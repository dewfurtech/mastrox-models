import * as THREE from 'three';

// Shared building blocks for the machine models. All sizes are meters.

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, ...o });

export const M = {
  body: std('#3b3e43', { roughness: 0.75 }),
  bodyDark: std('#26282c', { roughness: 0.8 }),
  frame: std('#1d1f22', { roughness: 0.7 }),
  navy: std('#3c4452', { roughness: 0.7 }),
  amber: new THREE.MeshPhysicalMaterial({
    color: '#ff9a2e', roughness: 0.15, metalness: 0, transparent: true, opacity: 0.42,
    emissive: '#a24a00', emissiveIntensity: 0.25, side: THREE.DoubleSide, depthWrite: false,
  }),
  rail: std('#d9d6cf', { roughness: 0.45, metalness: 0.5 }),
  roller: std('#e86a1e', { roughness: 0.55, metalness: 0 }),
  chain: std('#2b2d30', { roughness: 0.9 }),
  rubber: std('#2a2a2a', { roughness: 0.95, metalness: 0 }),
  steel: std('#b9bdc2', { roughness: 0.35, metalness: 0.8 }),
  chrome: std('#dfe3e6', { roughness: 0.15, metalness: 1 }),
  alu: std('#cfd3d6', { roughness: 0.4, metalness: 0.6 }),
  motor: std('#8d9399', { roughness: 0.5, metalness: 0.5 }),
  orange: std('#f07a22', { roughness: 0.5, metalness: 0.1 }),
  red: std('#d42a1f', { roughness: 0.5 }),
  redOrange: std('#e8452a', { roughness: 0.55, metalness: 0.1 }),
  yellow: std('#f2c218', { roughness: 0.5 }),
  green: std('#2bb34a', { roughness: 0.5 }),
  gearGreen: std('#4d7a4a', { roughness: 0.6 }),
  lime: std('#a8d80e', { roughness: 0.45, metalness: 0.15 }),
  white: std('#f2f2f0', { roughness: 0.6, metalness: 0 }),
  buff: std('#efece4', { roughness: 1, metalness: 0 }),
  brass: std('#c79a3a', { roughness: 0.35, metalness: 0.9 }),
  hose: std('#1b1b1b', { roughness: 0.6, metalness: 0.1 }),
  disc: std('#8e9398', { roughness: 0.45, metalness: 0.6 }),
  coil: std('#d8c39e', { roughness: 0.8, metalness: 0 }),
  knob: std('#5aa7d6', { roughness: 0.4 }),
  screen: std('#1d2a3c', { roughness: 0.2, emissive: '#3a5f8c', emissiveIntensity: 0.6 }),
  lamp: std('#ffb347', { emissive: '#ff9a2e', emissiveIntensity: 1.6 }),
  panel: std('#d8cbb3', { roughness: 0.8, metalness: 0 }),
  film: new THREE.MeshPhysicalMaterial({ color: '#f3f2ee', roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }), // high-gloss PVC film
  band: std('#8a5a32', { roughness: 0.6, metalness: 0 }),
};

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function cyl(r, h, mat, x = 0, y = 0, z = 0, axis = 'y', seg = 28) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Flat text decal drawn on a canvas; `w` is the decal width in meters.
// `accent` splits the text into a base-colored part and an orange part ("mas" + "trox").
export function decal(text, { w, color = '#ffffff', accent, bg, font = '400 120px "IBM Plex Sans Thai", sans-serif' }) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = font;
  c.width = Math.ceil(ctx.measureText(text).width) + 60;
  c.height = 170;
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.font = font;
  ctx.textBaseline = 'middle';
  if (accent) {
    const [a, b] = accent;
    ctx.fillStyle = color; ctx.fillText(a, 30, 88);
    ctx.fillStyle = '#f07a22'; ctx.fillText(b, 30 + ctx.measureText(a).width, 88);
  } else {
    ctx.fillStyle = color; ctx.fillText(text, 30, 88);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshBasicMaterial({ map: tex, transparent: !bg }));
}

// ---------- The mastrox logo, from the real artwork (Docs\Logo) ----------
// Two cuts of the same letters, each keyed off its background into a white mask once; every texture
// then recolours the "mas" and "trox" parts. Textures are made at once and painted when the image
// arrives, so models can be built synchronously.
//   thin: assets/mastrox-logo-thin.png  = Logo_GrayGround.png (white + orange on dark grey)
//   bold: assets/mastrox-logo-badge.png = mastroxR1.png (dark + white on orange) — the weight on the
//         Nova X beam in the photos
const ARTS = {
  thin: { file: 'mastrox-logo-thin.png', x: 137, y: 61, w: 1393, h: 235, split: 0.5255,
    alpha: (r, g, b) => (Math.max(r, g, b) - 40) / 190 },               // bright letters on #262626
  bold: { file: 'mastrox-logo-badge.png', x: 218, y: 203, w: 2250, h: 382, split: 0.523,
    alpha: (r, g, b) => (Math.abs(r - 253) + Math.abs(g - 79) + b - 40) / 220 }, // anything not orange
};
const ART_PAD = 0.05; // clear space each side, as a share of the width
const aspectOf = art => art.h / (art.w * (1 + 2 * ART_PAD));
export const LOGO_ASPECT = aspectOf(ARTS.thin), LOGO_ASPECT_BOLD = aspectOf(ARTS.bold);
// Resolves once both cuts are loaded and logo textures are painted (for snapshots taken straight away).
const artReady = [];
export let logosReady;
for (const art of Object.values(ARTS)) {
  art.mask = null; art.waiting = [];
  artReady.push(new Promise(res => art.waiting.push(res)));
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = art.w; c.height = art.h;
    const x = c.getContext('2d');
    x.drawImage(img, art.x, art.y, art.w, art.h, 0, 0, art.w, art.h);
    const id = x.getImageData(0, 0, art.w, art.h), d = id.data;
    for (let k = 0; k < d.length; k += 4) {
      const a = Math.min(1, Math.max(0, art.alpha(d[k], d[k + 1], d[k + 2])));
      d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = Math.round(a * 255);
    }
    x.putImageData(id, 0, 0);
    art.mask = c;
    art.waiting.splice(0).forEach(f => f());
  };
  img.onerror = () => art.waiting.splice(0).forEach(f => f());
  img.src = new URL('../assets/' + art.file, import.meta.url).href;
}
logosReady = Promise.all(artReady);

const logoCache = new Map();
// Texture of the logo with "mas" and "trox" in the given colours (cached per cut and colour pair).
export function logoTexture({ mas = '#f2f2f2', trox = '#f26022', bold = false } = {}) {
  const art = bold ? ARTS.bold : ARTS.thin, key = (bold ? 'b' : 't') + mas + trox;
  if (logoCache.has(key)) return logoCache.get(key);
  const W = 1536, artW = Math.round(W / (1 + 2 * ART_PAD)), H = Math.round(artW * art.h / art.w), pad = (W - artW) / 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const paint = () => {
    const x = c.getContext('2d');
    x.clearRect(0, 0, W, H);
    x.drawImage(art.mask, pad, 0, artW, H);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = mas; x.fillRect(0, 0, pad + artW * art.split, H);
    x.fillStyle = trox; x.fillRect(pad + artW * art.split, 0, W, H);
    x.globalCompositeOperation = 'source-over';
    tex.needsUpdate = true;
  };
  if (art.mask) paint(); else art.waiting.push(paint);
  tex.userData.mastroxLogo = { mas, trox, bold };   // blocky.js finds the logos by this
  logoCache.set(key, tex);
  return tex;
}

// The logo as a flat plane `w` meters wide; `color` is the "mas" colour ("trox" stays brand orange).
// `bold` picks the heavy cut (Nova X beam).
export const logo = (w, color = '#f2f2f2', trox, { bold = false } = {}) => new THREE.Mesh(
  new THREE.PlaneGeometry(w, w * (bold ? LOGO_ASPECT_BOLD : LOGO_ASPECT)),
  new THREE.MeshBasicMaterial({ map: logoTexture({ mas: color, trox, bold }), transparent: true, depthWrite: false }));

// The bold logo on its orange block (Docs\Logo\mastroxR1.png): dark "mas", white "trox". For badges.
export const BADGE_ASPECT = 788 / 2686;
let badgeTex = null;
export function badgeTexture() {
  if (!badgeTex) {
    badgeTex = new THREE.TextureLoader().load(new URL('../assets/mastrox-logo-badge.png', import.meta.url).href);
    badgeTex.colorSpace = THREE.SRGBColorSpace;
    badgeTex.anisotropy = 8;
    badgeTex.userData.mastroxLogo = { badge: true };
  }
  return badgeTex;
}
export const logoBadge = w => new THREE.Mesh(new THREE.PlaneGeometry(w, w * BADGE_ASPECT), new THREE.MeshBasicMaterial({ map: badgeTexture() }));

export function warning(x, y, z, rotY = 0, s = 1) {
  const shape = new THREE.Shape([new THREE.Vector2(-0.025 * s, 0), new THREE.Vector2(0.025 * s, 0), new THREE.Vector2(0, 0.044 * s)]);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), M.yellow);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  return m;
}

export function tube(points, r, mat = M.hose, seg = 40) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 12), mat);
  m.castShadow = true;
  return m;
}

// Round push button / pilot light pointing along +z (rotate the parent to aim it).
export const button = (mat, x, y, z, r = 0.012) => cyl(r, 0.02, mat, x, y, z, 'z', 16);

// Leveling foot with a threaded stem.
export function foot(g, x, z, h = 0.06) {
  g.add(cyl(0.008, h, M.steel, x, h / 2, z, 'y', 10));
  g.add(cyl(0.03, 0.012, M.steel, x, 0.006, z, 'y', 20));
}

// Floor marker for where the operator stands to run the machine: a yellow pad with a hazard border
// and two footprints pointing at the controls. `look` is the direction the operator faces, [x, z].
// Other sites find it by name ("OperatorZone") or by userData.operatorZone (glTF: node extras):
//   { position: [x, y, z], look: [x, z], size: [width, depth] }   meters, floor level, Y up
const ZONE_MAT = {
  fill: new THREE.MeshStandardMaterial({ color: '#f2c218', roughness: 0.8, transparent: true, opacity: 0.35, depthWrite: false }),
  edge: std('#f2c218', { roughness: 0.6, metalness: 0 }),
  dark: std('#1d1f22', { roughness: 0.8, metalness: 0 }),
  foot: std('#1d1f22', { roughness: 0.8, metalness: 0, side: THREE.DoubleSide }), // the left foot is mirrored
};

function footprint(s) {
  // Sole outline about 260 mm long, wide (toe) end at shape −y.
  const p = new THREE.Shape();
  p.moveTo(0, -0.13 * s);
  p.bezierCurveTo(0.055 * s, -0.13 * s, 0.06 * s, -0.04 * s, 0.045 * s, 0.03 * s);
  p.bezierCurveTo(0.04 * s, 0.1 * s, 0.035 * s, 0.13 * s, 0, 0.13 * s);
  p.bezierCurveTo(-0.035 * s, 0.13 * s, -0.04 * s, 0.1 * s, -0.04 * s, 0.03 * s);
  p.bezierCurveTo(-0.05 * s, -0.04 * s, -0.05 * s, -0.13 * s, 0, -0.13 * s);
  const geo = new THREE.ShapeGeometry(p, 12);
  geo.rotateX(-Math.PI / 2); // flat on the floor, facing up, toes on +z
  geo.rotateY(Math.PI); // toes toward −z
  return geo;
}

export function operatorZone({ x, z, look, w = 0.7, d = 0.6 }) {
  const [lx, lz] = look;
  const g = new THREE.Group();
  g.name = 'OperatorZone';
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(-lx, -lz); // local −z (the toes) points along `look`
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ZONE_MAT.fill);
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = 0.003;
  fill.receiveShadow = true;
  g.add(fill);
  // Hazard border: alternating yellow / black dashes.
  const t = 0.04, h = 0.005, dash = 0.1;
  const edge = (len, along, cx, cz) => {
    const n = Math.max(2, Math.round(len / dash));
    for (let i = 0; i < n; i++) {
      const c = -len / 2 + (i + 0.5) * len / n;
      const m = along === 'x'
        ? box(len / n, h, t, i % 2 ? ZONE_MAT.dark : ZONE_MAT.edge, cx + c, h / 2, cz)
        : box(t, h, len / n, i % 2 ? ZONE_MAT.dark : ZONE_MAT.edge, cx, h / 2, cz + c);
      m.castShadow = false;
      g.add(m);
    }
  };
  edge(w, 'x', 0, -d / 2 + t / 2);
  edge(w, 'x', 0, d / 2 - t / 2);
  edge(d - 2 * t, 'z', -w / 2 + t / 2, 0);
  edge(d - 2 * t, 'z', w / 2 - t / 2, 0);
  const fs = Math.min(1, (d - 0.12) / 0.26);
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(footprint(fs), ZONE_MAT.foot);
    f.position.set(s * 0.09, 0.006, 0.02);
    if (s < 0) f.scale.x = -1; // left foot
    g.add(f);
  }
  const len = Math.hypot(lx, lz) || 1;
  g.userData.operatorZone = { position: [x, 0, z], look: [lx / len, lz / len], size: [w, d] };
  return g;
}

// Current operator zones of a (possibly edited) model, in the root's frame.
export function operatorZonesOf(root) {
  const out = [];
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  root.traverse(o => {
    const z = o.userData.operatorZone;
    if (!z || o.userData.deleted) return;
    const m = inv.clone().multiply(o.matrixWorld);
    const p = new THREE.Vector3().setFromMatrixPosition(m);
    const dir = new THREE.Vector3(0, 0, -1).transformDirection(m);
    const s = new THREE.Vector3().setFromMatrixScale(m);
    const r = v => +v.toFixed(4);
    o.userData.operatorZone = { position: [r(p.x), r(p.y), r(p.z)], look: [r(dir.x), r(dir.z)], size: [r(z.size[0] * s.x), r(z.size[1] * s.z)] };
    out.push(o.userData.operatorZone);
  });
  root.userData.operatorZones = out;
  return out;
}
