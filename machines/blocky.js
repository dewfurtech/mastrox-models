import * as THREE from 'three';
import { logoTexture, LOGO_ASPECT } from './lib.js';

// Blocky stand-ins for a machine, for factory layouts where the full model is too much
// but a plain grey box says too little. Three levels, coarse to fine:
//   plainBox(machine)                      one grey box of the measured size, orange stripe at the front
//   toBlocky(machine, { level: 'chunky' }) a handful of big blocks (base, table, beam, cabinet, hood):
//                                          same-colour blocks that touch are merged into one, small ones go
//   toBlocky(machine, { level: 'blocky' }) every part bigger than 12 cm as its own box, tilted with the part
//                                          (the rules Factory Simulator uses in src/view3d/machines3d.ts)
// Each returns a THREE.Group holding one mesh (vertex colours, flat shading) plus the mastrox logos where the
// real machine has them, in the real artwork (`label: false` to leave them out), placed like the machine's root (so it lines up with the full model),
// or with the base centre at the origin when `center: true`. The workpiece and operator zones are left out.

export const LEVELS = {
  // minPart: parts whose bounding-box diagonal is shorter than this go (bolts, buttons, labels, small lights)
  // minTube: tubes thinner than this go (air lines, cables)
  blocky: { minPart: 0.12, minTube: 0.035, glassPad: 0.02, merge: false },
  // merge: same-colour blocks that touch become their common box (if that box isn't mostly empty),
  // then blocks under `minBlock` go, long thin ones go (rails, trim strips: middle side under `minThick`)
  // and blocks almost inside a bigger one go
  chunky: { minPart: 0.12, minTube: 0.035, glassPad: 0.02, merge: true, minBlock: 0.45, minThick: 0.1, fill: 0.5, gap: 0.05 },
};

const TEXTURED = new THREE.Color('#b4b8bd');   // parts with a texture (printed panels, the table top's grain)
const WHITE = new THREE.Color('#ffffff');
const BOX_GREY = new THREE.Color('#a9adb2'), BOX_ORANGE = new THREE.Color('#f26022');

export function toBlocky(machine, opts = {}) {
  const o = { ...LEVELS[opts.level || 'blocky'], ...opts };
  const parts = collect(machine, o);
  let boxes;
  if (o.merge) {
    boxes = mergeTouching(parts.map(p => ({ box: p.aabb.clone(), color: p.color })), o);
    boxes = boxes.filter(b => { const s = b.box.getSize(V()); return s.length() >= o.minBlock && [s.x, s.y, s.z].sort((p, q) => p - q)[1] >= o.minThick; });
    boxes = dropInside(boxes);
  }
  const geo = o.merge ? buildAabbs(boxes) : buildOriented(parts);
  const out = finish(geo, machine, o, `${machine.object.name || 'machine'}_${o.merge ? 'Chunky' : 'Blocky'}`,
    o.merge ? boxes : parts.map(p => ({ box: p.aabb, color: p.color })), 'blocks');
  out.userData.blocky = { level: opts.level || 'blocky', blocks: o.merge ? boxes.length : parts.length };
  return out;
}

// One grey box the size of the machine (workpiece and operator zone left out), orange stripe along the top front edge.
export function plainBox(machine, opts = {}) {
  const b = measure(machine);
  const { axis, sign } = frontOf(machine);
  const stripe = Math.min(0.08, b.getSize(V()).y * 0.08);
  const body = { box: b.clone(), color: BOX_GREY };
  const band = b.clone();
  band.min.y = b.max.y - stripe;
  const face = sign > 0 ? b.max[axis] : b.min[axis];
  band.min[axis] = face - 0.001 * sign; band.max[axis] = face + 0.01 * sign;
  if (band.min[axis] > band.max[axis]) [band.min[axis], band.max[axis]] = [band.max[axis], band.min[axis]];
  const geo = buildAabbs([body, { box: band, color: BOX_ORANGE }]);
  const out = finish(geo, machine, opts, `${machine.object.name || 'machine'}_Box`, [body], 'box');
  out.userData.blocky = { level: 'box', blocks: 1 };
  return out;
}

// A machine record (as from MODELS[id]()) with its object swapped for a blocky copy; static.
export function blockyMachine(machine, opts = {}) {
  const object = opts.level === 'box' ? plainBox(machine, opts) : toBlocky(machine, opts);
  return { ...machine, object, workpiece: null, open: null, toggles: [], update() {}, info: () => `${object.userData.blocky.blocks} ก้อน` };
}

// Size and position of the machine without its workpiece and operator zones.
export function measure(machine) {
  const root = machine.object;
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const out = new THREE.Box3(), b = new THREE.Box3(), m = new THREE.Matrix4();
  eachMesh(machine, mesh => {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    b.copy(mesh.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(toRoot, mesh.matrixWorld));
    out.union(b);
  });
  return out;
}

// ---------------------------------------------------------------------------------------------

const V = () => new THREE.Vector3();

function eachMesh(machine, fn) {
  const skip = new Set();
  if (machine.workpiece) skip.add(machine.workpiece);
  const walk = obj => {
    if (!obj.visible || skip.has(obj) || obj.isCSS2DObject || obj.userData.operatorZone) return;
    if (obj.isMesh && obj.geometry?.attributes.position) fn(obj);
    for (const c of obj.children) walk(c);
  };
  walk(machine.object);
}

// Every part worth keeping: its local bounding box, the matrix into the root frame, its root-frame AABB and colour.
function collect(machine, o) {
  const root = machine.object;
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const parts = [];
  const inst = new THREE.Matrix4(), s = V();
  eachMesh(machine, mesh => {
    const g = mesh.geometry, p = g.parameters || {};
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!mat || mat.visible === false) return;
    if (g.type === 'PlaneGeometry' && mat.map) return;            // text and logo decals
    if (g.type === 'TubeGeometry' && p.radius < o.minTube) return; // air lines, cables
    if (!g.boundingBox) g.computeBoundingBox();
    if (g.boundingBox.isEmpty()) return;
    const color = colorOf(mat);
    const base = new THREE.Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld);
    // Acrylic hoods sit inside their frame, and a frame's box is solid: push the panels 2 cm out so they show.
    const glass = mat.transparent || mat.transmission > 0;
    const local = glass ? g.boundingBox.clone().expandByScalar(o.glassPad / base.getMaxScaleOnAxis()) : g.boundingBox;
    const count = mesh.isInstancedMesh ? mesh.count : 1;
    for (let i = 0; i < count; i++) {
      const m = base.clone();
      if (mesh.isInstancedMesh) m.multiply((mesh.getMatrixAt(i, inst), inst));
      const aabb = local.clone().applyMatrix4(m);
      if (aabb.getSize(s).length() < o.minPart) continue;
      parts.push({ local, matrix: m, aabb, color });
    }
  });
  return parts;
}

function colorOf(mat) {
  if (mat.map) return TEXTURED.clone();
  const c = mat.color ? mat.color.clone() : new THREE.Color('#cccccc');
  if (mat.transparent || mat.transmission > 0) c.lerp(WHITE, 0.2);   // acrylic: a bit lighter, still orange
  if (mat.emissive && mat.emissiveIntensity > 0) c.add(mat.emissive.clone().multiplyScalar(Math.min(mat.emissiveIntensity, 1) * 0.3));
  return c;
}

// Same-colour boxes that touch (within `gap`) become their common box, as long as the parts fill at least
// `fill` of it, so an L of two beams stays two boxes but a row of panels becomes one.
function mergeTouching(list, o) {
  const vol = b => { const s = b.getSize(V()); return Math.max(s.x, 0.02) * Math.max(s.y, 0.02) * Math.max(s.z, 0.02); };
  const key = c => c.getHexString().replace(/(.)./g, '$1');    // colours that differ in the low digits still match
  for (const b of list) { b.key = key(b.color); b.filled = vol(b.box); }
  const grown = new THREE.Box3(), u = new THREE.Box3();
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      grown.copy(a.box).expandByScalar(o.gap);
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.key !== a.key || !grown.intersectsBox(b.box)) continue;
        u.copy(a.box).union(b.box);
        if ((a.filled + b.filled) / vol(u) < o.fill) continue;
        a.box.copy(u);
        a.filled = Math.min(a.filled + b.filled, vol(u));
        list.splice(j, 1);
        grown.copy(a.box).expandByScalar(o.gap);
        j = i;   // the bigger box may now touch earlier ones
        changed = true;
      }
    }
  }
  return list;
}

// Blocks that sit (almost) wholly inside a bigger one add nothing from outside.
function dropInside(list) {
  const vol = b => { const s = b.getSize(V()); return s.x * s.y * s.z; };
  list.sort((a, b) => vol(b.box) - vol(a.box));
  const inter = new THREE.Box3();
  return list.filter((b, i) => {
    const v = vol(b.box);
    for (let k = 0; k < i; k++) {
      inter.copy(b.box).intersect(list[k].box);
      if (!inter.isEmpty() && vol(inter) > v * 0.9) return false;
    }
    return true;
  });
}

// 12 triangles per box, each face its own vertices so it shades flat.
const FACES = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
function pushBox(pos, col, corners, color) {
  for (const [a, b, c, d] of FACES) for (const k of [a, b, c, a, c, d]) {
    pos.push(corners[k].x, corners[k].y, corners[k].z);
    col.push(color.r, color.g, color.b);
  }
}
const cornersOf = (b, m) => Array.from({ length: 8 }, (_, i) => {
  const v = new THREE.Vector3(i & 4 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 1 ? b.max.z : b.min.z);
  return m ? v.applyMatrix4(m) : v;
});

function buildOriented(parts) {
  const pos = [], col = [];
  for (const p of parts) {
    const c = cornersOf(p.local, p.matrix);
    // Mirrored parts turn inside out; swapping corner i with 7 - i mirrors the box back through its centre.
    if (p.matrix.determinant() < 0) c.reverse();
    pushBox(pos, col, c, p.color);
  }
  return geometry(pos, col);
}

function buildAabbs(list) {
  const pos = [], col = [];
  for (const b of list) pushBox(pos, col, cornersOf(b.box), b.color);
  return geometry(pos, col);
}

function geometry(pos, col) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

const MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
MATERIAL.userData.shared = true;
function finish(geo, machine, o, name, hosts, level) {
  const mesh = new THREE.Mesh(geo, MATERIAL);
  mesh.name = name;
  const out = new THREE.Group();
  out.name = name;
  out.add(mesh);
  if (o.label !== false && hosts?.length) for (const l of logosFor(machine, hosts, level)) out.add(l);
  if (o.center) {
    const b = measure(machine), c = b.getCenter(V());
    for (const ch of out.children) ch.position.sub(new THREE.Vector3(c.x, b.min.y, c.z));
  } else {
    // Same place as the full model (some roots are turned, e.g. Booster faces the other way).
    const r = machine.object;
    out.position.copy(r.position); out.quaternion.copy(r.quaternion); out.scale.copy(r.scale);
  }
  return out;
}

// The front side in the root's frame: the horizontal axis the main camera view (views.a) looks along.
export function frontOf(machine) {
  const v = machine.views;
  if (!v) return { axis: 'z', sign: 1 };
  const d = new THREE.Vector3(...v.a).sub(new THREE.Vector3(...v.target));
  d.applyQuaternion(machine.object.quaternion.clone().invert());
  return Math.abs(d.x) > Math.abs(d.z) ? { axis: 'x', sign: Math.sign(d.x) || 1 } : { axis: 'z', sign: Math.sign(d.z) || 1 };
}

// ---- mastrox logos ----------------------------------------------------------------------------
// The full models already carry the real logo artwork (lib.js, from Docs\Logo) where the real machine has it.
// Each logo is copied at the same place, size and turn, then moved along its facing to sit on the front-most
// block under it (blocks are bigger or smaller than the real panels). Plain box: the biggest logo per side.
// A model with no logo gets one on its biggest front block.
const MIN_LOGO = 0.15;   // logos narrower than this (m) would just be a smudge on a block

function logosFor(machine, hosts, level) {
  const placed = [];
  for (const lg of realLogos(machine)) {
    const p = placeLogo(lg, hosts);
    if (p) placed.push(p);
  }
  let keep = placed;
  if (level === 'box') {
    const best = new Map();
    for (const p of placed) if (!best.has(p.side) || best.get(p.side).w < p.w) best.set(p.side, p);
    keep = [...best.values()];
  }
  if (!keep.length) { const f = frontLogo(machine, hosts); if (f) keep = [f]; }
  return keep.map(p => logoMesh(p, level === 'box' ? hosts[0].color : null));
}

// Every visible mastrox logo plane of the full model, in the root's frame.
function realLogos(machine) {
  const root = machine.object;
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const list = [];
  eachMesh(machine, mesh => {
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const tag = mat?.map?.userData?.mastroxLogo;
    if (!tag || mesh.geometry.type !== 'PlaneGeometry') return;
    const m = new THREE.Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld);
    const pos = V(), quat = new THREE.Quaternion(), scl = V();
    m.decompose(pos, quat, scl);
    const { width, height } = mesh.geometry.parameters;
    const w = width * Math.abs(scl.x), h = height * Math.abs(scl.y);
    if (w < MIN_LOGO && h < MIN_LOGO) return;
    list.push({ tex: mat.map, tag, w, h, pos, quat });
  });
  return list;
}

// Slide a logo along its facing onto the front-most block it overlaps; null if no block is under it.
function placeLogo(lg, hosts) {
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(lg.quat);
  const axis = ['x', 'y', 'z'].reduce((a, k) => (Math.abs(n[k]) > Math.abs(n[a]) ? k : a), 'x');
  if (Math.abs(n[axis]) < 0.85) return null;   // slanted: leave it out rather than float it
  const sign = Math.sign(n[axis]);
  const ext = V();   // half size of the logo along each axis
  for (const [cx, cy] of [[1, 1], [1, -1]]) {
    const v = new THREE.Vector3(cx * lg.w / 2, cy * lg.h / 2, 0).applyQuaternion(lg.quat);
    ext.max(new THREE.Vector3(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)));
  }
  const others = ['x', 'y', 'z'].filter(k => k !== axis);
  let face = null, under = false;
  for (const hst of hosts) {
    const b = hst.box;
    if (others.some(k => b.max[k] < lg.pos[k] - ext[k] || b.min[k] > lg.pos[k] + ext[k])) continue;
    const f = sign > 0 ? b.max[axis] : b.min[axis];
    face = face === null ? f : sign > 0 ? Math.max(face, f) : Math.min(face, f);
    if (others.every(k => b.min[k] <= lg.pos[k] && b.max[k] >= lg.pos[k])) under = true;
  }
  if (!under) return null;
  const pos = lg.pos.clone();
  pos[axis] = face + 0.006 * sign;
  return { ...lg, pos, side: axis + sign };
}

// No logo on the model (VAir): one on the biggest block face near the front, about badge size.
function frontLogo(machine, hosts) {
  const { axis, sign } = frontOf(machine);
  const across = axis === 'z' ? 'x' : 'z';
  const all = new THREE.Box3();
  hosts.forEach(h => all.union(h.box));
  const depth = Math.max(all.getSize(V())[axis], 0.01);
  const face = b => (sign > 0 ? b.max[axis] : b.min[axis]);
  let best = null, bestArea = 0;
  for (const h of hosts) {
    const s = h.box.getSize(V());
    if (s.y < 0.15 || s[across] < 0.3) continue;
    const back = Math.abs(face(h.box) - face(all)) / depth;
    if (back > 0.6) continue;
    const area = s.y * s[across] * (1 - back);
    if (area > bestArea) { bestArea = area; best = h; }
  }
  if (!best) return null;
  const s = best.box.getSize(V()), c = best.box.getCenter(V());
  const w = Math.min(s[across] * 0.5, s.y * 0.5 / LOGO_ASPECT, 0.8);
  const lum = 0.2126 * best.color.r + 0.7152 * best.color.g + 0.0722 * best.color.b;
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, axis === 'z' ? (sign > 0 ? 0 : Math.PI) : sign * Math.PI / 2, 0));
  return placeLogo({ tex: logoTexture({ mas: lum < 0.18 ? '#f2f2f2' : '#2e3135' }), tag: {}, w, h: w * LOGO_ASPECT, pos: c, quat }, hosts);
}

// On the plain grey box a light "mas" would vanish: use the dark one there (badges keep their orange block).
const logoMats = new Map();
function logoMesh(p, onColor) {
  let tex = p.tex;
  if (onColor && !p.tag.badge) {
    const lum = 0.2126 * onColor.r + 0.7152 * onColor.g + 0.0722 * onColor.b;
    tex = logoTexture({ mas: lum < 0.18 ? '#f2f2f2' : '#2e3135', trox: p.tag.trox, bold: p.tag.bold });
  }
  let mat = logoMats.get(tex);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ map: tex, transparent: !p.tag.badge, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false });
    mat.userData.shared = true;   // used by every copy: callers disposing a stand-in should leave it alone
    logoMats.set(tex, mat);
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), mat);
  mesh.name = 'MastroxLogo';
  mesh.position.copy(p.pos);
  mesh.quaternion.copy(p.quat);
  return mesh;
}
