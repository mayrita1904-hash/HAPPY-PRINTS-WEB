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
  wrap.innerHTML = paquetes.map(p => {
    const feats = [p.feature_1, p.feature_2, p.feature_3, p.feature_4, p.feature_5].filter(Boolean);
    return `
    <div class="exp-tier exp-tier-${p.tier_key}${p.badge ? ' exp-tier-highlight' : ''}">
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

let extrasIndex = 0;

function updateExtrasCarousel() {
  const track = document.getElementById('extrasGrid');
  const viewport = track && track.parentElement;
  if (!track || !viewport) return;
  const cards = [...track.children];
  if (!cards.length) return;
  extrasIndex = Math.max(0, Math.min(extrasIndex, cards.length - 1));
  cards.forEach((card, i) => {
    const dist = Math.abs(i - extrasIndex);
    card.classList.toggle('is-active', dist === 0);
    card.classList.toggle('is-near', dist === 1);
  });
  const active = cards[extrasIndex];
  const offset = viewport.clientWidth / 2 - (active.offsetLeft + active.offsetWidth / 2);
  track.style.transform = `translateX(${offset}px)`;
}

function moveExtras(dir) {
  extrasIndex += dir;
  updateExtrasCarousel();
}

function focusExtras(i) {
  extrasIndex = i;
  updateExtrasCarousel();
}

function setupExtrasSwipe() {
  const viewport = document.querySelector('.webdev-extras-viewport');
  if (!viewport || viewport.dataset.swipeBound) return;
  viewport.dataset.swipeBound = '1';
  let startX = 0, dragging = false;
  viewport.addEventListener('pointerdown', e => { dragging = true; startX = e.clientX; });
  viewport.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    const diff = e.clientX - startX;
    if (Math.abs(diff) > 40) moveExtras(diff < 0 ? 1 : -1);
  });
  viewport.addEventListener('pointercancel', () => { dragging = false; });
  window.addEventListener('resize', updateExtrasCarousel);
}

/* ── Calculadora "Arma tu sitio a la medida" ── */
function renderBuilderPkgs(paquetes) {
  const wrap = document.getElementById('builderPkgs');
  if (!paquetes.length) {
    wrap.innerHTML = '<p class="webdev-empty-msg">Muy pronto publicaremos los paquetes disponibles.</p>';
    return;
  }
  wrap.innerHTML = paquetes.map((p, i) => `
    <label class="webdev-builder-pkg webdev-builder-pkg-${p.tier_key}">
      <input type="radio" name="pkg" value="${p.precio_valor}" data-name="${p.nombre}" data-plus="${p.precio_plus ? '1' : '0'}" ${i === 0 ? 'checked' : ''}>
      <span class="webdev-builder-pkg-info">
        <span class="webdev-builder-pkg-top"><span class="webdev-builder-pkg-name">${p.nombre}</span><span class="webdev-builder-pkg-price">${fmtMoney(p.precio_valor)}${p.precio_plus ? '+' : ''}</span></span>
        <span class="webdev-builder-pkg-desc">${p.descripcion || ''}</span>
      </span>
    </label>
  `).join('');
}

function renderBuilderExtras(extras) {
  const wrap = document.getElementById('builderExtras');
  const noRecurrentes = extras.filter(e => !e.recurrente).sort((a, b) => a.precio - b.precio);
  if (!noRecurrentes.length) {
    wrap.innerHTML = '<p class="webdev-empty-msg">Muy pronto publicaremos los extras disponibles.</p>';
    return;
  }
  wrap.innerHTML = noRecurrentes.map(e => `
    <label class="webdev-builder-extra">
      <input type="checkbox" value="${e.precio}" data-name="${e.nombre}">
      <span class="webdev-builder-extra-name">${e.nombre}</span>
      <span class="webdev-builder-extra-price">+${fmtMoney(e.precio)}</span>
    </label>
  `).join('');

  const nota = document.getElementById('builderNote');
  const recurrentes = extras.filter(e => e.recurrente);
  if (nota) {
    nota.textContent = recurrentes.length
      ? `No incluye costos recurrentes: ${recurrentes.map(e => `${e.nombre.toLowerCase()} (${fmtMoney(e.precio)}${e.unidad || ''})`).join(' ni ')} — se cotizan aparte.`
      : '';
  }
}

function updateBuilderTotal() {
  const pkgInput = document.querySelector('input[name="pkg"]:checked');
  const totalEl = document.getElementById('builderTotal');
  const cta = document.getElementById('builderCta');
  if (!pkgInput || !totalEl || !cta) return;

  const plus = pkgInput.dataset.plus === '1';
  const selectedExtras = [...document.querySelectorAll('#builderExtras input:checked')];
  const total = selectedExtras.reduce((sum, cb) => sum + Number(cb.value), Number(pkgInput.value));
  const totalTxt = `${fmtMoney(total)}${plus ? '+' : ''} MXN`;

  totalEl.textContent = totalTxt;

  const pkgName = pkgInput.dataset.name;
  const breakdown = document.getElementById('builderBreakdown');
  if (breakdown) {
    const pkgRow = `<div class="webdev-builder-row webdev-builder-row-base"><span>${pkgName} (paquete base)</span><span>${fmtMoney(pkgInput.value)}${plus ? '+' : ''}</span></div>`;
    const extraRows = selectedExtras.map(cb =>
      `<div class="webdev-builder-row"><span>+ ${cb.dataset.name}</span><span>${fmtMoney(cb.value)}</span></div>`
    ).join('');
    breakdown.innerHTML = pkgRow + extraRows;
  }

  const extraNames = selectedExtras.map(cb => cb.dataset.name);
  let msg = `¡Hola! 👋 Armé mi sitio web a la medida en la página de Happy Prints:\n\nPaquete: ${pkgName}`;
  if (extraNames.length) msg += `\nExtras: ${extraNames.join(', ')}`;
  msg += `\nTotal estimado: ${totalTxt}\n\n¿Podemos platicar los detalles?`;
  cta.href = `https://wa.me/5217224616543?text=${encodeURIComponent(msg)}`;
}

function bindBuilderEvents() {
  document.querySelectorAll('input[name="pkg"], #builderExtras input').forEach(el => {
    el.addEventListener('change', updateBuilderTotal);
  });
  updateBuilderTotal();
}

function bindExtrasCardClicks() {
  document.querySelectorAll('#extrasGrid .webdev-extras-card').forEach((card, i) => {
    card.addEventListener('click', () => focusExtras(i));
  });
  extrasIndex = 0;
  updateExtrasCarousel();
  setupExtrasSwipe();
}

async function cargarWebdev() {
  try {
    const [paquetes, extras] = await Promise.all([
      get('webdev_paquetes?select=*&order=orden'),
      get('webdev_extras?select=*&order=categoria,orden')
    ]);
    renderWebdevTiers(paquetes);
    renderWebdevExtras(extras);
    renderBuilderPkgs(paquetes);
    renderBuilderExtras(extras);
  } catch (e) {
    document.getElementById('webdevTiers').innerHTML = '<div class="exp-tiers-loading">No se pudieron cargar los paquetes en este momento. Escríbenos por WhatsApp para más información.</div>';
    document.getElementById('extrasGrid').innerHTML = '<p class="webdev-empty-msg">No se pudieron cargar los extras en este momento.</p>';
    document.getElementById('builderPkgs').innerHTML = '';
    document.getElementById('builderExtras').innerHTML = '';
  }
  bindExtrasCardClicks();
  bindBuilderEvents();
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
