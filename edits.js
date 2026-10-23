// Edits made in editor.html, stored per machine and replayed on top of the generated model.
// A node is addressed by its path of child indices from the machine's root ("3/0/2"), which is
// stable because every model is built the same way each time. Edits are an ordered list of ops;
// replaying them in order on a fresh model gives the edited model (undo = drop the last op).
//
//   { type: 'xform', path, p: [x,y,z], r: [x,y,z], s: [x,y,z] }   position / rotation (rad) / scale
//   { type: 'color', path, color: '#rrggbb' }                       this part only
//   { type: 'matColor', path, color: '#rrggbb' }                    every part sharing its material
//   { type: 'hide', path, hidden: true|false }
//   { type: 'delete', path }                                        hidden for good (keeps paths stable)
//   { type: 'dup', path }                                           copy appended to the same parent
//   { type: 'rename', path, name }
//   { type: 'add', path, spec }                                     new box / pipe / wire under path ('' = root)
//   { type: 'params', path, spec }                                  change an added part's size, points, color…
//
// spec: { kind: 'box', w, h, d, color, p, r }
//       { kind: 'pipe' | 'wire', points: [[x,y,z]…], radius, color, flange?, sag? }   (meters, parent frame)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A machine whose model was rebuilt gets a new storage name, so edits made on the old model
// (whose part paths no longer match) are not replayed on the new one.
const STORE_ID = { 'rakete-3500a': 'rakete-3500a-v2', 'rakete-3500ant': 'rakete-3500ant-v2', 'rakete-4800ant': 'rakete-4800ant-v2', 'rakete-5000af': 'rakete-5000af-v2', 'nova-xs': 'nova-xs-v2', 'moon-10': 'moon-10-v2', 'moon-40': 'moon-40-v2', 'moon-40d': 'moon-40d-v2', 'moon-80': 'moon-80-v2' };
export const storeName = id => STORE_ID[id] ?? id;
const KEY = id => `mastrox-edits:${storeName(id)}`;

// ---------- Parts added in the editor ----------
export const ADD_DEFAULTS = {
  box: { kind: 'box', w: 0.3, h: 0.3, d: 0.3, color: '#9aa3ab' },
  pipe: { kind: 'pipe', radius: 0.025, color: '#b9bdc2', flange: true },
  wire: { kind: 'wire', radius: 0.006, color: '#1b1b1b', sag: 0.06 },
};
export const ADD_NAMES = { box: 'กล่อง', pipe: 'ท่อ', wire: 'สายไฟ' };

// Pipe path: straight runs joined by round bends (like real bent tube / elbows).
function pipeCurve(pts, r) {
  const path = new THREE.CurvePath();
  const v = pts.map(p => new THREE.Vector3(...p));
  let from = v[0];
  for (let i = 1; i < v.length - 1; i++) {
    const a = v[i - 1], b = v[i], c = v[i + 1];
    const bend = Math.min(r * 3, a.distanceTo(b) / 2, b.distanceTo(c) / 2);
    const p1 = b.clone().addScaledVector(a.clone().sub(b).normalize(), bend);
    const p2 = b.clone().addScaledVector(c.clone().sub(b).normalize(), bend);
    if (from.distanceTo(p1) > 1e-5) path.add(new THREE.LineCurve3(from, p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, b, p2));
    from = p2;
  }
  path.add(new THREE.LineCurve3(from, v[v.length - 1]));
  return path;
}

// Wire path: smooth curve through the points that hangs a little between them.
function wireCurve(pts, r, sag) {
  const v = pts.map(p => new THREE.Vector3(...p));
  const out = [v[0]];
  for (let i = 1; i < v.length; i++) {
    const a = v[i - 1], b = v[i], len = a.distanceTo(b);
    const mid = a.clone().lerp(b, 0.5);
    mid.y = Math.max(r, mid.y - len * (sag ?? 0));
    out.push(mid, b);
  }
  return new THREE.CatmullRomCurve3(out, false, 'centripetal');
}

function addedGeometry(spec) {
  if (spec.kind === 'box') return new THREE.BoxGeometry(spec.w, spec.h, spec.d);
  const pts = (spec.points || []).filter((p, i, a) => !i || new THREE.Vector3(...p).distanceTo(new THREE.Vector3(...a[i - 1])) > 1e-4);
  if (pts.length < 2) return new THREE.SphereGeometry(spec.radius, 12, 8).translate(...(pts[0] || [0, 0, 0]));
  const r = spec.radius;
  const curve = spec.kind === 'pipe' ? pipeCurve(pts, r) : wireCurve(pts, r, spec.sag);
  const len = curve.getLength();
  const tube = new THREE.TubeGeometry(curve, Math.min(600, Math.max(24, Math.round(len / (r * 1.5)) + pts.length * 12)), r, spec.kind === 'pipe' ? 20 : 10);
  tube.deleteAttribute('uv');
  const parts = [tube];
  // End caps (pipe: flanges, wire: small plugs) so the tube isn't open.
  for (const [at, t] of [[0, 0], [1, 1]]) {
    const p = curve.getPointAt(at), dir = curve.getTangentAt(t);
    const cap = spec.kind === 'pipe' && spec.flange
      ? new THREE.CylinderGeometry(r * 1.9, r * 1.9, Math.max(0.008, r * 0.5), 24)
      : new THREE.CylinderGeometry(r * (spec.kind === 'pipe' ? 1 : 1.35), r * (spec.kind === 'pipe' ? 1 : 1.35), spec.kind === 'pipe' ? 0.002 : r * 3, 16);
    cap.deleteAttribute('uv');
    cap.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)).translate(p.x, p.y, p.z);
    parts.push(cap);
  }
  return mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g)) ?? tube;
}

export function makeAdded(spec) {
  const mat = new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: spec.kind === 'pipe' ? 0.35 : spec.kind === 'wire' ? 0.55 : 0.7,
    metalness: spec.kind === 'pipe' ? 0.7 : 0.1,
  });
  const m = new THREE.Mesh(addedGeometry(spec), mat);
  m.castShadow = m.receiveShadow = true;
  m.name = spec.name || ADD_NAMES[spec.kind];
  if (spec.p) m.position.fromArray(spec.p);
  if (spec.r) m.rotation.set(...spec.r);
  m.userData.added = { ...spec };
  m.userData.ownMat = true;
  return m;
}

export function updateAdded(o, spec) {
  const next = { ...o.userData.added, ...spec };
  o.geometry.dispose();
  o.geometry = addedGeometry(next);
  if (next.color) for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.color.set(next.color);
  o.userData.added = next;
}

export function pathOf(root, obj) {
  const path = [];
  for (let o = obj; o && o !== root; o = o.parent) {
    if (!o.parent) return null;
    path.unshift(o.parent.children.indexOf(o));
  }
  return path.join('/');
}

export function nodeAt(root, path) {
  if (path === '' || path == null) return root;
  let o = root;
  for (const i of String(path).split('/')) {
    o = o?.children[+i];
    if (!o) return null;
  }
  return o;
}

function meshesOf(o) {
  const out = [];
  o.traverse(m => { if (m.isMesh) out.push(m); });
  return out;
}

// Give a part its own copy of its material(s) so a color change doesn't spread to other parts
// (the models share materials, e.g. every dark body panel uses the same one).
function ownMaterial(mesh) {
  if (mesh.userData.ownMat) return;
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(m => m.clone()) : mesh.material.clone();
  mesh.userData.ownMat = true;
}

function setColor(mat, color) {
  for (const m of Array.isArray(mat) ? mat : [mat]) if (m.color && !m.map) m.color.set(color);
}

export function applyOp(root, op) {
  const o = nodeAt(root, op.path);
  if (!o) return false;
  switch (op.type) {
    case 'xform':
      o.position.fromArray(op.p);
      o.rotation.set(op.r[0], op.r[1], op.r[2]);
      o.scale.fromArray(op.s);
      o.userData.edited = true;
      break;
    case 'color':
      for (const m of meshesOf(o)) { ownMaterial(m); setColor(m.material, op.color); }
      break;
    case 'matColor': {
      // All parts in this machine that share the clicked part's material get one shared copy.
      const src = meshesOf(o)[0];
      if (!src) return false;
      const shared = Array.isArray(src.material) ? src.material[0] : src.material;
      const copy = shared.clone();
      setColor(copy, op.color);
      root.traverse(m => {
        if (!m.isMesh) return;
        if (m.material === shared) m.material = copy;
        else if (Array.isArray(m.material)) m.material = m.material.map(x => (x === shared ? copy : x));
      });
      break;
    }
    case 'hide':
      o.visible = !op.hidden;
      o.userData.hidden = op.hidden;
      break;
    case 'delete':
      o.visible = false;
      o.userData.deleted = true;
      break;
    case 'dup': {
      const c = o.clone(true);
      if (o.userData.added) { c.geometry = o.geometry.clone(); c.material = o.material.clone(); }
      c.position.x += 0.1;
      c.userData = { ...o.userData, copyOf: op.path };
      o.parent.add(c);
      break;
    }
    case 'rename':
      o.name = op.name;
      break;
    case 'add':
      o.add(makeAdded(op.spec));
      break;
    case 'params':
      if (!o.userData.added) return false;
      updateAdded(o, op.spec);
      break;
    default:
      return false;
  }
  return true;
}

export function applyEdits(root, ops) {
  let failed = 0;
  for (const op of ops || []) if (!applyOp(root, op)) failed++;
  return failed;
}

export function loadEdits(id) {
  try { return JSON.parse(localStorage.getItem(KEY(id)) || '[]'); } catch { return []; }
}

export function saveEdits(id, ops) {
  try {
    if (ops.length) localStorage.setItem(KEY(id), JSON.stringify(ops));
    else localStorage.removeItem(KEY(id));
    return true;
  } catch { return false; }
}

// Which machines have saved edits (for the viewer's note).
export function editedIds() {
  const ids = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith('mastrox-edits:')) continue;
      const s = k.slice(14);
      if (s in STORE_ID) continue; // edits of a replaced model
      ids.push(Object.keys(STORE_ID).find(id => STORE_ID[id] === s) ?? s);
    }
  } catch { /* storage blocked */ }
  return ids;
}

// Bounds of a subtree, skipping hidden parts and (optionally) one subtree such as the workpiece.
export function boundsOf(root, skip) {
  const box = new THREE.Box3(), b = new THREE.Box3();
  root.updateMatrixWorld(true);
  const walk = o => {
    if (o === skip || !o.visible || o.isCSS2DObject || o.userData.operatorZone) return;
    if (o.isMesh) { b.makeEmpty(); b.expandByObject(o, false); /* includes children */ }
    if (o.isMesh) box.union(b);
    else for (const c of o.children) walk(c);
  };
  walk(root);
  return box;
}
