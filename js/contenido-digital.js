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
  initTiersAnim(wrap);
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

/* ══════════════════════════════════════════════════════════════════════
   Animaciones de la página (todas se apagan con prefers-reduced-motion:
   motion.js solo agrega .motion-on cuando el usuario no pidió menos movimiento)
   ══════════════════════════════════════════════════════════════════════ */
const wdMotion = () => document.documentElement.classList.contains('motion-on');
const wdSleep = ms => new Promise(r => setTimeout(r, ms));
const wdOnView = (el, fn, threshold = .3) =>
  new IntersectionObserver((es, ob) => { if (es.some(e => e.isIntersecting)) { ob.disconnect(); fn(); } }, { threshold }).observe(el);

/* ── Hero: navegador que arma una página de ejemplo (negocios ficticios) en ciclo ── */
const WD_DEMOS = [
  { url: 'panaderialupita.com', name: 'Panadería Lupita', ico: '🥐', tag: 'Pan recién horneado todos los días', brand: '#E8833A', soft: '#FDEBDD',
    items: [['🥐', 'Cuernito', '$18'], ['🍩', 'Dona glaseada', '$22'], ['🎂', 'Pastel 3 leches', '$380']] },
  { url: 'floreriarosa.mx', name: 'Florería Rosa', ico: '🌷', tag: 'Arreglos para cada ocasión', brand: '#E0457B', soft: '#FCE3EC',
    items: [['💐', 'Ramo primavera', '$450'], ['🌹', 'Caja 12 rosas', '$690'], ['🪴', 'Suculenta', '$120']] },
  { url: 'tallerdelacasa.com', name: 'Taller de la Casa', ico: '🪵', tag: 'Muebles hechos a mano en Toluca', brand: '#2F7D6D', soft: '#DDF0EB',
    items: [['🪑', 'Silla roble', '$1,900'], ['🛋️', 'Banca', '$2,400'], ['🗄️', 'Buró', '$1,650']] }
];
function initWebBuilder() {
  const site = document.getElementById('wdSite');
  if (!site) return;
  const grid = document.getElementById('wdGrid'), url = document.getElementById('wdUrl'), toast = document.getElementById('wdToast');
  let idx = 0, visible = false, running = false;
  const fill = d => {
    site.style.setProperty('--wd-brand', d.brand); site.style.setProperty('--wd-soft', d.soft);
    document.getElementById('wdIco').textContent = d.ico;
    document.getElementById('wdName').textContent = d.name;
    document.getElementById('wdTag').textContent = d.tag;
    grid.innerHTML = d.items.map(([e, n, p]) => `<div class="wd-card wd-blk"><div class="wd-ph">${e}</div><div class="wd-nm">${n}</div><div class="wd-pr">${p}</div></div>`).join('');
  };
  fill(WD_DEMOS[0]);
  if (!wdMotion()) { site.querySelectorAll('.wd-blk').forEach(b => b.classList.add('in')); return; }
  site.classList.add('wd-anim');
  async function loop() {
    running = true;
    while (visible) {
      const d = WD_DEMOS[idx++ % WD_DEMOS.length];
      fill(d);
      const order = [site.querySelector('.wd-nav'), site.querySelector('.wd-hero'), ...grid.querySelectorAll('.wd-blk'), site.querySelector('.wd-wa')];
      order.forEach(b => b.classList.remove('in')); toast.classList.remove('in');
      url.textContent = '';
      for (const ch of d.url) { url.textContent += ch; await wdSleep(55); }
      await wdSleep(350);
      for (const b of order) { b.classList.add('in'); await wdSleep(b.classList.contains('wd-card') ? 260 : 480); }
      await wdSleep(500); toast.classList.add('in');
      await wdSleep(2600);
      if (!visible) break; // fuera de pantalla: se queda armada y retoma al volver
      toast.classList.remove('in'); order.slice().reverse().forEach(b => b.classList.remove('in'));
      await wdSleep(700);
    }
    running = false;
  }
  new IntersectionObserver(es => {
    visible = es.some(e => e.isIntersecting);
    if (visible && !running) { running = true; loop(); }
  }, { threshold: .3 }).observe(site);
}

/* ── Paquetes: el precio corre, las palomitas se marcan renglón por renglón y se eleva el recomendado ── */
function initTiersAnim(wrap) {
  const tiers = [...wrap.querySelectorAll('.exp-tier')];
  if (!tiers.length) return;
  if (!wdMotion()) return;
  wrap.classList.add('wd-anim');
  const fmt = n => '$' + Math.round(n).toLocaleString('es-MX');
  wdOnView(wrap, async () => {
    tiers.forEach(t => {
      const el = t.querySelector('.exp-tier-price');
      if (!el) return;
      const txt = el.textContent, plus = txt.trim().endsWith('+') ? '+' : '';
      const v = Number(txt.replace(/[^0-9.]/g, ''));
      if (!v) return;
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / 1300), e = 1 - Math.pow(1 - k, 3);
        el.textContent = k < 1 ? fmt(v * e) : txt;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    const max = Math.max(...tiers.map(t => t.querySelectorAll('.exp-tier-feats li').length));
    for (let i = 0; i < max; i++) {
      tiers.forEach(t => { const li = t.querySelectorAll('.exp-tier-feats li')[i]; if (li) li.classList.add('wd-on'); });
      await wdSleep(260);
    }
    await wdSleep(150);
    tiers.forEach(t => t.classList.add('wd-up'));
  }, .25);
}

/* ── "Así trabajamos": hilo rosa que recorre los 4 pasos en ciclo (mismo patrón que el home) ── */
function initProcessThread() {
  const steps = document.getElementById('wdSteps');
  if (!steps || !wdMotion()) return;
  steps.classList.add('wd-anim');
  const cards = [...steps.querySelectorAll('.wd-step')];
  const base = steps.querySelector('.wd-thread-base'), prog = steps.querySelector('.wd-thread-prog');
  let marks = [], total = 0, visible = false, running = false, played = false;
  function buildPath() {
    const pts = cards.map(c => {
      const ic = c.querySelector('.wd-step-ico');
      return { x: c.offsetLeft + ic.offsetLeft + ic.offsetWidth / 2, y: c.offsetTop + ic.offsetTop + ic.offsetHeight / 2, top: c.offsetTop, bottom: c.offsetTop + c.offsetHeight };
    });
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'), r = 16;
    let d = `M${pts[0].x},${pts[0].y}`; marks = [0];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (Math.abs(a.y - b.y) < 8 || Math.abs(a.x - b.x) < 8) d += ` L${b.x},${b.y}`;
      else {
        const mid = (a.bottom + b.top) / 2, s = a.x > b.x ? -1 : 1;
        d += ` L${a.x},${mid - r} Q${a.x},${mid} ${a.x + s * r},${mid} L${b.x - s * r},${mid} Q${b.x},${mid} ${b.x},${mid + r} L${b.x},${b.y}`;
      }
      tmp.setAttribute('d', d); marks.push(tmp.getTotalLength());
    }
    base.setAttribute('d', d); prog.setAttribute('d', d);
    total = marks[marks.length - 1]; prog.style.strokeDasharray = total;
  }
  const setP = len => { prog.style.strokeDashoffset = total - len; cards.forEach((c, i) => c.classList.toggle('on', marks[i] <= len + .5)); };
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const anim = (from, to, dur) => new Promise(res => {
    const t0 = performance.now();
    const tick = now => { const t = Math.min(1, (now - t0) / dur); setP(from + (to - from) * ease(t)); t < 1 ? requestAnimationFrame(tick) : res(); };
    requestAnimationFrame(tick);
  });
  async function loop() {
    running = true; played = true;
    buildPath();
    if (cards[cards.length - 1].classList.contains('on')) { await anim(total, 0, 700); await wdSleep(400); }
    while (visible) {
      await anim(0, total, 3400);
      await wdSleep(2600);
      if (!visible) break;
      await anim(total, 0, 700);
      await wdSleep(600);
    }
    running = false;
  }
  buildPath(); setP(0);
  new IntersectionObserver(es => {
    visible = es.some(e => e.isIntersecting);
    if (visible && !running) { running = true; setTimeout(loop, 300); }
  }, { threshold: .3 }).observe(steps);
  let lastW = steps.offsetWidth;
  new ResizeObserver(() => {
    if (steps.offsetWidth === lastW) return;
    lastW = steps.offsetWidth; buildPath(); setP(played && !running ? total : 0);
  }).observe(steps);
}

document.addEventListener('DOMContentLoaded', () => {
  cargarWebdev();
  setupHeroTilt();
  initWebBuilder();
  initProcessThread();
});
