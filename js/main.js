const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p3cmFwaXF2eXhkbGlqZG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA1NzgsImV4cCI6MjA5ODUwNjU3OH0._3r9pDu7Vg09o_5MZt3tcu7i2CZoWk3xKtbOMWcY_wM';
const HDR = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };
const WA_NUMBER = '5217224616543';

const PROMO_KEY = 'hp_promo_dismissed';
function cerrarPromoBanner() {
  const b = document.getElementById('promoBanner');
  if (b) b.style.display = 'none';
  localStorage.setItem(PROMO_KEY, '1');
}
if (localStorage.getItem(PROMO_KEY)) {
  const promoBanner = document.getElementById('promoBanner');
  if (promoBanner) promoBanner.style.display = 'none';
}

let allProds = [], allCats = [], allNiveles = [], allImgs = [], allCotItems = [];
let cur = null, st = { qty: 1, talla: 'adulto', hojas: 50 };
const ATTACH_MAX_BYTES = 5 * 1024 * 1024;
let attachUrl = null, attachTooBig = false, attachName = '';

/* Categorías sin costo fijo: se cotizan por checklist en vez de calculadora de precio */
const QUOTE_CATS = ['offset y serigrafía', 'impresión digital', 'grabado y corte láser'];
function esCategoriaCotizacion(nombre) { return QUOTE_CATS.includes((nombre || '').toLowerCase()); }

const fmt = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 });

const EMOJI = {
  'tazas':'☕','playeras':'👕','sudaderas':'🧥','termos':'🥤',
  'vasos':'🧊','libretas':'📓','plumas':'🖊️','calendarios':'📅','offset y serigrafía':'🖨️','stickers':'⭐','invitaciones':'💌',
  'promociones':'🔥','bordados':'🧵',
  'fiesta de niños':'🎈','despedida de soltera':'💃','despedida de soltero':'🕺','para mamá':'💐',
  'para papá':'👔','graduación':'🎓','día del maestro':'🍎','día del niño':'🧸','bautizo':'👶','jubilación':'🎉',
  'sellos':'🏷️','etiquetas':'🔖','credenciales':'🪪','impresión digital':'🖼️','publicidad':'📣','grabado y corte láser':'✂️'
};
function catEmoji(k) { return EMOJI[(k||'').toLowerCase()] || '📦'; }

async function get(path) {
  const r = await fetch(SB_URL + '/rest/v1/' + path, { headers: HDR });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ── Secciones estáticas de servicios (tipo Canva) ── */
const SERVICE_TILES = [
  { title: 'Sublimación, DTF y Vinil', sub: '', icon: '👕', img: 'assets/images/sublimacion-dtf-vinil.png', color: '#7C3AED', showAll: true },
  { title: 'Libretas, Agendas y Planners', sub: '', icon: '📓', img: 'assets/images/libretas-agendas-planners.png', color: '#1FB6AE', kw: ['libreta','agenda','planner'] },
  { title: 'Sellos, Etiquetas y Credenciales', sub: '', icon: '🏷️', img: 'assets/images/sellos-etiquetas-credenciales.png', color: '#F5A623', kw: ['sello','etiqueta','credencial'] },
  { title: 'Invitaciones y Papelería Social', sub: '', icon: '💌', img: 'assets/images/invitaciones-papeleria-social.png', color: '#FF2D78', kw: ['invitac','papeler'] },
  { title: 'Impresión Digital y Publicidad', sub: '', icon: '🖼️', img: 'assets/images/impresion-digital-publicidad.png', color: '#F6C55B', kw: ['impresion','digital','publicidad'] },
  { title: 'Offset y Serigrafía', sub: '', icon: '🖨️', img: 'assets/images/offset-serigrafia.png', color: '#E91E8C', kw: ['offset','serigraf'] },
  { title: 'Grabado y Corte Láser', sub: '', icon: '✂️', img: 'assets/images/grabado-corte-laser.png', color: '#B4C430', kw: ['grabado','laser','corte'] },
  { title: 'Contenido Digital', sub: '', icon: '🎨', img: 'assets/images/diseno-grafico-contenido-digital.png', color: '#1FADA0', link: '/pages/contenido-digital' }
];

const FEATURED = [
  { key: 'tazas', label: 'Tazas', icon: '☕', color: '#1FB6AE', desc: 'Cambian de color o se personalizan con tu foto o diseño favorito.' },
  { key: 'playeras', label: 'Playeras', icon: '👕', color: '#FF2D78', desc: 'Estampado full color de alta durabilidad, en el diseño que imagines.' },
  { key: 'sudaderas', label: 'Sudaderas', icon: '🧥', color: '#7C3AED', desc: 'Ideal para regalo o uniforme de equipo, con tu diseño o logo.' },
  { key: 'termos', label: 'Termos', icon: '🥤', color: '#F5A623', desc: 'Mantienen la temperatura y resisten el uso diario.' },
  { key: 'vasos', label: 'Vasos', icon: '🧊', color: '#F6C55B', desc: 'Para el café o bebida de todos los días, con tu nombre o diseño.' },
  { key: 'libretas', label: 'Libretas', icon: '📓', color: '#1FADA0', desc: 'Pasta dura o suave, perfectas para regalo u oficina.' }
];

function matchCatIds(keywords) {
  const found = allCats.filter(c => keywords.some(k => c.nombre.toLowerCase().includes(k)));
  if (found.length) return found.map(c => c.id);
  const serv = allCats.find(c => c.nombre.toLowerCase().includes('servicio'));
  return serv ? [serv.id] : [];
}

function buildCatGrid() {
  const grid = document.getElementById('cat-grid-visual');
  if (!grid) return;
  grid.innerHTML = SERVICE_TILES.map(t => {
    const fitClass = t.imgFit === 'cover' ? ' cover' : '';
    const media = t.img
      ? `<img class="cat-tile-img${fitClass}" src="${t.img}" alt="${t.title} - Happy Prints" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'cat-tile-icon',textContent:'${t.icon}'}))">`
      : `<div class="cat-tile-icon">${t.icon}</div>`;
    const action = t.link
      ? `location.href='${t.link}'`
      : (() => { const arg = t.showAll ? `'all'` : (() => { const ids = matchCatIds(t.kw); return ids.length ? JSON.stringify(ids) : `'all'`; })(); return `filt(${arg})`; })();
    return `<div class="cat-tile ${t.img?'has-img':''}${fitClass}" style="background:${t.color}" onclick="${action}">
      ${media}
      <div class="cat-tile-title">${t.title}</div>
    </div>`;
  }).join('');
}

let featuredIndex = 0;

function buildFeatured() {
  const wrap = document.getElementById('featured-grid');
  if (!wrap) return;
  const items = FEATURED.map(f => {
    const cat = allCats.find(c => c.nombre.toLowerCase().includes(f.key));
    if (!cat) return null;
    const prods = allProds.filter(p => p.categoria_id === cat.id);
    if (!prods.length) return null;
    const minPrice = Math.min(...prods.map(p => Number(p.precio_base)));
    const withImg = prods.find(p => p.imagen_url);
    const media = withImg
      ? `<img src="${withImg.imagen_url}" alt="${f.label} personalizados - Happy Prints" loading="lazy" onerror="this.parentElement.innerHTML='<div class=&quot;feat-ph&quot;>${f.icon}</div>'">`
      : `<div class="feat-ph">${f.icon}</div>`;
    return { catId: cat.id, media, f, minPrice };
  }).filter(Boolean);

  const cards = items.map((it, i) => `<div class="feat-card" onclick="focusFeatured(${i})">
      <div class="feat-media" style="background:${it.f.color}22">${it.media}</div>
      <div class="feat-name">${it.f.label}</div>
      <div class="feat-desc">${it.f.desc}</div>
      <div class="feat-price">Desde ${fmt(it.minPrice)}</div>
      <button class="feat-btn" onclick="event.stopPropagation();filt(${it.catId})">Ver catálogo</button>
    </div>`).join('');
  wrap.innerHTML = cards || '<p style="text-align:center;color:var(--ink-soft)">Cargando productos destacados…</p>';
  featuredIndex = Math.min(featuredIndex, Math.max(items.length - 1, 0));
  updateFeaturedCarousel();
  setupFeaturedSwipe();
}

function updateFeaturedCarousel() {
  const track = document.getElementById('featured-grid');
  const viewport = track && track.parentElement;
  if (!track || !viewport) return;
  const cards = [...track.children];
  if (!cards.length) return;
  featuredIndex = Math.max(0, Math.min(featuredIndex, cards.length - 1));
  cards.forEach((card, i) => {
    const dist = Math.abs(i - featuredIndex);
    card.classList.toggle('is-active', dist === 0);
    card.classList.toggle('is-near', dist === 1);
  });
  const active = cards[featuredIndex];
  const offset = viewport.clientWidth / 2 - (active.offsetLeft + active.offsetWidth / 2);
  track.style.transform = `translateX(${offset}px)`;
}

function moveFeatured(dir) {
  featuredIndex += dir;
  updateFeaturedCarousel();
}

function focusFeatured(i) {
  featuredIndex = i;
  updateFeaturedCarousel();
}

function setupFeaturedSwipe() {
  const viewport = document.querySelector('.featured-viewport');
  if (!viewport || viewport.dataset.swipeBound) return;
  viewport.dataset.swipeBound = '1';
  let startX = 0, dragging = false;
  viewport.addEventListener('pointerdown', e => { dragging = true; startX = e.clientX; });
  viewport.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    const diff = e.clientX - startX;
    if (Math.abs(diff) > 40) moveFeatured(diff < 0 ? 1 : -1);
  });
  viewport.addEventListener('pointercancel', () => { dragging = false; });
  window.addEventListener('resize', () => updateFeaturedCarousel());
}

async function init() {
  try {
    [allCats, allProds, allNiveles] = await Promise.all([
      get('categorias?select=*&order=orden'),
      get('productos?select=*,categorias(nombre,emoji)&order=categoria_id,orden&activo=eq.true'),
      get('precios_niveles?select=*&order=producto_id,cantidad_min')
    ]);
    try {
      allImgs = await get('producto_imagenes?select=*&order=producto_id,orden');
    } catch (e) { allImgs = []; }
    try {
      allCotItems = await get('cotizacion_items?select=*&order=categoria_id,orden');
    } catch (e) { allCotItems = []; }
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
  const cats = allCats.filter(c => usedIds.has(c.id) || esCategoriaCotizacion(c.nombre));
  const chips = document.getElementById('cat-chips');
  chips.innerHTML = `<button class="chip on" data-cat="all" onclick="filt('all',this)"><span class="ci">🏷️</span><span class="cl">Todo</span></button>` +
    cats.map(c => `<button class="chip" data-cat="${c.id}" onclick="filt(${c.id},this)"><span class="ci">${catEmoji(c.emoji||c.nombre)}</span><span class="cl">${c.nombre}</span></button>`).join('');
}

function filt(cat, chipEl) {
  document.querySelectorAll('.chip').forEach(e => e.classList.remove('on'));
  document.querySelectorAll('.hnl').forEach(e => e.classList.remove('on'));
  if (chipEl) {
    chipEl.classList.add('on');
  } else if (!Array.isArray(cat)) {
    const match = document.querySelector(`.chip[data-cat="${cat}"]`);
    if (match) match.classList.add('on');
  }
  renderGrid(cat);
  document.getElementById('prods').scrollIntoView({ behavior: 'smooth' });
}

const GRID_PAGE_SIZE = 30;
let gridState = { cat: null, visible: GRID_PAGE_SIZE };

function renderGrid(cat) {
  if (gridState.cat !== cat) gridState = { cat, visible: GRID_PAGE_SIZE };

  const ids = cat === 'all' ? null : Array.isArray(cat) ? cat : [cat];
  const quoteCats = ids ? ids.map(id => allCats.find(c => c.id === id)).filter(c => c && esCategoriaCotizacion(c.nombre)) : [];
  const quoteHtml = quoteCats.map(quoteChecklistHtml).join('');
  const persCats = ids ? ids.map(id => allCats.find(c => c.id === id)).filter(c => c && esCategoriaPersonalizable(c.nombre)) : [];

  const list = cat === 'all' ? allProds
    : Array.isArray(cat) ? allProds.filter(p => cat.includes(p.categoria_id))
    : allProds.filter(p => p.categoria_id === cat);

  if (!list.length && !quoteHtml) {
    document.getElementById('grid').innerHTML = '<div class="empty">No hay productos en esta categoría todavía.</div>';
    return;
  }

  const persHtml = (persCats.length && list.length) ? `
    <div class="pers-banner">
      🎨 DISEÑA TU PROPIO PRODUCTO EN TIEMPO REAL
      <span>Sube tu diseño y velo al instante antes de pedir</span>
    </div>` : '';

  const visibleList = list.slice(0, gridState.visible);
  const cardsHtml = visibleList.map(p => {
    const c = p.categorias || {};
    const imgTag = p.imagen_url
      ? `<img class="cimg" src="${p.imagen_url}" alt="${p.nombre}${c.nombre ? ' - ' + c.nombre + ' personalizado' : ''} | Happy Prints" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const ph = `<div class="cph" style="${p.imagen_url ? 'display:none' : ''}">${catEmoji(c.emoji||c.nombre)}</div>`;
    return `<div class="card" onclick="openM(${p.id})">
      <div class="cst" style="background:${p.color_marca || '#FF2D78'}"></div>
      <button class="card-heart ${favoritos.includes(p.id) ? 'on' : ''}" data-pid="${p.id}" onclick="event.stopPropagation();toggleFavorito(${p.id})" aria-label="Marcar como favorito">♥</button>
      ${imgTag}${ph}
      <div class="cbody">
        <div class="cname">${p.nombre}</div>
        <div class="cdesc">${(p.descripcion||'').substring(0,58)}${(p.descripcion||'').length>58?'…':''}</div>
        <div class="cprice">${fmt(p.precio_base)}<span class="cpsub">desde · MXN</span></div>
        <button class="cbtn">Ver y calcular precio →</button>
      </div>
    </div>`;
  }).join('');

  const remaining = list.length - visibleList.length;
  const moreHtml = remaining > 0
    ? `<div class="load-more-wrap"><button class="load-more-btn" onclick="loadMoreGrid()">Ver más productos (${remaining})</button></div>`
    : '';

  document.getElementById('grid').innerHTML = persHtml + cardsHtml + moreHtml + quoteHtml;
}

function loadMoreGrid() {
  gridState.visible += GRID_PAGE_SIZE;
  renderGrid(gridState.cat);
}

/* ── Checklist de cotización personalizada (categorías sin costo fijo) ── */
const QUOTE_ICON_IMG = {
  'impresión digital': 'assets/images/impresion-digital-sticker.png'
};

function quoteChecklistHtml(catObj) {
  const items = allCotItems.filter(i => i.categoria_id === catObj.id);
  const opciones = items.length
    ? items.map(i => `
        <label class="qi-item">
          <input type="checkbox" value="${i.nombre.replace(/"/g, '&quot;')}">
          <span>${i.nombre}</span>
        </label>`).join('')
    : '<div class="empty">Muy pronto agregaremos las opciones de esta categoría. Escríbenos directo por WhatsApp.</div>';

  const iconImg = QUOTE_ICON_IMG[(catObj.nombre || '').toLowerCase()];
  const iconHtml = iconImg
    ? `<img class="quote-icon-img" src="${iconImg}" alt="${catObj.nombre}">`
    : `<div class="quote-icon">${catEmoji(catObj.emoji || catObj.nombre)}</div>`;

  return `
    <div class="quote-box" id="quoteBox${catObj.id}">
      ${iconHtml}
      <h3 class="quote-title">${catObj.nombre} — Cotización personalizada</h3>
      <p class="quote-sub">El precio depende del formato, material y cantidad. Marca lo que te interesa y te enviamos una cotización a la medida, sin compromiso.</p>
      <div class="qi-list">${opciones}</div>
      <span class="olbl">Cuéntanos más detalles (opcional)</span>
      <textarea id="qiDetalle${catObj.id}" class="qi-detalle" rows="3" placeholder="Ej. tamaño, material, cantidad aproximada, fecha en que lo necesitas…"></textarea>
      <button class="wabtn" onclick="solicitarCotizacion(${catObj.id}, '${catObj.nombre.replace(/'/g, "\\'")}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.092.537 4.058 1.477 5.769L0 24l6.406-1.469A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.895 0-3.673-.513-5.197-1.407l-.373-.219-3.8.872.908-3.71-.242-.388A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
        Solicitar cotización por WhatsApp
      </button>
    </div>
  `;
}

function solicitarCotizacion(catId, catNombre) {
  const box = document.getElementById('quoteBox' + catId);
  const checks = Array.from(box.querySelectorAll('.qi-item input:checked')).map(i => i.value);
  const detalle = (document.getElementById('qiDetalle' + catId).value || '').trim();
  if (!checks.length && !detalle) {
    alert('Marca al menos una opción o cuéntanos qué necesitas para poder cotizarte 🙂');
    return;
  }
  const listaTxt = checks.length ? checks.map(c => `☑️ ${c}`).join('\n') : '(sin opciones marcadas)';
  const detalleTxt = detalle ? `\n\n📝 *Detalles adicionales:*\n${detalle}` : '';
  const msg = `¡Hola! 👋 Vengo de su catálogo y me gustaría cotizar lo siguiente en *${catNombre}*:\n\n${listaTxt}${detalleTxt}\n\n¿Me podrían compartir precio, tiempos de entrega y qué información necesitan para armar mi cotización? ¡Quedo al pendiente! 😊`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ── Calculadora de precio ── */
function nivelesDe(id) {
  return allNiveles.filter(n => n.producto_id === id);
}

/* Función pura, sin depender del modal abierto — la usan tanto el modal (cur/st)
   como el carrito (una línea por producto agregado). */
function calcLineTotal(p, state, nivs) {
  const q = state.qty;

  if (p.tipo === 'simple') return p.precio_base * q;

  if (p.tipo === 'talla')
    return (state.talla === 'infantil' && p.precio_infantil ? p.precio_infantil : p.precio_base) * q;

  if (p.tipo === 'cantidad') {
    const niv = nivs.find(n => q >= n.cantidad_min && (n.cantidad_max == null || q <= n.cantidad_max))
      || nivs[nivs.length - 1];
    if (!niv) return p.precio_base * q;
    return (state.hojas === 100 && niv.precio_100_hojas ? niv.precio_100_hojas : niv.precio) * q;
  }

  if (p.tipo === 'escalonado') {
    const niv = nivs.find(n => q >= n.cantidad_min && (n.cantidad_max == null || q <= n.cantidad_max))
      || nivs[nivs.length - 1];
    return niv ? niv.precio * q : p.precio_base * q;
  }

  return p.precio_base * q;
}

function calcT() {
  if (!cur) return 0;
  return calcLineTotal(cur, st, nivelesDe(cur.id));
}

function openM(id) {
  cur = allProds.find(p => p.id === id);
  if (!cur) return;
  const tallaInicial = cur.talla_adulto_activo === false && cur.precio_infantil && cur.talla_infantil_activo !== false
    ? 'infantil' : 'adulto';
  st = { qty: 1, talla: tallaInicial, hojas: 50 };
  attachUrl = null; attachTooBig = false; attachName = '';
  hideDesignPreview();
  const c = cur.categorias || {};
  const color = cur.color_marca || '#FF2D78';

  const mimg  = document.getElementById('mimg');
  const mph   = document.getElementById('mph');
  const mzoom = document.getElementById('mzoom');
  resetModalZoom();

  const gallery = allImgs
    .filter(i => i.producto_id === cur.id)
    .sort((a, b) => a.orden - b.orden)
    .map(i => i.url);
  if (!gallery.length && cur.imagen_url) gallery.push(cur.imagen_url);

  if (gallery.length) {
    mimg.src = gallery[0];
    mimg.alt = `${cur.nombre}${c.nombre ? ' - ' + c.nombre + ' personalizado' : ''} | Happy Prints`;
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
  renderThumbs(gallery);

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
  const box = document.getElementById('designBox');
  if (design) box.style.display = 'none';
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
  const box = document.getElementById('designBox');
  if (design) box.style.display = 'block';
}

/* ── Galería de miniaturas (estilo Amazon) ── */
function renderThumbs(gallery) {
  const wrap = document.getElementById('mthumbs');
  if (!wrap) return;
  if (gallery.length < 2) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
  wrap.style.display = 'flex';
  wrap.innerHTML = gallery.map((url, i) => `
    <img src="${url}" class="mthumb ${i === 0 ? 'on' : ''}" alt="Vista ${i + 1} de ${cur.nombre} | Happy Prints" loading="lazy" onclick="selectGalleryImg('${url}', this)">
  `).join('');
}

function selectGalleryImg(url, el) {
  const mimg = document.getElementById('mimg');
  mimg.src = url;
  resetModalZoom();
  document.querySelectorAll('.mthumb').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
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
  const permitePersonalizar = esPersonalizable(p);
  let h = '';

  if (p.tipo === 'talla') {
    const adultoOn   = p.talla_adulto_activo !== false;
    const infantilOn = !!p.precio_infantil && p.talla_infantil_activo !== false;
    h += `<span class="olbl">Talla</span><div class="ogrid">
      ${adultoOn
        ? `<button class="obtn ${st.talla==='adulto'?'on':''}" onclick="pick('talla','adulto')">
            🧑 Adulto<br><small style="font-size:10px;font-weight:600;color:#9090A8">${fmt(p.precio_base)} c/u</small>
           </button>`
        : ''
      }
      ${infantilOn
        ? `<button class="obtn ${st.talla==='infantil'?'on':''}" onclick="pick('talla','infantil')">
            🧒 Infantil<br><small style="font-size:10px;font-weight:600;color:#9090A8">${fmt(p.precio_infantil)} c/u</small>
           </button>`
        : ''
      }
      ${!adultoOn && !infantilOn ? '<div style="grid-column:1/-1;font-size:12px;color:var(--ink-soft)">Sin tallas disponibles por el momento.</div>' : ''}
    </div>`;
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
    <input type="text" inputmode="numeric" pattern="[0-9]*" class="qv" id="qv" value="${st.qty}"
      oninput="this.value=this.value.replace(/[^0-9]/g,'')" onchange="setQty(this.value)" aria-label="Cantidad de piezas">
    <button class="qbtn" onclick="chgQ(1)" aria-label="Sumar">+</button>
    <span style="font-size:12px;color:#9090A8;margin-left:6px">piezas</span>
  </div>

  <span class="olbl">${permitePersonalizar ? '✨ Personaliza tu producto (opcional)' : '📎 Foto de referencia (opcional)'}</span>
  <label class="attach-zone" id="attachZone" for="attachInput">
    <input type="file" id="attachInput" accept="image/*" onchange="handleAttach(event)" style="display:none">
    <span id="attachLabel">${permitePersonalizar
      ? '📎 Toca para subir tu foto o diseño y ver una vista previa (máx. 5 MB)'
      : '📎 Toca para adjuntar una foto o diseño (máx. 5 MB)'}</span>
  </label>
  ${permitePersonalizar ? `
  <div id="designHint" style="display:none;margin-top:8px">
    <div style="font-size:11px;color:var(--ink-soft);text-align:center;margin-bottom:8px">
      Arrastra el diseño para moverlo · esquinas para agrandarlo · ⟳ para girarlo
    </div>
    <div style="display:flex;align-items:center;gap:10px;background:#F5F5F8;border-radius:10px;padding:8px 12px">
      <img id="designThumb" src="" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:8px;flex-shrink:0">
      <button type="button" onclick="document.getElementById('attachInput').click()" style="background:none;border:none;font-size:11px;font-weight:700;color:var(--navy);cursor:pointer;display:flex;align-items:center;gap:4px">🔄 Reemplazar</button>
      <button type="button" onclick="removeDesign()" style="background:none;border:none;font-size:11px;font-weight:700;color:#DC2626;cursor:pointer;display:flex;align-items:center;gap:4px;margin-left:auto">🗑️ Eliminar</button>
    </div>
  </div>` : ''}

  <div class="tbox">
    <div>
      <div class="tlbl">Total estimado</div>
      <div style="font-size:10px;color:rgba(255,255,255,.32);margin-top:2px" id="tqi">${st.qty} pieza(s)</div>
    </div>
    <div class="tamt" id="ta">${fmt(total)}</div>
  </div>

  <button class="cartaddbtn" onclick="agregarAlCarritoDesdeModal()">🛒 Agregar al carrito</button>

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
  document.getElementById('qv').value       = st.qty;
  document.getElementById('ta').textContent  = fmt(calcT());
  document.getElementById('tqi').textContent = st.qty + ' pieza(s)';
}

function setQty(val) {
  let n = parseInt(val, 10);
  if (isNaN(n) || n < 1) n = 1;
  st.qty = n;
  if (cur.tipo === 'escalonado' || cur.tipo === 'cantidad') { renderMB(); return; }
  document.getElementById('qv').value       = st.qty;
  document.getElementById('ta').textContent  = fmt(calcT());
  document.getElementById('tqi').textContent = st.qty + ' pieza(s)';
}

function pick(k, v) { st[k] = v; renderMB(); }

function renderAttachZone(html) {
  const label = document.getElementById('attachLabel');
  if (label) label.innerHTML = html;
}

/* ── Editor de personalización: mover, agrandar y girar el diseño ── */
function esPersonalizable(p) {
  const catNombre = ((p && p.categorias && p.categorias.nombre) || '').toLowerCase();
  return catNombre.includes('playera') || catNombre.includes('sudadera');
}

function esCategoriaPersonalizable(nombre) {
  const n = (nombre || '').toLowerCase();
  return n.includes('playera') || n.includes('sudadera');
}

let design = null; // { x, y, w, h, angle } — x,y = centro en px relativos a #mip

function showDesignPreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const mip = document.getElementById('mip');
      const cw = mip.clientWidth, ch = mip.clientHeight;
      const w = Math.min(cw * 0.42, img.naturalWidth || cw * 0.42);
      const h = w * ((img.naturalHeight || w) / (img.naturalWidth || w));
      design = { x: cw / 2, y: ch / 2, w, h, angle: 0 };
      document.getElementById('mimgOverlay').src = e.target.result;
      renderDesignBox();
      if (!document.getElementById('mimg').classList.contains('zoomed')) {
        document.getElementById('designBox').style.display = 'block';
      }
      const hint = document.getElementById('designHint');
      if (hint) hint.style.display = 'block';
      const thumb = document.getElementById('designThumb');
      if (thumb) thumb.src = e.target.result;
      const zone = document.getElementById('attachZone');
      if (zone) zone.style.display = 'none';
      scheduleCombinedUpdate();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function hideDesignPreview() {
  design = null;
  combinedUrl = null;
  clearTimeout(combinedTimer);
  document.getElementById('designBox').style.display = 'none';
  document.getElementById('mimgOverlay').src = '';
  const hint = document.getElementById('designHint');
  if (hint) hint.style.display = 'none';
}

function removeDesign() {
  hideDesignPreview();
  attachUrl = null; attachTooBig = false; attachName = '';
  document.getElementById('attachInput').value = '';
  renderAttachZone('📎 Toca para subir tu foto o diseño y ver una vista previa (máx. 5 MB)');
  const zone = document.getElementById('attachZone');
  if (zone) zone.style.display = 'flex';
}

function renderDesignBox() {
  if (!design) return;
  const box = document.getElementById('designBox');
  box.style.left      = design.x + 'px';
  box.style.top       = design.y + 'px';
  box.style.width     = design.w + 'px';
  box.style.height    = design.h + 'px';
  box.style.transform = `translate(-50%,-50%) rotate(${design.angle}deg)`;
}

/* ── Generar una sola imagen: producto + diseño en su posición/tamaño/ángulo ── */
let combinedUrl = null;
let combinedTimer = null;

function loadImgEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fitRect(naturalW, naturalH, boxW, boxH) {
  const containerRatio = boxW / boxH, imageRatio = naturalW / naturalH;
  if (imageRatio > containerRatio) {
    const renderedW = boxW, renderedH = boxW / imageRatio;
    return { renderedW, renderedH, offsetX: 0, offsetY: (boxH - renderedH) / 2 };
  }
  const renderedH = boxH, renderedW = boxH * imageRatio;
  return { renderedW, renderedH, offsetX: (boxW - renderedW) / 2, offsetY: 0 };
}

async function generarImagenCombinada() {
  if (!design || !cur) return null;
  const mimg = document.getElementById('mimg');
  const mip  = document.getElementById('mip');
  const overlaySrc = document.getElementById('mimgOverlay').src;
  if (!mimg.src || !overlaySrc) return null;

  try {
    const [baseImg, designImg] = await Promise.all([loadImgEl(mimg.src), loadImgEl(overlaySrc)]);
    const canvas = document.createElement('canvas');
    canvas.width  = baseImg.naturalWidth;
    canvas.height = baseImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

    const { renderedW, offsetX, offsetY } = fitRect(baseImg.naturalWidth, baseImg.naturalHeight, mip.clientWidth, mip.clientHeight);
    const scale = canvas.width / renderedW;
    const cx = (design.x - offsetX) * scale, cy = (design.y - offsetY) * scale;
    const dw = design.w * scale, dh = design.h * scale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(design.angle * Math.PI / 180);
    ctx.drawImage(designImg, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  } catch (err) {
    return null;
  }
}

async function actualizarCombinada() {
  const blob = await generarImagenCombinada();
  if (!blob) { combinedUrl = null; return; }
  try {
    const path = `pedidos/combo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const r = await fetch(`${SB_URL}/storage/v1/object/productos/${path}`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: blob
    });
    if (!r.ok) throw new Error();
    combinedUrl = `${SB_URL}/storage/v1/object/public/productos/${path}`;
  } catch (err) {
    combinedUrl = null;
  }
}

function scheduleCombinedUpdate() {
  clearTimeout(combinedTimer);
  combinedTimer = setTimeout(actualizarCombinada, 350);
}

(function initDesignEditor() {
  const box    = document.getElementById('designBox');
  const rotate = document.getElementById('designRotate');
  const resizeHandles = box.querySelectorAll('.resize-handle');
  let drag = null, rot = null, rsz = null;

  box.addEventListener('pointerdown', e => {
    if (e.target.classList.contains('design-handle') || !design) return;
    drag = { sx: e.clientX, sy: e.clientY, ox: design.x, oy: design.y };
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove', e => {
    if (!drag) return;
    design.x = drag.ox + (e.clientX - drag.sx);
    design.y = drag.oy + (e.clientY - drag.sy);
    renderDesignBox();
  });
  box.addEventListener('pointerup', () => { if (drag) scheduleCombinedUpdate(); drag = null; });

  resizeHandles.forEach(handle => {
    handle.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (!design) return;
      const r = box.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      rsz = { dist0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, w0: design.w, h0: design.h, cx, cy };
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', e => {
      if (!rsz) return;
      const dist  = Math.hypot(e.clientX - rsz.cx, e.clientY - rsz.cy);
      const scale = Math.max(0.3, Math.min(3, dist / rsz.dist0));
      design.w = Math.max(30, rsz.w0 * scale);
      design.h = Math.max(30, rsz.h0 * scale);
      renderDesignBox();
    });
    handle.addEventListener('pointerup', () => { if (rsz) scheduleCombinedUpdate(); rsz = null; });
  });

  rotate.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (!design) return;
    const r = box.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    rot = { startAngle, angle0: design.angle, cx, cy };
    rotate.setPointerCapture(e.pointerId);
  });
  rotate.addEventListener('pointermove', e => {
    if (!rot) return;
    const angle = Math.atan2(e.clientY - rot.cy, e.clientX - rot.cx) * 180 / Math.PI;
    design.angle = rot.angle0 + (angle - rot.startAngle);
    renderDesignBox();
  });
  rotate.addEventListener('pointerup', () => { if (rot) scheduleCombinedUpdate(); rot = null; });
})();

async function handleAttach(e) {
  const file = e.target.files[0];
  if (!file) return;
  attachUrl = null; attachTooBig = false; attachName = file.name;
  if (esPersonalizable(cur)) showDesignPreview(file);

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
  let foto = '';
  if (combinedUrl) foto += `\n🎨 *Vista previa con mi diseño:* ${combinedUrl}`;
  if (attachUrl) {
    foto += `\n📎 *${combinedUrl ? 'Diseño original que subí' : 'Foto de referencia'}:* ${attachUrl}`;
  } else if (attachTooBig) {
    foto += `\n📎 *${combinedUrl ? 'Diseño original' : 'Foto de referencia'}:* les mando el archivo por este mismo chat (pesa más de 5 MB)`;
  }
  const msg = encodeURIComponent(
    `¡Hola! 👋 Vengo de su catálogo y me encantó lo que vi ✨\n\nMe gustaría apartar este pedido:\n\n🛍️ *Producto:* ${cur.nombre}\n🔢 *Cantidad:* ${st.qty} pieza(s)${ex}${foto}\n💰 *Total estimado:* ${fmt(t)} MXN\n\n¿Podrían confirmarme disponibilidad, tiempo de entrega y cómo realizar el pago? ¡Quedo al pendiente! 😊`
  );
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
}

/* ══════════════════════════════════════════════════════════════════════
   CUENTA DE CLIENTE — Mi Perfil / Mis Favoritos / Mi Carrito
   Sesión compartida con /pages/cursos (misma llave de localStorage).
   ══════════════════════════════════════════════════════════════════════ */
const SESSION_KEY = 'hp_cursos_session';
const CART_KEY = 'hp_carrito';
const ENVIO_FIJO = 185;

let session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
let recoverySession = null;
let accionPendiente = null; // 'carrito' | 'perfil' | 'favoritos', para reanudar tras el login
let carrito = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
let favoritos = []; // ids de producto_id que el cliente marcó como favorito
let direcciones = [];
let perfilData = null;
let misPedidos = [];

function fmtMoney(n) { return fmt(n); }

/* ── Helpers autenticados a Supabase (a diferencia de get(), mandan el token del cliente) ── */
async function sbAuthGet(path) {
  const r = await fetch(SB_URL + '/rest/v1/' + path, {
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (session ? session.access_token : SB_KEY) }
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbAuthWrite(method, path, body) {
  const r = await fetch(SB_URL + '/rest/v1/' + path, {
    method,
    headers: {
      apikey: SB_KEY, Authorization: 'Bearer ' + session.access_token,
      'Content-Type': 'application/json', Prefer: 'return=representation'
    },
    body: body != null ? JSON.stringify(body) : undefined
  });
  if (!r.ok) throw new Error(await r.text());
  return r.status === 204 ? null : r.json();
}

function guardarSesion(data) {
  session = data;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function cerrarSesionCuenta() {
  session = null;
  localStorage.removeItem(SESSION_KEY);
  favoritos = []; direcciones = []; perfilData = null; misPedidos = [];
  actualizarBadges();
  ['cartOv', 'perfilOv', 'favOv'].forEach(id => cerrarPanel(id));
}

function guardarCarrito() {
  localStorage.setItem(CART_KEY, JSON.stringify(carrito));
  actualizarBadges();
}
function actualizarBadges() {
  const cb = document.getElementById('cartBadge');
  const fb = document.getElementById('favBadge');
  if (cb) { cb.textContent = carrito.length; cb.style.display = carrito.length ? 'flex' : 'none'; }
  if (fb) { fb.textContent = favoritos.length; fb.style.display = favoritos.length ? 'flex' : 'none'; }
}

/* ── Popup de iniciar sesión / crear cuenta ── */
function mostrarLoginTab(tab) {
  document.getElementById('ltabLogin').classList.toggle('on', tab === 'login');
  document.getElementById('ltabReg').classList.toggle('on', tab === 'registro');
  document.getElementById('lpanelLogin').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('lpanelReg').style.display = tab === 'registro' ? 'block' : 'none';
  document.getElementById('loginPopupSub').textContent = tab === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta para continuar';
}

function abrirLoginPopup(accion) {
  accionPendiente = accion;
  document.getElementById('loginPopupOv').classList.add('open');
}
function cerrarLoginPopup() {
  document.getElementById('loginPopupOv').classList.remove('open');
}

async function doLoginPopup() {
  const email = document.getElementById('lpLoginEmail').value.trim();
  const pass = document.getElementById('lpLoginPass').value;
  const err = document.getElementById('lpLoginErr');
  const btn = document.getElementById('lpLoginBtn');
  err.style.display = 'none';
  if (!email || !pass) { err.textContent = 'Ingresa tu correo y contraseña.'; err.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Entrando…';
  try {
    const r = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = data.error_code === 'email_not_confirmed'
        ? 'Debes confirmar tu correo primero (revisa tu bandeja de entrada).'
        : (data.msg || data.error_description || 'Correo o contraseña incorrectos.');
      throw new Error(msg);
    }
    guardarSesion(data);
    cerrarLoginPopup();
    await ejecutarAccionPendiente();
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Iniciar sesión';
  }
}

async function doRegistroPopup() {
  const nombre = document.getElementById('lpRegNombre').value.trim();
  const email = document.getElementById('lpRegEmail').value.trim();
  const pass = document.getElementById('lpRegPass').value;
  const err = document.getElementById('lpRegErr');
  const ok = document.getElementById('lpRegOk');
  const btn = document.getElementById('lpRegBtn');
  err.style.display = 'none'; ok.style.display = 'none';
  if (!nombre || !email || !pass) { err.textContent = 'Completa nombre, correo y contraseña.'; err.style.display = 'block'; return; }
  if (pass.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; err.style.display = 'block'; return; }

  btn.disabled = true; btn.textContent = 'Creando cuenta…';
  try {
    const r = await fetch(SB_URL + '/auth/v1/signup', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, data: { nombre } })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.msg || data.error_description || data.error || 'No se pudo crear la cuenta.');

    if (data.access_token) {
      guardarSesion(data);
      cerrarLoginPopup();
      await ejecutarAccionPendiente();
    } else {
      ok.textContent = 'Cuenta creada ✔ Revisa tu correo para confirmarla y luego inicia sesión.';
      ok.style.display = 'block';
      document.getElementById('lpRegPass').value = '';
      mostrarLoginTab('login');
      document.getElementById('lpLoginEmail').value = email;
    }
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Crear cuenta';
  }
}

async function forgotPasswordPopup() {
  const email = document.getElementById('lpLoginEmail').value.trim();
  const err = document.getElementById('lpLoginErr');
  if (!email) { err.textContent = 'Escribe tu correo arriba primero.'; err.style.display = 'block'; return; }
  try {
    const r = await fetch(SB_URL + '/auth/v1/recover', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, options: { redirect_to: location.origin + '/' } })
    });
    if (!r.ok) throw new Error((await r.json()).msg || 'No se pudo enviar el correo.');
    err.style.display = 'none';
    alert('Te enviamos un correo con un enlace para elegir una nueva contraseña ✔');
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  }
}

/* ── Enlace de recuperación de contraseña (vuelve del correo) ── */
function checkRecoveryLink() {
  const hash = location.hash;
  if (!hash) return false;
  const params = new URLSearchParams(hash.slice(1));

  if (params.get('error_code') === 'otp_expired') {
    history.replaceState(null, '', location.pathname);
    alert('Ese enlace ya venció. Pide uno nuevo con "¿Olvidaste tu contraseña?" y ábrelo apenas te llegue.');
    return false;
  }
  const access_token = params.get('access_token');
  if (params.get('type') !== 'recovery' || !access_token) return false;

  recoverySession = { access_token };
  document.getElementById('resetPopupOv').classList.add('open');
  return true;
}

async function confirmarResetPopup() {
  const nueva = document.getElementById('resetPopupPass').value;
  const err = document.getElementById('resetPopupErr');
  err.style.display = 'none';
  if (!nueva || nueva.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; err.style.display = 'block'; return; }
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + recoverySession.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: nueva })
    });
    if (!r.ok) throw new Error((await r.json()).msg || 'No se pudo actualizar la contraseña.');
    guardarSesion(recoverySession);
    history.replaceState(null, '', location.pathname);
    document.getElementById('resetPopupOv').classList.remove('open');
    alert('Contraseña actualizada, ¡bienvenida! 👋');
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  }
}

async function ejecutarAccionPendiente() {
  const accion = accionPendiente;
  accionPendiente = null;
  if (accion === 'carrito') await abrirCarrito();
  else if (accion === 'perfil') await abrirPerfil();
  else if (accion === 'favoritos') await abrirFavoritos();
}

/* ── Abrir / cerrar paneles ── */
function cerrarPanel(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
function abrirPanelOv(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

async function abrirCarrito() {
  if (!session) { abrirLoginPopup('carrito'); return; }
  abrirPanelOv('cartOv');
  renderCarritoPanel();
  try {
    if (!perfilData) await cargarPerfil();
    if (!direcciones.length) await cargarDirecciones();
    renderCarritoPanel();
  } catch (e) { /* el checkout sigue usable, solo no viene prellenado */ }
}

async function abrirPerfil() {
  if (!session) { abrirLoginPopup('perfil'); return; }
  document.getElementById('perfilBody').innerHTML = '<div class="cart-empty-hint">Cargando…</div>';
  abrirPanelOv('perfilOv');
  try {
    await Promise.all([cargarPerfil(), cargarDirecciones(), cargarMisPedidos()]);
    renderPerfilPanel();
  } catch (e) {
    document.getElementById('perfilBody').innerHTML = '<div class="cart-empty-hint">No se pudo cargar tu perfil. Intenta de nuevo más tarde.</div>';
  }
}

async function abrirFavoritos() {
  if (!session) { abrirLoginPopup('favoritos'); return; }
  document.getElementById('favBody').innerHTML = '<div class="cart-empty-hint">Cargando…</div>';
  abrirPanelOv('favOv');
  try {
    await cargarFavoritosCompletos();
    renderFavoritosPanel();
  } catch (e) {
    document.getElementById('favBody').innerHTML = '<div class="cart-empty-hint">No se pudieron cargar tus favoritos.</div>';
  }
}

/* ══════════════════════════════════════════════════════════════════════
   MI CARRITO
   ══════════════════════════════════════════════════════════════════════ */
const CHEVRON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

function varianteTexto(p, state) {
  if (!p) return '';
  if (p.tipo === 'talla') return 'Talla: ' + (state.talla === 'infantil' ? 'Infantil' : 'Adulto');
  if (p.tipo === 'cantidad') return state.hojas + ' hojas';
  return '';
}

function agregarAlCarritoDesdeModal() {
  if (!session) { abrirLoginPopup('carrito'); return; }
  carrito.push({
    producto_id: cur.id, nombre: cur.nombre, tipo: cur.tipo, imagen_url: cur.imagen_url || '',
    qty: st.qty, talla: st.talla, hojas: st.hojas, attachUrl: attachUrl, combinedUrl: combinedUrl
  });
  guardarCarrito();
  const btn = document.querySelector('.cartaddbtn');
  if (btn) {
    const original = btn.textContent;
    btn.textContent = '✔ Agregado al carrito';
    setTimeout(() => { if (btn.isConnected) btn.textContent = original; }, 1400);
  }
}

function cambiarCantidadCarrito(idx, delta) {
  carrito[idx].qty = Math.max(1, carrito[idx].qty + delta);
  guardarCarrito();
  renderCarritoPanel();
}
function quitarDelCarrito(idx) {
  carrito.splice(idx, 1);
  guardarCarrito();
  renderCarritoPanel();
}
function toggleAccordionCarrito(id) {
  document.getElementById(id).classList.toggle('open');
}

function aplicarDireccionSeleccionada(val) {
  const campos = ['ckCalle', 'ckNumero', 'ckColonia', 'ckCp', 'ckCiudad', 'ckEntreCalles'];
  if (val === 'nueva') { campos.forEach(id => document.getElementById(id).value = ''); return; }
  const d = direcciones.find(x => String(x.id) === String(val));
  if (!d) return;
  document.getElementById('ckCalle').value = d.calle;
  document.getElementById('ckNumero').value = d.numero;
  document.getElementById('ckColonia').value = d.colonia;
  document.getElementById('ckCp').value = d.cp;
  document.getElementById('ckCiudad').value = d.ciudad;
  document.getElementById('ckEntreCalles').value = d.entre_calles || '';
}

function direccionCheckoutHtml() {
  const d = direcciones.find(x => x.predeterminada) || direcciones[0] || {};
  const selector = direcciones.length > 1 ? `<div class="cart-field"><label>Dirección guardada</label>
      <select id="ckDireccionSel" onchange="aplicarDireccionSeleccionada(this.value)">
        ${direcciones.map(x => `<option value="${x.id}" ${x.predeterminada ? 'selected' : ''}>${escapeHtmlMain(x.etiqueta)} — ${escapeHtmlMain(x.calle)} ${escapeHtmlMain(x.numero)}</option>`).join('')}
        <option value="nueva">+ Nueva dirección</option>
      </select>
    </div>` : '';
  return `
    ${selector}
    <div class="cart-form-row">
      <div class="cart-field"><label>Calle *</label><input type="text" id="ckCalle" autocomplete="address-line1" value="${escapeHtmlMain(d.calle || '')}"></div>
      <div class="cart-field"><label>Número *</label><input type="text" id="ckNumero" autocomplete="off" value="${escapeHtmlMain(d.numero || '')}"></div>
    </div>
    <div class="cart-form-row">
      <div class="cart-field"><label>Colonia *</label><input type="text" id="ckColonia" autocomplete="address-line2" value="${escapeHtmlMain(d.colonia || '')}"></div>
      <div class="cart-field"><label>C.P. *</label><input type="text" inputmode="numeric" id="ckCp" autocomplete="postal-code" value="${escapeHtmlMain(d.cp || '')}"></div>
    </div>
    <div class="cart-form-row">
      <div class="cart-field"><label>Ciudad *</label><input type="text" id="ckCiudad" autocomplete="address-level2" value="${escapeHtmlMain(d.ciudad || '')}"></div>
      <div class="cart-field"><label>Entre calles (opcional)</label><input type="text" id="ckEntreCalles" autocomplete="off" value="${escapeHtmlMain(d.entre_calles || '')}"></div>
    </div>
    <div class="cart-field" style="margin-bottom:0"><label>Notas (opcional)</label><textarea id="ckNotas"></textarea></div>`;
}

function escapeHtmlMain(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function renderCarritoPanel() {
  const body = document.getElementById('cartBody');
  if (!carrito.length) {
    body.innerHTML = '<div class="cart-empty-hint">Tu carrito está vacío todavía.<br>Ve al catálogo y agrega tus productos favoritos 🛍️</div>';
    return;
  }

  let subtotal = 0;
  const lineasHtml = carrito.map((linea, idx) => {
    const p = allProds.find(pr => pr.id === linea.producto_id);
    const state = { qty: linea.qty, talla: linea.talla, hojas: linea.hojas };
    const total = p ? calcLineTotal(p, state, nivelesDe(linea.producto_id)) : 0;
    subtotal += total;
    const variante = varianteTexto(p, state);
    const img = linea.combinedUrl || linea.imagen_url;
    return `
      <div class="cart-line">
        ${img ? `<img class="cart-thumb" src="${img}" alt="">` : `<div class="cart-thumb" style="display:flex;align-items:center;justify-content:center;font-size:20px">📦</div>`}
        <div class="cart-line-info">
          <div class="cart-line-name">${escapeHtmlMain(linea.nombre)}</div>
          ${variante ? `<div class="cart-line-variant">${variante}</div>` : ''}
          ${linea.combinedUrl ? `<div class="cart-line-tag">🎨 Con tu diseño</div>` : ''}
          <div class="cart-line-bottom">
            <div class="qty-stepper">
              <button class="qty-btn" onclick="cambiarCantidadCarrito(${idx},-1)">−</button>
              <span class="qty-val">${linea.qty}</span>
              <button class="qty-btn" onclick="cambiarCantidadCarrito(${idx},1)">+</button>
            </div>
            <div class="cart-line-price">${fmtMoney(total)}</div>
          </div>
        </div>
        <button class="cart-line-remove" onclick="quitarDelCarrito(${idx})" aria-label="Quitar">✕</button>
      </div>`;
  }).join('');

  const total = subtotal + ENVIO_FIJO;
  const correoActual = (session.user && session.user.email) || '';
  const nombreActual = (perfilData && perfilData.nombre) || (session.user && session.user.user_metadata && session.user.user_metadata.nombre) || '';

  body.innerHTML = `
    ${lineasHtml}
    <div class="cart-summary">
      <div class="cart-summary-row"><span>Subtotal</span><span>${fmtMoney(subtotal)}</span></div>
      <div class="cart-summary-row envio"><span>Gastos de envío<span class="lock-tag">🔒 fijo</span></span><span>${fmtMoney(ENVIO_FIJO)}</span></div>
    </div>
    <div class="cart-total">
      <div class="cart-total-lbl">TOTAL</div>
      <div class="cart-total-amt">${fmtMoney(total)}</div>
    </div>

    <div class="accordion open" id="accDatos">
      <button type="button" class="accordion-head" onclick="toggleAccordionCarrito('accDatos')">
        <span class="accordion-head-lbl">🙋 Tus datos</span>
        <span class="accordion-chevron">${CHEVRON_SVG}</span>
      </button>
      <div class="accordion-body"><div class="accordion-body-inner">
        <div class="cart-form-row">
          <div class="cart-field"><label>Nombre completo *</label><input type="text" id="ckNombre" autocomplete="name" value="${escapeHtmlMain(nombreActual)}"></div>
          <div class="cart-field"><label>Teléfono *</label><input type="tel" inputmode="tel" id="ckTelefono" autocomplete="tel" value="${escapeHtmlMain((perfilData && perfilData.telefono) || '')}"></div>
        </div>
        <div class="cart-field" style="margin-bottom:0"><label>Correo *</label><input type="email" id="ckCorreo" autocomplete="email" value="${escapeHtmlMain(correoActual)}"></div>
      </div></div>
    </div>

    <div class="accordion" id="accDireccion">
      <button type="button" class="accordion-head" onclick="toggleAccordionCarrito('accDireccion')">
        <span class="accordion-head-lbl">📦 Dirección de entrega</span>
        <span class="accordion-chevron">${CHEVRON_SVG}</span>
      </button>
      <div class="accordion-body"><div class="accordion-body-inner">${direccionCheckoutHtml()}</div></div>
    </div>

    <button class="pay-btn" id="payBtn" onclick="pagarConMercadoPago()">💳 Pagar con Mercado Pago — ${fmtMoney(total)}</button>
    <div class="pay-note">Se abrirá la página segura de Mercado Pago para completar tu pago (tarjeta u OXXO).</div>`;
}

async function pagarConMercadoPago() {
  const nombre = document.getElementById('ckNombre').value.trim();
  const telefono = document.getElementById('ckTelefono').value.trim();
  const correo = document.getElementById('ckCorreo').value.trim();
  const calle = document.getElementById('ckCalle').value.trim();
  const numero = document.getElementById('ckNumero').value.trim();
  const colonia = document.getElementById('ckColonia').value.trim();
  const cp = document.getElementById('ckCp').value.trim();
  const ciudad = document.getElementById('ckCiudad').value.trim();
  const entre_calles = document.getElementById('ckEntreCalles').value.trim();
  const notas = document.getElementById('ckNotas').value.trim();

  if (!nombre || !telefono || !correo) { alert('Completa tu nombre, teléfono y correo — son obligatorios.'); return; }
  if (!calle || !numero || !colonia || !cp || !ciudad) { alert('Completa tu dirección de entrega — son obligatorios.'); return; }
  if (!carrito.length) { alert('Tu carrito está vacío.'); return; }

  const btn = document.getElementById('payBtn');
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = 'Preparando pago…';

  try {
    const items = carrito.map(l => ({
      producto_id: l.producto_id, cantidad: l.qty, talla: l.talla, hojas: l.hojas,
      attach_url: l.attachUrl || null, combined_url: l.combinedUrl || null
    }));
    const r = await fetch('/api/mp-crear-preferencia-pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify({ items, cliente: { nombre, telefono, correo, calle, numero, colonia, cp, ciudad, entre_calles, notas } })
    });
    const data = await r.json();
    if (!r.ok || !data.init_point) throw new Error(data.error || 'No se pudo iniciar el pago.');
    location.href = data.init_point;
  } catch (e) {
    alert('Error: ' + e.message);
    btn.disabled = false;
    btn.textContent = original;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   MIS FAVORITOS
   ══════════════════════════════════════════════════════════════════════ */
async function cargarFavoritosIds() {
  try {
    const rows = await sbAuthGet(`favoritos?select=producto_id&user_id=eq.${session.user.id}`);
    favoritos = rows.map(r => r.producto_id);
  } catch (e) { favoritos = []; }
  actualizarBadges();
  actualizarCorazonesTarjetas();
}
async function cargarFavoritosCompletos() {
  await cargarFavoritosIds();
}

function actualizarCorazonesTarjetas() {
  document.querySelectorAll('.card-heart').forEach(el => {
    el.classList.toggle('on', favoritos.includes(Number(el.dataset.pid)));
  });
}

async function toggleFavorito(pid) {
  if (!session) { abrirLoginPopup('favoritos'); return; }
  const idx = favoritos.indexOf(pid);
  try {
    if (idx === -1) {
      await sbAuthWrite('POST', 'favoritos', { user_id: session.user.id, producto_id: pid });
      favoritos.push(pid);
    } else {
      await sbAuthWrite('DELETE', `favoritos?user_id=eq.${session.user.id}&producto_id=eq.${pid}`, null);
      favoritos.splice(idx, 1);
    }
  } catch (e) { return; }
  actualizarBadges();
  actualizarCorazonesTarjetas();
  if (document.getElementById('favOv').classList.contains('open')) renderFavoritosPanel();
}

function agregarFavoritoAlCarrito(pid) {
  const p = allProds.find(pr => pr.id === pid);
  if (!p) return;
  const tallaInicial = p.talla_adulto_activo === false && p.precio_infantil && p.talla_infantil_activo !== false ? 'infantil' : 'adulto';
  carrito.push({ producto_id: p.id, nombre: p.nombre, tipo: p.tipo, imagen_url: p.imagen_url || '', qty: 1, talla: tallaInicial, hojas: 50, attachUrl: null, combinedUrl: null });
  guardarCarrito();
  alert(`Se agregó "${p.nombre}" a tu carrito ✓`);
}

function renderFavoritosPanel() {
  const body = document.getElementById('favBody');
  if (!favoritos.length) {
    body.innerHTML = '<div class="cart-empty-hint">Todavía no tienes favoritos.<br>Da clic en el corazón de cualquier producto del catálogo para guardarlo aquí ♥</div>';
    return;
  }
  const rowsHtml = favoritos.map(pid => {
    const p = allProds.find(pr => pr.id === pid);
    if (!p) return '';
    return `
      <div class="fav-row">
        <div class="fav-thumb-wrap">
          ${p.imagen_url ? `<img class="fav-thumb" src="${p.imagen_url}" alt="">` : `<div class="fav-thumb" style="display:flex;align-items:center;justify-content:center;font-size:20px">📦</div>`}
          <button class="fav-heart" onclick="toggleFavorito(${p.id})" title="Quitar de favoritos">♥</button>
        </div>
        <div class="fav-info">
          <div class="fav-name">${escapeHtmlMain(p.nombre)}</div>
          <div class="fav-price">${p.tipo === 'simple' ? '' : 'Desde '}${fmtMoney(p.precio_base)}</div>
        </div>
        <button class="fav-add-btn" onclick="agregarFavoritoAlCarrito(${p.id})">🛒 Agregar</button>
      </div>`;
  }).join('');
  body.innerHTML = rowsHtml || '<div class="cart-empty-hint">Todavía no tienes favoritos.</div>';
}

/* ══════════════════════════════════════════════════════════════════════
   MI PERFIL — datos personales, direcciones, historial de pedidos
   ══════════════════════════════════════════════════════════════════════ */
async function cargarPerfil() {
  try {
    const rows = await sbAuthGet(`perfiles?select=*&id=eq.${session.user.id}`);
    if (rows.length) {
      perfilData = rows[0];
    } else {
      const nombreInicial = (session.user.user_metadata && session.user.user_metadata.nombre) || '';
      const [creado] = await sbAuthWrite('POST', 'perfiles', { id: session.user.id, nombre: nombreInicial });
      perfilData = creado;
    }
  } catch (e) {
    perfilData = perfilData || { nombre: '', telefono: '' };
  }
}
async function cargarDirecciones() {
  try {
    direcciones = await sbAuthGet(`direcciones?select=*&user_id=eq.${session.user.id}&order=predeterminada.desc,creado_en.desc`);
  } catch (e) { direcciones = []; }
}
async function cargarMisPedidos() {
  try {
    misPedidos = await sbAuthGet(`pedidos?select=*,pedido_items(*)&user_id=eq.${session.user.id}&order=creado_en.desc`);
  } catch (e) { misPedidos = []; }
}

async function guardarDatosPersonales() {
  const nombre = document.getElementById('pfNombre').value.trim();
  const telefono = document.getElementById('pfTelefono').value.trim();
  try {
    await sbAuthWrite('PATCH', `perfiles?id=eq.${session.user.id}`, { nombre, telefono });
    perfilData.nombre = nombre; perfilData.telefono = telefono;
    alert('Datos actualizados ✔');
  } catch (e) { alert('Error: ' + e.message); }
}

async function cambiarContrasenaCuenta() {
  const nueva = prompt('Escribe tu nueva contraseña (mínimo 6 caracteres):');
  if (!nueva) return;
  if (nueva.length < 6) { alert('La contraseña debe tener al menos 6 caracteres.'); return; }
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: nueva })
    });
    if (!r.ok) throw new Error((await r.json()).msg || 'No se pudo actualizar.');
    alert('Contraseña actualizada ✔');
  } catch (e) { alert('Error: ' + e.message); }
}

async function agregarDireccion() {
  const etiqueta = prompt('¿Cómo quieres llamar a esta dirección? (ej. Casa, Oficina)', 'Casa');
  if (!etiqueta) return;
  const calle = prompt('Calle:'); if (!calle) return;
  const numero = prompt('Número:'); if (!numero) return;
  const colonia = prompt('Colonia:'); if (!colonia) return;
  const cp = prompt('Código postal:'); if (!cp) return;
  const ciudad = prompt('Ciudad:'); if (!ciudad) return;
  const entre_calles = prompt('Entre calles (opcional):') || null;
  try {
    const esPrimera = direcciones.length === 0;
    await sbAuthWrite('POST', 'direcciones', { user_id: session.user.id, etiqueta, calle, numero, colonia, cp, ciudad, entre_calles, predeterminada: esPrimera });
    await cargarDirecciones();
    renderPerfilPanel();
  } catch (e) { alert('Error: ' + e.message); }
}

async function editarDireccion(id) {
  const d = direcciones.find(x => x.id === id);
  if (!d) return;
  const etiqueta = prompt('Etiqueta:', d.etiqueta); if (!etiqueta) return;
  const calle = prompt('Calle:', d.calle); if (!calle) return;
  const numero = prompt('Número:', d.numero); if (!numero) return;
  const colonia = prompt('Colonia:', d.colonia); if (!colonia) return;
  const cp = prompt('Código postal:', d.cp); if (!cp) return;
  const ciudad = prompt('Ciudad:', d.ciudad); if (!ciudad) return;
  const entre_calles = prompt('Entre calles (opcional):', d.entre_calles || '') || null;
  try {
    await sbAuthWrite('PATCH', `direcciones?id=eq.${id}`, { etiqueta, calle, numero, colonia, cp, ciudad, entre_calles });
    await cargarDirecciones();
    renderPerfilPanel();
  } catch (e) { alert('Error: ' + e.message); }
}

async function eliminarDireccion(id) {
  if (!confirm('¿Eliminar esta dirección?')) return;
  try {
    await sbAuthWrite('DELETE', `direcciones?id=eq.${id}`, null);
    await cargarDirecciones();
    renderPerfilPanel();
  } catch (e) { alert('Error: ' + e.message); }
}

async function marcarDireccionPredeterminada(id) {
  try {
    await sbAuthWrite('PATCH', `direcciones?user_id=eq.${session.user.id}`, { predeterminada: false });
    await sbAuthWrite('PATCH', `direcciones?id=eq.${id}`, { predeterminada: true });
    await cargarDirecciones();
    renderPerfilPanel();
  } catch (e) { alert('Error: ' + e.message); }
}

const ESTATUS_ENVIO_INFO = {
  confirmado:  ['status-confirmado', '💳 Pago confirmado'],
  preparacion: ['status-preparacion', '🎨 En preparación'],
  transito:    ['status-transito', '🚚 En tránsito'],
  entregado:   ['status-entregado', '✅ Entregado'],
  cancelado:   ['status-cancelado', '✕ Cancelado']
};

function renderPerfilPanel() {
  const body = document.getElementById('perfilBody');
  const nombre = (perfilData && perfilData.nombre) || '';
  const telefono = (perfilData && perfilData.telefono) || '';
  const correo = (session.user && session.user.email) || '';

  const direccionesHtml = direcciones.length ? direcciones.map(d => `
    <div class="addr-card">
      <div class="addr-card-top">
        <span class="addr-label">${escapeHtmlMain(d.etiqueta)}</span>
        ${d.predeterminada ? '<span class="addr-default-tag">Predeterminada</span>' : ''}
      </div>
      <div class="addr-text">${escapeHtmlMain(d.calle)} ${escapeHtmlMain(d.numero)}, ${escapeHtmlMain(d.colonia)}, ${escapeHtmlMain(d.ciudad)}, ${escapeHtmlMain(d.cp)}</div>
      <div class="addr-actions">
        <button class="edit" onclick="editarDireccion(${d.id})">✏️ Editar</button>
        <button class="del" onclick="eliminarDireccion(${d.id})">🗑 Eliminar</button>
        ${!d.predeterminada ? `<button class="set-default" onclick="marcarDireccionPredeterminada(${d.id})">Usar como predeterminada</button>` : ''}
      </div>
    </div>`).join('') : '<div class="cart-empty-hint">Todavía no tienes direcciones guardadas.</div>';

  const pedidosHtml = misPedidos.length ? misPedidos.map(ped => {
    const items = (ped.pedido_items || []).map(it => `${it.producto_nombre} x${it.cantidad}`).join(', ');
    const [cls, lbl] = ESTATUS_ENVIO_INFO[ped.estatus_envio] || ESTATUS_ENVIO_INFO.confirmado;
    const fecha = new Date(ped.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    return `
      <div class="order-row">
        <div class="order-row-top"><span class="order-num">Pedido #${ped.id}</span><span class="order-date">${fecha}</span></div>
        <div class="order-items">${escapeHtmlMain(items)}</div>
        <div class="order-row-bottom"><span class="order-total">${fmtMoney(ped.total)}</span><span class="status-badge ${cls}">${lbl}</span></div>
      </div>`;
  }).join('') : '<div class="cart-empty-hint">Todavía no tienes pedidos.</div>';

  body.innerHTML = `
    <div class="profile-block-head"><div class="profile-block-title">🙋 Datos personales</div></div>
    <div class="cart-form-row">
      <div class="cart-field"><label>Nombre completo</label><input type="text" id="pfNombre" autocomplete="name" value="${escapeHtmlMain(nombre)}"></div>
      <div class="cart-field"><label>Teléfono</label><input type="tel" inputmode="tel" id="pfTelefono" autocomplete="tel" value="${escapeHtmlMain(telefono)}"></div>
    </div>
    <div class="cart-field"><label>Correo</label><input value="${escapeHtmlMain(correo)}" disabled style="opacity:.6"></div>
    <button class="login-popup-btn" style="margin-bottom:10px" onclick="guardarDatosPersonales()">Guardar datos</button>
    <div class="pass-change">
      <span>🔒 Contraseña</span>
      <button class="profile-link-btn" onclick="cambiarContrasenaCuenta()">Cambiar contraseña</button>
    </div>

    <div class="profile-block-head"><div class="profile-block-title">📍 Mis direcciones</div></div>
    ${direccionesHtml}
    <button class="add-addr-btn" onclick="agregarDireccion()">➕ Agregar nueva dirección</button>

    <div class="profile-block-head"><div class="profile-block-title">📦 Mis pedidos</div></div>
    ${pedidosHtml}

    <button class="logout-btn-profile" onclick="cerrarSesionCuenta()">Cerrar sesión</button>`;
}

document.getElementById('ov').addEventListener('click', e => {
  if (e.target === document.getElementById('ov')) closeM();
});
['cartOv', 'perfilOv', 'favOv'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target.id === id) cerrarPanel(id);
  });
});
document.getElementById('loginPopupOv').addEventListener('click', e => {
  if (e.target.id === 'loginPopupOv') cerrarLoginPopup();
});

/* ══════════════════════════════════════════════════════════════════════
   Pantalla de retorno de Mercado Pago (?pedido=approved|pending|failure)
   ══════════════════════════════════════════════════════════════════════ */
function mostrarThanksSiAplica() {
  const params = new URLSearchParams(location.search);
  const estado = params.get('pedido');
  if (!estado) return;
  history.replaceState(null, '', location.pathname);
  const wrap = document.getElementById('thanksWrap');

  if (estado === 'approved') {
    carrito = [];
    guardarCarrito();
    wrap.innerHTML = `
      <div class="thanks-card">
        <div class="thanks-icon ok">✅</div>
        <div class="thanks-title">¡Gracias por tu compra!</div>
        <div class="thanks-sub">Tu pago fue confirmado y ya empezamos a preparar tu pedido. Te avisaremos por correo cuando cambie de estatus.</div>
        <div class="tracker">
          <div class="tracker-step done"><div class="tracker-line"></div><div class="tracker-dot">✓</div><div class="tracker-lbl">Pago<br>confirmado</div></div>
          <div class="tracker-step"><div class="tracker-line"></div><div class="tracker-dot">2</div><div class="tracker-lbl">En<br>preparación</div></div>
          <div class="tracker-step"><div class="tracker-line"></div><div class="tracker-dot">3</div><div class="tracker-lbl">En<br>tránsito</div></div>
          <div class="tracker-step"><div class="tracker-line"></div><div class="tracker-dot">4</div><div class="tracker-lbl">Entregado</div></div>
        </div>
        <button class="thanks-btn" onclick="document.getElementById('thanksWrap').style.display='none';abrirPerfil()">📦 Ver mis pedidos</button>
      </div>`;
  } else if (estado === 'pending') {
    wrap.innerHTML = `
      <div class="thanks-card">
        <div class="thanks-icon wait">⏳</div>
        <div class="thanks-title">Tu pago está en proceso</div>
        <div class="thanks-sub">Si elegiste pagar en OXXO, en cuanto se confirme el depósito activamos tu pedido y te avisamos por correo.</div>
        <button class="thanks-btn" onclick="document.getElementById('thanksWrap').style.display='none';abrirPerfil()">📦 Ver estatus de mi pedido</button>
      </div>`;
  } else if (estado === 'failure') {
    wrap.innerHTML = `
      <div class="thanks-card">
        <div class="thanks-icon fail">❌</div>
        <div class="thanks-title">No se pudo completar el pago</div>
        <div class="thanks-sub">Tu carrito sigue intacto — puedes intentarlo de nuevo con otra tarjeta o método de pago cuando quieras.</div>
        <button class="thanks-btn" onclick="document.getElementById('thanksWrap').style.display='none';abrirCarrito()">🛒 Volver a mi carrito</button>
      </div>`;
  } else {
    return;
  }
  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function initCuenta() {
  if (checkRecoveryLink()) return;
  mostrarThanksSiAplica();
  actualizarBadges();
  if (session) {
    try { await cargarFavoritosIds(); } catch (e) {}
  }
}

init();
initCuenta();
