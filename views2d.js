import * as THREE from 'three';

// 2D drawing of a machine from four sides (front / back / left / right), orthographic,
// flat bright colors with crisp black outlines. Outlines come from a post pass over a buffer of
// (view normal, depth, material id): a line goes wherever the material changes, the surface
// folds, or the depth jumps; the outer silhouette is drawn thicker.
//
//   const v = createViews2D(renderer, overlayCanvas, { ui: 2, line: 2 });
//   const { h } = v.measure(bounds, width, rows);   // sheet height for a given width
//   v.render(machine, bounds, { x, y, w, h }, rows); // rows: [['front'], ['back'], ['left', 'right']]
//   v.snapshot(title)                                 // canvas of the finished sheet
//
// `ui` scales titles, dimension text and margins; `line` scales the outline thickness (pixels).

const VIEWS = {
  front: { title: 'ด้านหน้า', en: 'Front', dir: [0, 0, 1], across: 'x' },
  back: { title: 'ด้านหลัง', en: 'Back', dir: [0, 0, -1], across: 'x' },
  left: { title: 'ด้านซ้าย', en: 'Left', dir: [-1, 0, 0], across: 'z' },
  right: { title: 'ด้านขวา', en: 'Right', dir: [1, 0, 0], across: 'z' },
};
// Long machines get the long sides full width; boxy ones a 2 × 2 grid.
export const rowsFor = size => (size.x >= 1.6 * size.z ? [['front'], ['back'], ['left', 'right']] : [['front', 'right'], ['back', 'left']]);
export const BG = '#ffffff';
const INK = '#111111';

// Brighter, clearer version of a model color: lift the darks so black lines read on them.
function clearColor(c) {
  const hsl = {};
  c.getHSL(hsl);
  const l = hsl.l < 0.5 ? 0.34 + hsl.l * 0.55 : hsl.l;
  return new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.15), l);
}

const ID_VERT = /* glsl */`
  varying vec3 vN; varying float vZ;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vZ = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const ID_FRAG = /* glsl */`
  uniform float uId; varying vec3 vN; varying float vZ;
  void main() {
    vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
    gl_FragColor = vec4(n.xy, vZ, uId);
  }`;
const EDGE_FRAG = /* glsl */`
  uniform sampler2D tColor, tId; uniform vec2 px; uniform float r, pxm; uniform vec3 ink, bg;
  varying vec2 vUv;
  vec3 nrm(vec4 s) { return vec3(s.xy, sqrt(max(0.0, 1.0 - dot(s.xy, s.xy)))); }
  float edge(vec4 a, vec4 b, float reach) {
    if (a.a != b.a) return 1.0;               // other material, or background
    if (a.a == 0.0) return 0.0;
    vec3 na = nrm(a), nb = nrm(b);
    if (dot(na, nb) < 0.8) return 1.0;        // fold
    float slope = min(length(na.xy) / max(na.z, 0.05), 20.0);
    return abs(a.z - b.z) > 0.012 + pxm * reach * slope * 1.5 ? 1.0 : 0.0; // depth step
  }
  void main() {
    vec4 c = texture2D(tId, vUv);
    float e = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398;
      vec2 d = vec2(cos(a), sin(a));
      e = max(e, edge(c, texture2D(tId, vUv + d * r * px), r));
      vec4 o = texture2D(tId, vUv + d * (2.0 * r + 1.0) * px); // thicker outer silhouette
      if ((c.a == 0.0) != (o.a == 0.0)) e = 1.0;
    }
    // Off the machine, paint background: the color target is only resolved inside each view.
    vec3 col = c.a == 0.0 && e == 0.0 ? bg : texture2D(tColor, vUv).rgb;
    gl_FragColor = vec4(mix(col, ink, e), 1.0);
    #include <colorspace_fragment>
  }`;

export function createViews2D(renderer, overlay, { ui = 1, line = 1 } = {}) {
  const PAD = { l: 64 * ui, r: 20 * ui, t: 34 * ui, b: 46 * ui }; // room around each view for title and dimensions
  const BLEED = 4 * ui; // extra drawn around each view so outlines at its edges aren't clipped
  const colorRT = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
  const idRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tColor: { value: colorRT.texture }, tId: { value: idRT.texture }, px: { value: new THREE.Vector2() }, r: { value: 1 }, pxm: { value: 0.005 }, ink: { value: new THREE.Color(INK) }, bg: { value: new THREE.Color(BG) } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: EDGE_FRAG,
    depthTest: false, depthWrite: false,
  }));
  quad.frustumCulled = false;
  const quadCam = new THREE.Camera();
  const cam = new THREE.OrthographicCamera();
  const bg = new THREE.Color(BG);

  // Per original material: its flat-color twin and its id-pass twin (ids start at 1; 0 = background).
  const flat = new WeakMap(), idMat = new WeakMap();
  let nextId = 1;
  const flatOf = m => {
    let f = flat.get(m);
    if (!f) {
      const glass = m.transparent && m.opacity < 0.7;
      f = new THREE.MeshBasicMaterial({
        color: m.map ? m.color : clearColor(m.color), map: m.map ?? null, side: m.side, toneMapped: false,
        transparent: m.transparent, opacity: glass ? Math.min(m.opacity, 0.3) : m.transparent ? m.opacity : 1, depthWrite: !glass,
      });
      f.userData.glass = glass;
      flat.set(m, f);
    }
    return f;
  };
  const idOf = m => {
    let f = idMat.get(m);
    if (!f) {
      f = new THREE.ShaderMaterial({ uniforms: { uId: { value: nextId++ } }, vertexShader: ID_VERT, fragmentShader: ID_FRAG, side: m.side });
      idMat.set(m, f);
    }
    return f;
  };
  // Glass panels get thin dark edges of their own, since they're left out of the outline pass.
  const glassLines = new WeakMap();
  const lineMat = new THREE.LineBasicMaterial({ color: '#6b3300', transparent: true, opacity: 0.85 });
  const lineGroup = new THREE.Group();
  lineGroup.matrixWorldAutoUpdate = false;
  const linesOf = mesh => {
    let l = glassLines.get(mesh.geometry);
    if (!l) glassLines.set(mesh.geometry, (l = new THREE.EdgesGeometry(mesh.geometry, 20)));
    const seg = new THREE.LineSegments(l, lineMat);
    seg.matrixAutoUpdate = false;
    seg.matrixWorld.copy(mesh.matrixWorld);
    return seg;
  };
  const isShown = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };

  // Swap every visible mesh to the given pass's material, run fn, then put the originals back.
  function withPass(root, pass, fn) {
    const saved = [];
    root.traverse(o => {
      if (!o.isMesh) return;
      saved.push([o, o.material, o.visible]);
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      const f = flatOf(m);
      if (pass === 'id') {
        if (f.userData.glass || (m.transparent && m.map)) o.visible = false; // see through glass; decals sit on surfaces
        else o.material = idOf(m);
      } else o.material = f;
    });
    try { fn(saved); } finally { for (const [o, m, v] of saved) { o.material = m; o.visible = v; } }
  }

  // Scale and cells for the given rows in a rect; with rect.h missing, the sheet is as tall as it needs.
  const across = (k, size) => (VIEWS[k].across === 'x' ? size.x : size.z);
  function layoutFor(size, rect, rows) {
    let s = Infinity;
    for (const row of rows) s = Math.min(s, (rect.w - row.length * (PAD.l + PAD.r)) / row.reduce((a, k) => a + across(k, size), 0));
    if (rect.h) s = Math.min(s, (rect.h - rows.length * (PAD.t + PAD.b)) / (rows.length * size.y));
    const rowH = size.y * s + PAD.t + PAD.b;
    const h = rows.length * rowH;
    const cells = [];
    let y = rect.y + (rect.h ? (rect.h - h) / 2 : 0);
    for (const row of rows) {
      const ws = row.map(k => across(k, size) * s);
      let x = rect.x + (rect.w - ws.reduce((a, b) => a + b + PAD.l + PAD.r, 0)) / 2;
      row.forEach((k, i) => {
        cells.push({ key: k, x: x + PAD.l, y: y + PAD.t, w: ws[i], h: size.y * s });
        x += ws[i] + PAD.l + PAD.r;
      });
      y += rowH;
    }
    return { s, cells, h };
  }
  const measure = (bounds, w, rows) => layoutFor(bounds.getSize(new THREE.Vector3()), { x: 0, y: 0, w }, rows);

  function aim(cell, scale, size, center) {
    const v = VIEWS[cell.key], half = across(cell.key, size) / 2;
    const far = Math.max(size.x, size.y, size.z) * 2;
    const m = BLEED / scale; // let the outline run past the measured box instead of being cut off
    Object.assign(cam, { left: -half - m, right: half + m, top: size.y / 2 + m, bottom: -size.y / 2 - m, near: 0.01, far: far * 2 });
    cam.position.set(center.x + v.dir[0] * far, center.y, center.z + v.dir[2] * far);
    cam.up.set(0, 1, 0);
    cam.lookAt(center);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  let layout = null;
  function render(machine, bounds, rect, rows) {
    const pr = renderer.getPixelRatio();
    const W = renderer.domElement.width, H = renderer.domElement.height;
    if (colorRT.width !== W || colorRT.height !== H) { colorRT.setSize(W, H); idRT.setSize(W, H); }
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    layout = layoutFor(size, rect, rows ?? rowsFor(size));
    const root = machine.object;
    root.updateMatrixWorld(true);

    const prev = { clear: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), auto: renderer.autoClear, tm: renderer.toneMapping };
    renderer.autoClear = false;
    renderer.toneMapping = THREE.NoToneMapping;
    const vp = c => [(c.x - BLEED) * pr, H - (c.y + c.h + BLEED) * pr, (c.w + 2 * BLEED) * pr, (c.h + 2 * BLEED) * pr];
    const each = (rt, fn) => {
      rt.scissorTest = false;
      renderer.setRenderTarget(rt);
      renderer.clear();
      for (const c of layout.cells) {
        rt.viewport.set(...vp(c)); rt.scissor.set(...vp(c)); rt.scissorTest = true;
        renderer.setRenderTarget(rt);
        aim(c, layout.s, size, center);
        fn();
      }
      rt.viewport.set(0, 0, W, H); rt.scissorTest = false;
    };

    renderer.setClearColor(0x000000, 0);
    withPass(root, 'id', () => each(idRT, () => renderer.render(root, cam)));

    renderer.setClearColor(bg, 1);
    withPass(root, 'color', saved => {
      lineGroup.clear();
      for (const [o] of saved) if (o.visible && o.material.userData.glass && isShown(o)) lineGroup.add(linesOf(o));
      each(colorRT, () => { renderer.render(root, cam); renderer.render(lineGroup, cam); });
    });

    const u = quad.material.uniforms;
    u.px.value.set(1 / W, 1 / H);
    u.r.value = Math.max(1, Math.round(pr * 0.6 * line));
    u.pxm.value = 1 / (layout.s * pr);
    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, W / pr, H / pr);
    renderer.render(quad, quadCam);

    renderer.setClearColor(prev.clear, prev.alpha);
    renderer.autoClear = prev.auto;
    renderer.toneMapping = prev.tm;
    drawOverlay(size, pr);
  }

  // Titles and overall dimension lines, drawn in CSS px on the overlay canvas.
  let lastKey = '';
  function drawOverlay(size, pr) {
    const key = JSON.stringify([layout.cells, overlay.width, overlay.height]);
    if (key === lastKey) return;
    lastKey = key;
    const g = overlay.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, overlay.width, overlay.height);
    g.setTransform(pr, 0, 0, pr, 0, 0);
    drawNotes(g, layout.cells, size);
  }

  const font = (w, px) => `${w} ${px * ui}px "IBM Plex Sans Thai", sans-serif`;
  function drawNotes(g, cells, size) {
    const mm = v => Math.round(v * 1000).toLocaleString('en');
    g.strokeStyle = g.fillStyle = '#1f2937';
    g.lineWidth = ui;
    for (const c of cells) {
      const v = VIEWS[c.key];
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.font = font(600, 15);
      g.fillText(v.title, c.x, c.y - 12 * ui);
      const tw = g.measureText(v.title).width;
      g.font = font(400, 12);
      g.fillStyle = '#6b7280'; g.fillText(v.en, c.x + tw + 8 * ui, c.y - 12 * ui); g.fillStyle = '#1f2937';
      // horizontal: length (front/back) or width (sides)
      const yb = c.y + c.h + 22 * ui;
      dim(g, c.x, yb, c.x + c.w, yb, mm(across(c.key, size)));
      g.beginPath(); g.moveTo(c.x + 0.5, c.y + c.h + 4 * ui); g.lineTo(c.x + 0.5, yb + 5 * ui); g.moveTo(c.x + c.w - 0.5, c.y + c.h + 4 * ui); g.lineTo(c.x + c.w - 0.5, yb + 5 * ui); g.stroke();
      // vertical: height
      const xl = c.x - 22 * ui;
      dim(g, xl, c.y + c.h, xl, c.y, mm(size.y));
      g.beginPath(); g.moveTo(c.x - 4 * ui, c.y + 0.5); g.lineTo(xl - 5 * ui, c.y + 0.5); g.moveTo(c.x - 4 * ui, c.y + c.h - 0.5); g.lineTo(xl - 5 * ui, c.y + c.h - 0.5); g.stroke();
    }
  }
  function dim(g, x0, y0, x1, y1, text) {
    const a = Math.atan2(y1 - y0, x1 - x0), ah = 7 * ui, aw = 3 * ui;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    for (const [x, y, s] of [[x0, y0, 1], [x1, y1, -1]]) { // arrowheads
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + s * ah * Math.cos(a) - aw * Math.sin(a), y + s * ah * Math.sin(a) + aw * Math.cos(a));
      g.lineTo(x + s * ah * Math.cos(a) + aw * Math.sin(a), y + s * ah * Math.sin(a) - aw * Math.cos(a));
      g.closePath(); g.fill();
    }
    g.save();
    g.translate((x0 + x1) / 2, (y0 + y1) / 2);
    g.rotate(Math.abs(a) > Math.PI / 4 ? -Math.PI / 2 : 0);
    g.font = font(500, 12);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width + 8 * ui;
    g.fillStyle = BG; g.fillRect(-w / 2, -8 * ui, w, 16 * ui);
    g.fillStyle = '#1f2937'; g.fillText(text, 0, 0);
    g.restore();
  }

  // One canvas of the current drawing: the WebGL frame (call right after render) plus the notes,
  // cropped to the views, with the machine name as a title.
  function snapshot(title) {
    const src = renderer.domElement, pr = renderer.getPixelRatio();
    const x0 = Math.min(...layout.cells.map(c => c.x - PAD.l)), y0 = Math.min(...layout.cells.map(c => c.y - PAD.t)) - 40 * ui;
    const x1 = Math.max(...layout.cells.map(c => c.x + c.w + PAD.r)), y1 = Math.max(...layout.cells.map(c => c.y + c.h + PAD.b));
    const crop = document.createElement('canvas');
    crop.width = Math.round((x1 - x0) * pr); crop.height = Math.round((y1 - y0) * pr);
    const k = crop.getContext('2d');
    k.fillStyle = BG; k.fillRect(0, 0, crop.width, crop.height);
    k.drawImage(src, x0 * pr, y0 * pr, crop.width, crop.height, 0, 0, crop.width, crop.height);
    k.drawImage(overlay, x0 * pr, y0 * pr, crop.width, crop.height, 0, 0, crop.width, crop.height);
    k.setTransform(pr, 0, 0, pr, 0, 0);
    k.font = font(600, 18); k.fillStyle = '#111';
    k.fillText(title, PAD.l, 26 * ui);
    return crop;
  }

  return { render, measure, snapshot, invalidate: () => (lastKey = '') };
}
