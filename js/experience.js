const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p3cmFwaXF2eXhkbGlqZG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA1NzgsImV4cCI6MjA5ODUwNjU3OH0._3r9pDu7Vg09o_5MZt3tcu7i2CZoWk3xKtbOMWcY_wM';
const HDR = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };

const TIER_ICON = { mini: '🌱', fiesta: '🎉', evento: '🎊', full: '👑' };

async function cargarPaquetes() {
  const wrap = document.getElementById('expTiers');
  try {
    const r = await fetch(SB_URL + '/rest/v1/experience_paquetes?select=*&order=orden', { headers: HDR });
    if (!r.ok) throw new Error();
    const paquetes = await r.json();
    renderPaquetes(paquetes);
  } catch (e) {
    wrap.innerHTML = '<div class="exp-tiers-loading">No se pudieron cargar los paquetes en este momento. Escríbenos por WhatsApp para más información.</div>';
  }
}

function renderPaquetes(paquetes) {
  const wrap = document.getElementById('expTiers');
  if (!paquetes.length) {
    wrap.innerHTML = '<div class="exp-tiers-loading">Muy pronto publicaremos los paquetes disponibles.</div>';
    return;
  }
  wrap.innerHTML = paquetes.map(p => `
    <div class="exp-tier exp-tier-${p.color_key}${p.badge ? ' exp-tier-highlight' : ''}">
      ${p.badge ? `<div class="exp-tier-badge">⭐ ${p.badge}</div>` : ''}
      <div class="exp-tier-head"><span class="exp-tier-icon">${TIER_ICON[p.color_key] || '✨'}</span>${p.nombre}</div>
      <div class="exp-tier-body">
        <div class="exp-tier-qty">${p.piezas}</div>
        <div class="exp-tier-time">🕐 ${p.horas}</div>
        <ul class="exp-tier-feats">
          ${p.feature_1 ? `<li><span class="exp-tier-check">✔</span>${p.feature_1}</li>` : ''}
          ${p.feature_2 ? `<li><span class="exp-tier-check">✔</span>${p.feature_2}</li>` : ''}
        </ul>
        <div class="exp-tier-price">${p.precio}</div>
        ${p.nota ? `<div class="exp-tier-note">${p.nota}</div>` : ''}
      </div>
    </div>
  `).join('');
}

cargarPaquetes();
