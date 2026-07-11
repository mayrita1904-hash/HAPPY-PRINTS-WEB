(function () {
  const ENDPOINT = '/api/track';
  const SID_KEY = 'hp_sid';

  function sid() {
    let id = sessionStorage.getItem(SID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SID_KEY, id);
    }
    return id;
  }

  function device() {
    return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'movil' : 'escritorio';
  }

  function send(type, data) {
    const payload = JSON.stringify(Object.assign({
      type, path: location.pathname, sid: sid(), device: device(),
      ref: document.referrer || '', ts: Date.now()
    }, data || {}));
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(ENDPOINT, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function () {});
    }
  }

  send('pageview');

  document.addEventListener('click', function (e) {
    const el = e.target.closest('a, button');
    if (!el) return;
    const label = el.getAttribute('data-track') || el.textContent.trim().slice(0, 40) || el.getAttribute('href') || el.id || 'sin-nombre';
    send('click', { label: label });
  });

  const seenDepths = new Set();
  function checkScroll() {
    const h = document.documentElement;
    const scrollable = h.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? Math.round((h.scrollTop / scrollable) * 100) : 100;
    [25, 50, 75, 100].forEach(function (m) {
      if (pct >= m && !seenDepths.has(m)) {
        seenDepths.add(m);
        send('scroll', { depth: m });
      }
    });
  }

  let lastScrollCheck = 0;
  window.addEventListener('scroll', function () {
    const now = Date.now();
    if (now - lastScrollCheck < 400) return;
    lastScrollCheck = now;
    checkScroll();
  }, { passive: true });

  const start = Date.now();
  let timeSent = false;
  function sendTime() {
    if (timeSent) return;
    timeSent = true;
    send('time', { seconds: Math.round((Date.now() - start) / 1000) });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendTime();
  });
  window.addEventListener('pagehide', sendTime);
})();
