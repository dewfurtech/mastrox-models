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

export const logo = (w, color = '#f2f2f2') => decal('mastrox', { w, accent: ['mas', 'trox'], color, font: '400 130px "IBM Plex Sans Thai", sans-serif' });

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
