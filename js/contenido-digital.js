const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p3cmFwaXF2eXhkbGlqZG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA1NzgsImV4cCI6MjA5ODUwNjU3OH0._3r9pDu7Vg09o_5MZt3tcu7i2CZoWk3xKtbOMWcY_wM';
const HDR = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };

const TIER_ICON = { basico: '🟢', catalogo: '🟡', completo: '🔴' };
const CATEGORIA_ICON = {
  'Contenido y marca': '🎨',
  'Funcionalidad': '⚙️',
  'Datos y crecimiento': '📊',
  'Automatización': '🤖',
  'Después de la entrega': '🚀'
};
const CATEGORIA_ORDEN = ['Contenido y marca', 'Funcionalidad', 'Datos y crecimiento', 'Automatización', 'Después de la entrega'];

async function get(path) {
  const r = await fetch(SB_URL + '/rest/v1/' + path, { headers: HDR });
  if (!r.ok) throw new Error('No se pudo cargar ' + path);
  return r.json();
}

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString('es-MX');
}

/* ── Paquetes (tarjetas de precio) ── */
function renderWebdevTiers(paquetes) {
  const wrap = document.getElementById('webdevTiers');
  if (!paquetes.length) {
    wrap.innerHTML = '<div class="exp-tiers-loading">Muy pronto publicaremos los paquetes disponibles.</div>';
    return;
  }
  wrap.innerHTML = paquetes.map((p, i) => {
    const feats = [p.feature_1, p.feature_2, p.feature_3, p.feature_4, p.feature_5].filter(Boolean);
    return `
    <div class="exp-tier exp-tier-${p.tier_key}${p.badge ? ' exp-tier-highlight' : ''} reveal" style="--i:${i}">
      ${p.badge ? `<div class="exp-tier-badge">${p.badge}</div>` : ''}
      <div class="exp-tier-head"><span class="exp-tier-icon">${TIER_ICON[p.tier_key] || '✨'}</span> ${p.nombre}</div>
      <div class="exp-tier-body">
        <div class="exp-tier-qty">${p.paginas}</div>
        <div class="exp-tier-time">${p.audiencia || ''}</div>
        <ul class="exp-tier-feats">
          ${feats.map(f => `<li><span class="exp-tier-check">✓</span> ${f}</li>`).join('')}
        </ul>
        <div class="exp-tier-price">${fmtMoney(p.precio_valor)}${p.precio_plus ? '+' : ''}</div>
        <div class="exp-tier-note">MXN, pago único · entrega ${p.entrega || ''}</div>
      </div>
    </div>`;
  }).join('');
  if (window.Motion) Motion.observeAll(wrap);
}

/* ── Extras (carrusel de tarjetas por categoría) ── */
function renderWebdevExtras(extras) {
  const grid = document.getElementById('extrasGrid');
  if (!extras.length) {
    grid.innerHTML = '<p class="webdev-empty-msg">Muy pronto publicaremos los extras disponibles.</p>';
    return;
  }
  const porCategoria = {};
  extras.forEach(e => {
    (porCategoria[e.categoria] = porCategoria[e.categoria] || []).push(e);
  });
  const categorias = CATEGORIA_ORDEN.filter(c => porCategoria[c]).concat(Object.keys(porCategoria).filter(c => !CATEGORIA_ORDEN.includes(c)));

  grid.innerHTML = categorias.map(cat => `
    <div class="webdev-extras-card">
      <h3>${CATEGORIA_ICON[cat] || '✨'} ${cat}</h3>
      <ul>
        ${porCategoria[cat].map(e => `
          <li><span class="webdev-extras-label"><span class="webdev-extras-check">✓</span> ${e.nombre}</span><span class="webdev-extras-price">${fmtMoney(e.precio)}${e.unidad || ''}</span></li>
        `).join('')}
      </ul>
    </div>
  `).join('');
}

function moveExtras(dir) {
  const track = document.getElementById('extrasGrid');
  if (!track) return;
  track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
}

function setupExtrasArrows() {
  const track = document.getElementById('extrasGrid');
  const prev = document.getElementById('exPrev');
  const next = document.getElementById('exNext');
  if (!track || !prev || !next) return;
  const update = () => {
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  };
  if (!track.dataset.scrollBound) {
    track.dataset.scrollBound = '1';
    track.addEventListener('scroll', update);
    window.addEventListener('resize', update);
  }
  update();
}

async function cargarWebdev() {
  try {
    const [paquetes, extras] = await Promise.all([
      get('webdev_paquetes?select=*&order=orden'),
      get('webdev_extras?select=*&order=categoria,orden')
    ]);
    renderWebdevTiers(paquetes);
    renderWebdevExtras(extras);
  } catch (e) {
    document.getElementById('webdevTiers').innerHTML = '<div class="exp-tiers-loading">No se pudieron cargar los paquetes en este momento. Escríbenos por WhatsApp para más información.</div>';
    document.getElementById('extrasGrid').innerHTML = '<p class="webdev-empty-msg">No se pudieron cargar los extras en este momento.</p>';
  }
  setupExtrasArrows();
}

/* ── Imagen animada del pitch ── */
function setupHeroTilt() {
  const wrap = document.querySelector('.exp-pitch-media-imgwrap');
  const img = wrap && wrap.querySelector('img');
  if (!wrap || !img) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  wrap.addEventListener('mousemove', e => {
    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    img.style.transform = `rotateY(${x * 12}deg) rotateX(${y * -12}deg)`;
  });
  wrap.addEventListener('mouseleave', () => {
    img.style.transform = 'rotateY(0deg) rotateX(0deg)';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cargarWebdev();
  setupHeroTilt();
});
