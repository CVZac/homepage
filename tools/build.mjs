#!/usr/bin/env node
// Builds the static site: src/ -> *.html at the repository root, plus assets/site.css and assets/site.js.
// No dependencies. Usage: node tools/build.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { renderPlate } from './plates.mjs';
import * as views from './views.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const read = (p) => fs.readFileSync(p, 'utf8');
const site = JSON.parse(read(path.join(SRC, 'data', 'site.json')));
const problems = [];
const warn = (page, msg) => problems.push(`${page}: ${msg}`);

// ---------- helpers shared with views ----------
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const t = (zh, en) => `<span data-zh lang="zh-CN">${zh}</span><span data-en lang="en">${en}</span>`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dateHtml(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `<time datetime="${iso}">${t(`${y}年${m}月${d}日`, `${MONTHS[m - 1]} ${d}, ${y}`)}</time>`;
}

// ---------- front matter ----------
function parsePage(file) {
  const raw = read(file);
  const m = raw.match(/^\s*<!--\s*(\{[\s\S]*?\})\s*-->/);
  const name = path.basename(file, '.html');
  if (!m) throw new Error(`${name}: missing front matter (a JSON object inside the first HTML comment)`);
  let meta;
  try { meta = JSON.parse(m[1]); } catch (e) { throw new Error(`${name}: front matter is not valid JSON: ${e.message}`); }
  for (const k of ['title', 'description']) {
    if (!meta[k] || !meta[k].zh || !meta[k].en) throw new Error(`${name}: front matter needs ${k}.zh and ${k}.en`);
  }
  return { name, file, meta, body: raw.slice(m[0].length) };
}

// ---------- directives ----------
function parseArgs(s) {
  const out = {};
  const re = /([\w-]+)=("([^"]*)"|[^\s]+)/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = m[3] !== undefined ? m[3] : m[2];
  Object.defineProperty(out, '_', { value: s.replace(re, ' ').trim().split(/\s+/).filter(Boolean), enumerable: false });
  return out;
}

function expandDirectives(html, page, ctx, depth = 0) {
  if (depth > 5) throw new Error(`${page.name}: includes nested too deeply`);
  return html.replace(/<!--\s*@(\w+)([^>]*?)-->/g, (_, kind, rest) => {
    const args = parseArgs(rest);
    if (kind === 'include') {
      const name = args._[0];
      const file = path.join(SRC, 'partials', name + '.html');
      if (!fs.existsSync(file)) throw new Error(`${page.name}: partial "${name}" not found`);
      let part = read(file);
      for (const [k, v] of Object.entries(args)) part = part.replaceAll(`%${k}%`, v);
      return expandDirectives(part, page, ctx, depth + 1);
    }
    if (kind === 'plate') return renderPlate(args);
    if (kind === 'date') return dateHtml(args._[0]);
    if (views[kind]) return expandDirectives(views[kind](args, ctx, page), page, ctx, depth + 1);
    throw new Error(`${page.name}: unknown directive @${kind}`);
  });
}

// {{中文||English}} -> two spans; attr="{{中文||English}}" -> attr plus per-language data attributes.
function expandI18n(html, pageName) {
  html = html.replace(/([\w:-]+)="\{\{([^{}]*?)\|\|([^{}]*?)\}\}"/g, (_, attr, zh, en) =>
    `${attr}="${zh.trim()}" data-zh-${attr}="${zh.trim()}" data-en-${attr}="${en.trim()}"`);
  html = html.replace(/\{\{([\s\S]*?)\|\|([\s\S]*?)\}\}/g, (_, zh, en) => t(zh.trim(), en.trim()));
  if (/\{\{|\}\}/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) warn(pageName, 'unbalanced {{ }} left after i18n expansion');
  return html;
}

// Chinese headings: allow line breaks only between words (CSS sets word-break: keep-all on headings).
const seg = new Intl.Segmenter('zh', { granularity: 'word' });
const BIND_PREV = new Set([...'的了着过们吗呢吧啊地得者性化式型级线页']); // never start a line
const BIND_NEXT = new Set([...'把被和与及或在对从向为是不也就都很最更还再又让给']); // never end a line
function breakable(text) {
  const words = [...seg.segment(text)].map((x) => x.segment);
  let out = '';
  words.forEach((w, i) => {
    out += w;
    const next = words[i + 1];
    if (!next) return;
    const cjk = (c) => /[\u4e00-\u9fff]/.test(c);
    if (cjk(w[w.length - 1]) && cjk(next[0]) && !BIND_PREV.has(next) && !BIND_NEXT.has(w)) out += '<wbr>';
  });
  return out;
}
function tuneHeadings(html) {
  return html.replace(/<(h[1-3])\b[^>]*>[\s\S]*?<\/\1>/g, (block) =>
    block.replace(/(<span data-zh lang="zh-CN">)([\s\S]*?)(<\/span>)/g, (_, a, inner, c) =>
      a + inner.replace(/(^|>)([^<]+)/g, (m, lead, text) => lead + breakable(text)) + c));
}

// ---------- assets ----------
function bundle(dir, out) {
  const files = fs.readdirSync(dir).filter((f) => !f.startsWith('_')).sort();
  const text = files.map((f) => `/* ${f} */\n${read(path.join(dir, f)).trim()}\n`).join('\n');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  return crypto.createHash('sha1').update(text).digest('hex').slice(0, 8);
}

// ---------- build ----------
const pages = fs.readdirSync(path.join(SRC, 'pages')).filter((f) => f.endsWith('.html')).sort()
  .map((f) => parsePage(path.join(SRC, 'pages', f)));

const posts = pages.filter((p) => p.meta.post).map((p) => ({
  url: p.name + '.html', title: p.meta.title, description: p.meta.description, ...p.meta.post,
})).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.order || 0) - (b.order || 0)));
for (const p of posts) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) warn(p.url, 'post.date must be YYYY-MM-DD');
  if (!site.categories[p.category]) warn(p.url, `post.category "${p.category}" is not defined in src/data/site.json`);
}

const ctx = { site, pages, posts, t, esc, dateHtml, renderPlate };
const cssV = bundle(path.join(SRC, 'styles'), path.join(ROOT, 'assets', 'site.css'));
const jsV = bundle(path.join(SRC, 'scripts'), path.join(ROOT, 'assets', 'site.js'));
const layout = read(path.join(SRC, 'layout.html'));
const built = [];

for (const page of pages) {
  const m = page.meta;
  let html = layout
    .replaceAll('%CONTENT%', () => page.body)
    .replaceAll('%TITLE_ZH%', esc(page.name === 'index' ? m.title.zh : `${m.title.zh} - ${site.name.zh}`))
    .replaceAll('%TITLE_EN%', esc(page.name === 'index' ? m.title.en : `${m.title.en} - ${site.name.en}`))
    .replaceAll('%DESC_ZH%', esc(m.description.zh)).replaceAll('%DESC_EN%', esc(m.description.en))
    .replaceAll('%SECTION%', m.section || '').replaceAll('%PAGE%', page.name)
    .replaceAll('%BODY_CLASS%', m.bodyClass || '')
    .replaceAll('%ROBOTS%', m.noindex ? '\n<meta name="robots" content="noindex">' : '')
    .replaceAll('%CSS_V%', cssV).replaceAll('%JS_V%', jsV);
  html = expandDirectives(html, page, ctx);
  html = tuneHeadings(expandI18n(html, page.name));
  built.push({ page, html });
}

// search index (a script, so it also works from file://)
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ');
function textOf(html, lang) {
  const main = (html.match(/<main[\s\S]*<\/main>/) || [''])[0];
  const other = lang === 'zh' ? 'en' : 'zh';
  let s = strip(main);
  let prev;
  do { prev = s; s = s.replace(new RegExp(`<span data-${other}\\b[^>]*>(?:(?!<span)[\\s\\S])*?</span>`, 'g'), ' '); } while (s !== prev);
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
const index = built.filter(({ page }) => !page.meta.noindex).map(({ page, html }) => ({
  u: page.name + '.html', s: page.meta.section || '',
  t: [page.meta.title.zh, page.meta.title.en], d: [page.meta.description.zh, page.meta.description.en],
  x: [textOf(html, 'zh').slice(0, 2400), textOf(html, 'en').slice(0, 3600)],
}));
fs.writeFileSync(path.join(ROOT, 'assets', 'search-index.js'), `window.CV_SEARCH=${JSON.stringify(index)};\n`);

// ---------- checks ----------
const names = new Set(pages.map((p) => p.name + '.html'));
for (const { page, html } of built) {
  const zh = (html.match(/<span data-zh\b/g) || []).length;
  const en = (html.match(/<span data-en\b/g) || []).length;
  if (zh !== en) warn(page.name, `language spans do not pair up (zh ${zh}, en ${en})`);
  const seen = new Set();
  for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (seen.has(url)) continue;
    seen.add(url);
    if (/^(https?:|mailto:|tel:|data:|#|javascript:)/.test(url)) continue;
    const file = url.split(/[?#]/)[0];
    if (!file) continue;
    if (file.endsWith('.html') ? !names.has(file) : !fs.existsSync(path.join(ROOT, file))) warn(page.name, `broken link or asset: ${url}`);
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) warn(page.name, `duplicate id(s): ${[...new Set(dup)].join(', ')}`);
  if ((html.match(/<h1\b/g) || []).length !== 1) warn(page.name, `expected exactly one <h1>, found ${(html.match(/<h1\b/g) || []).length}`);
  if (/TODO|lorem ipsum|待补充/i.test(html)) warn(page.name, 'placeholder text found');
}

if (!process.argv.includes('--check')) {
  for (const { page, html } of built) fs.writeFileSync(path.join(ROOT, page.name + '.html'), html);
}
console.log(`${process.argv.includes('--check') ? 'Checked' : 'Built'} ${built.length} pages, ${posts.length} posts. css ${cssV}, js ${jsV}.`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n- ` + problems.join('\n- '));
  process.exitCode = 1;
}
