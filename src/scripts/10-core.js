// Language, header, dropdowns and the full-screen menu.
(function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'cvetron-lang';

  function applyLang(lang) {
    root.lang = lang === 'en' ? 'en' : 'zh-CN';
    var code = lang === 'en' ? 'en' : 'zh';
    var title = root.getAttribute('data-title-' + code);
    if (title) document.title = title;
    var desc = document.querySelector('meta[name="description"]');
    var d = root.getAttribute('data-desc-' + code);
    if (desc && d) desc.setAttribute('content', d);
    // attributes written as attr="{{中文||English}}" carry data-zh-attr / data-en-attr copies
    var prefix = 'data-' + code + '-';
    document.querySelectorAll('[data-i18n-attrs]').forEach(function (el) {
      for (var i = 0; i < el.attributes.length; i++) {
        var a = el.attributes[i];
        if (a.name.indexOf(prefix) === 0) el.setAttribute(a.name.slice(prefix.length), a.value);
      }
    });
    document.dispatchEvent(new CustomEvent('cv:lang', { detail: { lang: code } }));
  }
  window.cvLang = function () { return root.lang === 'en' ? 'en' : 'zh'; };

  // mark elements that carry translated attributes once, so later switches are cheap
  document.querySelectorAll('*').forEach(function (el) {
    for (var i = 0; i < el.attributes.length; i++) {
      var n = el.attributes[i].name;
      if (n.indexOf('data-zh-') === 0 || n.indexOf('data-en-') === 0) { el.setAttribute('data-i18n-attrs', ''); break; }
    }
  });
  applyLang(window.cvLang());

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-lang-toggle]');
    if (!btn) return;
    var next = window.cvLang() === 'en' ? 'zh' : 'en';
    try { localStorage.setItem(KEY, next); } catch (err) { /* private mode: the choice lasts for this page only */ }
    applyLang(next);
    if (/[?&]lang=/.test(location.search) && history.replaceState) {
      var url = new URL(location.href);
      url.searchParams.delete('lang');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  });

  // ---- header: compact state after scrolling ----
  var header = document.querySelector('[data-header]');
  if (header) {
    var ticking = false;
    var onScroll = function () {
      header.toggleAttribute('data-scrolled', window.scrollY > 24);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();
  }

  // ---- dropdowns ----
  var drops = Array.prototype.slice.call(document.querySelectorAll('[data-dropdown]'));
  function setOpen(drop, open) {
    var btn = drop.querySelector('button[aria-expanded]');
    var menu = drop.querySelector('[data-dropdown-menu]');
    if (!btn || !menu) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.hidden = !open;
    drop.toggleAttribute('data-open', open);
  }
  function closeAll(except) { drops.forEach(function (d) { if (d !== except) setOpen(d, false); }); }
  var hoverFine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  drops.forEach(function (drop) {
    var btn = drop.querySelector('button[aria-expanded]');
    var menu = drop.querySelector('[data-dropdown-menu]');
    if (!btn || !menu) return;
    var timer;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      closeAll(drop); setOpen(drop, open);
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault(); closeAll(drop); setOpen(drop, true);
        var first = menu.querySelector('a, button'); if (first) first.focus();
      }
    });
    menu.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(menu.querySelectorAll('a, button'));
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setOpen(drop, false); btn.focus(); }
    });
    drop.addEventListener('focusout', function (e) {
      if (!drop.contains(e.relatedTarget)) setOpen(drop, false);
    });
    if (hoverFine) {
      drop.addEventListener('mouseenter', function () { clearTimeout(timer); timer = setTimeout(function () { closeAll(drop); setOpen(drop, true); }, 80); });
      drop.addEventListener('mouseleave', function () { clearTimeout(timer); timer = setTimeout(function () { setOpen(drop, false); }, 160); });
    }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('[data-dropdown]')) closeAll(null); });

  // ---- full-screen menu (a <dialog>, so focus trapping and Escape are native) ----
  var menu = document.getElementById('site-menu');
  if (menu && typeof menu.showModal === 'function') {
    document.querySelectorAll('[data-menu-open]').forEach(function (b) {
      b.addEventListener('click', function () { menu.showModal(); root.setAttribute('data-menu-open', ''); });
    });
    menu.addEventListener('close', function () { root.removeAttribute('data-menu-open'); });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('[data-menu-close]') || e.target.closest('a[href]')) menu.close();
    });
  }

  // ---- current page in navigation ----
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === here && !a.hasAttribute('data-no-current')) a.setAttribute('aria-current', 'page');
  });
})();
