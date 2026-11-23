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
