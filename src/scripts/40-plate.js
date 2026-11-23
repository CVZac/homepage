// Hero plate: the bodies travel their orbits, slowly. Stops off-screen, on request, and under reduced motion.
(function () {
  'use strict';
  var hero = document.querySelector('[data-hero-plate]');
  if (!hero) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var bodies = Array.prototype.slice.call(hero.querySelectorAll('[data-orbit]')).map(function (el) {
    var v = el.getAttribute('data-orbit').split(' ').map(Number);
    return { el: el, cx: v[0], cy: v[1], rx: v[2], ry: v[3], rot: v[4] * Math.PI / 180, t: v[5] * Math.PI / 180, w: 2 * Math.PI / v[6] };
  });
  var btn = hero.querySelector('[data-plate-toggle]');
  var paused = false, visible = true, raf = 0, last = 0;
  function place(b) {
    var x = b.rx * Math.cos(b.t), y = b.ry * Math.sin(b.t);
    b.el.setAttribute('cx', (b.cx + x * Math.cos(b.rot) - y * Math.sin(b.rot)).toFixed(2));
    b.el.setAttribute('cy', (b.cy + x * Math.sin(b.rot) + y * Math.cos(b.rot)).toFixed(2));
  }
  function tick(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    for (var i = 0; i < bodies.length; i++) { bodies[i].t -= bodies[i].w * dt; place(bodies[i]); }
    raf = requestAnimationFrame(tick);
  }
  function schedule() {
    var run = !paused && visible && !still.matches && !document.hidden;
    if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  if (btn) btn.addEventListener('click', function () { paused = !paused; btn.setAttribute('aria-pressed', paused ? 'true' : 'false'); schedule(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; schedule(); }, { threshold: 0.05 }).observe(hero);
  document.addEventListener('visibilitychange', schedule);
  if (still.addEventListener) still.addEventListener('change', schedule);
  schedule();
})();
