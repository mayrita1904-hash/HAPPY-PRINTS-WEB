const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p3cmFwaXF2eXhkbGlqZG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA1NzgsImV4cCI6MjA5ODUwNjU3OH0._3r9pDu7Vg09o_5MZt3tcu7i2CZoWk3xKtbOMWcY_wM';
const HDR = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };
const WA_NUMBER = '5217227118927';

async function get(path) {
  const r = await fetch(SB_URL + '/rest/v1/' + path, { headers: HDR });
  if (!r.ok) throw new Error('No se pudo cargar ' + path);
  return r.json();
}

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString('es-MX');
}

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
  cta.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function bindBuilderEvents() {
  document.querySelectorAll('input[name="pkg"], #builderExtras input').forEach(el => {
    el.addEventListener('change', updateBuilderTotal);
  });
  updateBuilderTotal();
}

async function cargarBuilder() {
  try {
    const [paquetes, extras] = await Promise.all([
      get('webdev_paquetes?select=*&order=orden'),
      get('webdev_extras?select=*&order=categoria,orden')
    ]);
    renderBuilderPkgs(paquetes);
    renderBuilderExtras(extras);
  } catch (e) {
    document.getElementById('builderPkgs').innerHTML = '<p class="webdev-empty-msg">No se pudieron cargar los paquetes en este momento. Escríbenos por WhatsApp para más información.</p>';
    document.getElementById('builderExtras').innerHTML = '';
  }
  bindBuilderEvents();
}

document.addEventListener('DOMContentLoaded', cargarBuilder);
