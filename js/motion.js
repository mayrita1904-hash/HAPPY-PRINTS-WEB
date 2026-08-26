/* Sistema de motion — reveal on scroll.
   El contenido siempre parte visible en el CSS base; solo si hay soporte de
   IntersectionObserver y el usuario no pidió menos movimiento, se agrega
   .motion-on a <html> y este script empieza a observar los .reveal. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('motion-on');

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

  function observeAll(root) {
    (root || document).querySelectorAll('.reveal:not(.is-visible)').forEach(function (el) {
      observer.observe(el);
    });
  }

  window.Motion = { observeAll: observeAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { observeAll(); });
  } else {
    observeAll();
  }
})();
