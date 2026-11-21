/* Animaciones del home (index.html). Se carga después de motion.js y main.js.
   Todo respeta prefers-reduced-motion: si el usuario pidió menos movimiento,
   motion.js no agrega .motion-on y aquí no se anima nada (el contenido ya está completo).

   - "¿Cómo hacer tu pedido?": un hilo rosa recorre los 6 pasos y los va encendiendo.
   - animarAlCarrito(img): la foto del producto vuela al ícono del carrito (la llama main.js).
   - animarCorazon(pid): estallido al marcar un favorito (la llama main.js).
   - Botón de WhatsApp: un solo "toquecito" + globito a los 8 s, una vez por visita.
   - Reseñas: las estrellas se encienden una por una (solo CSS; aquí se separan en <i>). */
(function () {
  const motionOn = () => document.documentElement.classList.contains('motion-on');
  const COLORS = ['#FF2D78', '#1FB6AE', '#F5A623', '#7C3AED', '#C8D640'];
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  function burst(host, n, dist, size) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'fx-dot';
      s.style.background = COLORS[i % COLORS.length];
      s.style.width = s.style.height = size + 'px';
      host.appendChild(s);
      const ang = (Math.PI * 2 * i) / n + Math.random() * .3;
      const d = dist * (0.8 + Math.random() * .5);
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d * .7}px)) scale(.3)`, opacity: 0 }
      ], { duration: 650 + Math.random() * 300, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => s.remove();
    }
  }

  /* ── ¿Cómo hacer tu pedido? ── */
  function initHowTo() {
    const steps = document.getElementById('howSteps');
    if (!steps || !motionOn()) return;
    const cards = [...steps.querySelectorAll('.step')];
    const base = steps.querySelector('.how-thread-base');
    const prog = steps.querySelector('.how-thread-prog');
    const done = document.getElementById('howDone');
    let marks = [], total = 0, played = false;

    function buildPath() {
      const pts = cards.map(c => {
        const ic = c.querySelector('.step-icon');
        return { x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + ic.offsetTop + ic.offsetHeight / 2, top: c.offsetTop, bottom: c.offsetTop + c.offsetHeight };
      });
      const r = 16;
      const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      let d = `M${pts[0].x},${pts[0].y}`;
      marks = [0];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        if (Math.abs(a.y - b.y) < 8 || Math.abs(a.x - b.x) < 8) {
          d += ` L${b.x},${b.y}`;
        } else {
          const mid = (a.bottom + b.top) / 2, s = a.x > b.x ? -1 : 1;
          d += ` L${a.x},${mid - r} Q${a.x},${mid} ${a.x + s * r},${mid} L${b.x - s * r},${mid} Q${b.x},${mid} ${b.x},${mid + r} L${b.x},${b.y}`;
        }
        tmp.setAttribute('d', d);
        marks.push(tmp.getTotalLength());
      }
      base.setAttribute('d', d);
      prog.setAttribute('d', d);
      total = marks[marks.length - 1];
      prog.style.strokeDasharray = total;
    }
    function setProgress(len) {
      prog.style.strokeDashoffset = total - len;
      cards.forEach((c, i) => c.classList.toggle('on', marks[i] <= len + 0.5));
    }
    function play() {
      buildPath();
      const dur = 4200, t0 = performance.now();
      const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const tick = now => {
        const t = Math.min(1, (now - t0) / dur);
        setProgress(total * ease(t));
        if (t < 1) requestAnimationFrame(tick);
        else if (done) { restart(done, 'pop'); burst(done, 16, 110, 7); }
      };
      requestAnimationFrame(tick);
    }

    buildPath();
    setProgress(0);
    new IntersectionObserver((entries, ob) => {
      if (entries.some(e => e.isIntersecting) && !played) { played = true; ob.disconnect(); setTimeout(play, 300); }
    }, { threshold: .3 }).observe(steps);

    let lastW = steps.offsetWidth;
    new ResizeObserver(() => {
      if (steps.offsetWidth === lastW) return;
      lastW = steps.offsetWidth;
      buildPath();
      setProgress(played ? total : 0);
    }).observe(steps);
  }

  /* ── Producto vuela al carrito ── */
  window.animarAlCarrito = function (img) {
    const cartBtn = document.getElementById('btnCarrito');
    const badge = document.getElementById('cartBadge');
    const bump = () => { if (cartBtn) restart(cartBtn, 'fx-wiggle'); if (badge) restart(badge, 'fx-pop'); };
    if (!motionOn() || !img || !cartBtn || !img.src || img.style.display === 'none') { bump(); return; }
    const a = img.getBoundingClientRect(), b = cartBtn.getBoundingClientRect();
    if (!a.width) { bump(); return; }
    const size = Math.min(a.width, a.height, 140);
    const f = document.createElement('img');
    f.src = img.src; f.alt = ''; f.className = 'fx-flyer';
    const x0 = a.left + a.width / 2 - size / 2, y0 = a.top + a.height / 2 - size / 2;
    Object.assign(f.style, { left: x0 + 'px', top: y0 + 'px', width: size + 'px', height: size + 'px' });
    document.body.appendChild(f);
    // Si el carrito quedó fuera de pantalla, vuela hacia la orilla de arriba, a su altura horizontal.
    const tx = b.left + b.width / 2, ty = Math.max(b.top + b.height / 2, 12);
    const dx = tx - (x0 + size / 2), dy = ty - (y0 + size / 2);
    f.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .45}px, ${dy * .45 - 60}px) scale(.55)`, opacity: 1, offset: .5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: .3 }
    ], { duration: 800, easing: 'cubic-bezier(.45,0,.25,1)' }).onfinish = () => { f.remove(); bump(); };
  };

  /* ── Estallido del corazón de favoritos ── */
  window.animarCorazon = function (pid) {
    if (!motionOn()) return;
    document.querySelectorAll(`.card-heart[data-pid="${pid}"]`).forEach(h => {
      restart(h, 'fx-heart');
      burst(h, 8, 24, 5);
    });
  };

  /* ── WhatsApp: un toquecito + globito, una sola vez por visita ── */
  function initWhatsApp() {
    const wa = document.querySelector('.wa-float');
    if (!wa || !motionOn()) return;
    try { if (sessionStorage.getItem('hp_wa_nudge')) return; } catch (e) { /* sin storage: seguimos */ }
    const show = () => {
      // Si hay un modal abierto, esperamos a que lo cierre en vez de perder el aviso.
      if (document.querySelector('.ov.open, .open[role="dialog"]')) { setTimeout(show, 3000); return; }
      try { sessionStorage.setItem('hp_wa_nudge', '1'); } catch (e) { /* nada */ }
      const bubble = document.createElement('a');
      bubble.className = 'wa-bubble';
      bubble.href = wa.href; bubble.target = '_blank'; bubble.rel = 'noopener';
      bubble.textContent = '¿Te ayudamos con tu pedido? 💬';
      document.body.appendChild(bubble);
      restart(wa, 'fx-nudge');
      requestAnimationFrame(() => bubble.classList.add('show'));
      setTimeout(() => { bubble.classList.remove('show'); setTimeout(() => bubble.remove(), 400); }, 5000);
    };
    setTimeout(show, 8000);
  }

  /* ── Estrellas de reseñas: se separan para que el CSS las encienda una por una ── */
  function initStars() {
    if (!motionOn()) return;
    document.querySelectorAll('.review-stars').forEach(el => {
      const n = (el.textContent.match(/★/g) || []).length;
      if (!n) return;
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', `${n} de 5 estrellas`);
      el.innerHTML = Array.from({ length: n }, (_, i) => `<i style="--s:${i}" aria-hidden="true">★</i>`).join('');
    });
  }

  function init() { initHowTo(); initWhatsApp(); initStars(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
