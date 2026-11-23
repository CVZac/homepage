// Plates: the site's artwork, drawn in code at build time.
// One vocabulary throughout: orbital diagrams in thin ink lines, the way an astronomy atlas draws them.
// Each plate is a diagram of its subject. Styling (line weights, colours, grain, plate mark) is in src/styles/50-plates.css.
const rad = (d) => (d * Math.PI) / 180;
const f = (n) => +(+n).toFixed(2);
let serial = 0;
const uid = (p) => `${p}${++serial}`;

// ---------- drawing helpers ----------
function pt(o, tdeg) {
  const a = rad(tdeg), r = rad(o.rot || 0);
  const x = o.rx * Math.cos(a), y = o.ry * Math.sin(a);
  return [o.cx + x * Math.cos(r) - y * Math.sin(r), o.cy + x * Math.sin(r) + y * Math.cos(r)];
}
const ell = (o, cls = 'pl-ln') =>
  `<ellipse class="${cls}" cx="${f(o.cx)}" cy="${f(o.cy)}" rx="${f(o.rx)}" ry="${f(o.ry)}"${o.rot ? ` transform="rotate(${o.rot} ${f(o.cx)} ${f(o.cy)})"` : ''}/>`;
const circ = (cx, cy, r, cls = 'pl-ln') => `<circle class="${cls}" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;
const line = (x1, y1, x2, y2, cls = 'pl-ln') => `<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
const body = (o, tdeg, r, cls = 'pl-body') => { const [x, y] = pt(o, tdeg); return circ(x, y, r, cls); };
const ring = (cx, cy, r) => ({ cx, cy, rx: r, ry: r });
function arc(o, t0, t1) {
  const [x0, y0] = pt(o, t0), [x1, y1] = pt(o, t1);
  return `M${f(x0)} ${f(y0)}A${f(o.rx)} ${f(o.ry)} ${o.rot || 0} ${Math.abs(t1 - t0) > 180 ? 1 : 0} ${t1 > t0 ? 1 : 0} ${f(x1)} ${f(y1)}`;
}
const arcPath = (o, t0, t1, cls = 'pl-ln') => `<path class="${cls}" d="${arc(o, t0, t1)}"/>`;
function ticks(cx, cy, r0, r1, step, cls = 'pl-ln', from = 0, to = 360) {
  let s = '';
  for (let a = from; a < to; a += step) {
    const c = Math.cos(rad(a)), q = Math.sin(rad(a));
    s += line(cx + r0 * c, cy + r0 * q, cx + r1 * c, cy + r1 * q, cls);
  }
  return s;
}
const hatch = (id, gap, angle) =>
  `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><line class="pl-hatch" x1="${gap / 2}" y1="0" x2="${gap / 2}" y2="${gap}"/></pattern>`;
const cross = (x, y, r = 4) => line(x - r, y, x + r, y) + line(x, y - r, x, y + r);

// ---------- diagrams ----------
// Each returns { w, h, fx, fy, s }: native size, the point of interest (kept in view when cropped), and the drawing.

// the logo's own construction
function about() {
  const cx = 160, cy = 200, e = { cx, cy, rx: 122, ry: 50.7, rot: -30 };
  let s = circ(cx, cy, 122, 'pl-ln-s') + line(18, cy, 302, cy, 'pl-ln-s');
  const [a0x, a0y] = pt({ ...e, ry: 0, rx: 150 }, 180), [a1x, a1y] = pt({ ...e, ry: 0, rx: 150 }, 0);
  s += line(a0x, a0y, a1x, a1y, 'pl-ln-d');
  const m = { cx, cy, rx: 0, ry: 78, rot: -30 };
  const [m0x, m0y] = pt(m, 90), [m1x, m1y] = pt(m, 270);
  s += line(m0x, m0y, m1x, m1y, 'pl-ln-d');
  s += arcPath(ring(cx, cy, 86), 0, -30);
  s += ell(e) + circ(cx, cy, 35.6, 'pl-fill') + body(e, 0, 27, 'pl-body');
  return { w: 320, h: 400, fx: cx, fy: cy, s };
}

// conjunction: everything lined up on one radius (the charter)
function conjunction() {
  const cx = 160, cy = 200, R = [30, 58, 86, 114];
  let s = ticks(cx, cy, 134, 140, 6, 'pl-ln-s') + ticks(cx, cy, 130, 140, 30, 'pl-ln') + circ(cx, cy, 140, 'pl-ln-s');
  const a = -58, c = Math.cos(rad(a)), q = Math.sin(rad(a));
  s += line(cx, cy, cx + 140 * c, cy + 140 * q) + line(cx - 140 * c, cy - 140 * q, cx, cy, 'pl-ln-d');
  R.forEach((r) => { s += circ(cx, cy, r); });
  s += circ(cx, cy, 8, 'pl-fill');
  R.forEach((r, i) => { s += circ(cx + r * c, cy + r * q, [3.5, 4.5, 5.5, 6.5][i], 'pl-body'); });
  return { w: 320, h: 400, fx: cx, fy: cy, s };
}

// four coaxial tiers, shaded more densely as the data gets more sensitive (deployment levels D1 to D4)
function tiers() {
  const cx = 160, ys = [86, 162, 238, 314], a = uid('h'), b = uid('h'), c = uid('h');
  let s = `<defs>${hatch(a, 10, 35)}${hatch(b, 6, 35)}${hatch(c, 3.4, 35)}</defs>`;
  s += line(cx, 36, cx, 364, 'pl-ln-d') + line(cx - 7, 36, cx + 7, 36) + line(cx - 7, 364, cx + 7, 364);
  ys.forEach((y, i) => {
    const e = { cx, cy: y, rx: 108, ry: 28 };
    if (i > 0) s += `<ellipse cx="${cx}" cy="${y}" rx="108" ry="28" fill="url(#${[a, b, c][i - 1]})"/>`;
    s += ell(e) + circ(cx, y, 3, 'pl-fill') + body(e, [205, 40, 140, 320][i], [3.6, 4.6, 5.6, 6.6][i]);
  });
  return { w: 320, h: 400, fx: cx, fy: 200, s };
}

// a steady circular orbit against a long eccentric one (dependable before novel)
function steady() {
  const nx = 118, ny = 282, dir = -55, a = 150, b = 62, c = Math.sqrt(a * a - b * b);
  const ecx = nx + c * Math.cos(rad(dir)), ecy = ny + c * Math.sin(rad(dir));
  const e = { cx: ecx, cy: ecy, rx: a, ry: b, rot: dir };
  const [fx, fy] = pt({ ...e, ry: 0, rx: a + 14 }, 0), [gx, gy] = pt({ ...e, ry: 0, rx: a + 14 }, 180);
  let s = line(gx, gy, fx, fy, 'pl-ln-s') + ell(e, 'pl-ln-dash') + circ(nx, ny, 70) + circ(nx, ny, 9, 'pl-fill');
  s += circ(2 * ecx - nx, 2 * ecy - ny, 2, 'pl-fill');
  s += body(ring(nx, ny, 70), 150, 6.5) + body(e, 14, 4, 'pl-body pl-body--hollow');
  return { w: 320, h: 400, fx: 160, fy: 210, s };
}

// armillary: a framework that holds (enterprise infrastructure)
function armillary() {
  const cx = 320, cy = 240, R = 168;
  let g = circ(cx, cy, R);
  [58, 118].forEach((rx) => { g += ell({ cx, cy, rx, ry: R }); });
  g += ell({ cx, cy, rx: R, ry: 50 });
  [-92, 92].forEach((dy) => { const w = Math.sqrt(R * R - dy * dy); g += ell({ cx, cy: cy + dy, rx: w, ry: f((w * 50) / R) }, 'pl-ln-s'); });
  g += line(cx, cy - 214, cx, cy + 214, 'pl-ln-d') + line(cx - 8, cy - 214, cx + 8, cy - 214) + line(cx - 8, cy + 214, cx + 8, cy + 214);
  g += circ(cx, cy, 8, 'pl-fill') + body({ cx, cy, rx: R, ry: 50 }, 52, 6);
  const s = ticks(cx, cy, 186, 192, 5, 'pl-ln-s') + ticks(cx, cy, 182, 192, 30, 'pl-ln') + circ(cx, cy, 192, 'pl-ln-s') + `<g transform="rotate(-20 ${cx} ${cy})">${g}</g>`;
  return { w: 640, h: 480, fx: cx, fy: cy, s };
}

// many small systems, each with its own orbit, in step (accessible computing)
function many() {
  let s = '';
  const cols = 5, rows = 3, x0 = 100, y0 = 116, dx = 110, dy = 124;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, cx = x0 + c * dx, cy = y0 + r * dy, e = { cx, cy, rx: 36, ry: 15, rot: -30 };
    s += ell(e) + circ(cx, cy, 4, 'pl-fill') + body(e, -i * 24, 3.2);
  }
  return { w: 640, h: 480, fx: 320, fy: 240, s };
}

// equal areas in equal times: a claim checked by measurement (validation)
function areas() {
  const cx = 336, cy = 240, a = 232, b = 152, c = Math.sqrt(a * a - b * b), ecc = c / a;
  const e = { cx, cy, rx: a, ry: b, rot: -10 };
  const fpt = pt({ ...e, ry: 0, rx: c }, 180);
  const N = 14, E = [];
  for (let i = 0; i < N; i++) {
    const M = (i / N) * 2 * Math.PI; let x = M;
    for (let j = 0; j < 30; j++) x = x - (x - ecc * Math.sin(x) - M) / (1 - ecc * Math.cos(x));
    E.push(180 + (x * 180) / Math.PI);
  }
  const id = uid('h');
  let s = `<defs>${hatch(id, 5, 40)}</defs>`;
  const sector = (i) => { const p0 = pt(e, E[i]), p1 = pt(e, E[(i + 1) % N]);
    return `<path d="M${f(fpt[0])} ${f(fpt[1])}L${f(p0[0])} ${f(p0[1])}A${a} ${b} ${e.rot} 0 1 ${f(p1[0])} ${f(p1[1])}Z" fill="url(#${id})"/>`; };
  s += sector(0) + sector(7);
  const [v0x, v0y] = pt({ ...e, ry: 0, rx: a + 22 }, 180), [v1x, v1y] = pt({ ...e, ry: 0, rx: a + 22 }, 0);
  s += line(v0x, v0y, v1x, v1y, 'pl-ln-d');
  E.forEach((d, i) => { const p = pt(e, d); s += line(fpt[0], fpt[1], p[0], p[1], [0, 1, 7, 8].includes(i) ? 'pl-ln' : 'pl-ln-s'); });
  s += ell(e);
  E.forEach((d, i) => { const p = pt(e, d); s += circ(p[0], p[1], i === 0 ? 6 : 2.6, i === 0 ? 'pl-body' : 'pl-fill'); });
  s += circ(fpt[0], fpt[1], 9, 'pl-fill');
  const f2 = pt({ ...e, ry: 0, rx: c }, 0);
  s += cross(f2[0], f2[1]);
  return { w: 640, h: 480, fx: 320, fy: 240, s };
}

// transfer to a higher orbit (venture capital access)
function transfer() {
  const cx = 320, cy = 244, r1 = 66, r2 = 186, a = (r1 + r2) / 2, b = Math.sqrt(r1 * r2), off = (r2 - r1) / 2;
  const tr = { cx: cx + off, cy, rx: a, ry: b };
  let g = circ(cx, cy, r1) + circ(cx, cy, r2) + arcPath(tr, 180, 360, 'pl-ln-dash') + line(cx - r1 - 26, cy, cx + r2 + 26, cy, 'pl-ln-s');
  g += circ(cx, cy, 9, 'pl-fill') + body(ring(cx, cy, r1), 180, 5.5) + body(tr, 262, 4, 'pl-fill') + body(ring(cx, cy, r2), 0, 7, 'pl-body pl-body--hollow');
  g += ticks(cx, cy, r2 + 8, r2 + 14, 6, 'pl-ln-s', 300, 361);
  return { w: 640, h: 480, fx: cx, fy: 240, s: `<g transform="rotate(-24 ${cx} ${cy})">${g}</g>` };
}

// one body on its own path, with AI, computing and capital in orbit around it (independent entrepreneurs)
function solo() {
  const ox = 590, oy = 1000, R = 790;
  const yAt = (x, r) => oy - Math.sqrt(r * r - (x - ox) * (x - ox));
  const arcP = (r) => `M-10 ${f(yAt(-10, r))}A${r} ${r} 0 0 1 650 ${f(yAt(650, r))}`;
  let s = `<path class="pl-ln-s" d="${arcP(R - 74)}"/><path class="pl-ln-s" d="${arcP(R + 74)}"/><path class="pl-ln" d="${arcP(R)}"/>`;
  const bx = 372, by = yAt(372, R);
  [[46, 19, 30, 3], [80, 33, 165, 3.6], [118, 49, 285, 4.4]].forEach(([rx, ry, tt, r]) => { const e = { cx: bx, cy: by, rx, ry, rot: -30 }; s += ell(e) + body(e, tt, r); });
  s += circ(bx, by, 11, 'pl-fill');
  for (let x = 60; x < 640; x += 58) { if (Math.abs(x - bx) < 130) continue; const y = yAt(x, R), dxn = (x - ox) / R, dyn = (y - oy) / R; s += line(x - dxn * 5, y - dyn * 5, x + dxn * 5, y + dyn * 5); }
  return { w: 640, h: 480, fx: 340, fy: 240, s };
}

// first light over a horizon (a launch)
function horizon() {
  const cx = 320, cy = 318;
  let s = line(28, cy, 612, cy);
  [58, 106, 154, 202].forEach((r, i) => { s += arcPath(ring(cx, cy, r), 180, 360, i % 2 ? 'pl-ln-s' : 'pl-ln'); });
  s += ticks(cx, cy, 216, 222, 6, 'pl-ln-s', 180, 361) + ticks(cx, cy, 212, 222, 30, 'pl-ln', 180, 361);
  s += line(cx, cy, cx, cy - 236, 'pl-ln-d');
  const a = 312;
  s += line(cx, cy, cx + 202 * Math.cos(rad(a)), cy + 202 * Math.sin(rad(a)), 'pl-ln-s');
  s += circ(cx, cy, 10, 'pl-fill') + body(ring(cx, cy, 154), a, 6.5) + body(ring(cx, cy, 58), 228, 3.6);
  [96, 180, 460, 544].forEach((x) => { s += line(x, cy - 4, x, cy + 4); });
  return { w: 640, h: 480, fx: cx, fy: 250, s };
}

// two bodies around one centre (two names, one company)
function binary() {
  const cx = 320, cy = 240, r1 = 54, r2 = 150, a = -24;
  let g = circ(cx, cy, 196, 'pl-ln-s') + ticks(cx, cy, 190, 196, 6, 'pl-ln-s') + circ(cx, cy, r1) + circ(cx, cy, r2);
  g += line(cx - r1 - 0, cy, cx + r2, cy, 'pl-ln-d') + cross(cx, cy, 5);
  g += body(ring(cx, cy, r1), 180, 13) + body(ring(cx, cy, r2), 0, 7);
  g += arcPath(ring(cx, cy, r2 + 18), -16, 16, 'pl-ln-s') + arcPath(ring(cx, cy, r1 + 22), 164, 196, 'pl-ln-s');
  return { w: 640, h: 480, fx: cx, fy: cy, s: `<g transform="rotate(${a} ${cx} ${cy})">${g}</g>` };
}

// five orbits round one nucleus: three bodies to one side, two to the other (the five practices)
function five() {
  const cx = 320, cy = 240, rot = -14, k = 0.42;
  const ax = { cx, cy, rx: 300, ry: 0, rot };
  const [x0, y0] = pt(ax, 180), [x1, y1] = pt(ax, 0);
  let s = line(30, cy, 610, cy, 'pl-ln-s') + line(x0, y0, x1, y1, 'pl-ln-d');
  [[76, 150, 4, 0], [124, 208, 4.6, 0], [174, 122, 5.4, 0], [226, 318, 5, 1], [282, 24, 6, 1]].forEach(([rx, t, r, hollow]) => {
    const e = { cx, cy, rx, ry: f(rx * k), rot };
    s += ell(e) + body(e, t, r, hollow ? 'pl-body pl-body--hollow' : 'pl-body');
  });
  s += circ(cx, cy, 20, 'pl-ln-dot') + circ(cx, cy, 8, 'pl-fill');
  return { w: 640, h: 480, fx: cx, fy: cy, s };
}

// four quantities measured before anything is chosen (size the workload)
function gauge() {
  const cx = 320, cy = 246;
  let s = ticks(cx, cy, 190, 196, 3, 'pl-ln-s') + ticks(cx, cy, 184, 196, 15, 'pl-ln') + circ(cx, cy, 196, 'pl-ln-s');
  [[64, 250], [100, 148], [136, 312], [172, 206]].forEach(([r, sweep], i) => {
    const o = ring(cx, cy, r), end = -90 + sweep;
    s += circ(cx, cy, r, 'pl-ln-s') + arcPath(o, -90, end) + body(o, end, [3.6, 4.4, 5.2, 6][i]);
    const c = Math.cos(rad(end)), q = Math.sin(rad(end));
    s += line(cx + (r - 9) * c, cy + (r - 9) * q, cx + (r + 9) * c, cy + (r + 9) * q);
  });
  s += line(cx, cy, cx, cy - 196, 'pl-ln-d') + circ(cx, cy, 8, 'pl-fill');
  return { w: 640, h: 480, fx: cx, fy: 240, s };
}

// own, rent, share: one solid orbit, one dashed, one carrying several bodies (compute economics)
function three() {
  const y = 240, r = 66;
  let s = line(40, y + 112, 600, y + 112, 'pl-ln-s');
  [130, 320, 510].forEach((x, i) => {
    const o = ring(x, y, r);
    s += circ(x, y, r, i === 1 ? 'pl-ln-dash' : 'pl-ln') + circ(x, y, 6, 'pl-fill') + line(x, y + r + 12, x, y + 118, 'pl-ln-d') + line(x - 5, y + 112, x + 5, y + 112);
    if (i === 0) s += body(o, 215, 6);
    if (i === 1) s += body(o, 305, 6, 'pl-body pl-body--hollow');
    if (i === 2) [200, 320, 80].forEach((t) => { s += body(o, t, 4.4); });
    s += arcPath(ring(x, y, r + 16), -120, -60, 'pl-ln-s');
  });
  return { w: 640, h: 480, fx: 320, fy: 240, s };
}

// five preparations on five rising orbits, then departure (before you raise)
function ascent() {
  const cx = 286, cy = 262, R = [42, 80, 118, 156, 194], A = [152, 112, 72, 32, -8];
  let s = '';
  const P = R.map((r, i) => [cx + r * Math.cos(rad(A[i])), cy + r * Math.sin(rad(A[i]))]);
  R.forEach((r) => { s += circ(cx, cy, r, 'pl-ln'); });
  s += `<path class="pl-ln-d" d="M${P.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}"/>`;
  const last = P[4], tx = -Math.sin(rad(A[4])), ty = Math.cos(rad(A[4]));
  s += line(last[0], last[1], last[0] - tx * 190, last[1] - ty * 190, 'pl-ln-dash');
  s += circ(cx, cy, 8, 'pl-fill');
  P.forEach((p, i) => { s += circ(p[0], p[1], [3.4, 4.2, 5, 5.8, 6.8][i], i === 4 ? 'pl-body pl-body--hollow' : 'pl-body'); });
  s += line(40, cy, 600, cy, 'pl-ln-s');
  return { w: 640, h: 480, fx: 320, fy: 240, s };
}

// a ring of checks, one still open, before the hand reaches the top (launch checklist)
function checks() {
  const cx = 320, cy = 240;
  let s = ticks(cx, cy, 182, 190, 6, 'pl-ln-s') + ticks(cx, cy, 176, 190, 30, 'pl-ln') + circ(cx, cy, 190, 'pl-ln-s') + circ(cx, cy, 150, 'pl-ln-s') + circ(cx, cy, 112);
  const o = ring(cx, cy, 112);
  [-90, -18, 54, 126, 198].forEach((t, i) => {
    const c = Math.cos(rad(t)), q = Math.sin(rad(t));
    s += line(cx + 112 * c, cy + 112 * q, cx + 150 * c, cy + 150 * q, 'pl-ln-s') + body(o, t, 6, i === 4 ? 'pl-body pl-body--hollow' : 'pl-body');
  });
  s += line(cx, cy, cx, cy - 176) + line(cx, cy, cx + 150 * Math.cos(rad(198)), cy + 150 * Math.sin(rad(198)), 'pl-ln-d') + circ(cx, cy, 8, 'pl-fill');
  return { w: 640, h: 480, fx: cx, fy: cy, s };
}

// rings with one sector opened, so the inside can be seen (transparency)
function cutaway() {
  const cx = 160, cy = 204;
  let s = '';
  [36, 68, 100, 132].forEach((r) => { s += arcPath(ring(cx, cy, r), -28, 272); });
  [-28, 272].forEach((t) => { s += line(cx, cy, cx + 148 * Math.cos(rad(t)), cy + 148 * Math.sin(rad(t)), 'pl-ln-s'); });
  [36, 68, 100, 132].forEach((r) => { s += arcPath(ring(cx, cy, r), 272, 332, 'pl-ln-d'); });
  s += circ(cx, cy, 8, 'pl-fill') + body(ring(cx, cy, 68), 300, 4.4) + body(ring(cx, cy, 132), 318, 6) + body(ring(cx, cy, 100), 150, 5);
  s += ticks(cx, cy, 144, 150, 6, 'pl-ln-s', 272, 333);
  return { w: 320, h: 400, fx: cx, fy: 204, s };
}

// three bodies on one orbit, evenly spaced (the team's three strengths)
function trio() {
  const cx = 320, cy = 240, e = { cx, cy, rx: 212, ry: 92, rot: -18 };
  let s = line(30, cy, 610, cy, 'pl-ln-s') + ell({ ...e, rx: 110, ry: 47 }, 'pl-ln-s') + ell(e);
  const P = [20, 140, 260].map((t) => pt(e, t));
  s += `<path class="pl-ln-d" d="M${P.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z"/>`;
  s += circ(cx, cy, 9, 'pl-fill');
  P.forEach((p, i) => { s += circ(p[0], p[1], [7, 6, 5][i], 'pl-body'); });
  return { w: 640, h: 480, fx: cx, fy: cy, s };
}

// a quiet sky: orbits with no bodies yet (nothing scheduled)
function quiet() {
  const cx = 320, cy = 240;
  let s = line(30, cy, 610, cy, 'pl-ln-s');
  [70, 122, 174].forEach((r) => { s += ell({ cx, cy, rx: r, ry: f(r * 0.42), rot: -14 }, 'pl-ln-dash'); });
  s += circ(cx, cy, 8, 'pl-fill') + ticks(cx, cy, 214, 220, 10, 'pl-ln-s');
  return { w: 640, h: 480, fx: cx, fy: cy, s };
}

const DIAGRAMS = { about, conjunction, tiers, steady, armillary, many, areas, transfer, solo, horizon, binary, five, gauge, three, ascent, checks, cutaway, trio, quiet };

// Which diagram a seed gets. First match wins; anything else is spread across the general-purpose set by hash.
const RULES = [
  [/new-website|launch/, 'horizon'], [/cv-etron-group|name|rename/, 'binary'], [/five-practices|practices?$|overview/, 'five'],
  [/size-the-workload|workload/, 'gauge'], [/buy-rent-share|economics/, 'three'], [/validate|validation/, 'areas'],
  [/before-you-raise|raise|capital/, 'transfer'], [/before-launch|checklist|engineering/, 'checks'],
  [/core-views|views|perspectives/, 'steady'], [/charter/, 'conjunction'], [/delivery|levels|security/, 'tiers'],
  [/transparency/, 'cutaway'], [/about|company/, 'about'], [/team/, 'trio'], [/events/, 'quiet'],
  [/infrastructure|infra/, 'armillary'], [/compute/, 'many'], [/founders|solo|futures/, 'solo'], [/careers/, 'five'],
];
const GENERAL = ['five', 'armillary', 'areas', 'transfer', 'binary', 'trio', 'gauge', 'conjunction', 'steady'];
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function kindFor(kind, seed) {
  if (kind && kind !== 'auto' && DIAGRAMS[kind]) return kind;
  const key = String(seed).replace(/\.html$/, '');
  if (key.startsWith('research-before-you-raise')) return 'ascent';
  for (const [re, k] of RULES) if (re.test(key)) return k;
  return GENERAL[hash(key) % GENERAL.length];
}

// Fits a diagram into a plate of the given ratio. Lines keep their weight however the drawing is scaled.
export function renderPlate({ kind = 'auto', seed = 'plate', ratio = '4x5' } = {}) {
  const k = kindFor(kind, seed);
  const d = DIAGRAMS[k]();
  const [rw, rh] = ratio.split('x').map(Number);
  const OH = 400, OW = Math.round((OH * rw) / rh);
  const meet = Math.min(OW / d.w, OH / d.h), slice = Math.max(OW / d.w, OH / d.h);
  const mismatch = slice / meet; // 1 when the ratios agree
  const cover = mismatch > 2.2 ? 0.52 : mismatch > 1.5 ? 0.42 : 0.3;
  const sc = Math.pow(meet, 1 - cover) * Math.pow(slice, cover) * (mismatch < 1.15 ? 0.96 : 1);
  const tx = OW / 2 - d.fx * sc, ty = OH / 2 - d.fy * sc;
  return `<svg class="plate__art" viewBox="0 0 ${OW} ${OH}" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" data-plate="${k}"><g transform="translate(${f(tx)} ${f(ty)}) scale(${f(sc)})">${d.s}</g></svg>`;
}

// ---------- hero: people at the nucleus, the five practices inscribed along five orbits ----------
const NAMES = [
  ['企业级 AI 基础设施', 'Enterprise-Grade AI Infrastructure'],
  ['中小企业普惠算力', 'Accessible Computing for SMBs'],
  ['AI 商业验证', 'AI-Powered Business Validation'],
  ['早期创业融资对接', 'Venture Capital Access for Early-Stage Startups'],
  ['赋能独立创业者', 'Empowering Independent Entrepreneurs'],
];
export function heroWide() {
  const W = 1280, H = 640, cx = 640, cy = 320, rot = -14, k = 0.42;
  const O = [
    { rx: 164, p: 1, lt: 270, side: 'top', b: 150, r: 5.5, T: 150 },
    { rx: 258, p: 2, lt: 96, side: 'bot', b: 318, r: 6.5, T: 290 },
    { rx: 358, p: 0, lt: 250, side: 'top', b: 42, r: 7.5, T: 470, accent: true },
    { rx: 466, p: 4, lt: 300, side: 'top', b: 196, r: 6, T: 700 },
    { rx: 578, p: 3, lt: 108, side: 'bot', b: 262, r: 8.5, T: 960 },
  ];
  let s = line(34, cy, W - 34, cy, 'pl-ln-s');
  const ax = { cx, cy, rx: 606, ry: 0, rot };
  const [ax0, ay0] = pt(ax, 180), [ax1, ay1] = pt(ax, 0);
  s += line(ax0, ay0, ax1, ay1, 'pl-ln-d');
  let defs = '', labels = '', bodies = '';
  O.forEach((o, i) => {
    const e = { cx, cy, rx: o.rx, ry: f(o.rx * k), rot };
    s += ell(e);
    const span = Math.min(62, 9000 / o.rx + 14), id = `hero-orbit-${i}`;
    defs += `<path id="${id}" d="${o.side === 'top' ? arc(e, o.lt - span, o.lt + span) : arc(e, o.lt + span, o.lt - span)}"/>`;
    const dy = o.side === 'top' ? -9 : 18, [zh, en] = NAMES[o.p];
    labels += `<text class="pl-label pl-label--zh" dy="${dy}" data-zh><textPath href="#${id}" startOffset="50%" text-anchor="middle">${zh}</textPath></text>`;
    labels += `<text class="pl-label" dy="${dy}" data-en><textPath href="#${id}" startOffset="50%" text-anchor="middle">${en}</textPath></text>`;
    const [bx, by] = pt(e, o.b);
    bodies += `<circle class="pl-body${o.accent ? ' pl-body--accent' : ''}" cx="${f(bx)}" cy="${f(by)}" r="${o.r}" data-orbit="${cx} ${cy} ${e.rx} ${e.ry} ${rot} ${o.b} ${o.T}"/>`;
  });
  s += circ(cx, cy, 30, 'pl-ln-dot') + circ(cx, cy, 11, 'pl-fill');
  labels += `<text class="pl-label pl-label--core pl-label--zh" x="${cx + 44}" y="${cy + 4.5}" data-zh>人</text><text class="pl-label pl-label--core" x="${cx + 44}" y="${cy + 4}" data-en>People</text>`;
  return `<svg class="plate__art plate__art--wide" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="{{轨道图：人在核心，五条业务线沿五条轨道环绕||Orbit chart: people at the nucleus, the five practices on five orbits around them}}"><defs>${defs}</defs>${s}<g class="pl-labels">${labels}</g>${bodies}</svg>`;
}
export function heroTall() {
  const W = 350, H = 438, cx = 175, cy = 219, rot = -58, k = 0.42;
  const O = [{ rx: 62, b: 150, r: 4, T: 150 }, { rx: 100, b: 318, r: 4.5, T: 290 }, { rx: 140, b: 60, r: 5.5, T: 470, accent: true }, { rx: 184, b: 196, r: 4.5, T: 700 }, { rx: 232, b: 262, r: 6, T: 960 }];
  let s = line(18, cy, W - 18, cy, 'pl-ln-s');
  const ax = { cx, cy, rx: 246, ry: 0, rot };
  const [ax0, ay0] = pt(ax, 180), [ax1, ay1] = pt(ax, 0);
  s += line(ax0, ay0, ax1, ay1, 'pl-ln-d');
  let bodies = '';
  O.forEach((o) => {
    const e = { cx, cy, rx: o.rx, ry: f(o.rx * k), rot };
    s += ell(e);
    const [bx, by] = pt(e, o.b);
    bodies += `<circle class="pl-body${o.accent ? ' pl-body--accent' : ''}" cx="${f(bx)}" cy="${f(by)}" r="${o.r}" data-orbit="${cx} ${cy} ${e.rx} ${e.ry} ${rot} ${o.b} ${o.T}"/>`;
  });
  s += circ(cx, cy, 16, 'pl-ln-dot') + circ(cx, cy, 7, 'pl-fill');
  return `<svg class="plate__art plate__art--tall" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">${s}${bodies}</svg>`;
}
