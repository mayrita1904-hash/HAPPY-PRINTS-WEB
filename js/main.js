const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p3cmFwaXF2eXhkbGlqZG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA1NzgsImV4cCI6MjA5ODUwNjU3OH0._3r9pDu7Vg09o_5MZt3tcu7i2CZoWk3xKtbOMWcY_wM';
const HDR = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };
const WA_NUMBER = '5217224616543';

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
  { title: 'Offset y Serigrafía', sub: '', icon: '🖨️', img: 'assets/images/offset-serigrafia.png', color: '#7C3AED', kw: ['offset','serigraf'] },
  { title: 'Invitaciones y Papelería Social', sub: '', icon: '💌', img: 'assets/images/invitaciones-papeleria-social.png', color: '#1FB6AE', kw: ['invitac','papeler'] },
  { title: 'Grabado y Corte Láser', sub: '', icon: '✂️', img: 'assets/images/grabado-corte-laser.png', color: '#F5A623', kw: ['grabado','laser','corte'] },
  { title: 'Sublimación, DTF y Vinil', sub: '', icon: '👕', img: 'assets/images/sublimacion-dtf-vinil.png', color: '#FF2D78', showAll: true },
  { title: 'Libretas, Agendas y Planners', sub: '', icon: '📓', img: 'assets/images/libretas-agendas-planners.png', color: '#F6C55B', kw: ['libreta','agenda','planner'] },
  { title: 'Impresión Digital y Publicidad', sub: '', icon: '🖼️', img: 'assets/images/impresion-digital-publicidad.png', color: '#E91E8C', kw: ['impresion','digital','publicidad'] },
  { title: 'Sellos, Etiquetas y Credenciales', sub: '', icon: '🏷️', img: 'assets/images/sellos-etiquetas-credenciales.png', color: '#B4C430', kw: ['sello','etiqueta','credencial'] },
  { title: 'Contenido Digital', sub: '', icon: '🎨', img: 'assets/images/diseno-grafico-contenido-digital.png', color: '#1FADA0', kw: ['contenido digital', 'contenido'] }
];

const FEATURED = [
  { key: 'tazas', label: 'Tazas', icon: '☕', color: '#1FB6AE' },
  { key: 'playeras', label: 'Playeras', icon: '👕', color: '#FF2D78' },
  { key: 'libretas', label: 'Libretas', icon: '📓', color: '#7C3AED' },
  { key: 'stickers', label: 'Stickers', icon: '⭐', color: '#F5A623' }
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
    const arg = t.showAll ? `'all'` : (() => { const ids = matchCatIds(t.kw); return ids.length ? JSON.stringify(ids) : `'all'`; })();
    const fitClass = t.imgFit === 'cover' ? ' cover' : '';
    const media = t.img
      ? `<img class="cat-tile-img${fitClass}" src="${t.img}" alt="${t.title} - Happy Prints" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'cat-tile-icon',textContent:'${t.icon}'}))">`
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
      ? `<img src="${withImg.imagen_url}" alt="${f.label} personalizados - Happy Prints" loading="lazy" onerror="this.parentElement.innerHTML='<div class=&quot;feat-ph&quot;>${f.icon}</div>'">`
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

function renderGrid(cat) {
  const singleId = Array.isArray(cat) ? (cat.length === 1 ? cat[0] : null) : (cat === 'all' ? null : cat);
  if (singleId != null) {
    const catObj = allCats.find(c => c.id === singleId);
    if (catObj && esCategoriaCotizacion(catObj.nombre)) { renderQuoteChecklist(catObj); return; }
  }

  const list = cat === 'all' ? allProds
    : Array.isArray(cat) ? allProds.filter(p => cat.includes(p.categoria_id))
    : allProds.filter(p => p.categoria_id === cat);
  if (!list.length) {
    document.getElementById('grid').innerHTML = '<div class="empty">No hay productos en esta categoría todavía.</div>';
    return;
  }
  document.getElementById('grid').innerHTML = list.map(p => {
    const c = p.categorias || {};
    const imgTag = p.imagen_url
      ? `<img class="cimg" src="${p.imagen_url}" alt="${p.nombre}${c.nombre ? ' - ' + c.nombre + ' personalizado' : ''} | Happy Prints" loading="lazy"
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

/* ── Checklist de cotización personalizada (categorías sin costo fijo) ── */
const QUOTE_ICON_IMG = {
  'impresión digital': 'assets/images/impresion-digital-sticker.png'
};

function renderQuoteChecklist(catObj) {
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

  document.getElementById('grid').innerHTML = `
    <div class="quote-box">
      ${iconHtml}
      <h3 class="quote-title">${catObj.nombre} — Cotización personalizada</h3>
      <p class="quote-sub">El precio depende del formato, material y cantidad. Marca lo que te interesa y te enviamos una cotización a la medida, sin compromiso.</p>
      <div class="qi-list">${opciones}</div>
      <span class="olbl">Cuéntanos más detalles (opcional)</span>
      <textarea id="qiDetalle" class="qi-detalle" rows="3" placeholder="Ej. tamaño, material, cantidad aproximada, fecha en que lo necesitas…"></textarea>
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
  const checks = Array.from(document.querySelectorAll('.qi-item input:checked')).map(i => i.value);
  const detalle = (document.getElementById('qiDetalle').value || '').trim();
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

document.getElementById('ov').addEventListener('click', e => {
  if (e.target === document.getElementById('ov')) closeM();
});

init();
