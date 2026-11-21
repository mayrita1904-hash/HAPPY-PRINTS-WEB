// Tarea programada de Vercel (ver "crons" en vercel.json).
// En el plan gratuito, Supabase pausa el proyecto tras ~7 días sin actividad y el
// sitio se queda sin catálogo. Esta función hace una consulta de solo lectura cada
// 3 días para que nunca llegue a pausarse. Usa la anon key (pública por diseño, la
// misma de js/main.js), así que no necesita ninguna variable de entorno.
const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p3cmFwaXF2eXhkbGlqZG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA1NzgsImV4cCI6MjA5ODUwNjU3OH0._3r9pDu7Vg09o_5MZt3tcu7i2CZoWk3xKtbOMWcY_wM';

module.exports = async (req, res) => {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/productos?select=id&limit=1`, {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    });
    if (!r.ok) {
      console.error('Supabase no respondió:', r.status);
      res.status(502).json({ ok: false, status: r.status });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Error al consultar Supabase:', e);
    res.status(500).json({ ok: false });
  }
};
