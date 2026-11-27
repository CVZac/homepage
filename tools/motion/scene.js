// WebGL views for the site. One renderer, one fixed full-viewport canvas; every element with
// data-3d="kind" is drawn into its own rectangle with the scissor test, so there is only one GL context.
// Rendering stops when no view is on screen or the tab is hidden. Lines below stay plain ES2019.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarse = window.matchMedia('(pointer: coarse)').matches;
const els = Array.from(document.querySelectorAll('[data-3d]'));

const C = {
  white: 0xf3f3f1, grey: 0xd9d9d5, mid: 0xb9b9b4, ink: 0x141414,
  orange: 0xff5b14, amber: 0xffb020, screen: 0x1b100c,
};

function boot() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { root.classList.add('no-webgl'); return; }
  if (!renderer.getContext()) { root.classList.add('no-webgl'); return; }

  const canvas = renderer.domElement;
  canvas.className = 'gl';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  renderer.setClearColor(0x000000, 0);
  renderer.setScissorTest(true);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const maxDpr = coarse ? 1.5 : 1.75;
  let W = 0, H = 0;
  function resize() {
    W = root.clientWidth; H = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(W, H, false);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // pointer in viewport pixels, shared by every view
  const pointer = { x: W / 2, y: H / 2, active: false };
  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; }, { passive: true });

  const views = els.map((el) => {
    const make = KINDS[el.getAttribute('data-3d')];
    if (!make) return null;
    const v = make(el, env);
    v.el = el; v.visible = false;
    return v;
  }).filter(Boolean);
  if (!views.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { const v = views.find((x) => x.el === en.target); if (v) v.visible = en.isIntersecting; });
    schedule();
  }, { rootMargin: '80px 0px' });
  views.forEach((v) => io.observe(v.el));

  let raf = 0, last = performance.now(), time = 0, rendered = false;
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduced.matches) time += dt;
    renderer.setScissor(0, 0, W, H); renderer.setViewport(0, 0, W, H); renderer.clear();
    let any = false;
    for (const v of views) {
      if (!v.visible) continue;
      const r = v.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.width < 2 || r.height < 2) continue;
      any = true;
      const y = H - r.bottom;
      renderer.setViewport(r.left, y, r.width, r.height);
      renderer.setScissor(r.left, y, r.width, r.height);
      if (v.w !== r.width || v.h !== r.height) { v.w = r.width; v.h = r.height; v.resize(r.width, r.height); }
      v.update(time, reduced.matches ? 0 : dt, pointer, r);
      renderer.render(v.scene, v.camera);
    }
    if (!rendered) { rendered = true; root.classList.add('gl-ready'); }
    if (any) schedule();
  }
  function schedule() { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('pointermove', schedule, { passive: true });
  schedule();
}

// ---------- helpers ----------
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
function cam(fov) { return new THREE.PerspectiveCamera(fov, 1, 0.1, 50); }
function fit(camera, w, h, baseW) {
  camera.aspect = w / h;
  // keep the subject the same apparent size on narrow viewports
  camera.zoom = Math.min(1, (w / h) / baseW);
  camera.updateProjectionMatrix();
}
function look(p, r) {
  // pointer relative to the view centre, roughly -1..1 (clamped)
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const s = Math.max(r.width, r.height) * 0.8;
  return { x: Math.max(-1.5, Math.min(1.5, (p.x - cx) / s)), y: Math.max(-1.5, Math.min(1.5, (p.y - cy) / s)) };
}
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function screenTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 110, 10, 128, 128, 190);
  gr.addColorStop(0, '#3a1a10'); gr.addColorStop(1, '#120a08');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,170,120,0.16)'; g.lineWidth = 2;
  for (let i = 1; i < 6; i++) { const p = i * 256 / 6; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 256); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(256, p); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function lights(scene, env, key) {
  scene.environment = env;
  const d = new THREE.DirectionalLight(0xffffff, key || 1.4); d.position.set(3, 5, 4); scene.add(d);
  const f = new THREE.DirectionalLight(0xffe2cc, 0.5); f.position.set(-4, 1, 2); scene.add(f);
}
function drag(el) {
  // drag to spin, with inertia; returns a state object read by the view
  const s = { vx: 0, vy: 0, rx: 0, ry: 0, down: false, px: 0, py: 0 };
  el.addEventListener('pointerdown', (e) => { s.down = true; s.px = e.clientX; s.py = e.clientY; el.setPointerCapture(e.pointerId); el.classList.add('is-dragging'); });
  el.addEventListener('pointermove', (e) => {
    if (!s.down) return;
    const dx = e.clientX - s.px, dy = e.clientY - s.py; s.px = e.clientX; s.py = e.clientY;
    s.vy = dx * 0.012; s.vx = dy * 0.012; s.ry += s.vy; s.rx += s.vx;
  });
  const up = () => { s.down = false; el.classList.remove('is-dragging'); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  return s;
}

// ---------- kinds ----------
const KINDS = {
  // the mascot: a glossy head with a screen face, two eyes that follow the pointer, an orbit and its electron
  bot(el, env) {
    const scene = new THREE.Scene(); const camera = cam(30); camera.position.set(0, -0.15, 7.6); camera.lookAt(0, -0.45, 0);
    lights(scene, env, 1.6);
    const white = new THREE.MeshPhysicalMaterial({ color: C.white, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18 });
    const grey = new THREE.MeshStandardMaterial({ color: C.grey, roughness: 0.6 });
    const orange = new THREE.MeshPhysicalMaterial({ color: C.orange, emissive: 0xff4a00, emissiveIntensity: 0.35, roughness: 0.28, clearcoat: 0.6 });
    const amber = new THREE.MeshPhysicalMaterial({ color: C.amber, emissive: 0xff8a00, emissiveIntensity: 0.25, roughness: 0.3, clearcoat: 0.6 });

    const rig = new THREE.Group(); scene.add(rig);
    const head = new THREE.Group(); rig.add(head);
    head.add(new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.56, 1.3, 6, 0.3), white));
    const bezel = new THREE.Mesh(new RoundedBoxGeometry(1.44, 1.32, 0.16, 5, 0.2), orange); bezel.position.z = 0.6; head.add(bezel);
    const rim = new THREE.Mesh(new RoundedBoxGeometry(0.2, 1.0, 0.18, 3, 0.08), amber); rim.position.set(0.66, -0.02, 0.62); head.add(rim);
    const face = new THREE.Mesh(new RoundedBoxGeometry(1.14, 1.04, 0.1, 4, 0.14), new THREE.MeshPhysicalMaterial({ map: screenTexture(), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }));
    face.position.z = 0.67; head.add(face);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 32), grey); knob.rotation.z = Math.PI / 2; knob.position.set(0.93, -0.05, 0); head.add(knob);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeGeo = new THREE.SphereGeometry(0.085, 24, 16);
    const eyes = [-0.2, 0.2].map((x) => { const m = new THREE.Mesh(eyeGeo, eyeMat); m.position.set(x, -0.02, 0.73); m.scale.set(1, 1.15, 0.4); head.add(m); return m; });

    const base = new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.6, 1.7, 4, 0.06), grey); base.position.y = -1.9; rig.add(base);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(2.21, 0.012, 1.71), new THREE.MeshBasicMaterial({ color: C.mid })); seam.position.y = -1.6; rig.add(seam);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.095; rig.add(shadow);

    const orbit = new THREE.Group(); orbit.rotation.set(1.18, 0.0, -0.42); rig.add(orbit);
    orbit.add(new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.008, 6, 200), new THREE.MeshBasicMaterial({ color: C.ink })));
    const electron = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), orange); orbit.add(electron);

    let blink = 2.2, spin = 0, joy = 0;
    el.addEventListener('click', () => { spin = 1; joy = 1.4; });
    return {
      scene, camera,
      resize(w, h) { fit(camera, w, h, 0.9); },
      update(t, dt, p, r) {
        const l = look(p, r);
        const ty = l.x * 0.55 + Math.sin(t * 0.6) * 0.06, tx = l.y * 0.32;
        head.rotation.y = damp(head.rotation.y, ty + spin * Math.PI * 2, 6, dt || 1);
        head.rotation.x = damp(head.rotation.x, tx, 6, dt || 1);
        head.position.y = Math.sin(t * 1.4) * 0.05;
        if (spin > 0) spin = Math.max(0, spin - dt * 1.6);
        if (joy > 0) joy = Math.max(0, joy - dt);
        blink -= dt; if (blink < -0.14) blink = 2.4 + ((t * 7.13) % 2.6);
        const closed = blink < 0 ? 0.12 : 1, happy = joy > 0 ? 0.35 : 1;
        eyes.forEach((e, i) => {
          e.scale.y = damp(e.scale.y, 1.15 * Math.min(closed, happy), 30, dt || 1);
          e.position.x = (i ? 0.2 : -0.2) + l.x * 0.1;
          e.position.y = -0.02 - l.y * 0.08 + (joy > 0 ? 0.04 : 0);
        });
        const a = t * 0.9; electron.position.set(Math.cos(a) * 1.62, Math.sin(a) * 1.62, 0);
        rig.rotation.y = Math.sin(t * 0.25) * 0.08;
      },
    };
  },

  // three orbital rings around a nucleus, white on black; drag to spin
  atom(el, env) {
    const scene = new THREE.Scene(); const camera = cam(30); camera.position.set(0, 0, 6.2);
    lights(scene, env, 1.2);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xececea, roughness: 0.45, clearcoat: 0.4 });
    const g = new THREE.Group(); scene.add(g);
    const tor = new THREE.TorusGeometry(1.15, 0.13, 24, 120);
    [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0.6]].forEach((rot) => { const m = new THREE.Mesh(tor, mat); m.rotation.set(rot[0], rot[1], rot[2]); g.add(m); });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 40, 28), new THREE.MeshPhysicalMaterial({ color: C.orange, emissive: 0xff4a00, emissiveIntensity: 0.3, roughness: 0.3, clearcoat: 1 })));
    const st = drag(el);
    return {
      scene, camera,
      resize(w, h) { fit(camera, w, h, 1); },
      update(t, dt, p, r) {
        if (!st.down) { st.vy = damp(st.vy, 0.006, 2, dt || 1); st.vx = damp(st.vx, 0.002, 2, dt || 1); st.ry += st.vy * (dt ? dt * 60 : 0); st.rx += st.vx * (dt ? dt * 60 : 0); }
        g.rotation.set(0.5 + st.rx, st.ry + t * 0.0, 0.2);
      },
    };
  },

  // practice objects, one per practice, sharing a material language
  rack(el, env) { // enterprise infrastructure: stacked slabs with status lights
    const v = stage(el, env, 30, 6.6);
    const slab = new RoundedBoxGeometry(2.2, 0.34, 1.4, 3, 0.06);
    const lamps = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(slab, i === 2 ? v.orange : v.white); m.position.y = (i - 2) * 0.42; v.g.add(m);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: i === 2 ? 0xffffff : C.orange }));
      lamp.position.set(0.78, (i - 2) * 0.42, 0.71); v.g.add(lamp); lamps.push(lamp);
    }
    v.tick = (t) => { lamps.forEach((l, i) => { l.visible = Math.sin(t * 3 + i * 1.7) > -0.6; }); };
    return v;
  },
  grid(el, env) { // accessible computing: many small units, rising and falling in a wave
    const v = stage(el, env, 30, 7.4);
    const n = 7, geo = new RoundedBoxGeometry(0.26, 0.26, 0.26, 2, 0.04);
    const inst = new THREE.InstancedMesh(geo, v.white, n * n); v.g.add(inst);
    const hot = new THREE.Mesh(geo, v.orange); v.g.add(hot);
    const m = new THREE.Matrix4();
    v.g.rotation.set(0.62, 0.78, 0);
    v.tick = (t) => {
      let k = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = (i - 3) * 0.34, z = (j - 3) * 0.34, y = Math.sin(t * 1.6 + i * 0.6 + j * 0.45) * 0.14;
        m.makeTranslation(x, y, z); inst.setMatrixAt(k++, m);
        if (i === 3 && j === 3) hot.position.set(x, y + 0.34, z);
      }
      inst.instanceMatrix.needsUpdate = true;
    };
    v.spin = 0.12;
    return v;
  },
  cage(el, env) { // business validation: an idea inside a frame of checks
    const v = stage(el, env, 30, 6.4);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2, 2, 2)), new THREE.LineBasicMaterial({ color: C.ink }));
    v.g.add(edges);
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 4), v.orange); v.g.add(ball);
    const corners = [];
    [-1, 1].forEach((x) => [-1, 1].forEach((y) => [-1, 1].forEach((z) => { const c = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.2, 0.2, 2, 0.04), v.white); c.position.set(x, y, z); v.g.add(c); corners.push(c); })));
    v.tick = (t) => { const s = 1 + Math.sin(t * 2.2) * 0.06; ball.scale.setScalar(s); corners.forEach((c, i) => { c.rotation.set(t + i, t * 0.7 + i, 0); }); };
    return v;
  },
  steps(el, env) { // venture capital access: rising steps, a sphere climbing them
    const v = stage(el, env, 30, 7);
    const geo = new RoundedBoxGeometry(0.7, 1, 0.9, 3, 0.05);
    const steps = [];
    for (let i = 0; i < 5; i++) { const h = 0.3 + i * 0.32; const m = new THREE.Mesh(geo, i === 4 ? v.orange : v.white); m.scale.y = h; m.position.set((i - 2) * 0.72, -1 + h / 2, 0); v.g.add(m); steps.push(h); }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 20), new THREE.MeshPhysicalMaterial({ color: C.ink, roughness: 0.25, clearcoat: 1 })); v.g.add(ball);
    v.g.rotation.set(0.25, -0.5, 0);
    v.tick = (t) => {
      const u = (t * 0.5) % 5, i = Math.floor(u), f = u - i;
      const x0 = (i - 2) * 0.72, x1 = (Math.min(i + 1, 4) - 2) * 0.72;
      const y0 = -1 + steps[i] + 0.18, y1 = -1 + steps[Math.min(i + 1, 4)] + 0.18;
      ball.position.set(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * 0.35, 0);
    };
    return v;
  },
  solo(el, env) { // independent entrepreneurs: one body, three satellites (AI, computing, capital)
    const v = stage(el, env, 30, 8.2);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 48, 32), v.orange); v.g.add(core);
    const sats = [];
    [[1.15, 0.2, 1.0], [1.55, -0.5, 0.7], [1.95, 0.9, 0.5]].forEach(([r, tilt, sp], i) => {
      const o = new THREE.Group(); o.rotation.x = 1.2 + tilt; o.rotation.z = tilt; v.g.add(o);
      o.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 160), new THREE.MeshBasicMaterial({ color: C.ink })));
      const s = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.22, 0.22, 2, 0.05), v.white); o.add(s); sats.push([s, r, sp, i * 2]);
    });
    v.tick = (t) => { sats.forEach(([s, r, sp, ph]) => { s.position.set(Math.cos(t * sp + ph) * r, Math.sin(t * sp + ph) * r, 0); s.rotation.set(t, t, 0); }); };
    v.spin = 0.05;
    return v;
  },
};
KINDS['bot-small'] = KINDS.bot;

// shared stage for the practice objects: lights, two materials, a group that eases toward the pointer and can be dragged
function stage(el, env, fov, dist) {
  const scene = new THREE.Scene(); const camera = cam(fov); camera.position.set(0, 0.2, dist);
  lights(scene, env, 1.4);
  const white = new THREE.MeshPhysicalMaterial({ color: C.white, roughness: 0.36, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const orange = new THREE.MeshPhysicalMaterial({ color: C.orange, emissive: 0xff4a00, emissiveIntensity: 0.3, roughness: 0.3, clearcoat: 1 });
  const holder = new THREE.Group(); scene.add(holder);
  const g = new THREE.Group(); holder.add(g);
  const st = drag(el);
  const v = {
    scene, camera, white, orange, g, spin: 0.18, tick: null,
    resize(w, h) { fit(camera, w, h, 1); },
    update(t, dt, p, r) {
      const l = look(p, r);
      if (!st.down) { st.vy = damp(st.vy, 0, 3, dt || 1); st.ry += st.vy + v.spin * dt; st.rx = damp(st.rx, 0, 2, dt || 1); }
      holder.rotation.y = damp(holder.rotation.y, st.ry + l.x * 0.4, 5, dt || 1);
      holder.rotation.x = damp(holder.rotation.x, st.rx + l.y * 0.25, 5, dt || 1);
      if (v.tick) v.tick(t);
    },
  };
  return v;
}

if (els.length) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}
