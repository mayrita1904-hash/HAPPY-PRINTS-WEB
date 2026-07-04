const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p3cmFwaXF2eXhkbGlqZG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA1NzgsImV4cCI6MjA5ODUwNjU3OH0._3r9pDu7Vg09o_5MZt3tcu7i2CZoWk3xKtbOMWcY_wM';
const HDR = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };
const WA_NUMBER = '5217224616543';

let allProds = [], allCats = [], allNiveles = [];
let cur = null, st = { qty: 1, talla: 'adulto', hojas: 50 };
const ATTACH_MAX_BYTES = 5 * 1024 * 1024;
let attachUrl = null, attachTooBig = false, attachName = '';

const fmt = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 });

const EMOJI = {
  'tazas':'☕','playeras':'👕','sudaderas':'🧥','termos':'🥤',
  'vasos':'🧊','libretas':'📓','plumas':'🖊️','calendarios':'📅','servicios':'🖨️','stickers':'⭐','invitaciones':'💌',
  'promociones':'🔥','bordados':'🧵',
  'fiesta de niños':'🎈','despedida de soltera':'💃','despedida de soltero':'🕺','para mamá':'💐',
  'para papá':'👔','graduación':'🎓','día del maestro':'🍎','día del niño':'🧸','bautizo':'👶','jubilación':'🎉'
};
function catEmoji(k) { return EMOJI[(k||'').toLowerCase()] || '📦'; }

async function get(path) {
  const r = await fetch(SB_URL + '/rest/v1/' + path, { headers: HDR });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ── Secciones estáticas de servicios (tipo Canva) ── */
const SERVICE_TILES = [
  { title: 'Offset y Serigrafía', sub: '', icon: '🖨️', img: 'assets/images/offset-serigrafia.png', color: '#7C3AED', kw: ['offset','serigraf'] },
  { title: 'Invitaciones y Papelería Social', sub: '', icon: '💌', img: 'assets/images/invitaciones-papeleria-social.png', color: '#1FB6AE', kw: ['invitac','papeler'] },
  { title: 'Grabado y Corte Láser', sub: '', icon: '✂️', img: 'assets/images/grabado-corte-laser.png', color: '#F5A623', kw: ['grabado','laser','corte'] },
  { title: 'Sublimación, DTF y Vinil', sub: '', icon: '👕', img: 'assets/images/sublimacion-dtf-vinil.png', color: '#FF2D78', kw: ['sublimac','dtf','vinil'] },
  { title: 'Libretas, Agendas y Planners', sub: '', icon: '📓', img: 'assets/images/libretas-agendas-planners.png', color: '#F6C55B', kw: ['libreta','agenda','planner'] },
  { title: 'Impresión Digital y Publicidad', sub: '', icon: '🖼️', img: 'assets/images/impresion-digital-publicidad.png', color: '#E91E8C', kw: ['impresion','digital','publicidad'] },
  { title: 'Sellos, Etiquetas y Credenciales', sub: '', icon: '🏷️', img: 'assets/images/sellos-etiquetas-credenciales.png', color: '#B4C430', kw: ['sello','etiqueta','credencial'] },
  { title: 'Diseño Gráfico y Contenido Digital', sub: '', icon: '🎨', img: 'assets/images/diseno-grafico-contenido-digital.jpg', imgFit: 'cover', color: '#1FADA0', kw: ['diseño','grafico','contenido'] }
];

const FEATURED = [
  { key: 'tazas', label: 'Tazas', icon: '☕', color: '#1FB6AE' },
  { key: 'playeras', label: 'Playeras', icon: '👕', color: '#FF2D78' },
  { key: 'libretas', label: 'Libretas', icon: '📓', color: '#7C3AED' },
  { key: 'stickers', label: 'Stickers', icon: '⭐', color: '#F5A623' }
];

function matchCatId(keywords) {
  const found = allCats.find(c => keywords.some(k => c.nombre.toLowerCase().includes(k)));
  if (found) return found.id;
  const serv = allCats.find(c => c.nombre.toLowerCase().includes('servicio'));
  return serv ? serv.id : 'all';
}

function buildCatGrid() {
  const grid = document.getElementById('cat-grid-visual');
  if (!grid) return;
  grid.innerHTML = SERVICE_TILES.map(t => {
    const catId = matchCatId(t.kw);
    const arg = typeof catId === 'string' ? `'${catId}'` : catId;
    const fitClass = t.imgFit === 'cover' ? ' cover' : '';
    const media = t.img
      ? `<img class="cat-tile-img${fitClass}" src="${t.img}" alt="${t.title}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'cat-tile-icon',textContent:'${t.icon}'}))">`
      : `<div class="cat-tile-icon">${t.icon}</div>`;
    return `<div class="cat-tile ${t.img?'has-img':''}${fitClass}" style="background:${t.color}" onclick="filt(${arg})">
      ${media}
      <div class="cat-tile-title">${t.title}</div>
    </div>`;
  }).join('');
}

function buildFeatured() {
  const wrap = document.getElementById('featured-grid');
  if (!wrap) return;
  const cards = FEATURED.map(f => {
    const cat = allCats.find(c => c.nombre.toLowerCase().includes(f.key));
    if (!cat) return '';
    const prods = allProds.filter(p => p.categoria_id === cat.id);
    if (!prods.length) return '';
    const minPrice = Math.min(...prods.map(p => Number(p.precio_base)));
    const withImg = prods.find(p => p.imagen_url);
    const media = withImg
      ? `<img src="${withImg.imagen_url}" alt="${f.label}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=&quot;feat-ph&quot;>${f.icon}</div>'">`
      : `<div class="feat-ph">${f.icon}</div>`;
    return `<div class="feat-card">
      <div class="feat-media" style="background:${f.color}22">${media}</div>
      <div class="feat-name">${f.label}</div>
      <div class="feat-price">Desde ${fmt(minPrice)}</div>
      <button class="feat-btn" onclick="filt(${cat.id})">Ver catálogo</button>
    </div>`;
  }).join('');
  wrap.innerHTML = cards || '<p style="text-align:center;color:var(--ink-soft);grid-column:1/-1">Cargando productos destacados…</p>';
}

async function init() {
  try {
    [allCats, allProds, allNiveles] = await Promise.all([
      get('categorias?select=*&order=orden'),
      get('productos?select=*,categorias(nombre,emoji)&order=categoria_id,orden&activo=eq.true'),
      get('precios_niveles?select=*&order=producto_id,cantidad_min')
    ]);
    buildCatGrid();
    buildFeatured();
    buildChips();
    renderGrid('all');
  } catch (e) {
    document.getElementById('grid').innerHTML = `<div class="empty">⚠️ No se pudieron cargar los productos.<br><small style="font-size:10px">${e.message}</small></div>`;
  }
}

function buildChips() {
  const usedIds = new Set(allProds.map(p => p.categoria_id));
  const cats = allCats.filter(c => usedIds.has(c.id));
  const chips = document.getElementById('cat-chips');
  chips.innerHTML = `<button class="chip on" data-cat="all" onclick="filt('all',this)"><span class="ci">🏷️</span><span class="cl">Todo</span></button>` +
    cats.map(c => `<button class="chip" data-cat="${c.id}" onclick="filt(${c.id},this)"><span class="ci">${catEmoji(c.emoji||c.nombre)}</span><span class="cl">${c.nombre}</span></button>`).join('');
}

function filt(cat, chipEl) {
  document.querySelectorAll('.chip').forEach(e => e.classList.remove('on'));
  document.querySelectorAll('.hnl').forEach(e => e.classList.remove('on'));
  if (chipEl) {
    chipEl.classList.add('on');
  } else {
    const match = document.querySelector(`.chip[data-cat="${cat}"]`);
    if (match) match.classList.add('on');
  }
  renderGrid(cat);
  document.getElementById('prods').scrollIntoView({ behavior: 'smooth' });
}

function goServicios() {
  const c = allCats.find(c => c.nombre.toLowerCase().includes('servicio'));
  filt(c ? c.id : 'all');
}

function inquireWA(topic) {
  const msg = encodeURIComponent(`¡Hola! 👋 Vi su página y me interesa *${topic}* que ofrecen en Happy Prints.\n\n¿Me podrían compartir más información, precios y disponibilidad? ¡Gracias! 😊`);
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
}

function renderGrid(cat) {
  const list = cat === 'all' ? allProds : allProds.filter(p => p.categoria_id === cat);
  if (!list.length) {
    document.getElementById('grid').innerHTML = '<div class="empty">No hay productos en esta categoría todavía.</div>';
    return;
  }
  document.getElementById('grid').innerHTML = list.map(p => {
    const c = p.categorias || {};
    const imgTag = p.imagen_url
      ? `<img class="cimg" src="${p.imagen_url}" alt="${p.nombre}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const ph = `<div class="cph" style="${p.imagen_url ? 'display:none' : ''}">${catEmoji(c.emoji||c.nombre)}</div>`;
    return `<div class="card" onclick="openM(${p.id})">
      <div class="cst" style="background:${p.color_marca || '#FF2D78'}"></div>
      ${imgTag}${ph}
      <div class="cbody">
        <div class="cname">${p.nombre}</div>
        <div class="cdesc">${(p.descripcion||'').substring(0,58)}${(p.descripcion||'').length>58?'…':''}</div>
        <div class="cprice">${fmt(p.precio_base)}<span class="cpsub">desde · MXN</span></div>
        <button class="cbtn">Ver y calcular precio →</button>
      </div>
    </div>`;
  }).join('');
}

/* ── Calculadora de precio ── */
function nivelesDe(id) {
  return allNiveles.filter(n => n.producto_id === id);
}

function calcT() {
  if (!cur) return 0;
  const q = st.qty, p = cur;
  const nivs = nivelesDe(p.id);

  if (p.tipo === 'simple') return p.precio_base * q;

  if (p.tipo === 'talla')
    return (st.talla === 'infantil' && p.precio_infantil ? p.precio_infantil : p.precio_base) * q;

  if (p.tipo === 'cantidad') {
    const niv = nivs.find(n => q >= n.cantidad_min && (n.cantidad_max == null || q <= n.cantidad_max))
      || nivs[nivs.length - 1];
    if (!niv) return p.precio_base * q;
    return (st.hojas === 100 && niv.precio_100_hojas ? niv.precio_100_hojas : niv.precio) * q;
  }

  if (p.tipo === 'escalonado') {
    const niv = nivs.find(n => q >= n.cantidad_min && (n.cantidad_max == null || q <= n.cantidad_max))
      || nivs[nivs.length - 1];
    return niv ? niv.precio * q : p.precio_base * q;
  }

  return p.precio_base * q;
}

function openM(id) {
  cur = allProds.find(p => p.id === id);
  if (!cur) return;
  st = { qty: 1, talla: 'adulto', hojas: 50 };
  attachUrl = null; attachTooBig = false; attachName = '';
  const c = cur.categorias || {};
  const color = cur.color_marca || '#FF2D78';

  const mimg  = document.getElementById('mimg');
  const mph   = document.getElementById('mph');
  const mzoom = document.getElementById('mzoom');
  resetModalZoom();
  if (cur.imagen_url) {
    mimg.src = cur.imagen_url;
    mimg.alt = cur.nombre;
    mimg.style.display  = 'block';
    mph.style.display   = 'none';
    mzoom.style.display = 'flex';
    mimg.onerror = () => { mimg.style.display = 'none'; mph.style.display = 'flex'; mph.textContent = catEmoji(c.emoji||c.nombre); mzoom.style.display = 'none'; };
  } else {
    mimg.style.display  = 'none';
    mph.style.display   = 'flex';
    mph.textContent     = catEmoji(c.emoji||c.nombre);
    mzoom.style.display = 'none';
  }

  document.getElementById('mbar').style.background = color;
  document.getElementById('mbdg').textContent       = c.nombre || '';
  document.getElementById('mbdg').style.background  = color;
  document.getElementById('mname').textContent      = cur.nombre;
  document.getElementById('mdesc').textContent      = cur.descripcion || '';

  renderMB();
  document.getElementById('ov').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeM() {
  document.getElementById('ov').classList.remove('open');
  document.body.style.overflow = '';
  resetModalZoom();
}

/* ── Zoom de imagen dentro del mismo modal ── */
function updateZoomOrigin(e) {
  const mimg = document.getElementById('mimg');
  const rect = mimg.getBoundingClientRect();
  const ox = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
  const oy = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
  mimg.style.transformOrigin = `${ox}% ${oy}%`;
}

function toggleModalZoom(e) {
  const mimg  = document.getElementById('mimg');
  const mip   = document.getElementById('mip');
  const mzoom = document.getElementById('mzoom');
  if (!mimg || mimg.style.display === 'none') return;

  if (mimg.classList.contains('zoomed')) {
    resetModalZoom();
    return;
  }
  updateZoomOrigin(e);
  mimg.classList.add('zoomed');
  mip.classList.add('zoomed');
  mzoom.classList.add('on');
}

/* Mientras está en zoom, seguir el cursor/dedo sin necesidad de volver a tocar */
document.getElementById('mimg').addEventListener('pointermove', e => {
  const mimg = document.getElementById('mimg');
  if (!mimg.classList.contains('zoomed')) return;
  e.preventDefault();
  updateZoomOrigin(e);
}, { passive: false });

function resetModalZoom() {
  const mimg  = document.getElementById('mimg');
  const mip   = document.getElementById('mip');
  const mzoom = document.getElementById('mzoom');
  mimg.classList.remove('zoomed');
  mip.classList.remove('zoomed');
  mzoom.classList.remove('on');
  mimg.style.transformOrigin = '';
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('ov').classList.contains('open')) return;
  if (document.getElementById('mimg').classList.contains('zoomed')) resetModalZoom();
  else closeM();
});

function renderMB() {
  const p     = cur;
  const color = p.color_marca || '#FF2D78';
  const nivs  = nivelesDe(p.id);
  const total = calcT();
  let h = '';

  if (p.tipo === 'talla') {
    h += `<span class="olbl">Talla</span><div class="ogrid">
      <button class="obtn ${st.talla==='adulto'?'on':''}" onclick="pick('talla','adulto')">
        🧑 Adulto<br><small style="font-size:10px;font-weight:600;color:#9090A8">${fmt(p.precio_base)} c/u</small>
      </button>
      ${p.precio_infantil
        ? `<button class="obtn ${st.talla==='infantil'?'on':''}" onclick="pick('talla','infantil')">
            🧒 Infantil<br><small style="font-size:10px;font-weight:600;color:#9090A8">${fmt(p.precio_infantil)} c/u</small>
           </button>`
        : ''
      }</div>`;
  }

  if (p.tipo === 'cantidad' && nivs.length) {
    const actNiv = nivs.find(n => st.qty >= n.cantidad_min && (n.cantidad_max==null||st.qty<=n.cantidad_max)) || nivs[nivs.length-1];
    h += `<span class="olbl">Número de hojas</span>
    <div class="ogrid">
      <button class="obtn ${st.hojas===50?'on':''}" onclick="pick('hojas',50)">
        📄 50 hojas<br><small style="font-size:10px;font-weight:600;color:#9090A8">${fmt(actNiv.precio)} c/u</small>
      </button>
      <button class="obtn ${st.hojas===100?'on':''}" onclick="pick('hojas',100)">
        📄 100 hojas<br><small style="font-size:10px;font-weight:600;color:#9090A8">${fmt(actNiv.precio_100_hojas)} c/u</small>
      </button>
    </div>
    <span class="olbl">Precio por cantidad</span>
    <div style="background:#F5F5F8;border-radius:10px;padding:10px 13px;margin-bottom:4px">
      ${nivs.map(n => {
        const on = st.qty >= n.cantidad_min && (n.cantidad_max==null||st.qty<=n.cantidad_max);
        const lbl = n.cantidad_max==null||n.cantidad_max>=9999 ? `Más de ${n.cantidad_min-1} piezas` : `${n.cantidad_min}–${n.cantidad_max} piezas`;
        const pu  = st.hojas===100 && n.precio_100_hojas ? n.precio_100_hojas : n.precio;
        return `<div class="tier-row" style="color:${on?color:'#9090A8'}">
          <span>${lbl}</span><span style="font-weight:${on?900:700}">${fmt(pu)}/u</span>
        </div>`;
      }).join('')}
    </div>`;
  }

  if (p.tipo === 'escalonado' && nivs.length) {
    h += `<span class="olbl">Precio por cantidad</span>
    <div style="background:#F5F5F8;border-radius:10px;padding:10px 13px;margin-bottom:4px">
      ${nivs.map(n => {
        const on = st.qty >= n.cantidad_min && (n.cantidad_max==null||st.qty<=n.cantidad_max);
        const lbl = n.cantidad_max==null||n.cantidad_max>=9999 ? `Más de ${n.cantidad_min-1} piezas` : `${n.cantidad_min}–${n.cantidad_max} piezas`;
        return `<div class="tier-row" style="color:${on?color:'#9090A8'}">
          <span>${lbl}</span><span style="font-weight:${on?900:700}">${fmt(n.precio)}/u</span>
        </div>`;
      }).join('')}
    </div>`;
  }

  h += `<span class="olbl">Cantidad de piezas</span>
  <div class="qrow">
    <button class="qbtn" onclick="chgQ(-1)" aria-label="Restar">−</button>
    <span class="qv" id="qv">${st.qty}</span>
    <button class="qbtn" onclick="chgQ(1)" aria-label="Sumar">+</button>
    <span style="font-size:12px;color:#9090A8;margin-left:6px">piezas</span>
  </div>

  <span class="olbl">Foto de referencia (opcional)</span>
  <label class="attach-zone" id="attachZone" for="attachInput">
    <input type="file" id="attachInput" accept="image/*" onchange="handleAttach(event)" style="display:none">
    <span id="attachLabel">📎 Toca para adjuntar una foto o diseño (máx. 5 MB)</span>
  </label>

  <div class="tbox">
    <div>
      <div class="tlbl">Total estimado</div>
      <div style="font-size:10px;color:rgba(255,255,255,.32);margin-top:2px" id="tqi">${st.qty} pieza(s)</div>
    </div>
    <div class="tamt" id="ta">${fmt(total)}</div>
  </div>

  <button class="wabtn" onclick="pedirWA()">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.092.537 4.058 1.477 5.769L0 24l6.406-1.469A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.895 0-3.673-.513-5.197-1.407l-.373-.219-3.8.872.908-3.71-.242-.388A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
    Pedir por WhatsApp
  </button>`;

  document.getElementById('mbody').innerHTML = h;
}

function chgQ(d) {
  st.qty = Math.max(1, st.qty + d);
  if (cur.tipo === 'escalonado' || cur.tipo === 'cantidad') { renderMB(); return; }
  document.getElementById('qv').textContent  = st.qty;
  document.getElementById('ta').textContent  = fmt(calcT());
  document.getElementById('tqi').textContent = st.qty + ' pieza(s)';
}

function pick(k, v) { st[k] = v; renderMB(); }

function renderAttachZone(html) {
  const label = document.getElementById('attachLabel');
  if (label) label.innerHTML = html;
}

async function handleAttach(e) {
  const file = e.target.files[0];
  if (!file) return;
  attachUrl = null; attachTooBig = false; attachName = file.name;

  if (file.size > ATTACH_MAX_BYTES) {
    attachTooBig = true;
    renderAttachZone(`⚠️ "${file.name}" pesa más de 5 MB. No hay problema: mándala directo por este chat de WhatsApp después de hacer tu pedido.`);
    return;
  }

  renderAttachZone(`⏳ Subiendo "${file.name}"…`);
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `pedidos/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const r = await fetch(`${SB_URL}/storage/v1/object/productos/${path}`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
      body: file
    });
    if (!r.ok) throw new Error();
    attachUrl = `${SB_URL}/storage/v1/object/public/productos/${path}`;
    renderAttachZone(`✅ "${file.name}" lista — se incluirá con tu pedido.`);
  } catch (err) {
    attachUrl = null;
    renderAttachZone(`⚠️ No se pudo subir "${file.name}". Puedes intentar de nuevo o mandarla directo por WhatsApp con tu pedido.`);
  }
}

function pedirWA() {
  const t  = calcT();
  const ex = cur.tipo === 'talla'    ? `\n📏 *Talla:* ${st.talla}`
           : cur.tipo === 'cantidad' ? `\n📄 *Hojas:* ${st.hojas}`
           : '';
  const foto = attachUrl
    ? `\n📎 *Foto de referencia:* ${attachUrl}`
    : attachTooBig
      ? `\n📎 *Foto de referencia:* les mando el archivo por este mismo chat (pesa más de 5 MB)`
      : '';
  const msg = encodeURIComponent(
    `¡Hola! 👋 Vengo de su catálogo y me encantó lo que vi ✨\n\nMe gustaría apartar este pedido:\n\n🛍️ *Producto:* ${cur.nombre}\n🔢 *Cantidad:* ${st.qty} pieza(s)${ex}${foto}\n💰 *Total estimado:* ${fmt(t)} MXN\n\n¿Podrían confirmarme disponibilidad, tiempo de entrega y cómo realizar el pago? ¡Quedo al pendiente! 😊`
  );
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
}

document.getElementById('ov').addEventListener('click', e => {
  if (e.target === document.getElementById('ov')) closeM();
});

init();
