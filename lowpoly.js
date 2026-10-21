import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Low-poly copy of a machine model, for placing many machines in a layout without the frame rate dropping.
// Works on any built model (detailed or simple), posed as it is:
//   - small parts go (bolts, buttons, thin air lines, slot labels, holders' details): anything whose
//     bounding box diagonal is under `minSize`, and tubes thinner than `minTube`
//   - round parts are rebuilt with fewer segments, rounded boxes become plain boxes, large extrusions
//     become their bounding box
//   - every remaining part is baked into the root's frame and merged by colour, so the whole machine is a few
//     dozen meshes instead of hundreds; textures become their average colour, except text and logo decals
//     (kept as separate textured planes)
//   - operator zones are kept as they are (other sites look them up by name / userData)
// The result is static: no animation, no workpiece.

const DEFAULTS = { minSize: 0.04, minTube: 0.008, maxExtrudeTris: 300, roundSegments: 10, smallRoundSegments: 6 };

export function toLowPoly(machine, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const root = machine.object;
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const skip = new Set();
  if (machine.workpiece) skip.add(machine.workpiece);
  const zones = root.children.filter(c => c.userData.operatorZone);
  zones.forEach(z => skip.add(z));

  const buckets = new Map();   // material key → { material, geos: [] }
  const decals = [];
  const box3 = new THREE.Box3(), size = new THREE.Vector3(), m = new THREE.Matrix4();
  let before = 0;

  const walk = obj => {
    if (!obj.visible || skip.has(obj) || obj.isCSS2DObject) return;
    if (obj.isMesh) handle(obj);
    for (const c of obj.children) walk(c);
  };
  function handle(mesh) {
    const g = mesh.geometry;
    if (!g.attributes.position) return;
    before += (g.index ? g.index.count : g.attributes.position.count) / 3;
    box3.setFromObject(mesh, false).getSize(size);
    if (size.length() < o.minSize) return;
    m.multiplyMatrices(toRoot, mesh.matrixWorld);
    // Multi-material meshes (a table plate with a textured top and orange edges): each face group on its own.
    if (Array.isArray(mesh.material)) {
      const flat = g.index ? g.toNonIndexed() : g;
      const groups = g.groups.length ? g.groups : [{ start: 0, count: flat.attributes.position.count, materialIndex: 0 }];
      for (const grp of groups) {
        const mat = mesh.material[grp.materialIndex];
        if (!mat) continue;
        const part = new THREE.BufferGeometry();
        for (const k of ['position', 'normal', 'uv']) {
          const a = flat.attributes[k];
          if (a) part.setAttribute(k, new THREE.BufferAttribute(a.array.slice(grp.start * a.itemSize, (grp.start + grp.count) * a.itemSize), a.itemSize));
        }
        add(clean(part), mat);
      }
      return;
    }
    const mat = mesh.material;
    if (isDecal(mesh, mat)) {
      const d = new THREE.Mesh(g.clone().applyMatrix4(m), decalMaterial(mat));
      d.name = mesh.name || 'decal';
      decals.push(d);
      return;
    }
    const simple = simplify(g, o);
    if (!simple) return;
    let geo = simple.index ? simple.toNonIndexed() : simple;
    if (geo === g) geo = g.clone();
    add(clean(geo), mat);
  }
  function add(geo, mat) {
    geo.applyMatrix4(m);
    if (m.determinant() < 0) flipWinding(geo);
    const key = materialKey(mat);
    if (!buckets.has(key)) buckets.set(key, { material: plainMaterial(mat), geos: [] });
    buckets.get(key).geos.push(geo);
  }
  walk(root);

  const out = new THREE.Group();
  out.name = (root.name || 'machine') + '_LowPoly';
  let i = 0;
  for (const { material, geos } of buckets.values()) {
    let merged = mergeGeometries(geos, false);
    geos.forEach(x => x.dispose());
    if (!merged) continue;
    merged = mergeVertices(merged, 1e-4);   // shared corners once: a third of the file size
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = material.name || 'part_' + i;
    mesh.castShadow = mesh.receiveShadow = !material.transparent;
    out.add(mesh);
    i++;
  }
  decals.forEach(d => out.add(d));
  zones.forEach(z => out.add(z.clone()));
  out.userData.operatorZones = root.userData.operatorZones;
  let after = 0;
  out.traverse(x => { if (x.isMesh) after += (x.geometry.index ? x.geometry.index.count : x.geometry.attributes.position.count) / 3; });
  out.userData.lowPoly = { trianglesBefore: Math.round(before), triangles: Math.round(after), meshes: out.children.length };
  return out;
}

// A machine record (as from MODELS[id]()) with its object swapped for the low-poly copy; static.
export function lowPolyMachine(machine, opts) {
  const object = toLowPoly(machine, opts);
  return { ...machine, object, workpiece: null, open: null, toggles: [], update() {}, info: () => {
    const s = object.userData.lowPoly;
    return `Low poly · ${s.triangles.toLocaleString('en')} สามเหลี่ยม (จาก ${s.trianglesBefore.toLocaleString('en')}) · ${s.meshes} ชิ้น`;
  } };
}

function isDecal(mesh, mat) {
  if (!mat.map || mesh.geometry.type !== 'PlaneGeometry') return false;   // text and logos are flat planes
  return mesh.userData.decal || mat.isMeshBasicMaterial || mat.transparent;
}

function decalMaterial(mat) {
  return new THREE.MeshStandardMaterial({ name: mat.name || 'decal', map: mat.map, transparent: mat.transparent, alphaTest: mat.transparent ? 0.3 : 0, roughness: 0.6, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 });
}

// Average colour of a canvas texture (cached on the texture), so a textured part keeps its overall tone.
const avgCache = new WeakMap();
function averageColor(tex) {
  if (avgCache.has(tex)) return avgCache.get(tex);
  let col = null;
  const img = tex.userData?.canvas || tex.image;
  try {
    if (img && img.width) {
      // Average over every pixel (a 1×1 draw just samples one spot, e.g. the hose's orange spiral wire).
      const w = Math.min(img.width, 128), h = Math.min(img.height, 128);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 32) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      if (n) col = new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
    }
  } catch (e) { /* tainted or not drawable: fall back to the material colour */ }
  avgCache.set(tex, col);
  return col;
}

function baseColor(mat) {
  const c = mat.color ? mat.color.clone() : new THREE.Color('#cccccc');
  if (mat.map && mat.map.colorSpace === THREE.SRGBColorSpace) { const a = averageColor(mat.map); if (a) c.multiply(a); }
  return c;
}

function materialKey(mat) {
  const c = baseColor(mat).getHexString();
  const op = mat.transparent ? Math.round((mat.opacity ?? 1) * 20) : 20;
  const em = mat.emissive && mat.emissiveIntensity > 0.3 ? mat.emissive.getHexString() : '';
  const metal = Math.round(Math.min(mat.metalness ?? 0, 0.6) * 5);
  return `${c}_${op}_${em}_${metal}`;
}

function plainMaterial(mat) {
  const transmissive = mat.transmission > 0;
  const transparent = mat.transparent || transmissive;
  return new THREE.MeshStandardMaterial({
    name: (mat.name || 'part').replace(/_\d+$/, ''),
    color: baseColor(mat),
    // Fully metallic parts read black in apps without an environment map; keep them a lit grey.
    metalness: Math.min(mat.metalness ?? 0, 0.35),
    roughness: Math.max(mat.roughness ?? 0.6, 0.3),
    transparent,
    opacity: transmissive ? 0.45 : mat.opacity ?? 1,
    depthWrite: !transparent,
    emissive: mat.emissive && mat.emissiveIntensity > 0.3 ? mat.emissive : new THREE.Color(0),
    emissiveIntensity: mat.emissive && mat.emissiveIntensity > 0.3 ? Math.min(mat.emissiveIntensity, 1) : 0,
    side: mat.side === THREE.DoubleSide || transparent ? THREE.DoubleSide : THREE.FrontSide,
  });
}

// Fewer segments for round things; boxes for rounded boxes and heavy extrusions. Returns null to drop the part.
function simplify(g, o) {
  const p = g.parameters || {};
  switch (g.type) {
    case 'CylinderGeometry': {
      const r = Math.max(p.radiusTop, p.radiusBottom);
      const seg = Math.min(p.radialSegments, r > 0.06 ? o.roundSegments + 6 : r > 0.02 ? o.roundSegments : o.smallRoundSegments);
      return new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, seg, 1, p.openEnded);
    }
    case 'TubeGeometry': {
      if (p.radius < o.minTube) return null;
      const len = p.path.getLength();
      return new THREE.TubeGeometry(p.path, Math.max(4, Math.min(p.tubularSegments, Math.round(len / 0.08))), p.radius, p.radius > 0.03 ? 8 : 5, p.closed);
    }
    case 'LatheGeometry': {
      const step = Math.max(1, Math.floor(p.points.length / 8));
      const pts = p.points.filter((_, i) => i % step === 0 || i === p.points.length - 1);
      return new THREE.LatheGeometry(pts, Math.min(p.segments, o.roundSegments + 2));
    }
    case 'SphereGeometry':
      return new THREE.SphereGeometry(p.radius, 10, 6, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    case 'CircleGeometry':
      return new THREE.CircleGeometry(p.radius, Math.min(p.segments, 12), p.thetaStart, p.thetaLength);
    case 'RingGeometry':
      return new THREE.RingGeometry(p.innerRadius, p.outerRadius, Math.min(p.thetaSegments, 12), 1, p.thetaStart, p.thetaLength);
    case 'TorusGeometry':
      return new THREE.TorusGeometry(p.radius, p.tube, 6, Math.min(p.tubularSegments, 16), p.arc);
    case 'RoundedBoxGeometry':
      return bboxBox(g);
    case 'ExtrudeGeometry': {
      const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
      return tris > o.maxExtrudeTris ? bboxBox(g) : g;
    }
    default:
      // RoundedBoxGeometry builds on BoxGeometry; tell it apart by its vertex count.
      if (g.type === 'BoxGeometry' && g.attributes.position.count > 24) return bboxBox(g);
      // Hand-merged parts (drag-chain links are four rounded plates each): one box per part.
      if (g.type === 'BufferGeometry' && (g.index ? g.index.count : g.attributes.position.count) / 3 > 48) return bboxBox(g);
      return g;
  }
}

function bboxBox(g) {
  g.computeBoundingBox();
  const b = g.boundingBox, s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  return new THREE.BoxGeometry(Math.max(s.x, 1e-4), Math.max(s.y, 1e-4), Math.max(s.z, 1e-4)).translate(c.x, c.y, c.z);
}

// Keep only position and normal (merged parts are plain colour, no texture) so everything can merge.
function clean(geo) {
  for (const k of Object.keys(geo.attributes)) if (!['position', 'normal'].includes(k)) geo.deleteAttribute(k);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.morphAttributes = {};
  geo.clearGroups();
  return geo;
}

// Mirrored parts (negative scale) turn inside out once baked; swap two corners of every triangle.
function flipWinding(geo) {
  for (const name of ['position', 'normal']) {
    const a = geo.attributes[name];
    if (!a) continue;
    const n = a.itemSize, arr = a.array;
    for (let t = 0; t < a.count; t += 3) for (let k = 0; k < n; k++) {
      const i1 = (t + 1) * n + k, i2 = (t + 2) * n + k, tmp = arr[i1];
      arr[i1] = arr[i2]; arr[i2] = tmp;
    }
    a.needsUpdate = true;
  }
}
