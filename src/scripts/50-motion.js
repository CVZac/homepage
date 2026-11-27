// Motion: smooth scrolling, one shared frame loop, reveals, marquees, kinetic letters, scramble text,
// the cursor, magnetic buttons, scroll progress and page transitions.
// Everything animates transform or opacity only. Nothing runs under prefers-reduced-motion.
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  // ---------- one frame loop for everything ----------
  var tasks = [];
  var raf = 0;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    for (var i = 0; i < tasks.length; i++) tasks[i](t);
  }
  function add(fn) { tasks.push(fn); if (!raf) raf = requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
    else if (!document.hidden && !raf && tasks.length) raf = requestAnimationFrame(loop);
  });

  // ---------- smooth scrolling ----------
  var lenis = null;
  if (!reduced && window.CVLenis) {
    lenis = new window.CVLenis({ lerp: 0.11, smoothWheel: true, anchors: { offset: -96 }, autoRaf: false });
    add(function (t) { lenis.raf(t); });
    new MutationObserver(function () { root.hasAttribute('data-menu-open') ? lenis.stop() : lenis.start(); }).observe(root, { attributes: true, attributeFilter: ['data-menu-open'] });
  }
  window.cvLenis = lenis;

  // scroll state shared by the tasks below
  var sy = window.scrollY, vel = 0, dir = 1;
  add(function () {
    var y = lenis ? lenis.scroll : window.scrollY;
    var d = y - sy; sy = y;
    vel += (d - vel) * 0.15;
    if (Math.abs(d) > 0.5) dir = d > 0 ? 1 : -1;
  });

  // ---------- scroll progress on the left rail ----------
  var bar = document.querySelector('[data-progress]');
  var num = document.querySelector('[data-progress-num]');
  if (bar) {
    var lastP = -1;
    add(function () {
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, sy / max));
      if (Math.abs(p - lastP) < 0.001) return;
      lastP = p;
      bar.style.transform = 'scaleY(' + p.toFixed(4) + ')';
      if (num) num.textContent = ('00' + Math.round(p * 100)).slice(-3);
    });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-to-top]')) return;
    if (lenis) lenis.scrollTo(0, { duration: 1.4 }); else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });

  // ---------- kinetic letters: each character is its own span (weight and width answer the pointer) ----------
  function splitLetters(el) {
    $$('[data-zh], [data-en]', el).concat(el.querySelector('[data-zh], [data-en]') ? [] : [el]).forEach(function (node) {
      var text = node.textContent;
      node.textContent = '';
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        var s = document.createElement('span');
        s.className = ch === ' ' || ch === ' ' ? 'ch ch--sp' : (ch === '■' ? 'ch ch--sq' : 'ch');
        s.textContent = ch === ' ' ? ' ' : ch;
        node.appendChild(s);
      }
    });
  }
  $$('[data-letters]').forEach(splitLetters);

  // ---------- marquees: speed follows scrolling, direction follows its sign ----------
  $$('[data-marquee]').forEach(function (el) {
    var speed = parseFloat(el.getAttribute('data-speed') || '0.5');
    var skew = el.hasAttribute('data-skew');
    // repeat the content so one copy is always off-screen
    var kids = Array.prototype.slice.call(el.children);
    var track = document.createElement('span'); track.className = 'marquee__track';
    kids.forEach(function (k) { track.appendChild(k); });
    el.appendChild(track);
    var copy = track.cloneNode(true); copy.setAttribute('aria-hidden', 'true');
    el.appendChild(copy);
    el.classList.add('marquee');
    if (reduced) return;
    var x = 0, w = 0, visible = true;
    function measure() { w = track.getBoundingClientRect().width; }
    measure();
    window.addEventListener('resize', measure);
    document.addEventListener('cv:lang', function () { requestAnimationFrame(measure); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(el);
    add(function () {
      if (!visible || !w) return;
      x -= (speed + Math.min(14, Math.abs(vel)) * 0.35) * dir;
      if (x <= -w) x += w; else if (x > 0) x -= w;
      var t = 'translate3d(' + x.toFixed(2) + 'px,0,0)' + (skew ? ' skewX(' + Math.max(-10, Math.min(10, -vel * 0.4)).toFixed(2) + 'deg)' : '');
      track.style.transform = t; copy.style.transform = t;
    });
  });

  // ---------- scrubbed statement: characters light up as the block scrolls past ----------
  $$('[data-scrub]').forEach(function (el) {
    var parts = [];
    $$('[data-zh], [data-en]', el).forEach(function (node) {
      var zh = node.hasAttribute('data-zh');
      var text = node.textContent; node.textContent = '';
      var units = zh ? text.split('') : text.split(/(\s+)/);
      units.forEach(function (u) {
        if (!u) return;
        if (/^\s+$/.test(u)) { node.appendChild(document.createTextNode(u)); return; }
        var s = document.createElement('span'); s.className = 'scrub__u'; s.textContent = u; node.appendChild(s);
        parts.push({ s: s, zh: zh });
      });
    });
    if (reduced) { parts.forEach(function (p) { p.s.style.opacity = 1; }); return; }
    var visible = false;
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(el);
    var last = -1;
    add(function () {
      if (!visible) return;
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      if (Math.abs(p - last) < 0.002) return; last = p;
      var lang = root.lang === 'en' ? false : true;
      var list = parts.filter(function (x) { return x.zh === lang; });
      var n = list.length, lit = p * n;
      for (var i = 0; i < n; i++) {
        var o = Math.min(1, Math.max(0.14, lit - i + 0.14));
        list[i].s.style.opacity = o.toFixed(3);
      }
    });
  });

  // ---------- scramble: short labels decode when they come into view ----------
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>_■';
  function scramble(node) {
    var target = node.textContent; if (!target.trim() || target.length > 48) return;
    var cjk = /[一-鿿]/.test(target);
    var pool = cjk ? target.replace(/\s/g, '') : GLYPHS;
    var start = performance.now(), dur = 520 + target.length * 18;
    function step(now) {
      var k = Math.min(1, (now - start) / dur), out = '';
      for (var i = 0; i < target.length; i++) {
        var c = target[i];
        if (c === ' ' || k > (i / target.length) * 0.7 + 0.3) out += c;
        else out += pool[(Math.floor(now / 40) + i * 7) % pool.length];
      }
      node.textContent = out;
      if (k < 1) requestAnimationFrame(step); else node.textContent = target;
    }
    requestAnimationFrame(step);
  }

  // ---------- reveals ----------
  var REVEAL = '.rowlabel, .colset > .label, .shelf__label, .hero__title, .hero__side, .dochead__title, .dochead > .lead, .split__head, .col, .acard, .pcard, .gcard, .area, .value, .rows > li, .teaser, .steps > li, .acc, .deflist > div, .feature, .tile, .statement, .cta__title, .related .teaser, .prose > section, .pcube, .leadstory, .sitemap__group, .contactband__item, .emptybox';
  var SCRAMBLE = '.rowlabel, .colset > .label, .shelf__label, .hx__tag, .label[data-scramble], [data-scramble]';
  if (!reduced && 'IntersectionObserver' in window) {
    root.classList.add('rv-on');
    var groups = new Map();
    $$(REVEAL).forEach(function (el) {
      if (el.closest('.menu, .drop__menu, .footer, [hidden]')) return;
      el.classList.add('rv');
      var p = el.parentElement; var i = groups.get(p) || 0; groups.set(p, i + 1);
      el.style.setProperty('--rd', Math.min(i, 8) * 70 + 'ms');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; io.unobserve(el);
        el.classList.add('is-in');
        if (el.matches(SCRAMBLE)) $$('[data-zh], [data-en]', el).concat(el.querySelector('[data-zh]') ? [] : [el]).forEach(function (n) { if (n.offsetParent !== null && !n.children.length) scramble(n); });
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.rv, .plate, ' + SCRAMBLE).forEach(function (el) { io.observe(el); });
  } else {
    $$('.plate').forEach(function (el) { el.classList.add('is-in'); });
  }

  // plates animate only while on screen
  if (!reduced && 'IntersectionObserver' in window) {
    var pio = new IntersectionObserver(function (entries) { entries.forEach(function (en) { en.target.classList.toggle('is-live', en.isIntersecting); }); });
    document.querySelectorAll('.plate').forEach(function (el) { pio.observe(el); });
  }

  // ---------- cursor ----------
  var cur = document.querySelector('.cursor');
  if (cur && fine && !reduced) {
    var cx = -100, cy = -100, tx = -100, ty = -100, frame = null, shown = false;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; cx = tx; cy = ty; root.classList.add('has-cursor'); }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { root.classList.remove('has-cursor'); shown = false; });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest('a, button, summary, select, input, textarea, label, [data-3d]');
      if (t === frame) return;
      frame = t;
      cur.classList.remove('is-frame', 'is-drag');
      cur.style.width = cur.style.height = '';
      cur.style.margin = '';
      if (!t) return;
      if (t.hasAttribute('data-3d')) { cur.classList.add('is-drag'); cur.style.width = cur.style.height = '2.75rem'; cur.style.margin = '-1.375rem 0 0 -1.375rem'; return; }
      if (t.matches('input, textarea, select')) { frame = null; return; }
      var r = t.getBoundingClientRect();
      if (r.width > 520 || r.height > 160) { frame = null; return; }
      cur.classList.add('is-frame');
      cur.style.width = (r.width + 12) + 'px'; cur.style.height = (r.height + 12) + 'px';
    });
    add(function () {
      var x = tx, y = ty;
      if (frame && cur.classList.contains('is-frame')) {
        var r = frame.getBoundingClientRect(); x = r.left - 6; y = r.top - 6;
        cx += (x - cx) * 0.35; cy += (y - cy) * 0.35;
      } else {
        var off = cur.classList.contains('is-drag') ? 0 : -5;
        cx += (x + off - cx) * 0.28; cy += (y + off - cy) * 0.28;
      }
      cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    });
  }

  // ---------- magnetic buttons ----------
  if (fine && !reduced) {
    $$('.btn--primary, .rail__btn, .row__go, .hx__nav button').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.transform = 'translate3d(' + (dx * 8).toFixed(1) + 'px,' + (dy * 6).toFixed(1) + 'px,0)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  // ---------- horizontal strip with arrows ----------
  $$('[data-strip]').forEach(function (strip) {
    var box = strip.closest('section') || document;
    $$('[data-strip-prev], [data-strip-next]', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cell = strip.firstElementChild; var w = cell ? cell.getBoundingClientRect().width : 300;
        strip.scrollBy({ left: btn.hasAttribute('data-strip-next') ? w : -w, behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  });

  // ---------- page transitions ----------
  root.classList.remove('is-entering-done');
  if (root.classList.contains('is-entering')) setTimeout(function () { root.classList.remove('is-entering'); }, 900);
  window.addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('is-leaving', 'is-entering'); });
  if (!reduced) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|https?:|javascript:)/.test(href)) return;
      var url = new URL(a.href, location.href);
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      try { sessionStorage.setItem('cv-wipe', '1'); } catch (err) { /* without storage the next page simply appears */ }
      root.classList.add('is-leaving');
      setTimeout(function () { location.href = a.href; }, 560);
    });
  }
})();
