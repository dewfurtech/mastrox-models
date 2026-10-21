import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Mastrox Rakete CNC nesting routers, detailed models. One builder for the whole family:
//   3500A    stand-alone, open gantry, linear 12-tool rack (factory photos, measured hood)
//   3500Ant  3500A router in a 10 m line: X-lift table at the infeed (+x), belt conveyor at the
//            outfeed (−x), suction-cup loader on the back of the gantry (brochure)
//   4800Ant  line, 2800 table, closed box gantry, 12-tool disc magazine in an amber housing
//   5000AF   as 4800Ant with a second head and a label printer (Auto Flip not modelled)
// The 3500A started as realistic/rakete-3500a.html; this file is now the source for all four
// (the standalone page is no longer kept in step).
// Units: metres. Y up. Machine length runs along x, the operator side faces +z.

export const RAKETE_VARIANTS = {
  'rakete-3500a': { name: 'Rakete 3500A', tag: '3500A', tableL: 2.52, line: false, box: false, disc: false, heads: 1, loader: false, label: false },
  'rakete-3500ant': { name: 'Rakete 3500Ant', tag: '3500Ant', tableL: 2.55, line: true, box: false, disc: false, heads: 1, loader: true, label: false },
  'rakete-4800ant': { name: 'Rakete 4800Ant', tag: '4800Ant', tableL: 2.85, line: true, box: true, disc: true, heads: 1, loader: true, label: false },
  'rakete-5000af': { name: 'Rakete 5000AF', tag: '5000AF', tableL: 2.85, line: true, box: true, disc: true, heads: 2, loader: true, label: true },
};
const LINE_LENGTH = 10.335; // overall length of the automation lines (brochure)

// Comfortaa for the logo and labels on the machine.
if (!document.querySelector('link[data-comfortaa]')) {
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.dataset.comfortaa = '1';
  l.href = 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400&family=IBM+Plex+Mono:wght@500;600&display=swap';
  document.head.appendChild(l);
}
try {
  await Promise.race([
    // Ask with real text: the font comes in subsets, and only the subset covering the given text downloads.
    Promise.all(['300', '400'].map(w => document.fonts.load(w + ' 100px Comfortaa', 'mastrox Rakete 0123456789 AFntT−+XYZ'))),
    new Promise(r => setTimeout(r, 2500)),
  ]);
} catch (e) {}

export function createRealRakete(id = 'rakete-3500a') {
  const V = RAKETE_VARIANTS[id];
  const MAX_ANISO = 8;
  // ---------- textures ----------
  function canvasTex(w, h, draw, { srgb = true, repeat } = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = MAX_ANISO;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.userData.canvas = c;
    return t;
  }
  function noise(ctx, w, h, amt, alpha = 0.06, streak = 0) {
    const n = Math.floor(w * h * amt);
    for (let i = 0; i < n; i++) {
      const v = Math.random() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, streak ? 6 + Math.random() * streak : 1, 1);
    }
  }

  const brushedTex = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#c9ccd0'; c.fillRect(0, 0, w, h);
    noise(c, w, h, 0.5, 0.08, 60);
  }, { repeat: [1, 1] });
  const paintTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#808080'; c.fillRect(0, 0, w, h);
    noise(c, w, h, 0.6, 0.12);
  }, { srgb: false, repeat: [6, 6] });

  // Green MDF spoil board over the vacuum table, with a grid of locating holes (as on the delivered machines).
  const TABLE_L = V.tableL, TABLE_W = 1.36;
  const gridTex = canvasTex(2048, Math.round(2048 * TABLE_W / TABLE_L), (c, w, h) => {
    const ppm = w / TABLE_L;
    c.fillStyle = "#93a89c"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const v = Math.random();
      c.fillStyle = v > 0.5 ? "rgba(214,228,218,0.20)" : "rgba(60,82,70,0.16)";
      c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2);
    }
    // faint machining marks from surfacing the board
    c.strokeStyle = "rgba(255,255,255,0.05)"; c.lineWidth = 0.05 * ppm;
    for (let y = 0; y < h; y += 0.05 * ppm) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.fillStyle = "#1f2722";
    for (let y = 0.12; y < TABLE_W - 0.05; y += 0.2) for (let x = 0.15; x < TABLE_L - 0.05; x += 0.3) {
      c.beginPath(); c.arc(x * ppm, y * ppm, 0.008 * ppm, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = "rgba(40,50,44,0.12)";
    for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 60, 20 + Math.random() * 40, 0, 0, Math.PI * 2); c.fill(); }
  });

  // Linear rail: ground steel with counterbored bolt holes every 60 mm.
  function railTex(len) {
    return canvasTex(256, 32, (c, w, h) => {
      c.fillStyle = '#c4c8cc'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#e3e6e9'; c.fillRect(0, h * 0.12, w, h * 0.18);
      c.fillStyle = '#2a2c2f';
      c.beginPath(); c.arc(w / 2, h / 2, h * 0.24, 0, Math.PI * 2); c.fill();
      noise(c, w, h, 0.3, 0.1, 20);
    }, { repeat: [len / 0.06, 1] });
  }
  function rackTex(len) {
    return canvasTex(64, 32, (c, w, h) => {
      c.fillStyle = '#5a5e63'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2b2d30';
      c.beginPath(); c.moveTo(w * 0.3, 0); c.lineTo(w * 0.7, 0); c.lineTo(w * 0.6, h * 0.55); c.lineTo(w * 0.4, h * 0.55); c.fill();
      c.fillStyle = '#8b9095'; c.fillRect(0, h * 0.55, w, 2);
    }, { repeat: [len / 0.0094, 1] });
  }

  // White PVC strip curtain under the hood: 60 mm strips with slits, slightly uneven at the hem.
  const brushTex = canvasTex(512, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const sw = 44;
    for (let x = 0; x < w; x += sw) {
      const len = h * (0.9 + Math.random() * 0.1), g = c.createLinearGradient(x, 0, x + sw, 0);
      g.addColorStop(0, "#e8e8e4"); g.addColorStop(0.5, "#fbfbf8"); g.addColorStop(1, "#dcdcd7");
      c.fillStyle = g; c.fillRect(x + 1.5, 0, sw - 3, len);
      c.fillStyle = "rgba(0,0,0,0.05)"; c.fillRect(x + 1.5, len - 3, sw - 3, 3);
    }
  }, { repeat: [1, 1] });

  // Clear PVC dust hose with an orange spiral wire.
  const hoseTex = canvasTex(64, 16, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#e9ece9'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#d9dcd9');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e86a1c'; c.fillRect(w * 0.46, 0, w * 0.08, h);
  });
  hoseTex.wrapS = hoseTex.wrapT = THREE.RepeatWrapping;
  const hoseBump = canvasTex(64, 16, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#000'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, '#000');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }, { srgb: false });
  hoseBump.wrapS = hoseBump.wrapT = THREE.RepeatWrapping;

  // Logo and label textures.
  function logoTex({ mas = '#1d1f22', trox = '#f07a22', weight = 300 } = {}) {
    const fs = 220;
    const font = `${weight} ${fs}px Comfortaa, "Varela Round", sans-serif`;
    const m = document.createElement('canvas').getContext('2d');
    m.font = font;
    const w1 = m.measureText('mas').width, w2 = m.measureText('trox').width;
    const W = Math.ceil(w1 + w2 + 20), H = Math.ceil(fs * 1.12);
    const tex = canvasTex(W, H, (c) => {
      c.font = font; c.textBaseline = 'alphabetic';
      c.fillStyle = mas; c.fillText('mas', 10, fs * 0.86);
      c.fillStyle = trox; c.fillText('trox', 10 + w1, fs * 0.86);
    });
    return { tex, aspect: W / H };
  }
  function labelTex(text, { bg = '#f07a22', fg = '#1d1f22', font = '400 120px Comfortaa, sans-serif', padX = 30, h = 170, small, smallFont } = {}) {
    const m = document.createElement('canvas').getContext('2d');
    m.font = font;
    let wMain = m.measureText(text).width, wSmall = 0;
    if (small) { m.font = smallFont; wSmall = m.measureText(small).width + 24; }
    const W = Math.ceil(wMain + wSmall + padX * 2);
    const tex = canvasTex(W, h, (c) => {
      if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, h); }
      c.fillStyle = fg; c.textBaseline = 'middle';
      let x = padX;
      if (small) { c.font = smallFont; c.fillText(small, x, h * 0.42); x += wSmall; }
      c.font = font; c.fillText(text, x, h * 0.54);
    });
    return { tex, aspect: W / h };
  }

  // ---------- materials ----------
  const mats = {};
  function mat(name, params, Physical = false) {
    const m = new (Physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)(params);
    m.name = name;
    mats[name] = m;
    return m;
  }
  const M = {
    body: mat('body_mid_grey', { color: '#8e9195', metalness: 0.08, roughness: 0.55, roughnessMap: paintTex, clearcoat: 0.15, clearcoatRoughness: 0.5 }, true),
    band: mat('body_dark_grey', { color: '#4d5258', metalness: 0.15, roughness: 0.5, roughnessMap: paintTex, clearcoat: 0.2 }, true),
    bodyDark: mat('body_seam', { color: '#5b5f64', metalness: 0.4, roughness: 0.6 }),
    hoodPaint: mat('hood_light_grey', { color: '#d7d8d6', metalness: 0.05, roughness: 0.45, roughnessMap: paintTex }),
    edgeOrange: mat('spoilboard_edge', { color: '#e8742a', metalness: 0, roughness: 0.5 }),
    coverLight: mat('servo_cover_light', { color: '#c9cac8', metalness: 0.08, roughness: 0.55, roughnessMap: paintTex }),
    cabinet: mat('cabinet_paint', { color: '#8e9195', metalness: 0.08, roughness: 0.5, roughnessMap: paintTex }),
    gantry: mat('gantry_dark_grey', { color: '#474c53', metalness: 0.2, roughness: 0.5, roughnessMap: paintTex, clearcoat: 0.2 }, true),
    black: mat('black_plastic', { color: '#141517', metalness: 0.1, roughness: 0.55 }),
    rubber: mat('rubber', { color: '#0e0f10', metalness: 0, roughness: 0.85 }),
    steel: mat('steel_ground', { color: '#c8ccd0', metalness: 1, roughness: 0.28 }),
    chrome: mat('chrome', { color: '#e9ecef', metalness: 1, roughness: 0.12 }),
    alu: mat('aluminium', { color: '#d4d7da', metalness: 0.9, roughness: 0.34 }),
    stainless: mat('stainless_brushed', { color: '#eef0f2', map: brushedTex, metalness: 0.55, roughness: 0.36 }),
    brass: mat('brass', { color: '#c9a44c', metalness: 1, roughness: 0.3 }),
    amber: mat('amber_acrylic', { color: '#ff8a24', metalness: 0, roughness: 0.08, transmission: 0.72, thickness: 0.006, ior: 1.49, attenuationColor: new THREE.Color('#ff6a00'), attenuationDistance: 0.05, transparent: true, opacity: 0.92, side: THREE.DoubleSide }, true),
    orange: mat('mastrox_orange', { color: '#f07a22', metalness: 0.1, roughness: 0.45 }),
    white: mat('white_nylon', { color: '#f1f0ec', metalness: 0, roughness: 0.55 }),
    blue: mat('blue_tube', { color: '#2b7fd6', metalness: 0, roughness: 0.4 }),
    red: mat('red_tube', { color: '#e0412a', metalness: 0, roughness: 0.4 }),
    orangeCable: mat('cable_orange', { color: '#e8621d', metalness: 0, roughness: 0.5 }),
    yellow: mat('warning_yellow', { color: '#f2c318', metalness: 0, roughness: 0.5 }),
    oil: mat('oil_reservoir', { color: '#f3d24a', metalness: 0, roughness: 0.15, transmission: 0.5, thickness: 0.02, transparent: true, opacity: 0.85 }, true),
    glass: mat('screen_glass', { color: '#ffb35c', metalness: 0, roughness: 0.05, emissive: '#5a2a00', emissiveIntensity: 0.4 }),
    grid: mat('vacuum_grid', { map: gridTex, metalness: 0.1, roughness: 0.7 }),
    mdfEdge: mat('mdf_edge', { color: '#b59a6c', metalness: 0, roughness: 0.9 }),
    brush: mat('brush_strip', { map: brushTex, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.7, metalness: 0 }),
    hose: mat('dust_hose', { map: hoseTex, bumpMap: hoseBump, bumpScale: 2.5, color: '#ffffff', roughness: 0.22, metalness: 0, transparent: true, opacity: 0.88, clearcoat: 0.6 }, true),
    lightRed: mat('lamp_red', { color: '#7a1a12', emissive: '#ff2a12', emissiveIntensity: 0.0, roughness: 0.3 }),
    lightAmber: mat('lamp_amber', { color: '#7a5212', emissive: '#ffb020', emissiveIntensity: 0.0, roughness: 0.3 }),
    lightGreen: mat('lamp_green', { color: '#1d5a22', emissive: '#4dff5a', emissiveIntensity: 0.0, roughness: 0.3 }),
    btnGreen: mat('button_green', { color: '#2f9a3a', emissive: '#39d24a', emissiveIntensity: 0.6, roughness: 0.3 }),
    btnRed: mat('button_red', { color: '#d0281b', roughness: 0.35 }),
  };

  // ---------- geometry helpers ----------
  function shade(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
  function at(mesh, x = 0, y = 0, z = 0, parent) { mesh.position.set(x, y, z); if (parent) parent.add(mesh); return mesh; }
  function box(w, h, d, m, x, y, z, parent) { return at(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y, z, parent); }
  function rbox(w, h, d, m, r, x, y, z, parent) {
    const rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    return at(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rr), m), x, y, z, parent);
  }
  function cyl(r1, r2, h, m, x, y, z, parent, axis = 'y', seg = 32) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    return at(mesh, x, y, z, parent);
  }
  // A flat textured sticker. `rotY` turns it to face a side; `rotZ` turns the text (−π/2 reads top to bottom).
  function decal({ tex, aspect }, width, x, y, z, parent, { rotY = 0, rotZ = 0, name = 'decal', transparent = true } = {}) {
    const m = mat(name + '_' + Object.keys(mats).length, { map: tex, transparent, roughness: 0.5, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / aspect), m);
    mesh.rotation.set(0, rotY, rotZ, 'YXZ');
    mesh.name = name;
    mesh.userData.decal = true;
    return at(mesh, x, y, z, parent);
  }
  function rail(len, x, y, z, parent, axis = 'x') {
    const t = railTex(len);
    const m = mat('linear_rail_' + Object.keys(mats).length, { map: t, metalness: 1, roughness: 0.28, color: '#ffffff' });
    const g = axis === 'x' ? new THREE.BoxGeometry(len, 0.026, 0.02) : axis === 'z' ? new THREE.BoxGeometry(0.02, 0.026, len) : new THREE.BoxGeometry(0.02, len, 0.026);
    if (axis === 'z') { t.rotation = Math.PI / 2; }
    return at(new THREE.Mesh(g, m), x, y, z, parent);
  }
  function rack(len, x, y, z, parent, axis = 'x') {
    const m = mat('rack_' + Object.keys(mats).length, { map: rackTex(len), metalness: 0.8, roughness: 0.4 });
    const g = axis === 'x' ? new THREE.BoxGeometry(len, 0.03, 0.022) : new THREE.BoxGeometry(0.022, 0.03, len);
    return at(new THREE.Mesh(g, m), x, y, z, parent);
  }
  function bolt(x, y, z, parent, axis = 'z', r = 0.007) { return cyl(r, r, 0.006, M.black, x, y, z, parent, axis, 12); }

  // Pneumatic cylinder with fittings and blue/red air lines (popup pins, stoppers).
  function airCylinder(parent, x, y, z, rot = 0) {
    const g = new THREE.Group();
    rbox(0.05, 0.085, 0.045, M.alu, 0.004, 0, 0, 0, g);
    for (const dz of [-0.014, 0.014]) box(0.051, 0.004, 0.003, M.bodyDark, 0, 0.02, dz, g);
    cyl(0.011, 0.011, 0.03, M.chrome, 0, 0.055, 0, g);
    cyl(0.022, 0.022, 0.03, M.brass, 0, 0.083, 0, g);
    cyl(0.006, 0.006, 0.012, M.black, 0.03, 0.02, 0, g, 'x', 10);
    cyl(0.006, 0.006, 0.012, M.black, 0.03, -0.02, 0, g, 'x', 10);
    g.add(tube([[0.036, 0.02, 0], [0.07, 0.03, 0.02], [0.09, -0.06, 0.03]], 0.004, M.blue));
    g.add(tube([[0.036, -0.02, 0], [0.065, -0.03, -0.01], [0.085, -0.09, -0.02]], 0.004, M.red));
    g.position.set(x, y, z);
    g.rotation.y = rot;
    parent.add(g);
    return g;
  }
  function tube(points, r, m, seg = 24) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 8, false), m);
  }

  // Drag chain: link geometry reused, re-laid along a curve whenever its ends move.
  const linkGeo = (() => {
    const L = 0.05, H = 0.042, W = 1;
    const plate = new RoundedBoxGeometry(0.008, H, L * 0.98, 2, 0.003);
    const a = plate.clone().translate(-W / 2 + 0.004, 0, 0);
    const b = plate.clone().translate(W / 2 - 0.004, 0, 0);
    const bar = new THREE.BoxGeometry(W - 0.01, 0.006, 0.012).translate(0, H / 2 - 0.003, 0);
    const bar2 = new THREE.BoxGeometry(W - 0.01, 0.006, 0.012).translate(0, -H / 2 + 0.003, 0);
    const parts = [a, b, bar, bar2].map(g => (g.index ? g.toNonIndexed() : g));
    parts.forEach(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
    return { geo: mergeGeometries(parts), L };
  })();
  class DragChain {
    constructor(parent, width, count, widthAxis) {
      this.group = new THREE.Group();
      this.links = [];
      this.width = width;
      this.axis = widthAxis.clone().normalize();
      for (let i = 0; i < count; i++) {
        const g = linkGeo.geo.clone();
        g.scale(width, 1, 1);
        const m = new THREE.Mesh(g, M.black);
        m.castShadow = true;
        this.links.push(m);
        this.group.add(m);
      }
      this.cable = null;
      parent.add(this.group);
    }
    layout(curve) {
      const n = this.links.length, len = curve.getLength();
      const x = this.axis, z = new THREE.Vector3(), y = new THREE.Vector3(), basis = new THREE.Matrix4();
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const p = curve.getPointAt(t);
        z.copy(curve.getTangentAt(t)).normalize();
        y.crossVectors(z, x).normalize();
        basis.makeBasis(x, y, z);
        const link = this.links[i];
        link.position.copy(p);
        link.quaternion.setFromRotationMatrix(basis);
        link.scale.set(1, 1, (len / n) / linkGeo.L);
      }
      const geo = new THREE.TubeGeometry(curve, Math.max(24, n), this.width * 0.16, 8, false);
      if (!this.cable) {
        this.cable = new THREE.Mesh(geo, M.orangeCable);
        this.group.add(this.cable);
      } else { this.cable.geometry.dispose(); this.cable.geometry = geo; }
    }
  }

  // ---------- the machine ----------
  const machine = new THREE.Group();
  machine.name = V.name.replace(' ', '_');

  // Base length grows with the table; the chute end (−x) and the loading plate (+x) keep their sizes.
  const BL = 3.80 + (TABLE_L - 2.52), BD = 1.66;   // base length (x) and depth (z)
  const LOW_TOP = 0.60, UP_TOP = 0.82; // lower body, upper body
  const TABLE_X = -BL / 2 + 0.55 + (TABLE_L + 0.1) / 2; // vacuum table centre (−0.04 on the 3500A)
  const TABLE_TOP = 0.89;

  // Base frame: light grey lower body, dark grey upper band carrying the Y rails and racks.
  const base = new THREE.Group(); base.name = 'Base'; machine.add(base);
  for (const x of [-BL / 2 + 0.3, 0, BL / 2 - 0.3]) for (const s of [-1, 1]) {
    rbox(0.30, 0.07, 0.26, M.band, 0.01, x, 0.045, s * 0.80, base);
    cyl(0.06, 0.07, 0.012, mat('foot_pad', { color: '#d9502a', roughness: 0.7 }), x + 0.08, 0.006, s * 0.85, base, 'y', 20);
    cyl(0.012, 0.012, 0.03, M.steel, x + 0.08, 0.08, s * 0.85, base);
    cyl(0.02, 0.02, 0.012, M.steel, x + 0.08, 0.072, s * 0.85, base, 'y', 6);
  }
  // Lower body and upper band, both left open over the dust chute pit at the left end (see below)
  const PIT = { x0: -BL / 2 + 0.05, x1: -BL / 2 + 0.36, z: 0.54 };
  {
    const lc = (LOW_TOP + 0.07) / 2, lh = LOW_TOP - 0.07;
    rbox(BL / 2 - PIT.x1, lh, BD, M.body, 0.012, (PIT.x1 + BL / 2) / 2, lc, 0, base);
    rbox(PIT.x0 + BL / 2, lh, BD, M.body, 0.012, (PIT.x0 - BL / 2) / 2, lc, 0, base);
    for (const s of [-1, 1]) rbox(PIT.x1 - PIT.x0 + 0.02, lh, BD / 2 - PIT.z, M.body, 0.006, (PIT.x0 + PIT.x1) / 2, lc, s * (BD / 2 + PIT.z) / 2, base);
    box(PIT.x1 - PIT.x0, 0.05, 2 * PIT.z, M.body, (PIT.x0 + PIT.x1) / 2, 0.095, 0, base);   // pit floor pan
  }
  {
    const yc = (UP_TOP + LOW_TOP) / 2, hh = UP_TOP - LOW_TOP;
    rbox(BL / 2 - PIT.x1, hh, 1.62, M.band, 0.01, (PIT.x1 + BL / 2) / 2, yc, 0, base);
    rbox(PIT.x0 + BL / 2, hh, 1.62, M.band, 0.01, (PIT.x0 - BL / 2) / 2, yc, 0, base);
    for (const s of [-1, 1]) rbox(PIT.x1 - PIT.x0 + 0.02, hh, 0.81 - PIT.z, M.band, 0.006, (PIT.x0 + PIT.x1) / 2, yc, s * (0.81 + PIT.z) / 2, base);
  }
  box(BL / 2 - PIT.x1, 0.012, BD - 0.02, M.bodyDark, (PIT.x1 + BL / 2) / 2, LOW_TOP - 0.002, 0, base);   // shadow line at the step
  // Front panel seams: the right-hand service panel with the vacuum valves.
  box(0.005, LOW_TOP - 0.14, 0.004, M.bodyDark, 0.92, 0.34, BD / 2 + 0.001, base);
  box(BL - 0.08, 0.005, 0.004, M.bodyDark, 0, 0.12, BD / 2 + 0.001, base);
  for (const s of [-1, 1]) for (const x of [-BL / 2 + 0.35, -0.7, 0.1, 0.92, BL / 2 - 0.35]) bolt(x, 0.55, s * (BD / 2 + 0.002), base);
  for (const s of [-1, 1]) box(0.004, LOW_TOP - 0.16, BD - 0.2, M.bodyDark, s * (BL / 2 + 0.001), 0.34, 0, base);

  // Y axis: rails on top of the side walls, racks on their outer faces (gantry rides these).
  for (const s of [-1, 1]) {
    rail(BL - 0.04, 0, UP_TOP + 0.013, s * 0.79, base);
    rack(BL - 0.04, 0, UP_TOP - 0.05, s * (0.81 + 0.011), base);
    rail(BL - 0.04, 0, UP_TOP - 0.13, s * (0.81 + 0.01), base);
  }

  // Vacuum table with a green MDF spoil board, orange edge band and an aluminium front edge bar
  const table = new THREE.Group(); table.name = 'VacuumTable'; base.add(table);
  box(TABLE_L + 0.1, 0.04, 1.46, M.band, TABLE_X, UP_TOP + 0.02, 0, table);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(TABLE_L, 0.03, TABLE_W), [M.edgeOrange, M.edgeOrange, M.grid, M.band, M.edgeOrange, M.edgeOrange]);
  at(plate, TABLE_X, TABLE_TOP - 0.015, 0, table);
  rbox(TABLE_L + 0.06, 0.035, 0.05, M.alu, 0.004, TABLE_X, TABLE_TOP - 0.03, TABLE_W / 2 + 0.03, table);
  for (let x = TABLE_X - TABLE_L / 2 + 0.2; x < TABLE_X + TABLE_L / 2; x += 0.6) cyl(0.007, 0.007, 0.004, M.steel, x, TABLE_TOP - 0.012, TABLE_W / 2 + 0.03, table, 'y', 12);
  // Popup pins / origin stoppers along the chute end and the front edge.
  for (const z of [-0.45, 0, 0.45]) airCylinder(table, TABLE_X - TABLE_L / 2 - 0.045, UP_TOP + 0.01, z, Math.PI);
  for (const x of [0.1, 1.1]) airCylinder(table, x, UP_TOP - 0.03, 0.70, -Math.PI / 2);

  // Left end: dust chute. A slotted cover plate next to the table, then the hopper frame round an open pit
  // that drops into the base (offcuts and dust fall through).
  {
    const x0 = TABLE_X - (TABLE_L + 0.1) / 2 - 0.02;
    const slotTex = canvasTex(512, 256, (c, w, h) => {
      c.fillStyle = '#4d5258'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#141517'; c.lineWidth = 9; c.lineCap = 'round';
      for (let y = 30; y < h - 20; y += 22) { c.beginPath(); c.moveTo(w * 0.2, y); c.lineTo(w * 0.8, y + 14); c.stroke(); }
    });
    const slotMat = mat('chute_slotted_plate', { map: slotTex, metalness: 0.15, roughness: 0.5 });
    const pw = 0.15;
    const sp = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.02, 1.3), [M.band, M.band, slotMat, M.band, M.band, M.band]);
    at(sp, x0 - pw / 2, UP_TOP + 0.03, 0, base);
    // V hopper under the slotted plate, sloping down into the pit
    const vp = box(0.3, 0.008, 1.06, M.band, PIT.x1 - 0.05, UP_TOP - 0.1, 0, base); vp.rotation.z = 0.7;
    // hopper frame on top of the band round the opening
    const fl = PIT.x1 - PIT.x0 + 0.1;
    for (const z of [-1, 1]) box(fl, 0.03, 0.16, M.band, (PIT.x0 + PIT.x1) / 2 - 0.05, UP_TOP + 0.015, z * (PIT.z + 0.08), base);
    box(0.08, 0.03, 2 * PIT.z + 0.32, M.band, PIT.x0 - 0.04, UP_TOP + 0.015, 0, base);
    // the pit itself: dark walls going down into the base, shaded darker toward the bottom
    const pitTex = canvasTex(8, 128, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a3d41'); g.addColorStop(1, '#0b0c0d');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    const pitMat = mat('chute_pit', { map: pitTex, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
    const depth = UP_TOP - 0.12, pw2 = PIT.x1 - PIT.x0, pd = 2 * PIT.z;
    const wall = (w, x, z, ry) => { const m = at(new THREE.Mesh(new THREE.PlaneGeometry(w, depth), pitMat), x, UP_TOP - depth / 2 + 0.001, z, base); m.rotation.y = ry; };
    wall(pd, PIT.x0 + 0.001, 0, Math.PI / 2); wall(pd, PIT.x1 - 0.001, 0, -Math.PI / 2);
    wall(pw2, (PIT.x0 + PIT.x1) / 2, PIT.z - 0.001, Math.PI); wall(pw2, (PIT.x0 + PIT.x1) / 2, -PIT.z + 0.001, 0);
    const floor = at(new THREE.Mesh(new THREE.PlaneGeometry(pw2, pd), mat('chute_pit_floor', { color: '#070808', roughness: 1 })), (PIT.x0 + PIT.x1) / 2, 0.121, 0, base);
    floor.rotation.x = -Math.PI / 2;
    // a few offcuts lying at the bottom
    for (const [dx, dz, w, d, r] of [[-0.08, 0.1, 0.22, 0.06, 0.3], [0.06, -0.15, 0.3, 0.05, -0.5], [0.0, 0.25, 0.12, 0.08, 1.1]]) {
      const o = box(w, 0.018, d, M.mdfEdge, (PIT.x0 + PIT.x1) / 2 + dx, 0.13, dz, base); o.rotation.y = r;
    }
  }
  // Right end: loading plate. A flat dark grey plate level with the table, studded with ball transfer units so a
  // sheet can be slid on from this end, and a round port near the table (install photo).
  const LOAD = { x0: TABLE_X + (TABLE_L + 0.1) / 2 + 0.01, x1: BL / 2 - 0.01, top: TABLE_TOP - 0.004 };
  {
    const L = LOAD.x1 - LOAD.x0, cx = (LOAD.x0 + LOAD.x1) / 2, th = LOAD.top - UP_TOP;
    rbox(L, th, 1.52, M.band, 0.012, cx, UP_TOP + th / 2, 0, base);
    const wheelMat = mat('load_wheel', { color: '#121314', roughness: 0.4, metalness: 0.1 });
    const rowsZ = [[-0.54, -0.18, 0.18, 0.54], [-0.36, 0.36], [-0.54, -0.18, 0.18, 0.54]];
    rowsZ.forEach((zs, i) => {
      const x = LOAD.x0 + 0.12 + i * (L - 0.22) / (rowsZ.length - 1);
      for (const z of zs) {
        rbox(0.07, 0.008, 0.055, M.black, 0.004, x, LOAD.top + 0.002, z, base);                      // pocket rim
        const w = cyl(0.026, 0.026, 0.018, wheelMat, x, LOAD.top - 0.006, z, base, 'z', 24);        // wheel, rolls along x
        w.name = 'LoadWheel';
        cyl(0.006, 0.006, 0.05, M.steel, x, LOAD.top - 0.006, z, base, 'z', 10);                     // axle
      }
    });
    const port = at(new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), M.black), LOAD.x0 + 0.1, LOAD.top + 0.001, -0.55, base); port.rotation.x = -Math.PI / 2;
    const ring = at(new THREE.Mesh(new THREE.RingGeometry(0.05, 0.058, 32), M.steel), LOAD.x0 + 0.1, LOAD.top + 0.0015, -0.55, base); ring.rotation.x = -Math.PI / 2;
  }
  // End face below the platform: air filter/regulator unit and the dust-extraction port stub
  {
    const ex = BL / 2 + 0.002;
    const frl = new THREE.Group(); frl.position.set(ex + 0.05, 0.42, 0.45); base.add(frl);
    for (let i = 0; i < 3; i++) {
      rbox(0.06, 0.07, 0.06, M.white, 0.006, 0, 0.0, -0.07 + i * 0.07, frl);
      cyl(0.022, 0.018, 0.09, mat('frl_bowl_' + i, { color: '#e9eef0', transparent: true, opacity: 0.6, roughness: 0.15 }), 0, -0.08, -0.07 + i * 0.07, frl, 'y', 20);
    }
    cyl(0.022, 0.022, 0.012, M.white, 0.035, 0.02, 0.0, frl, 'x', 20);                    // gauge
    cyl(0.008, 0.008, 0.05, M.steel, -0.04, 0.0, -0.13, frl, 'x', 12);
    cyl(0.012, 0.012, 0.03, M.btnRed, 0.0, 0.0, 0.14, frl, 'z', 12);
    cyl(0.045, 0.045, 0.16, M.steel, ex + 0.08, 0.32, 0.05, base, 'x', 28);                // dust port stub
    cyl(0.05, 0.05, 0.02, M.steel, ex + 0.155, 0.32, 0.05, base, 'x', 28);
  }
  // Pop-up alignment bar: a long steel bar in the slot between the table and the loading plate. It rises
  // out of the slot and nudges the sheet so it sits square against the origin pins before a cut.
  const ALIGN = { x: TABLE_X + TABLE_L / 2 + 0.065, down: TABLE_TOP - 0.07, up: TABLE_TOP + 0.015, push: 0.03 };
  const aligner = new THREE.Group(); aligner.name = 'AlignBar'; base.add(aligner);
  box(0.03, 1.3, 0.03, M.rubber, ALIGN.x, TABLE_TOP - 0.04, 0, base).rotation.x = Math.PI / 2;        // the slot
  rbox(0.025, 0.06, 1.28, M.steel, 0.004, 0, 0, 0, aligner);
  for (const z of [-0.5, 0, 0.5]) cyl(0.012, 0.012, 0.12, M.chrome, 0, -0.09, z, aligner, 'y', 12);  // lift rods
  let alignLift = 0;
  function placeAligner() { aligner.position.set(ALIGN.x - ALIGN.push * alignLift, ALIGN.down + (ALIGN.up - ALIGN.down) * alignLift, 0); }
  placeAligner();
  // Tool length sensor sits in the round cut-out of the loading plate at the other end
  const sensorX = LOAD.x0 + 0.1;
  cyl(0.03, 0.035, 0.05, M.black, sensorX, LOAD.top - 0.02, -0.55, base);
  cyl(0.022, 0.022, 0.006, M.steel, sensorX, LOAD.top + 0.008, -0.55, base);
  cyl(0.004, 0.004, 0.03, M.chrome, sensorX + 0.035, LOAD.top + 0.01, -0.55, base);

  // Decals on the base
  const bigLogo = logoTex();
  decal(bigLogo, 1.75, -0.32, 0.36, BD / 2 + 0.003, base, { name: 'logo_front' });
  decal(bigLogo, 1.75, 0.32, 0.36, -BD / 2 - 0.003, base, { name: 'logo_back', rotY: Math.PI });
  const tag3500 = labelTex(V.tag, { font: '400 120px Comfortaa, sans-serif', h: 170, padX: 26 });
  decal(tag3500, 0.34, BL / 2 - 0.07, 0.36, BD / 2 + 0.003, base, { rotZ: -Math.PI / 2, name: 'tag_' + V.tag, transparent: false });
  const axisY = labelTex('−Y+', { bg: '#f4f4f2', fg: '#1d1f22', font: '600 90px "IBM Plex Mono", monospace', h: 120, padX: 18 });
  decal(axisY, 0.075, -0.75, 0.73, 0.81 + 0.003, base, { name: 'axis_Y', transparent: false });
  const warn = labelTex('⚡', { bg: '#f2c318', fg: '#1d1f22', font: '700 110px sans-serif', h: 140, padX: 30 });

  // The six vacuum-zone ball valves on the front service panel, with the vacuum gauge in the middle
  {
    const gx0 = 0.98 + 2.5 * 0.105 + 0.0;
    cyl(0.04, 0.04, 0.03, M.black, gx0, 0.33, BD / 2 + 0.015, base, 'z', 28);
    const dial = at(new THREE.Mesh(new THREE.CircleGeometry(0.034, 28), mat('gauge_face', { color: '#f4f4f0', roughness: 0.3 })), gx0, 0.33, BD / 2 + 0.031, base);
    box(0.002, 0.026, 0.001, M.btnRed, gx0 + 0.006, 0.335, BD / 2 + 0.032, base).rotation.z = -0.6;
  }
  for (let i = 0; i < 6; i++) {
    const x = 0.98 + i * 0.105 + (i >= 3 ? 0.06 : 0);
    const v = new THREE.Group(); v.position.set(x, 0.24, BD / 2 + 0.02); base.add(v);
    cyl(0.016, 0.016, 0.06, M.black, 0, 0, 0, v, 'y', 16);
    cyl(0.02, 0.02, 0.028, M.steel, 0, 0.0, 0.025, v, 'z', 16);
    box(0.012, 0.075, 0.01, M.black, 0.0, 0.045, 0.04, v);
    rbox(0.022, 0.03, 0.02, M.blue, 0.006, 0.0, 0.085, 0.04, v);
    v.add(tube([[0, -0.03, 0], [0, -0.09, 0.03], [0.01, -0.16, 0.02]], 0.007, M.black));
  }

  // Operator buttons on the front of the band at the right end: start, pause, reset, e-stop
  {
    const px = BL / 2 - 0.22;
    rbox(0.26, 0.07, 0.02, M.black, 0.006, px, UP_TOP - 0.11, 0.81 + 0.012, base);
    [['#2f9a3a', '#39d24a'], ['#c9a21a', '#ffd23a'], ['#2f9a3a', '#39d24a']].forEach(([c, e], i) =>
      cyl(0.014, 0.014, 0.014, mat('panel_btn_' + i, { color: c, emissive: e, emissiveIntensity: 0.5, roughness: 0.3 }), px - 0.09 + i * 0.055, UP_TOP - 0.11, 0.81 + 0.026, base, 'z', 18));
    cyl(0.02, 0.016, 0.02, M.btnRed, px + 0.09, UP_TOP - 0.11, 0.81 + 0.03, base, 'z', 20);
  }

  // Y drag chain tray low along the back of the base, cable junction box at its fixed end
  const trayY = 0.15;
  box(BL - 0.3, 0.012, 0.15, M.band, 0, trayY - 0.006, -(BD / 2 + 0.075), base);
  box(BL - 0.3, 0.06, 0.006, M.band, 0, trayY + 0.024, -(BD / 2 + 0.15), base);
  rbox(0.2, 0.16, 0.1, M.body, 0.008, -BL / 2 + 0.15, 0.3, -(BD / 2 + 0.05), base);

  // ---------- gantry (moves along x) ----------
  const gantry = new THREE.Group(); gantry.name = 'Gantry'; machine.add(gantry);
  // The spindle sits on the gantry's −x side, so the hood faces the dust-chute end (photos). GX stays 1;
  // set it to −1 to mirror the whole gantry (text decals are flipped back so they still read).
  const GX = 1; gantry.scale.x = GX;
  const BEAM_Y0 = 1.40, BEAM_Y1 = 1.72;
  const BEXT = V.disc ? 0.12 : 0, BEAM_HALF = 0.86 + BEXT;   // beam half-length along z
  // Uprights are cast plates offset toward +x, leaving room for the press roller between them and the hood.
  function uprightGeo() {
    const s = new THREE.Shape(), top = BEAM_Y0 - 0.86 + 0.06;
    s.moveTo(-0.12, 0); s.lineTo(0.16, 0); s.lineTo(0.16, 0.12); s.lineTo(0.15, top);
    s.lineTo(-0.15, top); s.lineTo(-0.12, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -0.05);
    return g;
  }
  const FOOT_Z = 0.8575;                       // outer foot plates, outside the racks
  const servoCovers = [];
  for (const s of [-1, 1]) {
    at(new THREE.Mesh(uprightGeo(), M.gantry), 0, 0.86, s * 0.79, gantry);
    for (const [dx, dy] of [[0.0, 1.1], [0.1, 0.95], [0.0, 1.3]]) bolt(dx, dy, s * 0.847, gantry);
    // Bearing blocks on the rail
    for (const dx of [-0.06, 0.1]) rbox(0.1, 0.03, 0.05, M.steel, 0.004, dx, 0.845, s * 0.79, gantry);
    // Long foot plate on the outside: carries the Y servo cover and both roller cylinders
    rbox(1.19, 0.26, 0.025, M.gantry, 0.006, -0.395, 0.75, s * FOOT_Z, gantry);
    for (const dx of [-0.9, -0.5, -0.1, 0.15]) bolt(dx, 0.83, s * (FOOT_Z + 0.013), gantry);
    // Light grey Y-servo cover hanging below the foot, chamfered at the bottom outer edge (photos)
    {
      const cs = new THREE.Shape();
      cs.moveTo(0, 0); cs.lineTo(0.16, 0); cs.lineTo(0.16, 0.18); cs.lineTo(0.1, 0.28); cs.lineTo(0, 0.28); cs.closePath();
      const g = new THREE.ExtrudeGeometry(cs, { depth: 0.40, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 });
      g.rotateY(Math.PI / 2); g.rotateX(Math.PI);           // depth along x, profile in z–y, chamfer down and out
      const cover = new THREE.Mesh(g, M.coverLight);
      cover.scale.z = s;                                    // mirror for the back side
      at(cover, -0.22, 0.70, s * (FOOT_Z + 0.013), gantry);
      servoCovers.push(cover);
      if (s > 0) decal(warn, 0.045, 0.12, 0.6, FOOT_Z + 0.013 + 0.161, gantry, { name: 'warning', transparent: false });
    }
    // End plates of the beam
    rbox(0.52, 0.38, 0.03, M.gantry, 0.008, 0.08, (BEAM_Y0 + BEAM_Y1) / 2, s * (0.87 + BEXT), gantry);
  }
  rbox(0.46, BEAM_Y1 - BEAM_Y0, 2 * BEAM_HALF, M.gantry, 0.015, 0.08, (BEAM_Y0 + BEAM_Y1) / 2, 0, gantry);
  // X rails on the beam face (−x side), rack on top of the beam with the X drag chain lying beside it
  rail(1.62 + 2 * BEXT, -0.16, BEAM_Y1 - 0.04, 0, gantry, 'z');
  rail(1.62 + 2 * BEXT, -0.16, BEAM_Y0 + 0.05, 0, gantry, 'z');
  rack(1.66 + 2 * BEXT, -0.11, BEAM_Y1 + 0.015, 0, gantry, 'z');
  const axisX = labelTex('−X+', { bg: '#f4f4f2', fg: '#1d1f22', font: '600 90px "IBM Plex Mono", monospace', h: 120, padX: 18 });
  decal(axisX, 0.075, 0.311, (BEAM_Y0 + BEAM_Y1) / 2, 0.25, gantry, { rotY: Math.PI / 2, name: 'axis_X', transparent: false });
  const lamp = cyl(0.01, 0.01, 0.01, M.yellow, 0.315, (BEAM_Y0 + BEAM_Y1) / 2, 0.33, gantry, 'x', 12);
  // Central lubrication pump on the front foot: black head with a digital timer over a clear yellow tank
  {
    const lp = new THREE.Group(); lp.position.set(0.05, 0.96, FOOT_Z + 0.013); gantry.add(lp);
    rbox(0.15, 0.07, 0.1, M.black, 0.01, 0, 0.0, 0.05, lp);
    box(0.05, 0.022, 0.002, mat('pump_display', { color: '#1a2a1a', emissive: '#d03020', emissiveIntensity: 0.7 }), -0.02, 0.0, 0.101, lp);
    rbox(0.14, 0.13, 0.1, M.oil, 0.012, 0, -0.105, 0.05, lp);
    cyl(0.02, 0.022, 0.03, M.orange, 0.09, -0.04, 0.05, lp);
    lp.add(tube([[-0.06, 0.03, 0.03], [-0.1, 0.12, 0.01], [-0.12, 0.3, -0.02]], 0.004, M.white));
  }
  // ---------- carriage (moves along the beam, world z) ----------
  const carriage = new THREE.Group(); carriage.name = 'Carriage_X'; gantry.add(carriage);
  const CF = -0.15 - 0.034;  // carriage plate face (x, gantry-local)
  for (const dy of [BEAM_Y1 - 0.04, BEAM_Y0 + 0.05]) for (const dz of [-0.1, 0.1]) rbox(0.03, 0.05, 0.08, M.steel, 0.004, -0.168, dy, dz, carriage);
  rbox(0.025, 0.64, 0.34, M.alu, 0.006, CF - 0.012, 1.62, 0, carriage);
  for (const dz of [-0.12, 0.12]) rail(0.6, CF - 0.035, 1.62, dz, carriage, 'y');
  // Z servo and ball-screw housing on top
  rbox(0.14, 0.03, 0.18, M.alu, 0.005, CF + 0.01, 1.955, 0, carriage);
  rbox(0.09, 0.09, 0.09, M.black, 0.008, CF + 0.01, 2.02, 0, carriage);
  cyl(0.04, 0.04, 0.12, M.black, CF + 0.01, 2.12, 0, carriage);
  cyl(0.03, 0.03, 0.03, M.alu, CF + 0.01, 2.195, 0, carriage);
  const fan = cyl(0.036, 0.036, 0.006, M.rubber, CF + 0.01, 2.212, 0, carriage);
  // Electrical box (install photos 3 / 30): a black sheet-metal box sitting directly on top of the carriage
  // at the back of the beam, no plate under it, its top front edge chamfered. Cooling fan and warning label
  // on its back face, cable gland on the operator side where the X chain enters. The Z chain leaves its top.
  const EBOX = { x0: -0.14, x1: 0.5, y0: BEAM_Y1 + 0.056, y1: BEAM_Y1 + 0.4, w: 0.23, ch: 0.1 };
  {
    const eb = new THREE.Group(); eb.name = 'ElectricalBox'; if (!V.box) carriage.add(eb);
    const dx = EBOX.x1 - EBOX.x0, dy = EBOX.y1 - EBOX.y0, fz = EBOX.w / 2, cy = (EBOX.y0 + EBOX.y1) / 2;
    const prof = new THREE.Shape();                                           // side profile (x, y), chamfer at top front
    prof.moveTo(EBOX.x0, EBOX.y0); prof.lineTo(EBOX.x1, EBOX.y0); prof.lineTo(EBOX.x1, EBOX.y1 - EBOX.ch);
    prof.lineTo(EBOX.x1 - EBOX.ch, EBOX.y1); prof.lineTo(EBOX.x0, EBOX.y1); prof.closePath();
    const g = new THREE.ExtrudeGeometry(prof, { depth: EBOX.w, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
    g.translate(0, 0, -fz);
    eb.add(new THREE.Mesh(g, M.black));
    // four corner standoffs lift the box just clear of the X chain running underneath
    for (const sx of [EBOX.x0 + 0.03, EBOX.x1 - 0.03]) for (const sz of [-0.09, 0.09]) box(0.04, EBOX.y0 - BEAM_Y1, 0.04, M.black, sx, (EBOX.y0 + BEAM_Y1) / 2, sz, eb);
    // back face: fan grille, warning label, bolts
    cyl(0.05, 0.05, 0.004, M.rubber, EBOX.x1 + 0.005, cy + 0.03, 0, eb, 'x', 20);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 6; box(0.003, 0.09, 0.004, M.black, EBOX.x1 + 0.007, cy + 0.03, 0, eb).rotation.x = a; }
    decal(warn, 0.08, EBOX.x1 + 0.007, cy - 0.1, 0, eb, { rotY: Math.PI / 2, name: 'warning', transparent: false });
    for (const [oy, oz] of [[0.15, 0.09], [0.15, -0.09], [-0.15, 0.09], [-0.15, -0.09]]) bolt(EBOX.x1 + 0.007, cy + oy, oz, eb, 'x', 0.005);
    // cable gland on the operator (+z) side, low, where the X chain comes in
    cyl(0.028, 0.028, 0.03, M.black, 0.04, EBOX.y0 + 0.035, fz + 0.015, eb, 'z', 16);
  }
  // Two filter-regulators with gauges and blue air lines on the back face of the beam
  for (const dz of V.box ? [] : V.loader ? [-0.62, 0.62] : [-0.12, 0.12]) {
    const fr = new THREE.Group(); fr.position.set(0.31 + 0.03, BEAM_Y0 + 0.07, dz); gantry.add(fr);
    rbox(0.05, 0.06, 0.05, M.white, 0.005, 0, 0, 0, fr);
    cyl(0.018, 0.016, 0.07, mat('reg_bowl' + dz, { color: '#eef2f3', transparent: true, opacity: 0.6, roughness: 0.15 }), 0, -0.065, 0, fr, 'y', 18);
    cyl(0.02, 0.02, 0.012, M.white, 0.03, 0.01, 0, fr, 'x', 20);
    const face = at(new THREE.Mesh(new THREE.CircleGeometry(0.016, 20), mat('reg_gauge' + dz, { color: '#f6f6f2' })), 0.0365, 0.01, 0, fr); face.rotation.y = Math.PI / 2;
    cyl(0.012, 0.01, 0.03, M.white, 0, 0.045, 0, fr, 'y', 14);
    fr.add(tube([[0, 0.06, 0], [0.03, 0.12, 0.03], [0.02, 0.2, 0.1 * Math.sign(dz)]], 0.004, M.blue));
    fr.add(tube([[0, -0.1, 0], [0.03, -0.16, -0.04], [0.0, -0.25, -0.12 * Math.sign(dz)]], 0.004, M.blue));
  }

  // ---------- Z slide with the spindle and hood ----------
  const zslide = new THREE.Group(); zslide.name = 'Slide_Z'; carriage.add(zslide);
  const HX = CF - 0.355;            // spindle axis (gantry-local x)
  const H_BOT = 1.17, H_TOP = 1.705; // hood box 53.5 cm tall (measured), brush skirt below
  rbox(0.03, 0.49, 0.30, M.alu, 0.005, CF - 0.06, 1.545, 0, zslide);
  for (const dz of [-0.12, 0.12]) for (const dy of [1.42, 1.68]) rbox(0.03, 0.05, 0.05, M.steel, 0.004, CF - 0.04, dy, dz, zslide);
  const bristleTex = canvasTex(512, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let x = 0; x < w; x += 0.8) {
      const len = h * (0.78 + Math.random() * 0.22);
      c.strokeStyle = `rgba(${230 + Math.random() * 25},${226 + Math.random() * 25},${208 + Math.random() * 25},${0.55 + Math.random() * 0.45})`;
      c.lineWidth = 0.8; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (Math.random() - 0.5) * 7, len); c.stroke();
    }
  }, { repeat: [1, 1] });
  const bristleMat = mat('shoe_bristles', { map: bristleTex, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8, metalness: 0 });
  // ---------- inside the hood: Z screw, 9 kW ATC spindle, dust shoe (from the 3500A spindle photos) ----------
  // Z ball screw and coupling between the carriage rails
  cyl(0.012, 0.012, 0.56, mat('ball_screw', { color: '#3a3c3e', metalness: 0.9, roughness: 0.35 }), CF - 0.045, 1.64, 0, carriage, 'y', 16);
  cyl(0.022, 0.022, 0.04, M.alu, CF - 0.045, 1.94, 0, carriage, 'y', 20);
  cyl(0.023, 0.023, 0.012, mat('coupling_spider', { color: '#d23a2a', roughness: 0.6 }), CF - 0.045, 1.94, 0, carriage, 'y', 20);

  const spindle = new THREE.Group(); spindle.name = 'Spindle_9kW'; zslide.add(spindle);
  const spindleGrey = mat('spindle_body', { color: '#c9cccf', metalness: 0.6, roughness: 0.42 });
  const castGrey = mat('dust_shoe_cast', { color: '#a9adb0', metalness: 0.25, roughness: 0.55, roughnessMap: paintTex });
  const darkGrey = mat('nose_housing', { color: '#4c5054', metalness: 0.35, roughness: 0.45, roughnessMap: paintTex });
  // spindle mounting plate on the slide (rides back over the tool row during a change)
  rbox(0.02, 0.44, 0.17, M.alu, 0.004, HX + 0.085, 1.42, 0, spindle);
  // square aluminium motor body with vertical cooling flutes
  rbox(0.13, 0.32, 0.13, spindleGrey, 0.008, HX, 1.37, 0, spindle);
  for (let k = -5; k <= 5; k++) {
    for (const f of [-1, 1]) {
      box(0.004, 0.17, 0.006, M.steel, HX + k * 0.011, 1.45, f * 0.066, spindle);   // flutes on the ±z faces
      box(0.006, 0.17, 0.004, M.steel, HX - 0.066, 1.45, k * 0.011, spindle);       // and the front face
    }
  }
  // black motor fan cap on top
  rbox(0.135, 0.06, 0.135, M.black, 0.01, HX, 1.56, 0, spindle);
  cyl(0.055, 0.058, 0.04, M.black, HX, 1.61, 0, spindle, 'y', 24);
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; box(0.004, 0.035, 0.022, M.rubber, HX + Math.cos(a) * 0.058, 1.61, Math.sin(a) * 0.058, spindle).rotation.y = -a; }
  // ATC drawbar cylinder: aluminium block bolted to the lower front of the body, with fittings
  rbox(0.045, 0.17, 0.1, M.alu, 0.004, HX - 0.088, 1.305, 0, spindle);
  box(0.002, 0.16, 0.003, M.bodyDark, HX - 0.111, 1.305, 0.02, spindle);
  for (const [dy, dz] of [[0.06, -0.035], [0.06, 0.035], [-0.06, -0.035], [-0.06, 0.035], [0.0, 0.0]]) bolt(HX - 0.111, 1.305 + dy, dz, spindle, 'x', 0.005);
  for (const dy of [0.065, -0.065]) cyl(0.006, 0.006, 0.02, M.white, HX - 0.088, 1.305 + dy, 0.06, spindle, 'z', 10);
  // black solenoid valve with a green indicator on the +z front corner
  rbox(0.04, 0.2, 0.05, M.black, 0.005, HX - 0.04, 1.40, 0.095, spindle);
  cyl(0.008, 0.008, 0.004, mat('led_green', { color: '#1a6b2a', emissive: '#30ff60', emissiveIntensity: 1.5 }), HX - 0.061, 1.40, 0.095, spindle, 'x', 14);
  // brass oil/air manifold with clear tubes on the −z side
  const brass = M.brass, clearTube = mat('clear_tube', { color: '#f3e7b8', transparent: true, opacity: 0.7, roughness: 0.2 });
  rbox(0.03, 0.12, 0.02, M.alu, 0.003, HX - 0.03, 1.47, -0.075, spindle);
  for (let i = 0; i < 5; i++) {
    const y = 1.425 + i * 0.022;
    cyl(0.006, 0.006, 0.016, brass, HX - 0.03, y, -0.09, spindle, 'z', 10);
    spindle.add(tube([[HX - 0.03, y, -0.098], [HX - 0.06, y + 0.08, -0.13], [HX + 0.0, 1.75, -0.12 + i * 0.01], [CF - 0.05, 1.78, -0.1]], 0.0035, clearTube, 20));
  }
  // air lines to the drawbar cylinder and solenoid
  spindle.add(tube([[HX - 0.088, 1.37, 0.07], [HX - 0.07, 1.48, 0.1], [HX - 0.04, 1.62, 0.11], [CF - 0.05, 1.76, 0.12]], 0.004, M.blue));
  spindle.add(tube([[HX - 0.088, 1.24, 0.07], [HX - 0.075, 1.32, 0.12], [HX - 0.02, 1.6, 0.13], [CF - 0.05, 1.79, 0.08]], 0.004, M.red));

  // Dust shoe: light grey cast block round the nose, white bristle skirt, angled duct up to the hose
  const SHOE_Y = 1.155, SHOE_W = 0.2, SHOE_D = 0.24;
  rbox(SHOE_W, 0.05, SHOE_D, castGrey, 0.008, HX, SHOE_Y + 0.025, 0, spindle);
  rbox(0.006, 0.026, 0.13, M.black, 0.002, HX - SHOE_W / 2 - 0.001, SHOE_Y + 0.025, 0, spindle);   // front slot
  {
    const BH = 0.055, ring = [
      { w: SHOE_D, x: -SHOE_W / 2, z: 0, ry: Math.PI / 2 }, { w: SHOE_D, x: SHOE_W / 2, z: 0, ry: Math.PI / 2 },
      { w: SHOE_W, x: 0, z: SHOE_D / 2, ry: 0 }, { w: SHOE_W, x: 0, z: -SHOE_D / 2, ry: 0 },
    ];
    for (const layer of [0, 0.006, 0.012]) for (const e of ring) {
      const g = new THREE.PlaneGeometry(e.w - layer * 2, BH), uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * e.w / 0.25 + layer * 7);
      const m = at(new THREE.Mesh(g, bristleMat), HX + Math.sign(e.x) * (Math.abs(e.x) - layer), SHOE_Y - BH / 2 + 0.003, Math.sign(e.z) * (Math.abs(e.z) - layer), spindle);
      m.rotation.y = e.ry;
    }
  }
  // duct: rises from the +z side of the shoe, diagonally up and out, to the hose cuff
  const ductPath = [[HX + 0.01, SHOE_Y + 0.04, 0.09], [HX + 0.01, SHOE_Y + 0.11, 0.15], [HX + 0.01, 1.36, 0.2], [HX + 0.01, 1.42, 0.21]];
  spindle.add(tube(ductPath, 0.048, castGrey, 24));
  cyl(0.062, 0.062, 0.05, M.steel, HX + 0.01, 1.44, 0.21, spindle, 'y', 28);           // hose cuff with clamp
  // dark grey nose housing under the shoe, flared lip, ground nose rings
  cyl(0.062, 0.062, 0.075, darkGrey, HX, 1.115, 0, spindle, 'y', 40);
  cyl(0.068, 0.064, 0.008, darkGrey, HX, 1.078, 0, spindle, 'y', 40);
  cyl(0.04, 0.04, 0.014, M.chrome, HX, 1.067, 0, spindle, 'y', 32);
  cyl(0.036, 0.036, 0.012, M.steel, HX, 1.053, 0, spindle, 'y', 32);
  cyl(0.039, 0.039, 0.01, M.chrome, HX, 1.042, 0, spindle, 'y', 32);
  cyl(0.034, 0.03, 0.012, M.steel, HX, 1.031, 0, spindle, 'y', 32);
  const toolMesh = new THREE.Group(); toolMesh.position.set(HX, 0, 0); spindle.add(toolMesh);
  // slide plate the spindle rides back on for tool changes
  rbox(0.36, 0.02, 0.2, M.alu, 0.004, HX + 0.08, 1.685, 0, zslide);

  // ---------- PVC strip curtain physics ----------
  // Each strip is a flexible flap hinged at the hood hem. Its bend angle theta (outward +) follows a damped
  // spring driven by the hood's acceleration, so the strips lag and swing when the head starts, stops and turns.
  // Where a strip would pass below the sheet (or table) it curls outward so its tip just rests on the surface.
  const CURTAIN = { len: 0.20, pitch: 0.062, rows: 8, k: 70, c: 3.2, gain: 0.55, maxSwing: 1.1 };
  const curtain = [];
  const curtainTex = canvasTex(64, 8, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#dcdcd6'); g.addColorStop(0.15, '#f5f5f1'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.85, '#f0f0eb'); g.addColorStop(1, '#d4d4ce');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const curtainMat = mat('pvc_strip', { map: curtainTex, side: THREE.DoubleSide, roughness: 0.38, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.3 }, true);
  // vertical extent of a uniformly bent strip, as a fraction of its length: sin(t)/t
  const bendDrop = t => (Math.abs(t) < 1e-4 ? 1 : Math.sin(t) / t);
  function contactAngle(frac) {           // smallest bend whose tip rises to the given fraction of the length
    if (frac >= 1) return 0;
    let lo = 0, hi = 2.6;
    for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (bendDrop(m) > frac) lo = m; else hi = m; }
    return hi;
  }
  const _hoodPos = new THREE.Vector3(), _hoodVel = new THREE.Vector3(), _hoodAcc = new THREE.Vector3(), _prevPos = new THREE.Vector3(), _prevVel = new THREE.Vector3();
  const _p = new THREE.Vector3();
  let curtainInit = false;
  function surfaceAt(x, z) {
    const sx = x - cur.group.position.x, sz = z - SHEET.z;
    if (sheets.visible && cur.group.visible && Math.abs(sx) <= SHEET.L / 2 && Math.abs(sz) <= SHEET.W / 2) return TABLE_TOP + SHEET.T;
    if (Math.abs(x - TABLE_X) <= TABLE_L / 2 && Math.abs(z) <= TABLE_W / 2) return TABLE_TOP;
    if (x >= LOAD.x0 && x <= LOAD.x1 && Math.abs(z) <= 0.76) return LOAD.top + 0.025;
    if (Math.abs(x) <= BL / 2 && Math.abs(z) <= 0.81) return UP_TOP;
    return -1;
  }
  function updateCurtain(dt) {
    if (!hood.visible || dt <= 0) return;
    hood.getWorldPosition(_hoodPos);
    if (!curtainInit) { _prevPos.copy(_hoodPos); _prevVel.set(0, 0, 0); curtainInit = true; }
    _hoodVel.subVectors(_hoodPos, _prevPos).divideScalar(dt);
    _hoodAcc.subVectors(_hoodVel, _prevVel).divideScalar(dt).clampLength(0, 40);
    _prevPos.copy(_hoodPos); _prevVel.copy(_hoodVel);
    const steps = Math.ceil(dt / 0.004), h = dt / steps, L = CURTAIN.len, R = CURTAIN.rows;
    for (const st of curtain) {
      // the gantry is mirrored in x, so the strip's outward normal in the world is (GX·nx, nz)
      const drive = -(_hoodAcc.x * GX * st.nx + _hoodAcc.z * st.nz) * CURTAIN.gain;
      for (let i = 0; i < steps; i++) {
        st.omega += (-CURTAIN.k * st.stiff * st.theta - CURTAIN.c * st.omega + drive * 9) * h;
        st.theta += st.omega * h;
      }
      st.theta = THREE.MathUtils.clamp(st.theta, -CURTAIN.maxSwing, CURTAIN.maxSwing);
      // contact with whatever is under the strip
      st.mesh.getWorldPosition(_p);
      const floor = surfaceAt(_p.x + GX * st.nx * 0.03, _p.z + st.nz * 0.03);
      if (floor > 0) {
        const room = (_p.y - floor - 0.001) / L;
        if (room <= 0) st.theta = Math.max(st.theta, 2.6), st.omega = 0;
        else if (room < bendDrop(st.theta)) { const tc = contactAngle(room); st.theta = st.theta < -0.02 ? -tc : tc; st.omega *= 0.2; }
      }
      // reshape the strip: uniform curvature along its length, swing outward (+) or inward (−) of the hem
      const pos = st.mesh.geometry.attributes.position, arr = pos.array, base = st.base;
      for (let v = 0; v < pos.count; v++) {
        const s = -base[v * 3 + 1];                       // distance down the strip from the hem
        const t = st.theta * (s / L);
        const k = Math.abs(st.theta) < 1e-4 ? 0 : L / st.theta;
        const out = Math.abs(st.theta) < 1e-4 ? 0 : k * (1 - Math.cos(t));
        const down = Math.abs(st.theta) < 1e-4 ? s : k * Math.sin(t);
        arr[v * 3 + 1] = -down;
        arr[v * 3 + 2] = out;
      }
      pos.needsUpdate = true;
      st.mesh.geometry.computeVertexNormals();
    }
  }

  // Hood: light grey painted box, 54.5 × 60 × 53.5 cm (measured), the two corners facing away from the
  // beam chamfered 5.25 × 6 cm. Amber windows on three faces, orange name stripe on the operator-side
  // chamfer, strip-brush skirt below.
  const hood = new THREE.Group(); hood.name = 'DustHood'; zslide.add(hood);
  const HW = 0.545, HD = 0.60, HH = H_TOP - H_BOT, CH_X = 0.0525, CH_Z = 0.06;
  {
    const shell = new THREE.Group(); hood.add(shell);
    const a = HW / 2, b = HD / 2;
    // Plan outline (x, z) around the spindle axis
    const plan = [[a, -b], [a, b], [-a + CH_X, b], [-a, b - CH_Z], [-a, -b + CH_Z], [-a + CH_X, -b]];
    function slab(h, grow, m, y) {
      const sh = new THREE.Shape(plan.map(([x, z]) => new THREE.Vector2(x * (1 + grow), -z * (1 + grow))));
      const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 });
      g.rotateX(-Math.PI / 2);
      return at(new THREE.Mesh(g, m), HX, y, 0, shell);
    }
    // open top (the Z servo and spindle fan show from above); dark band with screws at the hem
    slab(0.042, 0.008, M.band, H_BOT);
    // Window panels with rounded cut-outs
    function panel(w, h, windowed) {
      const s = new THREE.Shape();
      s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath();
      let glass = null;
      if (windowed) {
        const ww = w - 0.06, wh = h - 0.06, r = 0.05, hole = new THREE.Path();
        hole.moveTo(-ww / 2 + r, -wh / 2); hole.lineTo(ww / 2 - r, -wh / 2); hole.quadraticCurveTo(ww / 2, -wh / 2, ww / 2, -wh / 2 + r);
        hole.lineTo(ww / 2, wh / 2 - r); hole.quadraticCurveTo(ww / 2, wh / 2, ww / 2 - r, wh / 2);
        hole.lineTo(-ww / 2 + r, wh / 2); hole.quadraticCurveTo(-ww / 2, wh / 2, -ww / 2, wh / 2 - r);
        hole.lineTo(-ww / 2, -wh / 2 + r); hole.quadraticCurveTo(-ww / 2, -wh / 2, -ww / 2 + r, -wh / 2);
        s.holes.push(hole);
        glass = new THREE.ShapeGeometry(new THREE.Shape(hole.getPoints(8)));
      }
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false, curveSegments: 6 });
      g.translate(0, 0, -0.006);
      return { frame: g, glass };
    }
    const ph = HH - 0.042, pc = H_BOT + 0.042 + ph / 2;
    // Each edge of the outline gets a panel facing outward. Windows on the −x face and the two long z faces.
    const edges = plan.map((p, i) => {
      const q = plan[(i + 1) % plan.length];
      const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      let nx = q[1] - p[1], nz = -(q[0] - p[0]);
      const nl = Math.hypot(nx, nz); nx /= nl; nz /= nl;
      if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
      return { mx, mz, len, nx, nz, ry: Math.atan2(nx, nz) };
    });
    edges.forEach(e => {
      const windowed = e.len > 0.3 && e.nx < 0.5;   // not the solid +x face toward the beam, not the chamfers
      const p = panel(e.len, ph, windowed);
      const fr = at(new THREE.Mesh(p.frame, M.hoodPaint), HX + e.mx, pc, e.mz, shell); fr.rotation.y = e.ry;
      for (let k = -1; k <= 1; k += 2) at(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.003, 10), M.steel), HX + e.mx + e.nx * 0.009 + Math.cos(e.ry) * k * e.len * 0.35, H_BOT + 0.021, e.mz + e.nz * 0.009 - Math.sin(e.ry) * k * e.len * 0.35, shell).rotation.set(Math.PI / 2, e.ry, 0, "YXZ");
      if (p.glass) { const gl = at(new THREE.Mesh(p.glass, M.amber), HX + e.mx - e.nx * 0.003, pc, e.mz - e.nz * 0.003, shell); gl.rotation.y = e.ry; }
    });
    // Orange name stripe on the chamfer that faces the operator (−x, +z corner)
    const ch = edges[2];
    const stripe = labelTex(V.tag, { font: '400 120px Comfortaa, sans-serif', small: 'Rakete', smallFont: '400 54px Comfortaa, sans-serif', h: 150, padX: 28 });
    const sw = ph - 0.02;
    const st = decal(stripe, sw, HX + ch.mx + ch.nx * 0.0015, pc, ch.mz + ch.nz * 0.0015, shell, { rotY: ch.ry, rotZ: -Math.PI / 2, name: 'hood_stripe', transparent: false });
    st.scale.set(1, (ch.len - 0.004) / (sw / stripe.aspect), 1);
    // PVC strip curtain: separate 60 mm strips hung from the hem, each one simulated (see updateCurtain).
    // Only three sides carry strips: the face toward the beam (where the tool rack passes) is open.
    for (const e of edges) {
      if (e.nx > 0.5) continue;
      const n = Math.max(1, Math.round(e.len / CURTAIN.pitch)), sw = e.len / n;
      const tx = Math.cos(e.ry), tz = -Math.sin(e.ry);           // along-edge direction
      for (let k = 0; k < n; k++) {
        const off = -e.len / 2 + sw * (k + 0.5);
        const g = new THREE.PlaneGeometry(sw - 0.003, CURTAIN.len, 1, CURTAIN.rows);
        g.translate(0, -CURTAIN.len / 2, 0);                         // hang from the top edge
        const m = at(new THREE.Mesh(g, curtainMat), HX + e.mx + e.nx * 0.004 + tx * off, H_BOT, e.mz + e.nz * 0.004 + tz * off, hood);
        m.rotation.y = e.ry;
        m.castShadow = true;
        curtain.push({ mesh: m, base: g.attributes.position.array.slice(), nx: e.nx, nz: e.nz, theta: 0, omega: 0,
          stiff: 1 + (Math.random() - 0.5) * 0.25 });
      }
    }
  }
  const shoe = new THREE.Group();   // the dust shoe now lives on the spindle itself

  // ---------- tool magazine ----------
  // 3500A / 3500Ant: one continuous fixed row of 12 ISO30 holders. The forks sit on an aluminium plate bolted to
  // the steel of the beam: hangers drop from the beam's underside, the plate runs the full width of the beam and
  // the forks reach forward into the back of the hood at band height (photos). It never moves.
  // 4800Ant / 5000AF: a 12-pocket disc at the operator end of the beam, hung from the beam on an arm and
  // covered by the amber housing; it turns the wanted pocket round to face the spindle.
  // Either way the spindle slides back inside the hood, over the pocket, to drop or pick a tool.
  const MAG_X = -0.394;                     // fork row (gantry-local x), just behind the dust shoe
  const FY = V.disc ? 1.135 : 1.12;         // holder flange height: tops level with the hood band
  const SLOT_Z = Array.from({ length: 12 }, (_, i) => -0.55 + i * 0.1);
  const SEAT_X = MAG_X - 0.006;             // centre of the fork's arc
  const DISC = V.disc ? { r: 0.16, z: BEAM_HALF - 0.18, cx: SEAT_X + 0.16 } : null;
  const pocketAngle = i => i * Math.PI / 6;
  const pocketZ = i => (DISC ? DISC.z : SLOT_Z[i]);
  const magazine = new THREE.Group(); magazine.name = 'ToolMagazine'; gantry.add(magazine);
  const forkShape = new THREE.Shape();
  forkShape.moveTo(-0.035, -0.03); forkShape.lineTo(0.035, -0.03); forkShape.lineTo(0.035, 0.03); forkShape.lineTo(0.022, 0.03);
  forkShape.absarc(0, 0.006, 0.021, 0, Math.PI, true); forkShape.lineTo(-0.035, 0.03); forkShape.closePath();
  const forkGeo = new THREE.ExtrudeGeometry(forkShape, { depth: 0.014, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1 });
  forkGeo.rotateX(Math.PI / 2);
  const slotLabel = i => labelTex('T' + (i + 1), { bg: '#f2c318', fg: '#1d1f22', font: '600 80px "IBM Plex Mono", monospace', h: 110, padX: 14 });
  let discG = null;
  if (!DISC) {
    const plateX0 = MAG_X + 0.032, plateX1 = -0.13;
    rbox(plateX1 - plateX0, 0.014, 1.44, M.alu, 0.003, (plateX0 + plateX1) / 2, FY - 0.031, 0, magazine);    // fork plate
    rbox(0.02, 0.03, 1.44, M.alu, 0.003, plateX0 + 0.01, FY - 0.016, 0, magazine);                           // extrusion lip the forks bolt to
    for (const z of [-0.68, -0.25, 0.25, 0.68]) {
      rbox(0.03, BEAM_Y0 - (FY - 0.024), 0.05, M.band, 0.004, -0.145, (BEAM_Y0 + FY - 0.024) / 2, z, magazine);  // hanger from the beam
      bolt(-0.16, BEAM_Y0 - 0.04, z, magazine, 'x', 0.006);
    }
    SLOT_Z.forEach((z, i) => {
      const f = at(new THREE.Mesh(forkGeo, M.white), MAG_X, FY - 0.007, z, magazine);
      f.rotation.y = -Math.PI / 2;                      // opening faces the spindle (front of the hood)
      const d = decal(slotLabel(i), 0.022, MAG_X + 0.022, FY - 0.0055, z, magazine, { name: 'slot_label', transparent: false });
      d.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    });
  } else {
    // The disc turns about a vertical axis just clear of the carriage's path; its index motor hangs from an arm
    // that runs under the Z slide to a post from the beam (all of it below the slide's lowest point).
    discG = new THREE.Group(); discG.name = 'ToolDisc'; discG.position.set(DISC.cx, 0, DISC.z); magazine.add(discG);
    cyl(DISC.r + 0.045, DISC.r + 0.045, 0.012, M.alu, 0, FY - 0.031, 0, discG, 'y', 48);
    cyl(0.05, 0.05, 0.03, M.black, 0, FY - 0.012, 0, discG, 'y', 24);
    for (let i = 0; i < 12; i++) {
      const a = pocketAngle(i), c = Math.cos(a), sn = Math.sin(a);
      const f = at(new THREE.Mesh(forkGeo, M.white), (DISC.r - 0.006) * c, FY - 0.007, -(DISC.r - 0.006) * sn, discG);
      f.rotation.y = a + Math.PI / 2;                  // opening faces outward
      const d = decal(slotLabel(i), 0.022, (DISC.r - 0.065) * c, FY - 0.0245, -(DISC.r - 0.065) * sn, discG, { name: 'slot_label', transparent: false });
      d.rotation.set(-Math.PI / 2, a, 0, 'YXZ');
    }
    cyl(0.038, 0.038, 0.05, M.black, DISC.cx, FY + 0.04, DISC.z, magazine, 'y', 24);      // index motor
    const postX = -0.1, armY = 1.22;
    rbox(postX - DISC.cx + 0.04, 0.012, 0.06, M.alu, 0.003, (postX + DISC.cx) / 2, armY, DISC.z, magazine);
    rbox(0.04, BEAM_Y0 - armY + 0.006, 0.06, M.band, 0.004, postX, (BEAM_Y0 + armY) / 2, DISC.z, magazine);
  }
  // Holders: pull stud, taper, V-flange, collet nut and a cutter. Lengths and diameters differ per pocket.
  const TOOLS = [
    [0.035, 0.006, 'chrome'], [0.045, 0.004, 'chrome'], [0.04, 0.008, 'black'], [0.05, 0.003, 'chrome'],
    [0.038, 0.009, 'brass'], [0.042, 0.005, 'black'], [0.048, 0.006, 'chrome'], [0.036, 0.0035, 'brass'],
    [0.044, 0.007, 'chrome'], [0.04, 0.005, 'black'], [0.05, 0.0045, 'chrome'], [0.037, 0.008, 'brass'],
  ];
  const holders = TOOLS.map(([L, r, m], i) => {
    const g = new THREE.Group(); g.name = 'Tool_T' + (i + 1);
    cyl(0.008, 0.01, 0.025, M.steel, 0, 0.06, 0, g, 'y', 16);
    cyl(0.016, 0.024, 0.04, M.steel, 0, 0.027, 0, g, 'y', 24);
    cyl(0.026, 0.026, 0.014, M.black, 0, 0, 0, g, 'y', 24);
    cyl(0.017, 0.012, 0.03, M.chrome, 0, -0.022, 0, g, 'y', 20);
    cyl(r, r, L, M[m], 0, -0.035 - L / 2, 0, g, 'y', 12);
    box(r * 2.05, L * 0.85, 0.0015, m === 'black' ? M.steel : M.black, 0, -0.035 - L / 2, 0, g);   // flute, so spin reads
    return g;
  });
  function seatInMagazine(i) {
    const h = holders[i];
    if (DISC) { discG.attach(h); const a = pocketAngle(i); h.position.set(DISC.r * Math.cos(a), FY, -DISC.r * Math.sin(a)); }
    else { magazine.attach(h); h.position.set(SEAT_X, FY, SLOT_Z[i]); }
    h.rotation.set(0, 0, 0);
  }
  function seatInSpindle(i) { const h = holders[i]; toolMesh.attach(h); h.position.set(0, 1.02, 0); h.rotation.set(0, 0, 0); }
  holders.forEach((_, i) => seatInMagazine(i));
  let currentTool = 0;
  seatInSpindle(currentTool);
  // The disc faces pocket i toward the spindle (−x) at rotation π − angle(i); it starts on T1's empty pocket.
  if (discG) discG.rotation.y = Math.PI - pocketAngle(currentTool);
  // Spindle slide inside the hood (0 = cutting position, 1 = back over the pocket)
  const SHIFT = SEAT_X - HX;
  let spindleShift = 0;

  // Press rollers: two segmented grey rubber rollers on black shafts, parallel to the beam, one each
  // side of the hood. The shaft ends sit in black bearing brackets on the outer foot plates, each pulled
  // down by a compact air cylinder below it. They drop onto the sheet while the spindle cuts.
  const ROLL_R = 0.042, ROLL_UP = 1.0, ROLL_DOWN = TABLE_TOP + 0.018 + ROLL_R - 0.001;
  const CYL_TOP = 0.86;                    // top of the compact cylinder bodies on the foot plate
  const rollers = [];
  {
    const RL = 1.3, seg = 0.045;
    const prof = [new THREE.Vector2(0.014, -RL / 2)];
    for (let z = -RL / 2; z < RL / 2 - 1e-6; z += seg) {
      prof.push(new THREE.Vector2(ROLL_R - 0.008, z + 0.002), new THREE.Vector2(ROLL_R, z + 0.008),
        new THREE.Vector2(ROLL_R, z + seg - 0.008), new THREE.Vector2(ROLL_R - 0.008, z + seg - 0.002));
    }
    prof.push(new THREE.Vector2(0.014, RL / 2));
    const ribGeo = new THREE.LatheGeometry(prof, 36);
    const rubberGrey = mat('roller_rubber', { color: '#5d6266', metalness: 0, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 }, true);
    for (const rx of [HX - HW / 2 - 0.075, HX + HW / 2 + 0.075]) {
      const r = new THREE.Group(); r.name = 'PressRoller'; r.position.set(rx, ROLL_UP, 0); gantry.add(r);
      const spin = new THREE.Group(); r.add(spin);
      const rib = new THREE.Mesh(ribGeo, rubberGrey); rib.rotation.x = Math.PI / 2; spin.add(rib);
      box(0.004, 0.006, RL, M.white, 0, ROLL_R - 0.001, 0, spin);       // marker so the rolling reads
      cyl(0.014, 0.014, 2 * (FOOT_Z + 0.05), M.black, 0, 0, 0, r, 'z', 16);
      const brackets = [];
      for (const s of [-1, 1]) {
        // black bearing bracket riding with the roller
        const bz = s * (FOOT_Z + 0.04);
        const br = new THREE.Shape();
        br.moveTo(-0.055, -0.05); br.lineTo(0.055, -0.05); br.lineTo(0.055, 0.02); br.lineTo(0.02, 0.055); br.lineTo(-0.055, 0.055); br.closePath();
        const bg = new THREE.ExtrudeGeometry(br, { depth: 0.02, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1 });
        bg.translate(0, 0, -0.01);
        at(new THREE.Mesh(bg, M.black), 0, 0, bz, r);
        cyl(0.026, 0.026, 0.03, M.black, 0, 0, bz + s * 0.02, r, 'z', 24);
        cyl(0.012, 0.012, 0.034, M.steel, 0, 0, bz + s * 0.022, r, 'z', 16);
        // compact air cylinder fixed on the foot plate under the bracket, with blue/orange lines
        rbox(0.06, 0.1, 0.05, M.alu, 0.005, rx, CYL_TOP - 0.05, bz, gantry);
        for (const dz of [-0.016, 0.016]) box(0.061, 0.004, 0.003, M.bodyDark, rx, CYL_TOP - 0.02, bz + dz, gantry);
        cyl(0.006, 0.006, 0.014, M.black, rx + 0.036, CYL_TOP - 0.025, bz, gantry, 'x', 10);
        cyl(0.006, 0.006, 0.014, M.black, rx + 0.036, CYL_TOP - 0.08, bz, gantry, 'x', 10);
        gantry.add(tube([[rx + 0.044, CYL_TOP - 0.025, bz], [rx + 0.12, CYL_TOP - 0.02, bz + s * 0.02], [rx + 0.2, CYL_TOP - 0.12, bz + s * 0.02], [-0.55, CYL_TOP - 0.1, bz + s * 0.01]], 0.004, M.blue));
        gantry.add(tube([[rx + 0.044, CYL_TOP - 0.08, bz], [rx + 0.1, CYL_TOP - 0.14, bz + s * 0.025], [rx + 0.25, CYL_TOP - 0.06, bz + s * 0.025], [-0.55, CYL_TOP - 0.12, bz + s * 0.015]], 0.004, M.orangeCable));
        brackets.push(bz);
      }
      // piston rods between cylinder tops and the brackets
      const rods = brackets.map(bz => cyl(0.009, 0.009, 1, M.chrome, rx, 0, bz, gantry, 'y', 16));
      rollers.push({ group: r, spin, rods, x: rx, y: ROLL_UP });
    }
  }
  function placeRollers() {
    for (const ro of rollers) {
      ro.group.position.y = ro.y;
      const bot = CYL_TOP, top = ro.y - 0.05, len = Math.max(top - bot, 0.01);
      for (const rod of ro.rods) { rod.scale.y = len; rod.position.y = bot + len / 2; }
    }
  }
  placeRollers();

  // Dust hose: corrugated clear PVC rising from the hood and sweeping back over the beam to a support arm.
  let hoseMesh;
  // From the shoe's duct cuff inside the hood, up out of the open top and back over the beam.
  function buildHose(dx = 0) {
    const x0 = HX + 0.01 + dx;
    const pts = [
      [x0, 1.46, 0.21], [x0, 1.7, 0.2], [x0 + 0.01, 1.95, 0.12], [HX + 0.08 + dx * 0.5, 2.16, 0.0],
      [CF - 0.04, 2.36, -0.14], [0.02, 2.38, -0.2], [0.12, 2.34, -0.22],
    ];
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.4);
    const len = curve.getLength();
    const g = new THREE.TubeGeometry(curve, 260, 0.065, 28, false);
    hoseTex.repeat.set(len / 0.022, 1);
    hoseBump.repeat.set(len / 0.011, 1);
    if (hoseMesh) { hoseMesh.geometry.dispose(); hoseMesh.geometry = g; }
    else { hoseMesh = new THREE.Mesh(g, M.hose); hoseMesh.name = 'DustHose'; zslide.add(hoseMesh); }
  }
  buildHose(0);
  // Hose clamp and support arm on the carriage top
  cyl(0.07, 0.07, 0.04, M.steel, 0.14, 2.34, -0.22, zslide, 'x', 28);
  rbox(0.03, 0.03, 0.12, M.alu, 0.004, 0.14, 2.3, -0.16, carriage);

  // Drag chains
  // X chain: a flat U lying in a tray on the beam top, running under the electrical box and into its side.
  // Z chain: a tall arch from the top of the electrical box that comes down from above onto the Z slide.
  const XCH = { x: 0.04, zFix: -0.5, len: 1.36, r: 0.07, y: BEAM_Y1 + 0.027 };
  const ZCH = { z: 0.0, xBox: 0.04, xZ: CF - 0.12, rise: 0.4 };   // xBox lines up with the X chain channel
  const xChain = new DragChain(gantry, 0.11, 40, new THREE.Vector3(1, 0, 0));
  xChain.group.visible = !V.box;   // closed in by the box gantry
  const zChain = new DragChain(carriage, 0.09, 30, new THREE.Vector3(0, 0, 1));
  // Z chain bracket: steel upright on the slide plate top with an arm reaching back under the chain end
  rbox(0.03, 0.18, 0.14, M.gantry, 0.004, CF - 0.06, 1.87, ZCH.z, zslide);
  rbox(ZCH.xZ - (CF - 0.06) + 0.1, 0.03, 0.14, M.gantry, 0.004, (ZCH.xZ + CF - 0.06) / 2 - 0.02, 1.945, ZCH.z, zslide);
  for (const dz of [-0.04, 0.04]) bolt(ZCH.xZ - 0.02, 1.961, ZCH.z + dz, zslide, 'y', 0.005);


  const yChain = new DragChain(machine, 0.12, 64, new THREE.Vector3(0, 0, 1));
  // X chain fixed end sits on the beam top at the back; Y chain fixed end at the left of the back tray.
  rbox(0.14, 0.05, 0.1, M.gantry, 0.006, XCH.x, BEAM_Y1 + 0.03, XCH.zFix - 0.05, gantry);                  // fixed end of the X chain
  box(0.15, 0.006, 1.7 + 2 * BEXT, M.band, XCH.x, BEAM_Y1 + 0.003, 0, gantry);                                           // flat chain tray on the beam top

  rbox(0.06, 0.1, 0.04, M.gantry, 0.005, 0.1, 0.37, -(BD / 2 + 0.075), gantry);   // Y chain moving-end bracket

  // ---------- box gantry (4800Ant / 5000AF) ----------
  // A light grey sheet-metal box closes in the beam and the electrics; the amber housing at the operator end covers
  // the tool disc (brochure photos). The carriage still runs along the open −x face of the beam.
  const GBOX = { x0: -0.145, x1: 0.56, y0: BEAM_Y0 - 0.04, y1: BEAM_Y1 + 0.26, z0: -BEAM_HALF - 0.04, z1: DISC ? DISC.z - 0.38 : BEAM_HALF + 0.04 };
  if (V.box) {
    const cover = new THREE.Group(); cover.name = 'GantryCover'; gantry.add(cover);
    const w = GBOX.x1 - GBOX.x0, h = GBOX.y1 - GBOX.y0, d = GBOX.z1 - GBOX.z0;
    const cx = (GBOX.x0 + GBOX.x1) / 2, cy = (GBOX.y0 + GBOX.y1) / 2, cz = (GBOX.z0 + GBOX.z1) / 2;
    rbox(w, h, d, M.hoodPaint, 0.02, cx, cy, cz, cover);
    box(w + 0.002, 0.004, d + 0.002, M.bodyDark, cx, GBOX.y1 - 0.07, cz, cover);               // lid seam
    for (const z of [GBOX.z0 + 0.35, cz + 0.15]) box(0.002, h - 0.1, 0.004, M.bodyDark, GBOX.x1 + 0.001, cy - 0.03, z, cover);   // panel seams
    const name = labelTex(V.tag, { bg: null, fg: '#f07a22', font: '400 120px Comfortaa, sans-serif', small: 'Rakete', smallFont: '400 54px Comfortaa, sans-serif', h: 150, padX: 20 });
    decal(name, 0.55, GBOX.x1 + 0.003, cy - 0.04, GBOX.z1 - 0.42, cover, { rotY: Math.PI / 2, name: 'tag_gantry' });
    const badge = labelTex('mastrox', { bg: '#f07a22', fg: '#1d1f22', font: '300 120px Comfortaa, sans-serif', h: 160, padX: 26 });
    decal(badge, 0.24, GBOX.x1 + 0.003, GBOX.y1 - 0.12, GBOX.z0 + 0.2, cover, { rotY: Math.PI / 2, name: 'logo_gantry', transparent: false });
    decal(logoTex(), 0.6, cx, cy, GBOX.z0 - 0.003, cover, { rotY: Math.PI, name: 'logo_gantry_end' });
  }
  if (DISC) {
    const hs = new THREE.Group(); hs.name = 'ToolHousing'; gantry.add(hs);
    const X0 = -0.15, X1 = GBOX.x1, Y0 = 1.06, Y1 = GBOX.y1, Z0 = GBOX.z1, Z1 = BEAM_HALF + 0.08, OPEN = 1.26;
    const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, cz = (Z0 + Z1) / 2, t = 0.03;
    // thin tinted acrylic: see-through like the brochure photos (the hood's thick amber would read solid at this size)
    const pane = mat('housing_acrylic', { color: '#ff9330', metalness: 0, roughness: 0.08, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
    for (const x of [X0 + t / 2, X1 - t / 2]) for (const z of [Z0 + t / 2, Z1 - t / 2]) rbox(t, Y1 - Y0, t, M.black, 0.004, x, cy, z, hs);   // posts
    for (const y of [Y0 + t / 2, Y1 - t / 2]) {
      for (const z of [Z0 + t / 2, Z1 - t / 2]) rbox(X1 - X0, t, t, M.black, 0.004, cx, y, z, hs);
      for (const x of [X0 + t / 2, X1 - t / 2]) rbox(t, t, Z1 - Z0, M.black, 0.004, x, y, cz, hs);
    }
    rbox(X1 - X0, 0.012, Z1 - Z0, M.black, 0.003, cx, Y1 - 0.006, cz, hs);                                     // roof
    box(X1 - X0 - 2 * t, Y1 - Y0 - 2 * t, 0.006, pane, cx, cy, Z1 - t / 2, hs);                              // operator face
    box(0.006, Y1 - Y0 - 2 * t, Z1 - Z0 - 2 * t, pane, X1 - t / 2, cy, cz, hs);                              // lift-side face
    box(0.006, Y1 - OPEN - t, Z1 - Z0 - 2 * t, pane, X0 + t / 2, (Y1 + OPEN) / 2, cz, hs);                    // carriage side, open below
  }
  // Second head (5000AF): a compact boring head beside the router spindle, with its own shoe and dust hose.
  // It rides the same carriage and stays up while the router cuts.
  if (V.heads > 1) {
    const dz = -0.4, hd = new THREE.Group(); hd.name = 'Head_2'; carriage.add(hd);
    rbox(0.025, 0.5, 0.16, M.alu, 0.005, CF - 0.012, 1.62, dz, hd);
    rbox(0.03, 0.46, 0.14, M.alu, 0.005, CF - 0.06, 1.6, dz, hd);
    rbox(0.09, 0.09, 0.09, M.black, 0.008, CF + 0.01, 1.92, dz, hd);
    cyl(0.035, 0.035, 0.1, M.black, CF + 0.01, 2.01, dz, hd);
    rbox(CF - 0.075 - HX, 0.07, 0.1, M.alu, 0.006, (CF - 0.075 + HX) / 2, 1.62, dz, hd);
    rbox(0.11, 0.28, 0.11, spindleGrey, 0.008, HX, 1.5, dz, hd);
    rbox(0.115, 0.05, 0.115, M.black, 0.008, HX, 1.665, dz, hd);
    cyl(0.04, 0.04, 0.08, darkGrey, HX, 1.32, dz, hd, 'y', 28);
    cyl(0.085, 0.085, 0.035, castGrey, HX, 1.265, dz, hd, 'y', 32);
    at(new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.088, 0.06, 40, 1, true), bristleMat), HX, 1.22, dz, hd);
    cyl(0.006, 0.006, 0.05, M.chrome, HX, 1.225, dz, hd, 'y', 10);
    const hose2 = tube([[HX, 1.28, dz - 0.07], [HX, 1.5, dz - 0.12], [HX + 0.05, 2.0, dz - 0.12], [HX + 0.2, 2.3, dz - 0.05], [0.1, 2.36, -0.3]], 0.05, M.hose, 120);
    hose2.name = 'DustHose_2'; hd.add(hose2);
  }
  // Label printer (5000AF Auto Label): prints and presses a label onto each part before it is cut.
  if (V.label) {
    const lz = 0.4, lp = new THREE.Group(); lp.name = 'LabelPrinter'; carriage.add(lp);
    rbox(CF - 0.075 - HX, 0.04, 0.05, M.alu, 0.004, (CF - 0.075 + HX) / 2, 1.64, lz, lp);
    rbox(0.16, 0.2, 0.12, M.white, 0.012, HX, 1.52, lz, lp);
    cyl(0.05, 0.05, 0.03, M.white, HX, 1.55, lz + 0.075, lp, 'z', 28);
    rbox(0.08, 0.02, 0.07, M.black, 0.004, HX, 1.405, lz, lp);
    box(0.06, 0.03, 0.002, mat('label_screen', { color: '#16261a', emissive: '#4dff7a', emissiveIntensity: 0.4 }), HX, 1.57, lz - 0.061, lp);
  }
  // Suction-cup loader on the back (+x) of the gantry (line machines): four cups on a bar, lowered by two
  // cylinders. It drags the top board off the lift onto the table and pushes the cut parts onto the conveyor.
  const LOADER_X = 0.47;
  const LOADER_TOP = V.box ? GBOX.y0 : 1.26;        // underside of whatever the cylinders hang from
  const CUP_REST = LOADER_TOP - 0.1 - 0.15;          // cup lips with the bar pulled up
  let cupY = CUP_REST, loaderG = null;
  const loaderRods = [];
  if (V.loader) {
    if (!V.box) {
      // 3500Ant: grey box with the logo on the back of the beam, carrying the cylinders
      rbox(0.24, BEAM_Y1 - LOADER_TOP, 0.9, M.hoodPaint, 0.012, 0.31 + 0.12, (BEAM_Y1 + LOADER_TOP) / 2, 0, gantry);
      decal(logoTex(), 0.5, 0.31 + 0.24 + 0.003, (BEAM_Y1 + LOADER_TOP) / 2, 0, gantry, { rotY: Math.PI / 2, name: 'logo_loader' });
    }
    loaderG = new THREE.Group(); loaderG.name = 'SuctionLoader'; gantry.add(loaderG);
    rbox(0.05, 0.05, 1.1, M.alu, 0.004, LOADER_X, 0.115, 0, loaderG);
    for (const z of [-0.45, -0.15, 0.15, 0.45]) {
      cyl(0.008, 0.008, 0.05, M.chrome, LOADER_X, 0.065, z, loaderG, 'y', 12);
      cyl(0.02, 0.02, 0.015, M.alu, LOADER_X, 0.045, z, loaderG, 'y', 16);
      cyl(0.03, 0.046, 0.03, M.rubber, LOADER_X, 0.015, z, loaderG, 'y', 28);
      loaderG.add(tube([[LOADER_X + 0.02, 0.05, z], [LOADER_X + 0.06, 0.1, z + 0.03], [LOADER_X + 0.04, 0.14, z + 0.06]], 0.004, M.blue));
    }
    for (const z of [-0.35, 0.35]) {
      rbox(0.05, 0.1, 0.05, M.alu, 0.005, LOADER_X, LOADER_TOP - 0.05, z, gantry);
      loaderRods.push(cyl(0.01, 0.01, 1, M.chrome, LOADER_X, 0, z, gantry, 'y', 14));
    }
  }
  function placeLoader() {
    if (!loaderG) return;
    loaderG.position.y = cupY;
    const bot = cupY + 0.14, top = LOADER_TOP - 0.1, len = Math.max(top - bot, 0.005);
    for (const r of loaderRods) { r.scale.y = len; r.position.y = bot + len / 2; }
  }
  placeLoader();

  // ---------- control cabinet ----------
  const cabinet = new THREE.Group(); cabinet.name = 'ControlCabinet'; machine.add(cabinet);
  // Off to the back side, clear of the base (BD / 2 = 0.83) so it doesn't block the chute end (user, 2026-10-21).
  cabinet.position.set(-2.62, 0, -1.3);
  cabinet.rotation.y = 0.08;
  {
    const CW = 0.82, CD = 0.56, CH = 1.80, C0 = 0.09;
    const s = new THREE.Shape(), r = 0.075;
    s.moveTo(-CW / 2, 0); s.lineTo(CW / 2, 0); s.lineTo(CW / 2, CH - r); s.quadraticCurveTo(CW / 2, CH, CW / 2 - r, CH);
    s.lineTo(-CW / 2 + r, CH); s.quadraticCurveTo(-CW / 2, CH, -CW / 2, CH - r); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: CD - 0.016, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 12 });
    g.translate(0, C0, -(CD - 0.016) / 2);
    cabinet.add(new THREE.Mesh(g, M.cabinet));
    // casters
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cx = sx * (CW / 2 - 0.07), cz = sz * (CD / 2 - 0.07);
      box(0.06, 0.02, 0.06, M.steel, cx, C0 - 0.01, cz, cabinet);
      cyl(0.035, 0.035, 0.025, M.rubber, cx, 0.035, cz, cabinet, 'z', 20);
      box(0.012, 0.05, 0.035, M.steel, cx, 0.06, cz, cabinet);
    }
    // Operator face (−x): monitor behind amber glass, buttons, keyboard shelf, e-stop, fans.
    const FX = -CW / 2 - 0.009;
    rbox(0.03, 0.40, 0.44, M.bodyDark, 0.01, FX, 1.48, 0, cabinet);
    const screenTex = canvasTex(512, 400, (c, w, h) => {
      c.fillStyle = '#1b2430'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2c3a4a'; c.fillRect(0, 0, w, 34);
      c.fillStyle = '#e8eef5'; c.font = '600 20px "IBM Plex Mono", monospace'; c.fillText(V.name.toUpperCase() + '  ·  NC', 14, 23);
      c.strokeStyle = '#3f5368'; c.lineWidth = 1;
      for (let x = 20; x < 330; x += 20) { c.beginPath(); c.moveTo(x, 50); c.lineTo(x, 380); c.stroke(); }
      for (let y = 50; y < 380; y += 20) { c.beginPath(); c.moveTo(20, y); c.lineTo(330, y); c.stroke(); }
      c.strokeStyle = '#f07a22'; c.lineWidth = 2;
      [[30, 60, 120, 140], [160, 60, 150, 90], [30, 210, 90, 160], [130, 160, 90, 110], [230, 160, 90, 210]].forEach(r => c.strokeRect(...r));
      c.fillStyle = '#9fb4c8'; c.font = '500 18px "IBM Plex Mono", monospace';
      ['X  612.40', 'Y 1408.25', 'Z   -3.20', 'S 18000', 'F 15000'].forEach((t, i) => c.fillText(t, 350, 80 + i * 32));
      c.fillStyle = '#39d24a'; c.fillRect(350, 260, 140, 40);
      c.fillStyle = '#0b1a0d'; c.fillText('CYCLE', 385, 286);
    });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.33), mat('cabinet_screen', { map: screenTex, emissive: '#ffffff', emissiveMap: screenTex, emissiveIntensity: 0.7, roughness: 0.4 }));
    scr.rotation.y = -Math.PI / 2; at(scr, FX - 0.016, 1.48, 0, cabinet);
    const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.35), mat('cabinet_glass', { color: '#ff9a3c', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 }));
    glassPane.rotation.y = -Math.PI / 2; at(glassPane, FX - 0.019, 1.48, 0, cabinet);
    // Button strip
    rbox(0.02, 0.09, 0.30, M.bodyDark, 0.006, FX, 1.18, 0, cabinet);
    [[-0.1, M.btnGreen], [-0.05, M.btnGreen], [0.0, M.black], [0.05, M.btnRed]].forEach(([dz, m]) => cyl(0.015, 0.015, 0.02, m, FX - 0.018, 1.18, dz, cabinet, 'x', 20));
    cyl(0.02, 0.02, 0.02, M.alu, FX - 0.018, 1.18, 0.11, cabinet, 'x', 20);
    // Keyboard shelf on brackets
    const shelf = new THREE.Group(); shelf.position.set(FX - 0.17, 1.08, 0); cabinet.add(shelf);
    rbox(0.34, 0.018, 0.5, M.black, 0.005, 0, 0, 0, shelf);
    rbox(0.24, 0.02, 0.42, M.bodyDark, 0.004, 0.02, 0.019, 0, shelf);
    for (const sz of [-0.2, 0.2]) {
      const br = new THREE.Shape(); br.moveTo(0, 0); br.lineTo(0.17, 0); br.lineTo(0.17, -0.14); br.closePath();
      const bg = new THREE.ExtrudeGeometry(br, { depth: 0.01, bevelEnabled: false });
      const bm = at(new THREE.Mesh(bg, M.black), 0, -0.009, sz, shelf);
      bm.rotation.y = 0; bm.position.x = 0.0;
    }
    // Handheld MPG pendant in its holder, with a coiled cord (install photos)
    {
      const pz = 0.2, py = 0.95;
      rbox(0.03, 0.06, 0.1, M.black, 0.004, FX - 0.01, py - 0.1, pz, cabinet);
      rbox(0.05, 0.2, 0.085, M.black, 0.012, FX - 0.035, py, pz, cabinet);
      cyl(0.03, 0.03, 0.012, M.btnRed, FX - 0.062, py + 0.03, pz, cabinet, 'x', 24);
      cyl(0.008, 0.008, 0.02, M.steel, FX - 0.07, py + 0.03, pz + 0.018, cabinet, 'x', 10);
      for (let i = 0; i < 3; i++) cyl(0.006, 0.006, 0.008, i ? M.black : M.btnGreen, FX - 0.062, py - 0.04, pz - 0.025 + i * 0.025, cabinet, 'x', 10);
      const coil = [];
      for (let t = 0; t <= 1; t += 1 / 160) coil.push([FX - 0.035 + Math.cos(t * 60) * 0.018, py - 0.1 - t * 0.42, pz + Math.sin(t * 60) * 0.018]);
      coil.push([FX - 0.02, py - 0.6, pz - 0.05], [FX - 0.002, py - 0.62, pz - 0.12]);
      cabinet.add(tube(coil, 0.004, M.black, 400));
    }
    // E-stop
    rbox(0.03, 0.08, 0.08, M.yellow, 0.008, FX - 0.004, 0.82, 0, cabinet);
    cyl(0.026, 0.02, 0.025, M.btnRed, FX - 0.025, 0.82, 0, cabinet, 'x', 24);
    // Fan grilles
    for (const dz of [-0.11, 0.11]) {
      rbox(0.012, 0.13, 0.13, M.black, 0.01, FX, 0.32, dz, cabinet);
      for (let i = 0; i < 5; i++) box(0.006, 0.006, 0.11, M.bodyDark, FX - 0.008, 0.27 + i * 0.025, dz, cabinet);
    }
    // Vertical logo on the long +z face, reading top to bottom
    const cl = logoTex();
    const lw = 1.45;
    decal(cl, lw, 0.2, C0 + CH / 2 + 0.08, CD / 2 + 0.003, cabinet, { rotZ: -Math.PI / 2, name: 'logo_cabinet' });
    // Signal tower
    const tw = new THREE.Group(); tw.position.set(-CW / 2 + 0.16, C0 + CH, 0); cabinet.add(tw);
    cyl(0.03, 0.035, 0.03, M.white, 0, 0.015, 0, tw);
    cyl(0.008, 0.008, 0.07, M.alu, 0, 0.065, 0, tw);
    const lampMats = [M.lightGreen, M.lightAmber, M.lightRed];
    lampMats.forEach((m, i) => cyl(0.027, 0.027, 0.055, m, 0, 0.13 + i * 0.058, 0, tw));
    for (let i = 0; i < 4; i++) cyl(0.028, 0.028, 0.004, M.white, 0, 0.1 + i * 0.058, 0, tw);
    cyl(0.024, 0.027, 0.015, M.white, 0, 0.3, 0, tw);
  }

  // ---------- the sheet being nested ----------
  // The sheet sits against the origin pins at the chute end of the table.
  const SHEET = { L: 2.44, W: 1.22, T: 0.018, x: TABLE_X - (TABLE_L - 2.52) / 2, z: 0 };
  // Each sheet has its own canvas, so its kerf lines stay on it while it rides out on the conveyor.
  const sheets = new THREE.Group(); sheets.name = 'Sheets'; machine.add(sheets);
  function makeSheet(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = MAX_ANISO;
    const group = new THREE.Group(); group.name = name; sheets.add(group);
    box(SHEET.L, SHEET.T, SHEET.W, M.mdfEdge, 0, SHEET.T / 2 - 0.0005, 0, group);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(SHEET.L, SHEET.W), mat('mdf_top_' + name, { map: tex, roughness: 0.85, metalness: 0 }));
    top.rotation.x = -Math.PI / 2;
    at(top, 0, SHEET.T + 0.0003, 0, group);
    const sh = {
      group, canvas, ctx, tex,
      paint() {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#d4c3a0'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 9000; i++) {
          const v = 150 + Math.random() * 60;
          ctx.fillStyle = `rgba(${v},${v * 0.86},${v * 0.66},0.18)`;
          ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 1 + Math.random() * 2);
        }
        tex.needsUpdate = true;
      },
    };
    sh.paint();
    return sh;
  }
  const sheetA = makeSheet('Sheet_MDF');
  sheetA.group.position.set(SHEET.x, TABLE_TOP, SHEET.z);
  const sheetB = V.line ? makeSheet('Sheet_MDF_2') : null;   // the line swaps between two
  if (sheetB) sheetB.group.visible = false;
  let cur = sheetA;          // the sheet on the table (or being loaded)
  let leaving = null;        // the cut sheet riding out on the conveyor

  // Cables from cabinet to machine, lying on the floor (rebuilt when the cabinet moves)
  const cables = new THREE.Group(); cables.name = 'Cables'; machine.add(cables);
  function buildCables() {
    cables.children.slice().forEach(c => { c.geometry.dispose(); cables.remove(c); });
    const cx = cabinet.position.x + 0.32, cz = cabinet.position.z;
    for (const [dz, r] of [[0, 0.015], [0.08, 0.012]]) {
      const mid = new THREE.Vector3((cx - BL / 2) / 2, 0.012, (cz - 0.55) / 2 + dz);
      cables.add(tube([[cx, 0.1, cz + dz], [cx + 0.12, 0.012, cz + dz - 0.08], [mid.x, 0.012, mid.z], [-BL / 2 - 0.1, 0.012, -0.5 + dz], [-BL / 2 - 0.01, 0.25, -0.55 + dz]], r, M.black, 40));
    }
  }
  buildCables();

  // ---------- optional line equipment (toggled in the toolbar) ----------
  // Outfeed: a belt conveyor beyond the chute end that takes the finished panels away.
  // Infeed: a scissor lift table beyond the roller platform holding the stack of boards to be cut.
  // The conveyor reaches in over the chute pit right up to the slotted plate, so panels slide straight onto it.
  const OUT = { x0: PIT.x1 + 0.005, len: V.line ? LINE_LENGTH - 0.417 - (BL / 2 + 0.03 + 2.5 - (PIT.x1 + 0.005)) : 3.0 + (BL / 2 + 0.02 + PIT.x1), w: 1.36, top: TABLE_TOP - 0.01 };
  const outfeed = new THREE.Group(); outfeed.name = 'OutfeedConveyor'; outfeed.visible = V.line; machine.add(outfeed);
  const beltTex = canvasTex(256, 64, (c, w, h) => {
    c.fillStyle = '#245c57'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
    c.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 1, h);
  }, { repeat: [OUT.len / 0.5, 1] });
  const beltMat = mat('conveyor_belt', { map: beltTex, roughness: 0.75, metalness: 0 });
  {
    const cx = OUT.x0 - OUT.len / 2;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(OUT.len, 0.02, OUT.w - 0.08), [M.rubber, M.rubber, beltMat, M.rubber, M.rubber, M.rubber]);
    at(belt, cx, OUT.top - 0.01, 0, outfeed);
    for (const s of [-1, 1]) {
      rbox(OUT.len + 0.04, 0.12, 0.04, M.alu, 0.006, cx, OUT.top - 0.04, s * (OUT.w / 2 - 0.02), outfeed);       // side frame
      rbox(OUT.len + 0.04, 0.03, 0.03, M.alu, 0.004, cx, OUT.top + 0.022, s * (OUT.w / 2 - 0.015), outfeed);       // guide lip
    }
    for (const x of [OUT.x0 - 0.04, OUT.x0 - OUT.len + 0.04]) cyl(0.04, 0.04, OUT.w - 0.1, M.steel, x, OUT.top - 0.04, 0, outfeed, 'z', 24);   // end drums
    for (let i = 0; i < 4; i++) {
      const x = OUT.x0 - 0.5 - i * (OUT.len - 0.62) / 3;        // first legs stand clear of the pit
      for (const s of [-1, 1]) rbox(0.06, OUT.top - 0.1, 0.06, M.alu, 0.006, x, (OUT.top - 0.1) / 2, s * (OUT.w / 2 - 0.05), outfeed);
      box(0.04, 0.04, OUT.w - 0.1, M.alu, x, 0.25, 0, outfeed);
      for (const s of [-1, 1]) cyl(0.03, 0.035, 0.02, M.rubber, x, 0.01, s * (OUT.w / 2 - 0.05), outfeed, 'y', 16);
    }
    box(OUT.len - 0.2, 0.04, 0.04, M.alu, cx, 0.25, OUT.w / 2 - 0.05, outfeed);
    box(OUT.len - 0.2, 0.04, 0.04, M.alu, cx, 0.25, -(OUT.w / 2 - 0.05), outfeed);
    // tipping chute at the far end, grey with the logo on its face
    const ex = OUT.x0 - OUT.len - 0.02, chute = new THREE.Group(); chute.position.set(ex, OUT.top - 0.05, 0); chute.rotation.z = 0.75; outfeed.add(chute);
    rbox(0.45, 0.012, OUT.w, M.body, 0.004, -0.225, 0, 0, chute);
    for (const s of [-1, 1]) rbox(0.45, 0.1, 0.012, M.body, 0.004, -0.225, 0.05, s * (OUT.w / 2 - 0.006), chute);
    decal(logoTex(), 0.38, -0.225, 0.007, 0, chute, { name: 'logo_chute' }).rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    // drive motor and gearbox on the far end
    const mx = OUT.x0 - OUT.len + 0.12;
    rbox(0.14, 0.12, 0.12, M.black, 0.01, mx, OUT.top - 0.12, OUT.w / 2 + 0.08, outfeed);
    cyl(0.06, 0.06, 0.18, M.blue, mx, OUT.top - 0.12, OUT.w / 2 + 0.22, outfeed, 'z', 24);
  }
  // finished panels riding the belt
  const SHEET_T_OUT = 0.018, panelDoneMat = mat('panel_finished', { color: '#ddcca6', roughness: 0.8 });
  const outParts = (V.line ? [] : [[0.72, 0.56], [0.6, 0.38], [0.45, 0.22], [0.38, 0.56]]).map(([l, w], i) => {
    const p = box(l, SHEET_T_OUT, w, panelDoneMat, 0, OUT.top + SHEET_T_OUT / 2, (i % 2 ? -0.25 : 0.2), outfeed);
    p.userData.x = OUT.x0 - 0.4 - i * 0.75;
    return p;
  });

  const INF = { x0: BL / 2 + 0.03, len: 2.5, w: 1.3, boards: 8 };
  const WHEEL_TOP = LOAD.top + 0.02;   // tops of the wheels in the loading plate
  const infeed = new THREE.Group(); infeed.name = 'InfeedLiftTable'; infeed.visible = V.line; machine.add(infeed);
  const lift = { boards: INF.boards, deck: new THREE.Group(), arms: [], stack: [] };
  {
    const cx = INF.x0 + INF.len / 2;
    // floor frame
    for (const s of [-1, 1]) rbox(INF.len, 0.1, 0.1, M.band, 0.008, cx, 0.05, s * (INF.w / 2 - 0.05), infeed);
    for (const x of [INF.x0 + 0.05, INF.x0 + INF.len - 0.05]) rbox(0.1, 0.1, INF.w, M.band, 0.008, x, 0.05, 0, infeed);
    infeed.add(lift.deck);
    rbox(INF.len, 0.06, INF.w, M.band, 0.008, cx, 0.03, 0, lift.deck);                                           // deck (y set in placeLift)
    const stripeTex = canvasTex(256, 16, (c, w, h) => { c.fillStyle = '#f2c318'; c.fillRect(0, 0, w, h); c.fillStyle = '#16171a'; for (let x = -h; x < w; x += 32) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 16, h); c.lineTo(x + 16 + h, 0); c.lineTo(x + h, 0); c.fill(); } }, { repeat: [INF.len / 0.25, 1] });
    const stripeMat = mat('lift_stripe', { map: stripeTex, roughness: 0.5, metalness: 0 });
    for (const sz of [-1, 1]) { const st = at(new THREE.Mesh(new THREE.PlaneGeometry(INF.len, 0.05), stripeMat), cx, 0.03, sz * (INF.w / 2 + 0.001), lift.deck); if (sz < 0) st.rotation.y = Math.PI; }
    cyl(0.02, 0.02, 1.25, M.white, INF.x0 + INF.len - 0.15, 0.625, -(INF.w / 2 + 0.1), infeed, 'y', 12);   // level sensor post
    rbox(0.06, 0.05, 0.08, M.orange, 0.006, INF.x0 + INF.len - 0.15, 1.2, -(INF.w / 2 + 0.06), infeed);
    for (const s of [-1, 1]) for (const k of [0, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1, 0.07, 0.04), M.gantry);
      arm.userData = { s, k }; infeed.add(arm); lift.arms.push(arm);
    }
    lift.ram = cyl(0.04, 0.04, 1, M.steel, 0, 0, 0, infeed, 'y', 16);
    lift.body = cyl(0.055, 0.055, 0.35, M.black, 0, 0, 0, infeed, 'y', 20);
    // the stack of boards waiting to be cut
    for (let i = 0; i < INF.boards; i++) {
      const b = box(SHEET.L, SHEET.T - 0.0005, SHEET.W, M.mdfEdge, 0, 0, 0, lift.deck);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(SHEET.L, SHEET.W), mat('mdf_stack_' + i, { color: '#d4c3a0', roughness: 0.85 }));
      top.rotation.x = -Math.PI / 2; top.position.y = SHEET.T / 2; b.add(top);
      lift.stack.push(b);
    }
  }
  // The deck rises so the top board of the stack is always level with the roller platform.
  function placeLift() {
    const cx = INF.x0 + INF.len / 2, feed = WHEEL_TOP + SHEET.T;   // top board's underside level with the loading wheels
    const deckTop = feed - lift.boards * SHEET.T;
    lift.deck.position.y = deckTop - 0.06;
    lift.stack.forEach((b, i) => { b.visible = i < lift.boards; b.position.set(cx, 0.06 + SHEET.T / 2 + i * SHEET.T, 0); });
    const y0 = 0.1, y1 = deckTop - 0.06, span = INF.len - 0.5, xa = cx - span / 2, xb = cx + span / 2;
    for (const arm of lift.arms) {
      const { s, k } = arm.userData;
      const pa = new THREE.Vector3(xa, k ? y1 : y0, s * (INF.w / 2 - 0.14 - 0.05 * k));
      const pb = new THREE.Vector3(xb, k ? y0 : y1, pa.z);
      arm.position.copy(pa).add(pb).multiplyScalar(0.5);
      arm.scale.x = pa.distanceTo(pb);
      arm.rotation.set(0, 0, Math.atan2(pb.y - pa.y, pb.x - pa.x));
    }
    const ramTop = (y0 + y1) / 2 + 0.02, ramBot = y0 + 0.02;
    lift.body.position.set(cx - 0.35, ramBot + 0.175, 0);
    lift.ram.position.set(cx - 0.35, (ramTop + ramBot + 0.35) / 2, 0); lift.ram.scale.y = Math.max(ramTop - ramBot - 0.35, 0.02);
  }
  placeLift();
  let beltOffset = 0;
  const BELT = 0.5;
  let leavingT = 0;
  function updateLine(dt) {
    if (V.line) {
      if (running) { beltOffset += dt * BELT; beltTex.offset.x = -beltOffset / 0.5; }
      if (leaving) {
        const g = leaving.group, end = OUT.x0 - OUT.len + 0.05 + SHEET.L / 2;
        if (running && g.position.x > end) g.position.x = Math.max(end, g.position.x - dt * BELT);
        if (g.position.x < PIT.x1) g.position.y = OUT.top;
        if (g.position.x <= end && (leavingT += dt) > 4) { g.visible = false; leaving = null; leavingT = 0; }   // taken off at the stop
      }
      return;
    }
    if (outfeed.visible && running) {
      beltOffset += dt * 0.35;
      beltTex.offset.x = -beltOffset / 0.5;
      for (const p of outParts) {
        p.userData.x -= dt * 0.35;
        if (p.userData.x < OUT.x0 - OUT.len + 0.3) p.userData.x = OUT.x0 - 0.3;
        p.position.x = p.userData.x;
      }
    } else outParts.forEach(p => { p.position.x = p.userData.x; });
  }

  // Nesting layout: cabinet parts packed row by row, the way nesting software lays them out.
  const KERF = 0.012, MARGIN = 0.015;
  function layoutParts() {
    const parts = [], rows = [0.56, 0.38, 0.22], lens = [0.72, 0.60, 0.45, 0.38, 0.56];
    let z = -SHEET.W / 2 + MARGIN, k = 0;
    for (const h of rows) {
      if (z + h > SHEET.W / 2 - MARGIN) break;
      let x = -SHEET.L / 2 + MARGIN;
      for (;;) {
        const w = lens[k++ % lens.length];
        if (x + w > SHEET.L / 2 - MARGIN) break;
        parts.push([x, z, x + w, z + h]);
        x += w + KERF;
      }
      z += h + KERF;
    }
    return parts;
  }
  // Program: list of moves in sheet-local metres; h is the Z height above the cut (m).
  const Z_CLEAR = 0.0, Z_PARK = 0.05, Z_CUT = -0.071;
  function buildProgram() {
    const prog = [{ kind: 'tool', to: 1 }];
    const parts = layoutParts();
    parts.forEach(([x0, z0, x1, z1], idx) => {
      if (idx === Math.floor(parts.length / 2)) prog.push({ kind: 'tool', to: 4 });
      const o = KERF / 2;
      const c = [[x0 - o, z0 - o], [x1 + o, z0 - o], [x1 + o, z1 + o], [x0 - o, z1 + o], [x0 - o, z0 - o]];
      prog.push({ x: c[0][0], z: c[0][1], h: Z_CLEAR, kind: 'rapid' });
      prog.push({ x: c[0][0], z: c[0][1], h: Z_CUT, kind: 'plunge' });
      for (let i = 1; i < c.length; i++) prog.push({ x: c[i][0], z: c[i][1], h: Z_CUT, kind: 'cut' });
      prog.push({ x: c[4][0], z: c[4][1], h: Z_CLEAR, kind: 'lift' });
    });
    return prog;
  }
  const PROGRAM = buildProgram();
  const SPEED = { rapid: 2.2, plunge: 0.35, lift: 0.5, cut: 0.75, park: 1.4 };

  // ---------- state / animation ----------
  const PARK = { x: -1.0, z: 0.0, h: Z_PARK };  // tool parked near the chute end
  const tool = { ...PARK };
  let running = false, step = 0, dwell = 0, finished = false, rpm = 0;

  function sheetToPx(x, z) { return [(x + SHEET.L / 2) / SHEET.L * cur.canvas.width, (z + SHEET.W / 2) / SHEET.W * cur.canvas.height]; }
  function drawKerf(ax, az, bx, bz) {
    const [px0, py0] = sheetToPx(ax, az), [px1, py1] = sheetToPx(bx, bz);
    const c = cur.ctx;
    c.strokeStyle = '#3d2c1c';
    c.lineWidth = KERF / SHEET.L * cur.canvas.width;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(px0, py0); c.lineTo(px1, py1); c.stroke();
    cur.tex.needsUpdate = true;
  }

  // Drag chains run as a U: the lower run lies fixed in its tray, bends 180°, and the upper run comes
  // back to the moving end. With a constant length the bend sits halfway, beyond the moving end.
  function uChainPoints(fix, mov, len, yl, r, toVec) {
    const b = (len + fix + mov) / 2, pts = [toVec(fix, yl), toVec(b, yl)];
    for (let i = 1; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 10; pts.push(toVec(b + Math.cos(a) * r, yl + r + Math.sin(a) * r)); }
    pts.push(toVec(b, yl + 2 * r), toVec(mov, yl + 2 * r));
    return new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.1);
  }
  function placeAxes() {
    // tool position (sheet-local) → gantry x, carriage z, slide y
    const wx = SHEET.x + tool.x, wz = SHEET.z + tool.z;
    gantry.position.x = wx - GX * HX;
    carriage.position.z = wz;
    zslide.position.y = tool.h;
    // X chain: lower run fixed in the tray from zFix toward +z, bend, upper run back into the box's +z side
    xChain.layout(uChainPoints(XCH.zFix, wz + EBOX.w / 2 + 0.03, XCH.len, XCH.y, XCH.r, (along, y) => new THREE.Vector3(XCH.x, y, along)));
    // Z chain: up from the box top, over, and straight down onto the slide (which moves with Z)
    {
      const yb = (V.box ? GBOX.y1 : EBOX.y1) + 0.02, yz = 1.96 + tool.h, top = Math.max(yb, yz) + ZCH.rise, r = (ZCH.xBox - ZCH.xZ) / 2, cx = (ZCH.xBox + ZCH.xZ) / 2;
      const P = (x, y) => new THREE.Vector3(x, y, ZCH.z);
      const pts = [P(ZCH.xBox, yb), P(ZCH.xBox, top)];
      for (let i = 1; i < 12; i++) { const a = i * Math.PI / 12; pts.push(P(cx + Math.cos(a) * r, top + Math.sin(a) * r)); }
      pts.push(P(ZCH.xZ, top), P(ZCH.xZ, yz));
      zChain.layout(new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.15));
    }
    // Y chain in the low tray along the back of the base, moving end under the back servo cover
    const gx = gantry.position.x;
    yChain.layout(uChainPoints(-BL / 2 + 0.15, gx + GX * 0.1, BL - 0.26, trayY + 0.021, 0.08, (along, y) => new THREE.Vector3(along, y, -(BD / 2 + 0.075))));
  }

  function moveToward(target, speed, dt) {
    const dx = target.x - tool.x, dz = target.z - tool.z, dh = target.h - tool.h;
    const d = Math.hypot(dx, dz, dh);
    const s = speed * dt;
    if (d <= s) { tool.x = target.x; tool.z = target.z; tool.h = target.h; return true; }
    tool.x += dx / d * s; tool.z += dz / d * s; tool.h += dh / d * s;
    return false;
  }

  const dX = { textContent: '' }, dY = { textContent: '' }, dZ = { textContent: '' }, dS = { textContent: '' }; // status / DRO, read by info()
  function setLamps(state) {
    M.lightGreen.emissiveIntensity = state === 'run' ? 2.4 : 0.05;
    M.lightAmber.emissiveIntensity = state === 'idle' ? 2.0 : 0.05;
    M.lightRed.emissiveIntensity = 0.05;
  }
  setLamps('idle');

  // ATC sequence, all inside the hood: lift, run along the beam to the pocket of the current tool, slide the
  // spindle back over the row, lower into the fork and release, rise, run to the new tool, grab it, slide back. Spindle must have stopped before release.
  const H_DOCK = FY - 1.02, H_CLR = 0.28;
  let tc = null;
  function makeToolChange(to, fromProgram) {
    const zf = pocketZ(currentTool) - SHEET.z, zt = pocketZ(to) - SHEET.z;
    const idx = i => (DISC ? [{ index: i }] : []);
    return { to, from: currentTool, fromProgram, i: 0, t: 0, steps: [
      { move: { h: H_CLR }, speed: 0.5 },
      { move: { z: zf, h: H_CLR }, speed: 1.0 },
      ...idx(currentTool),
      { shift: 1 },
      { move: { z: zf, h: H_DOCK }, speed: 0.2 },
      { release: true }, { wait: 0.35 },
      { move: { z: zf, h: H_CLR }, speed: 0.4 },
      ...idx(to),
      { move: { z: zt, h: H_CLR }, speed: 0.8 },
      { move: { z: zt, h: H_DOCK }, speed: 0.2 },
      { grab: to }, { wait: 0.35 },
      { move: { z: zt, h: H_CLR }, speed: 0.4 },
      { shift: 0 },
    ] };
  }
  function runToolChange(dt) {
    const st = tc.steps[tc.i];
    let done = false;
    if (st.move) done = moveToward({ x: st.move.x ?? tool.x, z: st.move.z ?? tool.z, h: st.move.h }, st.speed, dt);
    else if (st.shift !== undefined) { const d = st.shift - spindleShift, k = 1.4 * dt; spindleShift += THREE.MathUtils.clamp(d, -k, k); done = Math.abs(d) < 1e-4; }
    else if (st.index !== undefined) {
      const d = Math.atan2(Math.sin(Math.PI - pocketAngle(st.index) - discG.rotation.y), Math.cos(Math.PI - pocketAngle(st.index) - discG.rotation.y));
      const k = 2.5 * dt; discG.rotation.y += THREE.MathUtils.clamp(d, -k, k); done = Math.abs(d) < 1e-3;
    }
    else if (st.release) { if (rpm < 0.02) { seatInMagazine(currentTool); done = true; } }
    else if (st.grab !== undefined) { seatInSpindle(st.grab); currentTool = st.grab; done = true; }
    else if (st.wait) { tc.t += dt; done = tc.t >= st.wait; if (done) tc.t = 0; }
    if (done) tc.i++;
    return tc.i >= tc.steps.length;
  }

  // ---------- line cycle (3500Ant / 4800Ant / 5000AF) ----------
  // After a sheet is cut: the cups drop behind it and the gantry pushes the parts onto the conveyor; then the
  // cups take the top board off the lift, drag it in over the loading wheels, let go, and push it from behind
  // onto the table against the origin pins. The gantry can't reach the whole way in one pull, hence two strokes.
  // Positions are where the cups are (world x); the gantry follows.
  const GMIN = SHEET.x - SHEET.L / 2 - 0.02 - HX, GMAX = BL / 2 - 0.2;   // gantry x travel used by the loader
  const toolXForCup = X => THREE.MathUtils.clamp(X - LOADER_X, GMIN, GMAX) + HX - SHEET.x;
  const cupWorld = () => SHEET.x + tool.x - HX + LOADER_X;
  let lineSeq = null;
  function makeLineSeq() {
    const half = SHEET.L / 2, stackX = INF.x0 + INF.len / 2;
    const other = () => (cur === sheetA ? sheetB : sheetA);
    return { i: 0, carry: null, steps: [
      { label: 'ดันชิ้นงานลงสายพาน', go: () => cur.group.position.x + half + 0.06, speed: SPEED.park },
      { label: 'ดันชิ้นงานลงสายพาน', cups: TABLE_TOP + 0.004 },
      { label: 'ดันชิ้นงานลงสายพาน', go: () => GMIN + LOADER_X, speed: 0.6, carry: true },
      { label: 'ดันชิ้นงานลงสายพาน', fn: () => { leaving = cur; leavingT = 0; } },
      { label: 'ดันชิ้นงานลงสายพาน', cups: CUP_REST },
      { label: 'ดูดแผ่นจากโต๊ะยก', go: () => stackX - half + 0.15, speed: SPEED.park },
      { label: 'ดูดแผ่นจากโต๊ะยก', fn: () => {
        // the top board becomes the next sheet
        const nx = other();
        if (leaving === nx) { nx.group.visible = false; leaving = null; }
        cur = nx; cur.paint(); cur.group.visible = true;
        lift.boards -= 1; lift.stack[lift.boards].visible = false;
        cur.group.position.set(stackX, WHEEL_TOP, SHEET.z);
      } },
      { label: 'ดูดแผ่นจากโต๊ะยก', cups: WHEEL_TOP + SHEET.T },
      { label: 'ดึงแผ่นเข้าเครื่อง', go: () => GMIN + LOADER_X, speed: 0.6, carry: true },
      { label: 'ดึงแผ่นเข้าเครื่อง', cups: CUP_REST },
      { label: 'ดึงแผ่นเข้าเครื่อง', fn: () => { if (lift.boards === 0) lift.boards = INF.boards; placeLift(); } },
      { label: 'ดันแผ่นเข้าตำแหน่ง', go: () => cur.group.position.x + half + 0.06, speed: SPEED.park },
      { label: 'ดันแผ่นเข้าตำแหน่ง', cups: WHEEL_TOP + 0.004 },
      { label: 'ดันแผ่นเข้าตำแหน่ง', go: () => SHEET.x + half + 0.06, speed: 0.4, carry: true },
      { label: 'ดันแผ่นเข้าตำแหน่ง', fn: () => { cur.group.position.set(SHEET.x, TABLE_TOP, SHEET.z); } },
      { label: 'ดันแผ่นเข้าตำแหน่ง', cups: CUP_REST },
    ] };
  }
  function runLine(dt) {
    if (!lineSeq) lineSeq = makeLineSeq();
    const L = lineSeq, st = L.steps[L.i];
    let done = false;
    if (st.go) {
      if (st.carry && L.carry === null) L.carry = cur.group.position.x - cupWorld();
      done = moveToward({ x: toolXForCup(st.go()), z: 0, h: Z_PARK }, st.speed, dt);
      if (st.carry) cur.group.position.x = cupWorld() + L.carry;
      if (done) L.carry = null;
    } else if (st.cups !== undefined) {
      const k = 0.35 * dt; cupY += THREE.MathUtils.clamp(st.cups - cupY, -k, k); done = Math.abs(st.cups - cupY) < 1e-4;
    } else if (st.fn) { st.fn(); done = true; }
    if (done) L.i++;
    if (L.i >= L.steps.length) { lineSeq = null; return true; }
    return false;
  }

  function tick(dt) {
    if (tc && (running || !tc.fromProgram)) {
      if (runToolChange(dt)) { if (tc.fromProgram) step++; tc = null; }
    } else if (running && !tc) {
      if (dwell > 0) { dwell -= dt; }
      else if (finished && V.line) {
        if (runLine(dt)) { finished = false; step = 0; dwell = 0.6; }
      }
      else if (finished) {
        if (moveToward(PARK, SPEED.park, dt)) {
          dwell = 2.0; finished = false; step = 0; cur.paint();
          if (infeed.visible) { lift.boards = lift.boards > 1 ? lift.boards - 1 : INF.boards; placeLift(); }
        }
      } else {
        const mv = PROGRAM[step];
        if (mv.kind === 'tool') {
          if (mv.to === currentTool) step++; else tc = makeToolChange(mv.to, true);
          if (step >= PROGRAM.length) finished = true;
        } else {
        const ax = tool.x, az = tool.z;
        const done = moveToward(mv, SPEED[mv.kind], dt);
        if (mv.kind === 'cut' && sheets.visible) drawKerf(ax, az, tool.x, tool.z);
        if (done) { step++; if (step >= PROGRAM.length) { finished = true; } }
        }
      }
    }
    if (running && !tc) rpm = Math.min(1, rpm + dt * 0.8);
    else rpm = Math.max(0, rpm - dt * (tc ? 1.6 : 0.6));
    if (spindle.position.x !== SHIFT * spindleShift) { spindle.position.x = SHIFT * spindleShift; buildHose(spindle.position.x); }
    toolMesh.rotation.y += rpm * dt * 60;
    fan.rotation.y += rpm * dt * 20;
    const gxPrev = gantry.position.x;
    placeAxes();
    // Press rollers come down while the cutter is in the material, but only where they land on the sheet.
    const dxG = gantry.position.x - gxPrev;
    const cutting = running && !tc && tool.h < Z_CLEAR - 0.005;
    const floorY = sheets.visible ? ROLL_DOWN : ROLL_DOWN - 0.018;
    for (const ro of rollers) {
      const wx = gantry.position.x + GX * ro.x - cur.group.position.x;
      const onSheet = Math.abs(wx) < SHEET.L / 2 - 0.02;
      const target = cutting && onSheet ? floorY : ROLL_UP;
      const step = 0.45 * dt;
      ro.y += THREE.MathUtils.clamp(target - ro.y, -step, step);
      if (ro.y - floorY < 0.002) ro.spin.rotation.z -= dxG / ROLL_R;
    }
    placeRollers();
    placeLoader();
    // the alignment bar pops up and pushes while the head is still parked, before the first plunge
    const alignTarget = running && !finished && step < 2 ? 1 : 0;
    alignLift += THREE.MathUtils.clamp(alignTarget - alignLift, -2.5 * dt, 2.5 * dt);
    placeAligner();
    updateCurtain(dt);
    updateLine(dt);
    const T = 'T' + (currentTool + 1) + ' · ';
    dS.textContent = tc ? `เปลี่ยนทูล T${tc.from + 1} → T${tc.to + 1}` : !running ? T + 'พร้อม' : lineSeq ? lineSeq.steps[Math.min(lineSeq.i, lineSeq.steps.length - 1)].label : rollers.some(r => r.y - floorY < 0.002) ? T + 'กำลังตัด · ลูกกลิ้งกดแผ่น' : T + 'กำลังตัด';
    // DRO in machine coordinates (mm): X across the gantry, Y along the bed, Z height above the spoil board
    dX.textContent = ((tool.z + SHEET.W / 2) * 1000).toFixed(1);
    dY.textContent = ((tool.x + SHEET.L / 2) * 1000).toFixed(1);
    dZ.textContent = ((tool.h - Z_CUT) * 1000 - 0).toFixed(1);
  }

  if (GX < 0) gantry.traverse(m => { if (m.userData.decal) m.scale.x *= -1; });
  shade(machine);
  xChain.group.traverse(m => { if (m.isMesh) m.castShadow = true; });
  // Thin decals and glass should not cast shadows
  machine.traverse(m => { if (m.isMesh && (m.material.transparent || m.name.startsWith('logo') || m.name.startsWith('tag') || m.name.startsWith('axis'))) m.castShadow = false; });
  placeAxes();

  // Start running so the main page shows it cutting.
  running = true; setLamps('run');
  // On a line the cabinet stands right behind the conveyor (brochure photos; keeps the 2260 mm overall width).
  const CAB_HOME = cabinet.position.clone(), CAB_LINE = new THREE.Vector3(-BL / 2 - 0.55, 0, -(OUT.w / 2 + 0.36));   // just behind the conveyor rail
  const lineChanged = () => { cabinet.position.copy(outfeed.visible ? CAB_LINE : CAB_HOME); buildCables(); };
  if (V.line) lineChanged();
  machine.userData.environment = true; // lit by an environment map, like the standalone page

  const cab = cabinet.position;
  const lineX0 = OUT.x0 - OUT.len, lineX1 = INF.x0 + INF.len, lineCx = (lineX0 + lineX1) / 2;
  const toggles = [
    { label: 'เครื่องทำงาน', on: 'ตัด', off: 'หยุด', initial: true, set: v => { running = v; setLamps(v ? 'run' : 'idle'); } },
    { label: 'ฝาครอบหัว', on: 'แสดง', off: 'ซ่อน', initial: true, set: v => { hood.visible = v; } },
    { label: 'ตู้คอนโทรล', on: 'แสดง', off: 'ซ่อน', initial: true, set: v => { cabinet.visible = v; cables.visible = v; } },
  ];
  if (!V.line) toggles.push(
    { label: 'สายพานขาออก', on: 'มี', off: 'ไม่มี', initial: false, set: v => { outfeed.visible = v; lineChanged(); } },
    { label: 'โต๊ะยกขาเข้า', on: 'มี', off: 'ไม่มี', initial: false, set: v => { infeed.visible = v; lineChanged(); } },
  );

  return {
    object: machine,
    workpiece: sheets,
    pieceLabel: 'แผ่นไม้',
    info: () => `โต๊ะ 1220 × ${V.tableL > 2.7 ? 2800 : V.line ? 2500 : 2450} · ทูล 12 ตัว${DISC ? ' (จาน)' : ''} · ${dS.textContent} · X ${dX.textContent} Y ${dY.textContent} Z ${dZ.textContent}`,
    labels: [
      { text: V.heads > 1 ? 'หัว ATC 9 kW + หัวเจาะ' : 'หัว ATC 9 kW', at: [0.2, 2.6, 0] },
      { text: 'ตู้คอนโทรล', at: [cab.x, 2.25, cab.z] },
      ...(V.line ? [
        { text: 'โต๊ะยก (X-lift)', at: [INF.x0 + INF.len / 2, 1.35, 0] },
        { text: 'สายพานขาออก', at: [OUT.x0 - OUT.len / 2, 1.3, 0] },
      ] : []),
      ...(DISC ? [{ text: 'แม็กกาซีนจาน 12 ทูล', at: [0.1, 2.2, BEAM_HALF] }] : []),
    ],
    views: V.line
      ? { a: [lineCx + 2.2, 4.4, 11.5], b: [lineCx - 2.2, 4.2, -11.5], target: [lineCx, 0.9, 0] }
      : { a: [1.2, 2.7, 7.2], b: [-1.6, 3.0, -6.6], target: [-0.45, 0.95, 0] },
    toggles,
    update(dt) { tick(dt); },
  };
}
