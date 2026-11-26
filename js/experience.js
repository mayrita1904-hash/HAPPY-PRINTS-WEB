const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p3cmFwaXF2eXhkbGlqZG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA1NzgsImV4cCI6MjA5ODUwNjU3OH0._3r9pDu7Vg09o_5MZt3tcu7i2CZoWk3xKtbOMWcY_wM';
const HDR = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };

const XP_WA = '5217224616543';
const TIER_ICON = { mini: '🌱', fiesta: '🎉', evento: '🎊', full: '👑' };
const motionOn = () => document.documentElement.classList.contains('motion-on');
const money = n => '$' + Math.round(n).toLocaleString('es-MX');
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Estado compartido entre "Pruébalo", celebraciones y el cotizador */
const xp = { paquetes: [], ev: '', pr: new Set(), name: '', img: '' };

/* ── Paquetes (tabla experience_paquetes) ── */
// "$7,500.00" → 7500 · "100+ piezas" → 100
const numDe = s => { const n = parseFloat(String(s || '').replace(/[^\d.]/g, '')); return isFinite(n) ? n : 0; };

async function cargarPaquetes() {
  const wrap = document.getElementById('expTiers');
  try {
    const r = await fetch(SB_URL + '/rest/v1/experience_paquetes?select=*&order=orden', { headers: HDR });
    if (!r.ok) throw new Error();
    const paquetes = await r.json();
    xp.paquetes = paquetes.map(p => ({
      nombre: p.nombre, precio: numDe(p.precio), piezas: numDe(p.piezas),
      plus: /\+/.test(p.precio || ''), horas: p.horas || ''
    })).filter(p => p.precio > 0 && p.piezas > 0);
    renderPaquetes(paquetes);
    actualizarCotizador();
  } catch (e) {
    wrap.innerHTML = '<div class="exp-tiers-loading">No se pudieron cargar los paquetes en este momento. Escríbenos por WhatsApp para más información.</div>';
    actualizarCotizador();
  }
}

function renderPaquetes(paquetes) {
  const wrap = document.getElementById('expTiers');
  if (!paquetes.length) {
    wrap.innerHTML = '<div class="exp-tiers-loading">Muy pronto publicaremos los paquetes disponibles.</div>';
    return;
  }
  wrap.innerHTML = paquetes.map((p, i) => {
    const precio = numDe(p.precio), piezas = numDe(p.piezas);
    const unit = precio && piezas ? `<div class="exp-tier-unit">≈ ${money(precio / piezas)} por invitado</div>` : '';
    return `
    <div class="exp-tier exp-tier-${p.color_key}${p.badge ? ' exp-tier-highlight' : ''} reveal" style="--i:${i}">
      ${p.badge ? `<div class="exp-tier-badge">⭐ ${p.badge}</div>` : ''}
      <div class="exp-tier-head"><span class="exp-tier-icon">${TIER_ICON[p.color_key] || '✨'}</span>${p.nombre}</div>
      <div class="exp-tier-body">
        <div class="exp-tier-qty">${p.piezas}</div>
        <div class="exp-tier-time">🕐 ${p.horas}</div>
        <ul class="exp-tier-feats">
          ${p.feature_1 ? `<li><span class="exp-tier-check">✔</span>${p.feature_1}</li>` : ''}
          ${p.feature_2 ? `<li><span class="exp-tier-check">✔</span>${p.feature_2}</li>` : ''}
        </ul>
        <div class="exp-tier-price" data-v="${precio}" data-txt="${escHtml(p.precio)}">${p.precio}</div>
        ${unit}
        ${p.nota ? `<div class="exp-tier-note">${p.nota}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  if (window.Motion) Motion.observeAll(wrap);
  contarPrecios(wrap);
}

/* El precio sube como contador la primera vez que los paquetes aparecen en pantalla */
function contarPrecios(wrap) {
  if (!motionOn()) return;
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    wrap.querySelectorAll('.exp-tier-price[data-v]').forEach(el => {
      const v = +el.dataset.v, final = el.dataset.txt;
      if (!v) return;
      const t0 = performance.now(), D = 1100;
      const step = now => {
        const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
        el.textContent = k < 1 ? money(v * e) : final;
        if (k < 1) requestAnimationFrame(step);
      };
      el.textContent = '$0';
      requestAnimationFrame(step);
    });
  }, { threshold: 0.3 });
  io.observe(wrap);
}

cargarPaquetes();

/* ── Celebraciones: avanzan solas, acercamiento lento y botón "Cotizar mi…" ── */
const CELEB = {
  'Bodas': ['Boda', 'Cotizar mi boda'],
  'XV años': ['XV años', 'Cotizar mis XV'],
  'Baby Showers': ['Baby shower', 'Cotizar mi baby shower'],
  'Eventos de empresa': ['Evento de empresa', 'Cotizar mi evento'],
  'Cumpleaños': ['Cumpleaños', 'Cotizar mi cumpleaños'],
  'Graduaciones': ['Graduación', 'Cotizar mi graduación']
};

function initExpSelector() {
  const panels = [...document.querySelectorAll('#expSelector .es-panel')];
  if (!panels.length) return;
  let auto = motionOn(), timer = 0;

  panels.forEach(p => {
    const titulo = (p.querySelector('.es-main') || {}).textContent || '';
    const info = p.querySelector('.es-info'), c = CELEB[titulo.trim()];
    p.insertAdjacentHTML('afterbegin', '<i class="es-bar" aria-hidden="true"></i>');
    if (info && c) info.insertAdjacentHTML('beforeend', `<a class="es-cta" href="#cotiza" data-ev="${c[0]}">${c[1]} →</a>`);
  });

  function activar(i) {
    panels.forEach((p, k) => {
      p.classList.toggle('active', k === i);
      p.querySelector('.es-bar').classList.remove('run');
    });
    if (!auto) return;
    const bar = panels[i].querySelector('.es-bar');
    void bar.offsetWidth;
    bar.classList.add('run');
    clearTimeout(timer);
    timer = setTimeout(() => activar((i + 1) % panels.length), 4500);
  }
  function detener() { auto = false; clearTimeout(timer); panels.forEach(p => p.querySelector('.es-bar').classList.remove('run')); }

  panels.forEach((p, i) => {
    setTimeout(() => p.classList.add('in'), 90 * i);
    p.addEventListener('click', e => {
      const cta = e.target.closest('.es-cta');
      detener();
      if (cta) { elegirEvento(cta.dataset.ev); return; }
      activar(i);
    });
  });

  // Solo avanza mientras la sección está en pantalla
  if (auto) {
    let empezo = false;
    new IntersectionObserver(es => {
      const vis = es.some(e => e.isIntersecting);
      if (vis && auto) { if (!empezo) { empezo = true; activar(0); } else activar(panels.findIndex(p => p.classList.contains('active'))); }
      if (!vis) clearTimeout(timer);
    }, { threshold: 0.35 }).observe(document.getElementById('expSelector'));
  }
}
initExpSelector();

/* ── Prensa en vivo: Elige → Personaliza → Lo creamos → Se lo lleva (se repite mientras está en pantalla) ── */
function initPrensa() {
  const press = document.getElementById('xpPress'), track = document.getElementById('xpTrack');
  if (!press || !track || !motionOn()) return;
  const steps = [...track.children], txt = press.querySelector('.xp-typed-txt');
  const DUR = [1600, 2000, 2000, 2200], NAME = 'SOFÍA';
  let timer = 0, typing = 0, visible = false;
  track.classList.add('run');

  function fase(i) {
    press.className = 'xp-press ph-' + i;
    steps.forEach((s, k) => {
      s.classList.toggle('on', k === i);
      s.classList.toggle('done', k < i);
      s.style.setProperty('--d', DUR[k] + 'ms');
    });
    clearInterval(typing);
    if (i === 0) { txt.textContent = ''; requestAnimationFrame(() => requestAnimationFrame(() => press.classList.add('go'))); }
    if (i === 1) {
      let n = 0;
      typing = setInterval(() => {
        n++; txt.textContent = NAME.slice(0, n) + (n < NAME.length ? '|' : '');
        if (n >= NAME.length) clearInterval(typing);
      }, 220);
    }
    if (i === 2) setTimeout(() => press.classList.add('hot'), 450);
    if (visible) timer = setTimeout(() => fase((i + 1) % 4), DUR[i]);
  }
  press.className = 'xp-press ph-3';
  new IntersectionObserver(es => {
    const was = visible; visible = es.some(e => e.isIntersecting);
    if (visible && !was) fase(0);
    if (!visible) { clearTimeout(timer); clearInterval(typing); }
  }, { threshold: 0.3 }).observe(press);
}
initPrensa();

/* ── Pruébalo con tu diseño: nombre/frase o figura subida, sobre gorra, tote y playera ── */
const TRY_COLS = [['Rosa', '#FF2D78'], ['Morado', '#7C3AED'], ['Turquesa', '#1FB6AE'], ['Azul marino', '#1A1F4B']];
// box = zona imprimible de cada producto (en coordenadas del viewBox 120×100)
const TRY_PRODS = [
  { n: 'Gorras', label: 'Gorra', box: [38, 28, 44, 30], base: (c) => `<path d="M18 64 q2 -40 42 -42 q40 2 42 42 z" fill="#fff" stroke="#D4D4E2" stroke-width="2"/><path d="M14 64 h92 q6 0 4 6 q-30 10 -60 6 q-26 -2 -40 -6 q-2 -6 4 -6z" fill="#E9E9F2"/><circle cx="60" cy="22" r="3.5" fill="${c}"/>` },
  { n: 'Tote bags', label: 'Tote bag', box: [34, 38, 52, 50], base: () => `<path d="M44 30 q0 -20 16 -20 q16 0 16 20" fill="none" stroke="#C9B48A" stroke-width="4"/><rect x="26" y="28" width="68" height="66" rx="4" fill="#F3E9D2" stroke="#E1D3B2" stroke-width="2"/>` },
  { n: 'Playeras', label: 'Playera', box: [42, 30, 36, 46], base: () => `<path d="M34 14 l14 -6 h24 l14 6 l20 18 l-12 12 l-10 -8 v58 h-48 v-58 l-10 8 l-12 -12 z" fill="#fff" stroke="#D4D4E2" stroke-width="2"/><path d="M50 8 q10 10 20 0" fill="none" stroke="#D4D4E2" stroke-width="2"/>` }
];

function initPruebalo() {
  const stage = document.getElementById('xpTryStage');
  if (!stage) return;
  const inp = document.getElementById('xpTryName'), file = document.getElementById('xpTryFile');
  const clear = document.getElementById('xpTryClear'), sw = document.getElementById('xpTrySw');
  let col = TRY_COLS[0][1], sel = 2;

  sw.innerHTML = TRY_COLS.map(([n, c], i) => `<button type="button" class="xp-sw" style="--c:${c}" aria-label="${n}" aria-pressed="${i === 0}"></button>`).join('');

  function diseno([x, y, w, h]) {
    const t = escHtml(inp.value.trim());
    const cx = x + w / 2;
    const fs = (len, max, ancho) => Math.min(max, ancho / Math.max(1, len) * 1.75).toFixed(1);
    if (xp.img && t) {
      const ih = h * 0.66;
      return `<image href="${xp.img}" x="${x}" y="${y}" width="${w}" height="${ih}" preserveAspectRatio="xMidYMid meet"/>
        <text x="${cx}" y="${y + ih + h * 0.26}" text-anchor="middle" fill="${col}" font-size="${fs(t.length, 11, w)}">${t}</text>`;
    }
    if (xp.img) return `<image href="${xp.img}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
    const txt = t || 'Tu diseño';
    return `<text x="${cx}" y="${y + h / 2 + 4}" text-anchor="middle" fill="${col}" font-size="${fs(txt.length, 14, w)}"${t ? '' : ' opacity=".45"'}>${txt}</text>`;
  }
  function pintar() {
    stage.innerHTML = TRY_PRODS.map((p, i) => `<button type="button" class="xp-prod" aria-pressed="${i === sel}">
      <svg viewBox="0 0 120 100" aria-hidden="true">${p.base(col)}${diseno(p.box)}</svg><span>${p.label}</span></button>`).join('');
    xp.name = inp.value.trim();
    actualizarCotizador();
  }

  inp.addEventListener('input', pintar);
  sw.addEventListener('click', e => {
    const b = e.target.closest('.xp-sw'); if (!b) return;
    [...sw.children].forEach(x => x.setAttribute('aria-pressed', x === b));
    col = b.style.getPropertyValue('--c'); pintar();
  });
  stage.addEventListener('click', e => {
    const b = e.target.closest('.xp-prod'); if (!b) return;
    sel = [...stage.children].indexOf(b); pintar();
  });
  // La imagen solo se usa para la vista previa en el navegador (no se sube a ningún lado)
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f || !/^image\//.test(f.type)) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 500 / Math.max(im.width, im.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        xp.img = cv.toDataURL('image/png');
        clear.hidden = false; pintar();
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  });
  clear.addEventListener('click', () => { xp.img = ''; file.value = ''; clear.hidden = true; pintar(); });
  document.getElementById('xpTryCta').addEventListener('click', () => {
    xp.pr.add(TRY_PRODS[sel].n);
    dibujarChips(); actualizarCotizador();
  });
  pintar();
}

/* ── Cotizador "Arma tu evento" ── */
const XP_EVENTOS = ['Boda', 'XV años', 'Baby shower', 'Cumpleaños', 'Graduación', 'Evento de empresa', 'Otro'];
const XP_PRODUCTOS = ['Playeras', 'Gorras', 'Tote bags'];

function dibujarChips() {
  const ch = (t, on) => `<button type="button" class="xp-chip" aria-pressed="${on}">${t}</button>`;
  const ev = document.getElementById('xpEv'), pr = document.getElementById('xpPr');
  if (!ev) return;
  ev.innerHTML = XP_EVENTOS.map(e => ch(e, e === xp.ev)).join('');
  pr.innerHTML = XP_PRODUCTOS.map(p => ch(p, xp.pr.has(p))).join('');
}

function elegirEvento(ev) {
  xp.ev = ev; dibujarChips(); actualizarCotizador();
  const cz = document.getElementById('cotiza');
  if (cz) cz.scrollIntoView({ behavior: motionOn() ? 'smooth' : 'auto' });
}

function fechaLargaXp(v) {
  if (!v) return 'por definir';
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function actualizarCotizador() {
  const g = document.getElementById('xpG');
  if (!g) return;
  const inv = +g.value, P = xp.paquetes;
  let rec = null;
  if (P.length) {
    const i = P.findIndex(p => p.piezas >= inv);
    rec = P[i === -1 ? P.length - 1 : i];
    document.getElementById('xpTiers').innerHTML = P.map(p => `<div class="xp-tier${p === rec ? ' rec' : ''}">
      <b>${escHtml(p.nombre)}</b><span>${p.piezas}${p.plus ? '+' : ''} piezas</span>
      <strong>${money(p.precio)}${p.plus ? '+' : ''}</strong><span>≈ ${money(p.precio / p.piezas)} c/u</span></div>`).join('');
    const extra = inv > rec.piezas ? ` Para ${inv} invitados cotizamos las piezas extra.` : '';
    document.getElementById('xpReco').innerHTML = `Para <b>${inv} invitados</b> te recomendamos el paquete <b>${escHtml(rec.nombre)}</b>: ${rec.piezas}${rec.plus ? '+' : ''} piezas por ${money(rec.precio)}${rec.plus ? '+' : ''}.${extra}`;
  } else {
    document.getElementById('xpTiers').innerHTML = '';
    document.getElementById('xpReco').innerHTML = `Para <b>${inv} invitados</b> te armamos una cotización a la medida.`;
  }
  const lineas = [
    '¡Hola! 👋 Quiero Happy Prints Experience en mi evento ✨', '',
    `🎉 Evento: ${xp.ev || 'por definir'}`,
    `📅 Fecha: ${fechaLargaXp(document.getElementById('xpD').value)}`,
    `👥 Invitados: ${inv}`,
    `🎁 Productos: ${xp.pr.size ? [...xp.pr].join(', ') : 'por definir'}`
  ];
  if (xp.name) lineas.push(`✏️ Nombre o frase: ${xp.name}`);
  if (xp.img) lineas.push('🖼️ Tengo una figura/diseño, se las mando aquí.');
  if (rec) lineas.push(`⭐ Paquete que me interesa: ${rec.nombre}`);
  lineas.push('', '¿Tienen disponible esa fecha?');
  document.getElementById('xpWa').href = `https://wa.me/${XP_WA}?text=` + encodeURIComponent(lineas.join('\n'));
  document.getElementById('xpCzNote').hidden = !xp.img;
}

function initCotizador() {
  const g = document.getElementById('xpG');
  if (!g) return;
  const d = document.getElementById('xpD');
  const hoy = new Date();
  d.min = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  document.getElementById('xpEv').addEventListener('click', e => {
    const b = e.target.closest('.xp-chip'); if (!b) return;
    xp.ev = xp.ev === b.textContent ? '' : b.textContent;
    dibujarChips(); actualizarCotizador();
  });
  document.getElementById('xpPr').addEventListener('click', e => {
    const b = e.target.closest('.xp-chip'); if (!b) return;
    const t = b.textContent;
    xp.pr.has(t) ? xp.pr.delete(t) : xp.pr.add(t);
    dibujarChips(); actualizarCotizador();
  });
  g.addEventListener('input', () => { document.getElementById('xpGo').textContent = g.value; actualizarCotizador(); });
  d.addEventListener('change', actualizarCotizador);
  dibujarChips(); actualizarCotizador();
}
initCotizador();
initPruebalo();

/* ── Barra fija "Cotizar" en celular: aparece al pasar el inicio y se oculta en el cotizador y el pie ── */
function initBarraCotizar() {
  const bar = document.getElementById('xpSticky');
  const pitch = document.querySelector('.exp-pitch'), cz = document.getElementById('cotiza'), foot = document.querySelector('footer');
  if (!bar || !pitch || !cz) return;
  const vis = new Map();
  const io = new IntersectionObserver(es => {
    es.forEach(e => vis.set(e.target, e.isIntersecting));
    const pasoInicio = !vis.get(pitch) && pitch.getBoundingClientRect().top < 0;
    const show = pasoInicio && !vis.get(cz) && !vis.get(foot);
    bar.classList.toggle('show', show);
    bar.setAttribute('aria-hidden', show ? 'false' : 'true');
    bar.tabIndex = show ? 0 : -1;
  });
  [pitch, cz, foot].forEach(el => el && io.observe(el));
}
initBarraCotizar();
