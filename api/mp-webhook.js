const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    const type = body.type || req.query.type || req.query.topic;
    const paymentId = (body.data && body.data.id) || req.query['data.id'] || req.query.id;

    if (type !== 'payment' || !paymentId) {
      // Mercado Pago manda otros tipos de eventos (merchant_order, etc.) — los ignoramos.
      res.status(200).json({ recibido: true });
      return;
    }

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: 'Bearer ' + process.env.MERCADOPAGO_ACCESS_TOKEN }
    });
    if (!paymentRes.ok) {
      res.status(500).json({ error: 'No se pudo consultar el pago en Mercado Pago' });
      return;
    }
    const payment = await paymentRes.json();
    const inscripcionId = payment.external_reference;
    if (!inscripcionId) {
      res.status(200).json({ recibido: true });
      return;
    }

    const estatus = payment.status === 'approved' ? 'pagado'
      : (payment.status === 'rejected' || payment.status === 'cancelled') ? 'rechazado'
      : 'pendiente';

    await fetch(`${SB_URL}/rest/v1/inscripciones?id=eq.${inscripcionId}`, {
      method: 'PATCH',
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ estatus, mp_payment_id: String(payment.id), actualizado_en: new Date().toISOString() })
    });

    res.status(200).json({ recibido: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
