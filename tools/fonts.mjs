#!/usr/bin/env node
// Subsets the web fonts to the characters the built pages actually use.
// Run after changing any text: node tools/fonts.mjs --src <folder with the source font files>
// Needs: Playwright (for Chromium) and Python with fonttools + brotli (pip install fonttools brotli).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'fonts.json'), 'utf8'));
const argv = process.argv.slice(2);
const srcDir = path.resolve(argv[argv.indexOf('--src') + 1] || path.join(ROOT, 'tools', '.font-src'));
const outDir = path.join(ROOT, 'assets', 'fonts');
if (!fs.existsSync(srcDir)) { console.error(`Source font folder not found: ${srcDir}\nSee README.md, "字体" section.`); process.exit(1); }

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = (await import('module')).createRequire(import.meta.url)('playwright')); }

// 1. collect characters per (family, weight) from every built page
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const families = cfg.fonts.map((f) => f.family);
const used = new Map(); // "family|weight|style" -> Set of chars
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
for (const file of pages) for (const lang of ['zh', 'en']) {
  await page.goto(pathToFileURL(path.join(ROOT, file)).href + '?lang=' + lang, { waitUntil: 'load' });
  const rows = await page.evaluate(({ fams, lang }) => {
    const out = {};
    const other = lang === 'zh' ? 'data-en' : 'data-zh';
    const add = (el, text) => {
      if (!text || !text.trim()) return;
      if (el.closest('[' + other + ']')) return; // text of the language that is not showing
      const cs = getComputedStyle(el);
      const stack = cs.fontFamily.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
      const mine = stack.filter((s) => fams.includes(s));
      if (!mine.length) return;
      const key = mine.join('>') + '|' + cs.fontWeight + '|' + cs.fontStyle;
      out[key] = (out[key] || '') + text;
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const p = n.parentElement;
      if (!p || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName)) continue;
      add(p, n.nodeValue);
    }
    document.querySelectorAll('[placeholder]').forEach((el) => add(el, el.getAttribute('data-' + lang + '-placeholder') || el.getAttribute('placeholder')));
    document.querySelectorAll('option').forEach((el) => add(el, el.getAttribute('data-' + lang + '-label') || el.textContent));
    return out;
  }, { fams: families, lang });
  for (const [key, text] of Object.entries(rows)) {
    const [stack, weight, style] = key.split('|');
    const stackFams = stack.split('>');
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp < 0x20) continue;
      // each character goes to the first family in the stack that covers it
      const fam = stackFams.find((f) => covers(cfg.fonts.find((x) => x.family === f).covers, cp));
      if (!fam) continue;
      const k = `${fam}|${weight}|${style}`;
      if (!used.has(k)) used.set(k, new Set());
      used.get(k).add(ch);
    }
  }
}
await browser.close();

// 2. subset each declared font file to the union of what its weights need
fs.mkdirSync(outDir, { recursive: true });
const report = [];
const outputs = new Map(); // output file -> { src, chars }
for (const font of cfg.fonts) {
  for (const face of font.faces) {
    if (!outputs.has(face.out)) outputs.set(face.out, { src: face.src, chars: new Set() });
    const chars = outputs.get(face.out).chars;
    for (const c of cfg.always[font.covers] || '') chars.add(c);
    for (const [k, set] of used) {
      const [fam, weight, style] = k.split('|');
      if (fam !== font.family) continue;
      if ((face.style || 'normal') !== style) continue;
      const w = Number(weight);
      const hit = face.weights ? (w >= face.weights[0] && w <= face.weights[1]) : nearest(font.faces.filter((f) => (f.style || 'normal') === style).map((f) => f.weight), w) === face.weight;
      if (hit) for (const c of set) chars.add(c);
    }
  }
}
for (const [outName, { src: srcName, chars }] of outputs) {
  {
    const face = { src: srcName, out: outName };
    const src = path.join(srcDir, face.src);
    if (!fs.existsSync(src)) { console.error(`Missing source font: ${src}`); process.exit(1); }
    const textFile = path.join(outDir, '.chars.txt');
    fs.writeFileSync(textFile, [...chars].join(''));
    const out = path.join(outDir, face.out);
    execFileSync('python3', ['-m', 'fontTools.subset', src, `--text-file=${textFile}`, `--output-file=${out}`, '--flavor=woff2',
      '--layout-features=*', '--no-hinting', '--desubroutinize', '--notdef-outline', '--name-IDs=1,2,4,6'], { stdio: 'inherit' });
    fs.unlinkSync(textFile);
    report.push(`${face.out}: ${chars.size} characters, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  }
}
console.log(report.join('\n'));

// "basic": ASCII and Latin-1 only (used in Chinese text, so dashes and ellipses come from the Chinese face);
// "latin": everything below the CJK blocks; "cjk": catches whatever is left.
function covers(kind, cp) {
  if (kind === 'basic') return cp <= 0xFF;
  if (kind === 'latin') return cp < 0x2E80;
  return true;
}

function nearest(list, w) {
  return list.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), list[0]);
}
