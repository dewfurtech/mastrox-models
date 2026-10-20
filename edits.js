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
import * as THREE from 'three';

const KEY = id => `mastrox-edits:${id}`;

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
      c.position.x += 0.1;
      c.userData = { ...o.userData, copyOf: op.path };
      o.parent.add(c);
      break;
    }
    case 'rename':
      o.name = op.name;
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
      if (k.startsWith('mastrox-edits:')) ids.push(k.slice(14));
    }
  } catch { /* storage blocked */ }
  return ids;
}

// Bounds of a subtree, skipping hidden parts and (optionally) one subtree such as the workpiece.
export function boundsOf(root, skip) {
  const box = new THREE.Box3(), b = new THREE.Box3();
  root.updateMatrixWorld(true);
  const walk = o => {
    if (o === skip || !o.visible || o.isCSS2DObject) return;
    if (o.isMesh) { b.makeEmpty(); b.expandByObject(o, false); /* includes children */ }
    if (o.isMesh) box.union(b);
    else for (const c of o.children) walk(c);
  };
  walk(root);
  return box;
}
