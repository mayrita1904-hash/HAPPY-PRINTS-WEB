const { MercadoPagoConfig, Preference } = require('mercadopago');

const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SB_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p3cmFwaXF2eXhkbGlqZG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA1NzgsImV4cCI6MjA5ODUwNjU3OH0._3r9pDu7Vg09o_5MZt3tcu7i2CZoWk3xKtbOMWcY_wM';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    const cursoId = body && body.curso_id;
    if (!cursoId) {
      res.status(400).json({ error: 'Falta curso_id' });
      return;
    }

    const cursoRes = await fetch(`${SB_URL}/rest/v1/cursos?id=eq.${cursoId}&activo=eq.true&select=id,nombre,precio`, {
      headers: { apikey: SB_ANON_KEY, Authorization: 'Bearer ' + SB_ANON_KEY }
    });
    const cursos = await cursoRes.json();
    const curso = cursos && cursos[0];
    if (!curso) {
      res.status(404).json({ error: 'Curso no encontrado' });
      return;
    }

    const inscripcionRes = await fetch(`${SB_URL}/rest/v1/inscripciones`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({ user_id: user.id, curso_id: curso.id, estatus: 'pendiente', monto: curso.precio })
    });
    if (!inscripcionRes.ok) {
      res.status(500).json({ error: 'No se pudo registrar la inscripción' });
      return;
    }
    const [inscripcion] = await inscripcionRes.json();

    const origin = `https://${req.headers.host}`;
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const preference = await new Preference(client).create({
      body: {
        items: [{ title: curso.nombre, quantity: 1, unit_price: Number(curso.precio), currency_id: 'MXN' }],
        payer: { email: user.email },
        external_reference: String(inscripcion.id),
        back_urls: {
          success: `${origin}/pages/cursos?compra=approved`,
          pending: `${origin}/pages/cursos?compra=pending`,
          failure: `${origin}/pages/cursos?compra=failure`
        },
        auto_return: 'approved',
        notification_url: `${origin}/api/mp-webhook`
      }
    });

    await fetch(`${SB_URL}/rest/v1/inscripciones?id=eq.${inscripcion.id}`, {
      method: 'PATCH',
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mp_preference_id: preference.id })
    });

    res.status(200).json({ init_point: preference.init_point });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
