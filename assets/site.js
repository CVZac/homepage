/* 10-core.js */
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

/* 20-components.js */
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

/* 30-pages.js */
// Page-specific behaviour: site search and the contact message composer.
(function () {
  'use strict';
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---- search ----
  var form = document.querySelector('[data-search-form]');
  var out = document.querySelector('[data-search-results]');
  if (form && out && window.CV_SEARCH) {
    var input = form.querySelector('input[type="search"]');
    var status = document.querySelector('[data-search-status]');
    var TEXT = {
      zh: { idle: '输入关键词，搜索全站内容。', none: function (q) { return '没有找到与「' + q + '」相关的内容。换一个词试试。'; }, some: function (n) { return '找到 ' + n + ' 个页面'; } },
      en: { idle: 'Type a word to search the whole site.', none: function (q) { return 'Nothing matches "' + q + '". Try a different word.'; }, some: function (n) { return n + (n === 1 ? ' page found' : ' pages found'); } }
    };
    var snippet = function (text, q) {
      var i = text.toLowerCase().indexOf(q);
      if (i < 0) return esc(text.slice(0, 90)) + (text.length > 90 ? '…' : '');
      var start = Math.max(0, i - 36), end = Math.min(text.length, i + q.length + 70);
      return (start > 0 ? '…' : '') + esc(text.slice(start, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length, end)) + (end < text.length ? '…' : '');
    };
    var run = function () {
      var lang = window.cvLang(), li = lang === 'en' ? 1 : 0, T = TEXT[lang];
      var q = input.value.trim().toLowerCase();
      if (!q) { out.innerHTML = ''; status.textContent = T.idle; return; }
      var hits = [];
      window.CV_SEARCH.forEach(function (p) {
        var title = p.t[li], desc = p.d[li], body = p.x[li];
        var score = (title.toLowerCase().indexOf(q) > -1 ? 6 : 0) + (desc.toLowerCase().indexOf(q) > -1 ? 3 : 0) + (body.toLowerCase().indexOf(q) > -1 ? 1 : 0);
        if (score) hits.push({ p: p, score: score, title: title, text: body.toLowerCase().indexOf(q) > -1 ? snippet(body, q) : esc(desc) });
      });
      hits.sort(function (a, b) { return b.score - a.score; });
      status.textContent = hits.length ? T.some(hits.length) : T.none(input.value.trim());
      out.innerHTML = hits.map(function (h) {
        return '<li class="result"><a class="result__link" href="' + h.p.u + '"><span class="result__title">' + esc(h.title) + '</span><span class="result__text">' + h.text + '</span></a></li>';
      }).join('');
    };
    var initial = new URLSearchParams(location.search).get('q');
    if (initial) input.value = initial;
    input.addEventListener('input', run);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); run();
      if (history.replaceState) history.replaceState(null, '', location.pathname + (input.value.trim() ? '?q=' + encodeURIComponent(input.value.trim()) : ''));
    });
    document.addEventListener('cv:lang', run);
    run();
  }

  // ---- contact composer: builds an email in the visitor's own mail app; nothing is sent to a server ----
  var composer = document.querySelector('[data-composer]');
  if (composer) {
    var to = composer.getAttribute('data-to');
    var note = composer.querySelector('[data-composer-status]');
    var L = {
      zh: { subject: '来自官网的咨询', name: '称呼', org: '机构', topic: '想了解', message: '想说的话', need: '请先写下想说的话。', copied: '内容已复制，可以粘贴到任何邮件或聊天工具里。', opened: '已在你的邮件应用中生成邮件。没有弹出窗口时，请使用「复制内容」。', failed: '无法自动复制，请手动选择文字复制。' },
      en: { subject: 'Enquiry from the website', name: 'Name', org: 'Organization', topic: 'Topic', message: 'Message', need: 'Please write your message first.', copied: 'Copied. You can paste it into any email or chat.', opened: 'A draft has been created in your mail app. If nothing opened, use "Copy text".', failed: 'Could not copy automatically. Please select the text and copy it.' }
    };
    var field = function (n) { return composer.elements[n]; };
    var build = function () {
      var T = L[window.cvLang()];
      var topicEl = field('topic');
      var topic = topicEl && topicEl.selectedIndex > 0 ? topicEl.options[topicEl.selectedIndex].text.trim() : '';
      var lines = [];
      if (field('fullname').value.trim()) lines.push(T.name + ': ' + field('fullname').value.trim());
      if (field('org').value.trim()) lines.push(T.org + ': ' + field('org').value.trim());
      if (topic) lines.push(T.topic + ': ' + topic);
      lines.push('', field('message').value.trim());
      return { subject: T.subject + (topic ? ' - ' + topic : ''), body: lines.join('\n'), ok: !!field('message').value.trim(), T: T };
    };
    var say = function (msg) { if (note) note.textContent = msg; };
    composer.addEventListener('submit', function (e) {
      e.preventDefault();
      var m = build();
      if (!m.ok) { say(m.T.need); field('message').focus(); return; }
      location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.body);
      say(m.T.opened);
    });
    var copy = composer.querySelector('[data-composer-copy]');
    if (copy) copy.addEventListener('click', function () {
      var m = build();
      if (!m.ok) { say(m.T.need); field('message').focus(); return; }
      var text = to + '\n' + m.subject + '\n\n' + m.body;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { say(m.T.copied); }, function () { say(m.T.failed); });
      } else { say(m.T.failed); }
    });
    // the option labels are bilingual: keep the visible text in step with the page language
    var syncOptions = function () {
      var lang = window.cvLang();
      composer.querySelectorAll('option[data-zh-label]').forEach(function (o) { o.textContent = o.getAttribute('data-' + lang + '-label'); });
    };
    document.addEventListener('cv:lang', syncOptions);
    syncOptions();
  }
})();

/* 40-plate.js */
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
