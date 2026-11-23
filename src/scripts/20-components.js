// Carousel, tabs, post filters, document table of contents.
(function () {
  'use strict';
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  // ---- carousel: one slide visible at a time, counter "01 / 05" ----
  $$('[data-carousel]').forEach(function (car) {
    var slides = $$('[data-slide]', car);
    if (!slides.length) return;
    var count = car.querySelector('[data-carousel-count]');
    var prev = car.querySelector('[data-carousel-prev]');
    var next = car.querySelector('[data-carousel-next]');
    var i = 0;
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.hidden = k !== i; });
      if (count) count.textContent = pad(i + 1) + ' / ' + pad(slides.length);
    }
    if (prev) prev.addEventListener('click', function () { show(i - 1); });
    if (next) next.addEventListener('click', function () { show(i + 1); });
    car.addEventListener('keydown', function (e) {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft') show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
    });
    show(0);
  });

  // ---- tabs ----
  $$('[role="tablist"]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, k) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = tabs[(k + 1) % tabs.length];
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = tabs[(k - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    var wanted = location.hash && document.querySelector('[role="tab"][aria-controls="' + location.hash.slice(1) + '"]');
    select(wanted && tabs.indexOf(wanted) > -1 ? wanted : (tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0]), false);
  });

  // ---- post lists: filter by group, sort by date, search ----
  $$('[data-postlist]').forEach(function (box) {
    var items = $$('[data-post]', box);
    var holder = items.length ? items[0].parentNode : null;
    var filters = $$('[data-filter]', box);
    var search = box.querySelector('[data-post-search]');
    var sort = box.querySelector('[data-post-sort]');
    var countEl = box.querySelector('[data-post-count]');
    var empty = box.querySelector('[data-post-empty]');
    var param = box.getAttribute('data-param');
    var active = 'all';
    function apply() {
      var q = search ? search.value.trim().toLowerCase() : '';
      var shown = 0;
      items.forEach(function (it) {
        var groups = (it.getAttribute('data-groups') || '').split(' ');
        var ok = active === 'all' || groups.indexOf(active) > -1;
        if (ok && q) ok = it.textContent.toLowerCase().indexOf(q) > -1;
        it.hidden = !ok;
        if (ok) shown++;
      });
      if (countEl) countEl.textContent = String(shown);
      if (empty) empty.hidden = shown !== 0;
      filters.forEach(function (f) {
        var on = f.getAttribute('data-filter') === active;
        f.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    filters.forEach(function (f) {
      f.addEventListener('click', function () {
        active = f.getAttribute('data-filter');
        if (param && history.replaceState) {
          var url = new URL(location.href);
          if (active === 'all') url.searchParams.delete(param); else url.searchParams.set(param, active);
          history.replaceState(null, '', url.pathname + url.search + url.hash);
        }
        apply();
      });
    });
    if (search) search.addEventListener('input', apply);
    if (sort && holder) sort.addEventListener('change', function () {
      var dir = sort.value === 'oldest' ? 1 : -1;
      items.slice().sort(function (a, b) {
        var x = a.getAttribute('data-date'), y = b.getAttribute('data-date');
        if (x === y) return Number(a.getAttribute('data-order')) - Number(b.getAttribute('data-order'));
        return x < y ? -dir : dir;
      }).forEach(function (it) { holder.appendChild(it); });
    });
    if (param) {
      var v = new URLSearchParams(location.search).get(param);
      if (v && filters.some(function (f) { return f.getAttribute('data-filter') === v; })) active = v;
    }
    apply();
  });

  // ---- view switch (gallery / list) ----
  $$('[data-view-switch]').forEach(function (sw) {
    var target = document.getElementById(sw.getAttribute('data-view-switch'));
    if (!target) return;
    $$('button[data-view]', sw).forEach(function (b) {
      b.addEventListener('click', function () {
        target.setAttribute('data-view', b.getAttribute('data-view'));
        $$('button[data-view]', sw).forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      });
    });
  });

  // ---- document table of contents: mark the section in view ----
  var toc = document.querySelector('[data-toc]');
  if (toc && 'IntersectionObserver' in window) {
    var links = $$('a[href^="#"]', toc);
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      var current = null;
      links.forEach(function (a) { var id = a.getAttribute('href').slice(1); if (!current && visible[id]) current = id; });
      if (current) links.forEach(function (a) {
        if (a === byId[current]) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }
})();
