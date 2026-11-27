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
// Page-specific behavior: site search and the contact message composer.
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
      en: { subject: 'Inquiry from the website', name: 'Name', org: 'Organization', topic: 'Topic', message: 'Message', need: 'Please write your message first.', copied: 'Copied. You can paste it into any email or chat.', opened: 'A draft has been created in your mail app. If nothing opened, use "Copy text".', failed: 'Could not copy automatically. Please select the text and copy it.' }
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

/* 50-motion.js */
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
