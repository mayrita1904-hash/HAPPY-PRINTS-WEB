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
  if (!viewport) return;
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

function updateBuilderTotal() {
  const pkgInput = document.querySelector('input[name="pkg"]:checked');
  const totalEl = document.getElementById('builderTotal');
  const cta = document.getElementById('builderCta');
  if (!pkgInput || !totalEl || !cta) return;

  const plus = pkgInput.dataset.plus === '1';
  const selectedExtras = [...document.querySelectorAll('#builderExtras input:checked')];
  const total = selectedExtras.reduce((sum, cb) => sum + Number(cb.value), Number(pkgInput.value));
  const totalTxt = `$${total.toLocaleString('es-MX')}${plus ? '+' : ''} MXN`;

  totalEl.textContent = totalTxt;

  const pkgName = pkgInput.dataset.name;
  const breakdown = document.getElementById('builderBreakdown');
  if (breakdown) {
    const pkgRow = `<div class="webdev-builder-row webdev-builder-row-base"><span>${pkgName} (paquete base)</span><span>$${Number(pkgInput.value).toLocaleString('es-MX')}${plus ? '+' : ''}</span></div>`;
    const extraRows = selectedExtras.map(cb =>
      `<div class="webdev-builder-row"><span>+ ${cb.dataset.name}</span><span>$${Number(cb.value).toLocaleString('es-MX')}</span></div>`
    ).join('');
    breakdown.innerHTML = pkgRow + extraRows;
  }

  const extraNames = selectedExtras.map(cb => cb.dataset.name);
  let msg = `¡Hola! 👋 Armé mi sitio web a la medida en la página de Happy Prints:\n\nPaquete: ${pkgName}`;
  if (extraNames.length) msg += `\nExtras: ${extraNames.join(', ')}`;
  msg += `\nTotal estimado: ${totalTxt}\n\n¿Podemos platicar los detalles?`;
  cta.href = `https://wa.me/5217224616543?text=${encodeURIComponent(msg)}`;
}

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
  document.querySelectorAll('#extrasGrid .webdev-extras-card').forEach((card, i) => {
    card.addEventListener('click', () => focusExtras(i));
  });
  updateExtrasCarousel();
  setupExtrasSwipe();

  document.querySelectorAll('input[name="pkg"], #builderExtras input').forEach(el => {
    el.addEventListener('change', updateBuilderTotal);
  });
  updateBuilderTotal();

  setupHeroTilt();
});
