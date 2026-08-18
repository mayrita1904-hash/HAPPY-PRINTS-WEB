const { MercadoPagoConfig, Preference } = require('mercadopago');

const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SB_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p3cmFwaXF2eXhkbGlqZG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA1NzgsImV4cCI6MjA5ODUwNjU3OH0._3r9pDu7Vg09o_5MZt3tcu7i2CZoWk3xKtbOMWcY_wM';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENVIO_FIJO = 185;

/* Misma lógica que calcLineTotal() en js/main.js — nunca se confía en el
   precio que manda el navegador, siempre se recalcula aquí con los datos
   reales de Supabase. */
function calcLineTotal(p, item, niveles) {
  const q = Number(item.cantidad) || 1;
  if (p.tipo === 'simple') return Number(p.precio_base) * q;
  if (p.tipo === 'talla')
    return (item.talla === 'infantil' && p.precio_infantil ? Number(p.precio_infantil) : Number(p.precio_base)) * q;
  if (p.tipo === 'cantidad') {
    const niv = niveles.find(n => q >= n.cantidad_min && (n.cantidad_max == null || q <= n.cantidad_max)) || niveles[niveles.length - 1];
    if (!niv) return Number(p.precio_base) * q;
    return (item.hojas === 100 && niv.precio_100_hojas ? Number(niv.precio_100_hojas) : Number(niv.precio)) * q;
  }
  if (p.tipo === 'escalonado') {
    const niv = niveles.find(n => q >= n.cantidad_min && (n.cantidad_max == null || q <= n.cantidad_max)) || niveles[niveles.length - 1];
    return niv ? Number(niv.precio) * q : Number(p.precio_base) * q;
  }
  return Number(p.precio_base) * q;
}

function varianteTexto(p, item) {
  if (p.tipo === 'talla') return 'Talla: ' + (item.talla === 'infantil' ? 'Infantil' : 'Adulto');
  if (p.tipo === 'cantidad') return (item.hojas || 50) + ' hojas';
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const authHeader = req.headers.authorization || '';
    const userToken = authHeader.replace('Bearer ', '');
    if (!userToken) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const userRes = await fetch(SB_URL + '/auth/v1/user', {
      headers: { apikey: SB_ANON_KEY, Authorization: 'Bearer ' + userToken }
    });
    if (!userRes.ok) {
      res.status(401).json({ error: 'Sesión inválida, vuelve a iniciar sesión.' });
      return;
    }
    const user = await userRes.json();

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const items = (body && body.items) || [];
    const cliente = (body && body.cliente) || {};
    if (!items.length) { res.status(400).json({ error: 'El carrito está vacío' }); return; }
    if (!cliente.nombre || !cliente.telefono || !cliente.correo || !cliente.calle || !cliente.numero || !cliente.colonia || !cliente.cp || !cliente.ciudad) {
      res.status(400).json({ error: 'Faltan datos del cliente o de la dirección' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.correo)) {
      res.status(400).json({ error: 'El correo no tiene un formato válido.' });
      return;
    }
    if (String(cliente.telefono).replace(/\D/g, '').length !== 10) {
      res.status(400).json({ error: 'El teléfono debe tener 10 dígitos.' });
      return;
    }
    if (String(cliente.cp).replace(/\D/g, '').length !== 5) {
      res.status(400).json({ error: 'El código postal debe tener 5 dígitos.' });
      return;
    }

    const ids = items.map(i => i.producto_id);
    const [productos, niveles] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/productos?id=in.(${ids.join(',')})&select=*`, { headers: { apikey: SB_ANON_KEY, Authorization: 'Bearer ' + SB_ANON_KEY } }).then(r => r.json()),
      fetch(`${SB_URL}/rest/v1/precios_niveles?producto_id=in.(${ids.join(',')})&select=*&order=producto_id,cantidad_min`, { headers: { apikey: SB_ANON_KEY, Authorization: 'Bearer ' + SB_ANON_KEY } }).then(r => r.json())
    ]);

    const lineasValidas = [];
    let subtotal = 0;
    for (const item of items) {
      const p = productos.find(pr => pr.id === item.producto_id);
      if (!p) continue;
      const nivs = niveles.filter(n => n.producto_id === item.producto_id);
      const total = calcLineTotal(p, item, nivs);
      subtotal += total;
      lineasValidas.push({ p, item, total });
    }
    if (!lineasValidas.length) { res.status(400).json({ error: 'Ninguno de los productos es válido' }); return; }

    const total = subtotal + ENVIO_FIJO;

    const pedidoRes = await fetch(`${SB_URL}/rest/v1/pedidos`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: user.id,
        cliente_nombre: cliente.nombre, cliente_telefono: cliente.telefono, cliente_email: cliente.correo,
        calle: cliente.calle, numero: cliente.numero, colonia: cliente.colonia, cp: cliente.cp, ciudad: cliente.ciudad,
        entre_calles: cliente.entre_calles || null, notas: cliente.notas || null,
        envio: ENVIO_FIJO, estatus_pago: 'pendiente', total
      })
    });
    if (!pedidoRes.ok) { res.status(500).json({ error: 'No se pudo registrar el pedido' }); return; }
    const [pedido] = await pedidoRes.json();

    const itemsPayload = lineasValidas.map(({ p, item, total }) => ({
      pedido_id: pedido.id, producto_id: p.id, producto_nombre: p.nombre, tipo: p.tipo,
      cantidad: Number(item.cantidad) || 1, variante: varianteTexto(p, item),
      precio_unitario: total / (Number(item.cantidad) || 1),
      attach_url: item.attach_url || null, combined_url: item.combined_url || null
    }));
    await fetch(`${SB_URL}/rest/v1/pedido_items`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(itemsPayload)
    });

    const origin = `https://${req.headers.host}`;
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const mpItems = lineasValidas.map(({ p, item, total }) => ({
      title: p.nombre, quantity: 1, unit_price: Number(total.toFixed(2)), currency_id: 'MXN'
    }));
    mpItems.push({ title: 'Envío', quantity: 1, unit_price: ENVIO_FIJO, currency_id: 'MXN' });

    const preference = await new Preference(client).create({
      body: {
        items: mpItems,
        payer: { email: cliente.correo },
        external_reference: String(pedido.id),
        back_urls: {
          success: `${origin}/?pedido=approved`,
          pending: `${origin}/?pedido=pending`,
          failure: `${origin}/?pedido=failure`
        },
        auto_return: 'approved',
        notification_url: `${origin}/api/mp-webhook-pedido`
      }
    });

    await fetch(`${SB_URL}/rest/v1/pedidos?id=eq.${pedido.id}`, {
      method: 'PATCH',
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mp_preference_id: preference.id })
    });

    res.status(200).json({ init_point: preference.init_point });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
