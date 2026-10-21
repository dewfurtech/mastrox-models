import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { operatorZonesOf } from './machines/lib.js';

// Export a machine model for editing in other programs. Units are meters, Y up.
//   dae  COLLADA, which SketchUp imports directly (File → Import), with colors
//   obj  Wavefront OBJ + MTL (zipped), for most 3D programs
//   glb  binary glTF, for Blender and the like; the only one that keeps logos and text
//   stl  geometry only, for CAD / printing
// SketchUp's own .skp format is closed, so .dae is the way into SketchUp.

// Flatten the visible meshes into world-space triangle lists, one entry per mesh (and per instance
// of an InstancedMesh). Text decals are skipped for the formats that can't carry their textures.
function bake(root, { keepDecals = false } = {}) {
  root.updateMatrixWorld(true);
  const parts = [];
  const m = new THREE.Matrix4();
  root.traverseVisible(obj => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!keepDecals && mats.every(mt => mt.map && mt.transparent)) return;
    let geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
    if (!geo.attributes.normal) geo.computeVertexNormals();
    // Multi-material meshes: keep the material of the largest group (e.g. the table's top face texture
    // is dropped, its frame color kept).
    let material = mats[0];
    if (Array.isArray(obj.material) && obj.geometry.groups.length) {
      const g = obj.geometry.groups.reduce((a, b) => (b.count > a.count ? b : a));
      material = obj.material[g.materialIndex] ?? material;
    }
    const matrices = [];
    if (obj.isInstancedMesh) {
      for (let i = 0; i < obj.count; i++) {
        obj.getMatrixAt(i, m);
        matrices.push(new THREE.Matrix4().multiplyMatrices(obj.matrixWorld, m));
      }
    } else {
      matrices.push(obj.matrixWorld.clone());
    }
    for (const mw of matrices) {
      const g = geo.clone().applyMatrix4(mw);
      parts.push({ name: obj.name || obj.parent?.name || 'part', geometry: g, material });
    }
  });
  return parts;
}

// One shared material entry per distinct color + opacity.
function materialTable(parts) {
  const byKey = new Map();
  for (const p of parts) {
    const c = p.material.color ?? new THREE.Color('#cccccc');
    const a = p.material.transparent ? p.material.opacity ?? 1 : 1;
    const key = `${c.getHexString()}_${Math.round(a * 100)}`;
    if (!byKey.has(key)) byKey.set(key, { id: `m${byKey.size}`, name: `color_${key}`, color: c, alpha: a });
    p.mat = byKey.get(key);
  }
  return [...byKey.values()];
}

const f = n => (Math.abs(n) < 1e-7 ? '0' : +n.toFixed(5));
const xmlName = s => s.replace(/[^A-Za-z0-9_-]/g, '_');

export function toDAE(root, title) {
  const parts = bake(root);
  const mats = materialTable(parts);
  const now = new Date().toISOString();
  const effects = mats.map(mt => `<effect id="${mt.id}-fx"><profile_COMMON><technique sid="common"><lambert>
<diffuse><color>${f(mt.color.r)} ${f(mt.color.g)} ${f(mt.color.b)} 1</color></diffuse>
<transparent opaque="A_ONE"><color>1 1 1 ${f(mt.alpha)}</color></transparent><transparency><float>1</float></transparency>
</lambert></technique></profile_COMMON></effect>`).join('\n');
  const materials = mats.map(mt => `<material id="${mt.id}" name="${mt.name}"><instance_effect url="#${mt.id}-fx"/></material>`).join('\n');
  const geometries = [], nodes = [];
  parts.forEach((p, i) => {
    const pos = p.geometry.attributes.position.array, nrm = p.geometry.attributes.normal.array;
    const n = pos.length / 3, id = `g${i}`;
    const idx = [];
    for (let v = 0; v < n; v++) idx.push(v, v);
    geometries.push(`<geometry id="${id}" name="${xmlName(p.name)}_${i}"><mesh>
<source id="${id}-p"><float_array id="${id}-pa" count="${pos.length}">${Array.from(pos, f).join(' ')}</float_array><technique_common><accessor source="#${id}-pa" count="${n}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>
<source id="${id}-n"><float_array id="${id}-na" count="${nrm.length}">${Array.from(nrm, f).join(' ')}</float_array><technique_common><accessor source="#${id}-na" count="${n}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>
<vertices id="${id}-v"><input semantic="POSITION" source="#${id}-p"/></vertices>
<triangles material="mat" count="${n / 3}"><input semantic="VERTEX" source="#${id}-v" offset="0"/><input semantic="NORMAL" source="#${id}-n" offset="1"/><p>${idx.join(' ')}</p></triangles>
</mesh></geometry>`);
    nodes.push(`<node id="n${i}" name="${xmlName(p.name)}_${i}"><instance_geometry url="#${id}"><bind_material><technique_common><instance_material symbol="mat" target="#${p.mat.id}"/></technique_common></bind_material></instance_geometry></node>`);
  });
  return `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
<asset><contributor><authoring_tool>Mastrox Models</authoring_tool></contributor><created>${now}</created><modified>${now}</modified><unit name="meter" meter="1"/><up_axis>Y_UP</up_axis></asset>
<library_effects>
${effects}
</library_effects>
<library_materials>
${materials}
</library_materials>
<library_geometries>
${geometries.join('\n')}
</library_geometries>
<library_visual_scenes><visual_scene id="scene" name="${xmlName(title)}">
${nodes.join('\n')}
</visual_scene></library_visual_scenes>
<scene><instance_visual_scene url="#scene"/></scene>
</COLLADA>
`;
}

export function toOBJ(root, base) {
  const parts = bake(root);
  const mats = materialTable(parts);
  const mtl = mats.map(mt => `newmtl ${mt.name}\nKd ${f(mt.color.r)} ${f(mt.color.g)} ${f(mt.color.b)}\nd ${f(mt.alpha)}\nillum 2\n`).join('\n');
  const out = [`# ${base} — Mastrox Models, units: meters, Y up`, `mtllib ${base}.mtl`];
  let vBase = 1;
  parts.forEach((p, i) => {
    const pos = p.geometry.attributes.position.array, nrm = p.geometry.attributes.normal.array;
    const n = pos.length / 3;
    out.push(`o ${xmlName(p.name)}_${i}`, `usemtl ${p.mat.name}`);
    for (let v = 0; v < n; v++) out.push(`v ${f(pos[v * 3])} ${f(pos[v * 3 + 1])} ${f(pos[v * 3 + 2])}`);
    for (let v = 0; v < n; v++) out.push(`vn ${f(nrm[v * 3])} ${f(nrm[v * 3 + 1])} ${f(nrm[v * 3 + 2])}`);
    for (let v = 0; v < n; v += 3) {
      const a = vBase + v, b = a + 1, c = a + 2;
      out.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
    }
    vBase += n;
  });
  return { obj: out.join('\n') + '\n', mtl };
}

export function toSTL(root) {
  const group = new THREE.Group();
  for (const p of bake(root)) group.add(new THREE.Mesh(p.geometry));
  return new STLExporter().parse(group, { binary: true });
}

export function toGLB(root, animations = []) {
  operatorZonesOf(root); // node extras carry the zone's current spot, after any editor moves
  return new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true, animations: animations.filter(Boolean) });
}

// Stats for the export preview: what will actually land in the file.
export function exportStats(root, kind) {
  const parts = bake(root, { keepDecals: kind === 'glb' });
  let tris = 0;
  for (const p of parts) tris += p.geometry.attributes.position.count / 3;
  const mats = kind === 'stl' ? 0 : materialTable(parts).length;
  const box = new THREE.Box3();
  for (const p of parts) { p.geometry.computeBoundingBox(); box.union(p.geometry.boundingBox); }
  return { parts: parts.length, tris: Math.round(tris), mats, box };
}

// The baked meshes as a scene group (how .dae / .obj / .stl will look: no text decals; STL no colors).
export function bakedPreview(root, kind) {
  const g = new THREE.Group();
  const grey = new THREE.MeshStandardMaterial({ color: '#b8bcc0', roughness: 0.6, metalness: 0.1 });
  for (const p of bake(root, { keepDecals: kind === 'glb' })) {
    const m = new THREE.Mesh(p.geometry, kind === 'stl' ? grey : p.material);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
