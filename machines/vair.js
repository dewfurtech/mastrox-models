import * as THREE from 'three';
import { M, box, cyl, decal, tube, button, std } from './lib.js';

// VAir inverter screw compressor sets, as sold in the Mastrox lineup:
// compressor + 600 L receiver tank + refrigerated air dryer + 2 line filters.
// Compressor sizes come from the VSD table (VDSD10 800 × 550 × 740, VDSD20 940 × 630 × 840).
// The brochure gives no size for the tank, dryer or filters; a 600 L tank is about Ø650 × 2000 mm,
// and the dryer is scaled from the photo. Origin on the floor at the compressor's center.

export const VAIRS = {
  'vair-10': { name: 'VAir 10HP set', model: 'VDSD10', size: [0.8, 0.55, 0.74], fad: '0.54–1.35 m³/min', kw: 7.5 },
  'vair-20': { name: 'VAir 20HP set', model: 'VDSD20', size: [0.94, 0.63, 0.84], fad: '1.04–2.6 m³/min', kw: 15 },
};

// White VAir "V": a plain letter V turned on its side, open to the left with the point on the
// right (">"), as painted on the doors. Fills a w × h panel.
// Within one set every V is the same size; a bigger set gets a bigger V (sized from its compressor).


function chevron(panelW, panelH) {
  // Draw an upright V of the rotated size, then turn it 90° counter-clockwise.
  const w = panelH, h = panelW;
  const t = w * 0.34; // stroke width along the open edge
  const foot = t * 0.42; // half-width of the flat bottom
  const s = new THREE.Shape([
    new THREE.Vector2(-w / 2, h / 2), new THREE.Vector2(-w / 2 + t, h / 2), new THREE.Vector2(0, -h / 2 + t * 1.5),
    new THREE.Vector2(w / 2 - t, h / 2), new THREE.Vector2(w / 2, h / 2), new THREE.Vector2(foot, -h / 2),
    new THREE.Vector2(-foot, -h / 2),
  ]);
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateZ(Math.PI / 2);
  return new THREE.Mesh(geo, M.white);
}

// Thin label plate stuck on the tank's curved shell, `angle` radians round from the front toward +x.
function shellPlate(w, h, x, y, z, r, angle) {
  const p = box(w, h, 0.003, M.white, x + Math.sin(angle) * (r + 0.002), y, z + Math.cos(angle) * (r + 0.002));
  p.rotation.y = angle;
  return p;
}

function vents(w, d, y, mat) {
  const g = new THREE.Group();
  const n = Math.floor(w / 0.03);
  for (let i = 0; i < n; i++) g.add(box(0.012, 0.004, d, mat, -w / 2 + (i + 0.5) * w / n, y, 0));
  return g;
}

export function createVAir(id) {
  const cfg = VAIRS[id];
  const [cl, cw, ch] = cfg.size;
  const V_W = cl * 0.475, V_H = V_W * 0.79; // fills the right door of this compressor
  const root = new THREE.Group();
  root.name = cfg.name;

  // Compressor: black plinth, lime cabinet, control panel on the front, chevron on the right door.
  const base = 0.07;
  root.add(box(cl, base, cw, M.frame, 0, base / 2, 0));
  root.add(box(cl - 0.01, ch - base, cw - 0.01, M.lime, 0, base + (ch - base) / 2, 0));
  const top = vents(cl * 0.7, cw * 0.4, ch + 0.002, M.gearGreen);
  top.position.x = -cl * 0.1;
  root.add(top);
  const zf = cw / 2;
  root.add(box(cl * 0.32, ch * 0.42, 0.01, M.frame, -cl * 0.24, ch * 0.62, zf));
  root.add(box(cl * 0.2, ch * 0.1, 0.006, M.screen, -cl * 0.24, ch * 0.7, zf + 0.007));
  root.add(button(M.red, -cl * 0.24, ch * 0.52, zf + 0.012, 0.018));
  // Flush with the right edge and the bottom of the right door.
  const v1W = V_W, v1H = V_H;
  const v1 = chevron(v1W, v1H);
  v1.position.set(cl / 2 - 0.005 - v1W / 2, base + 0.01 + v1H / 2, zf + 0.002);
  root.add(v1);
  root.add(box(0.004, ch - base - 0.04, 0.004, M.gearGreen, cl * 0.02, base + (ch - base) / 2, zf + 0.001)); // door seam
  root.add(box(0.1, 0.13, 0.002, M.white, cl * 0.3, ch * 0.8, zf + 0.003)); // rating plate, top of the right door
  root.add(cyl(0.018, 0.2, M.steel, -cl / 2 - 0.08, ch * 0.78, -cw * 0.2, 'x', 12)); // air outlet
  {
    // photos: "VAIR" under the control window (20HP) or low on the left door (10HP)
    const mark = decal('VAIR', { w: 0.13, color: '#ffffff', font: '700 120px "IBM Plex Sans Thai", sans-serif' });
    mark.position.set(id === 'vair-20' ? -cl * 0.24 : -cl * 0.36, id === 'vair-20' ? ch * 0.3 : ch * 0.36, zf + 0.004);
    root.add(mark);
  }
  if (id === 'vair-20') {
    // 20HP photo: "Inverter VSD" on the door above the V
    const inv = decal('Inverter VSD', { w: 0.16, color: '#c9d97a', font: 'italic 400 100px "IBM Plex Sans Thai", sans-serif' });
    inv.position.set(cl * 0.33, base + 0.02 + V_H + 0.03, zf + 0.004);
    root.add(inv);
  }

  // 600 L receiver tank. Both sets stand in one row facing front, as in their photos (measured at
  // ~300 px/m): 20HP — dryer, tank, compressor from left to right; 10HP — the mirror: compressor,
  // tank, dryer. The tank stands on lime legs in the middle.
  const row = true, left = id === 'vair-20'; // left: the tank and dryer are on the compressor's left
  const tr = 0.325, tankH = 2.0, tx = left ? -1.18 : cl / 2 + 0.68, tz = left ? -0.01 : -0.08;
  const shell = 1.55, legs = 0.12;
  const yc = legs + 0.2 + shell / 2;
  root.add(cyl(tr, shell, M.lime, tx, yc, tz, 'y', 40));
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(tr, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.lime);
    cap.scale.y = 0.55;
    cap.position.set(tx, yc + s * shell / 2, tz);
    if (s < 0) cap.rotation.x = Math.PI;
    cap.castShadow = true;
    root.add(cap);
  }
  if (row) {
    // four splayed lime legs with foot pads (photo)
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4, lx = tx + Math.cos(a) * tr * 0.62, lz = tz + Math.sin(a) * tr * 0.62;
      const leg = box(0.06, legs + 0.27, 0.06, M.lime, lx, (legs + 0.27) / 2, lz);
      leg.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08);
      root.add(leg);
      root.add(box(0.1, 0.012, 0.1, M.lime, lx + Math.cos(a) * 0.015, 0.006, lz + Math.sin(a) * 0.015));
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3 + 0.3;
      root.add(box(0.05, legs + 0.25, 0.05, M.frame, tx + Math.cos(a) * tr * 0.75, (legs + 0.25) / 2, tz + Math.sin(a) * tr * 0.75));
    }
  }
  const v2 = chevron(V_W, V_H);
  v2.position.set(tx - 0.04, yc + 0.4, tz + tr + 0.003);
  root.add(v2);
  root.add(cyl(0.012, 0.12, M.brass, tx, yc + shell / 2 + tr * 0.55 + 0.04, tz, 'y', 10)); // safety valve
  // Two plates under the V, toward the right of the shell: a small certificate, then the data plate.
  root.add(shellPlate(0.1, 0.09, tx, yc + 0.05, tz, tr, 0.45));
  root.add(shellPlate(0.14, 0.15, tx, yc - 0.13, tz, tr, 0.42));

  // Refrigerated dryer in front of the tank: lime sides with slot vents, a black front panel with a
  // window over the gauge and controls and the white V below it, and a dark lid with two pipe stubs.
  // 20HP photo: about 0.53 wide × 0.63 tall, on the left of the tank, its front level with the others.
  const dl = left ? 0.53 : 0.49, dw = left ? 0.7 : 0.62, dh = left ? 0.63 : 0.57;
  const dx = left ? tx - tr - dl / 2 - 0.02 : tx + tr + 0.44 + dl / 2, dz = zf + 0.04 - dw / 2;
  const dfz = dz + dw / 2; // front face
  root.add(box(dl, dh - 0.015, dw - 0.01, M.lime, dx, (dh - 0.015) / 2, dz - 0.005));
  root.add(box(dl + 0.004, dh - 0.015, 0.012, M.frame, dx, (dh - 0.015) / 2, dfz - 0.004)); // black front panel
  root.add(box(dl + 0.01, 0.015, dw + 0.01, M.bodyDark, dx, dh - 0.0075, dz)); // lid
  for (const z of [dz - dw * 0.3, dz - dw * 0.12]) root.add(cyl(0.022, 0.03, M.steel, dx - dl * 0.15, dh + 0.015, z, 'y', 16));
  // Window in the upper front: dew-point gauge, controller, a copper line across the bottom.
  const wy = dh * 0.72;
  root.add(box(dl * 0.8, dh * 0.3, 0.004, std('#0e0f11', { roughness: 0.4 }), dx, wy, dfz + 0.003));
  root.add(cyl(0.045, 0.02, M.chrome, dx - dl * 0.18, wy + 0.01, dfz + 0.012, 'z', 28));
  root.add(cyl(0.036, 0.022, std('#e8eef5', { roughness: 0.3 }), dx - dl * 0.18, wy + 0.01, dfz + 0.014, 'z', 28));
  root.add(box(0.06, 0.05, 0.02, std('#3b6fb6'), dx + dl * 0.05, wy + 0.02, dfz + 0.012));
  root.add(box(0.035, 0.035, 0.015, M.green, dx + dl * 0.25, wy + 0.04, dfz + 0.01));
  root.add(box(dl * 0.6, 0.012, 0.012, std('#b8693a', { metalness: 0.6, roughness: 0.4 }), dx + dl * 0.05, wy - dh * 0.11, dfz + 0.01));
  // Down at the bottom of the black front panel.
  const v3H = V_H;
  const v3 = chevron(V_W, V_H);
  v3.position.set(left ? dx - dl / 2 + 0.004 + V_W / 2 : dx + dl / 2 - 0.004 - V_W / 2, v3H / 2 + 0.005, dfz + 0.004); // flush bottom; right (10HP) or left (20HP photo)
  root.add(v3);
  // Slot vents on the left side, in staggered columns.
  const slotGeo = new THREE.CapsuleGeometry(0.005, 0.035, 4, 8);
  const cols = 10, rows = 11;
  const slots = new THREE.InstancedMesh(slotGeo, std('#101112', { roughness: 0.9 }), cols * rows);
  const m4 = new THREE.Matrix4(), rot = new THREE.Matrix4().makeRotationX(0.35);
  let k = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      m4.makeTranslation(dx - dl / 2 - 0.002, 0.12 + r * 0.042 + (c % 2) * 0.012, dz - dw * 0.36 + c * 0.046).multiply(rot);
      slots.setMatrixAt(k++, m4);
    }
  }
  root.add(slots);
  for (const [y, z] of [[0.04, 1], [dh - 0.04, 1], [0.04, -1], [dh - 0.04, -1]]) {
    root.add(cyl(0.005, 0.004, M.chrome, dx + z * (dl / 2 - 0.02), y, dfz + 0.006, 'z', 8)); // corner rivets
  }

  const pipe = M.steel;
  let fx, filterLabel;
  if (left) {
    // 20HP photo: two filters stand on the dryer's top at its left, piped across into the tank's
    // side; a third filter hangs off the tank's upper left with a black hose looping down to the
    // dryer; a black hose loops from the tank's lower right into the compressor.
    const hose = std('#141414', { roughness: 0.55 });
    const fz = dz - 0.1, fy0 = dh + 0.02;
    fx = dx - dl / 2 + 0.07;
    for (let i = 0; i < 2; i++) {
      const x = fx + i * 0.11;
      root.add(cyl(0.045, 0.24, M.lime, x, fy0 + 0.12, fz, 'y', 20)); // filter bowl
      root.add(cyl(0.05, 0.05, M.lime, x, fy0 + 0.265, fz, 'y', 20)); // head
      root.add(cyl(0.012, 0.04, M.brass, x, fy0 - 0.01, fz, 'y', 10)); // drain
    }
    root.add(cyl(0.018, 0.12, M.brass, fx - 0.1, fy0 + 0.265, fz, 'x', 10)); // inlet fitting
    root.add(tube([[fx + 0.11, fy0 + 0.265, fz], [fx + 0.3, fy0 + 0.27, fz], [tx - tr - 0.05, fy0 + 0.25, fz + 0.04], [tx - tr + 0.01, fy0 + 0.25, tz + 0.15]], 0.025, pipe));
    // filter on the tank's upper left, black hose down to the dryer
    const ux = tx - tr - 0.12, uy = 1.48, uz = tz + 0.12;
    root.add(cyl(0.04, 0.22, std('#d8e04a', { roughness: 0.5 }), ux, uy, uz, 'y', 20));
    root.add(cyl(0.046, 0.05, M.lime, ux, uy + 0.13, uz, 'y', 20));
    root.add(cyl(0.012, 0.12, M.steel, ux + 0.07, uy + 0.13, uz, 'x', 10)); // nipple into the tank
    root.add(tube([[ux - 0.04, uy + 0.13, uz], [ux - 0.35, uy + 0.12, uz + 0.05], [dx - dl / 2 - 0.18, 1.0, dz + 0.1], [dx + dl / 2 - 0.08, dh + 0.25, dz + 0.05], [dx + dl / 2 - 0.08, dh + 0.04, dz - 0.05]], 0.016, hose, 60));
    // tank lower right to the compressor's inlet valve, sagging in a loop
    root.add(cyl(0.012, 0.08, M.brass, tx + tr + 0.03, 0.63, tz + 0.1, 'x', 10));
    root.add(cyl(0.015, 0.14, M.brass, -cl / 2 - 0.05, ch * 0.88, zf - 0.12, 'x', 10)); // inlet valve on the compressor
    root.add(tube([[tx + tr + 0.07, 0.63, tz + 0.1], [tx + tr + 0.2, 0.55, tz + 0.2], [-cl / 2 - 0.25, 0.25, zf], [-cl / 2 - 0.3, 0.6, zf - 0.05], [-cl / 2 - 0.12, ch * 0.88, zf - 0.12]], 0.016, hose, 60));
    // pressure gauge on the tank front, inside the V
    root.add(cyl(0.05, 0.02, M.chrome, tx - 0.06, yc + 0.42, tz + tr + 0.01, 'z', 28));
    root.add(cyl(0.042, 0.022, std('#eef2f6', { roughness: 0.3 }), tx - 0.06, yc + 0.42, tz + tr + 0.012, 'z', 28));
    // three spare-part boxes on the compressor's top (photo)
    [[-0.12, 0.19, 0.16], [0.03, 0.24, 0.2], [0.18, 0.2, 0.16]].forEach(([x, h, w]) => {
      root.add(box(w * 0.8, h, w * 0.6, M.lime, cl * 0.1 + x, ch + h / 2, -0.02));
      root.add(box(w * 0.7, h * 0.45, 0.002, M.white, cl * 0.1 + x, ch + h * 0.45, -0.02 + w * 0.3 + 0.002));
    });
    filterLabel = { text: 'Filter ×3', at: [fx + 0.05, dh + 0.45, fz] };
  } else {
    // 10HP photo: a filter on the tank's upper right with two black hoses down to the dryer (one into
    // its left side low, one over into its top); two more filters hang from a steel pipe that runs
    // into the dryer's top; a black hose sags from the compressor's right side into the tank.
    const hose = std('#141414', { roughness: 0.55 });
    const ux = tx + tr + 0.12, uy = 1.42, uz = tz + 0.12;
    root.add(cyl(0.04, 0.22, std('#d8e04a', { roughness: 0.5 }), ux, uy, uz, 'y', 20));
    root.add(cyl(0.046, 0.05, M.lime, ux, uy + 0.13, uz, 'y', 20));
    root.add(cyl(0.012, 0.12, M.steel, ux - 0.07, uy + 0.13, uz, 'x', 10)); // nipple into the tank
    root.add(tube([[ux, uy - 0.12, uz], [ux, 0.6, uz + 0.05], [ux + 0.08, 0.28, dz + 0.1], [dx - dl / 2 - 0.01, 0.25, dz + 0.1]], 0.016, hose, 60));
    root.add(tube([[ux + 0.03, uy + 0.13, uz], [ux + 0.45, uy + 0.05, uz + 0.05], [dx + 0.08, dh + 0.5, dz], [dx + 0.08, dh + 0.01, dz - 0.05]], 0.016, hose, 60));
    const py = dh + 0.06, pz = dz - 0.08;
    fx = tx + tr + 0.3;
    root.add(cyl(0.015, 0.1, M.brass, fx - 0.1, py, pz, 'x', 10)); // inlet fitting
    root.add(tube([[fx - 0.05, py, pz], [dx - 0.05, py, pz], [dx + 0.02, py - 0.01, pz], [dx + 0.02, dh + 0.005, pz]], 0.02, pipe, 24));
    for (let i = 0; i < 2; i++) {
      const x = fx + i * 0.1;
      root.add(cyl(0.045, 0.05, M.lime, x, py - 0.02, pz, 'y', 20)); // head on the pipe
      root.add(cyl(0.04, 0.22, M.lime, x, py - 0.155, pz, 'y', 20)); // bowl hanging below
      root.add(cyl(0.01, 0.04, M.brass, x, py - 0.285, pz, 'y', 10)); // drain
    }
    // compressor right side to the tank's lower left, sagging in a loop
    root.add(cyl(0.015, 0.12, M.brass, cl / 2 + 0.05, ch * 0.72, zf - 0.15, 'x', 10));
    root.add(cyl(0.012, 0.08, M.brass, tx - tr - 0.03, 0.63, tz + 0.1, 'x', 10));
    root.add(tube([[cl / 2 + 0.11, ch * 0.72, zf - 0.15], [cl / 2 + 0.22, 0.4, zf - 0.05], [cl / 2 + 0.3, 0.22, zf], [tx - tr - 0.15, 0.4, tz + 0.15], [tx - tr - 0.07, 0.63, tz + 0.1]], 0.016, hose, 60));
    root.add(cyl(0.05, 0.02, M.chrome, tx + 0.05, yc + 0.42, tz + tr + 0.01, 'z', 28)); // gauge in the V
    root.add(cyl(0.042, 0.022, std('#eef2f6', { roughness: 0.3 }), tx + 0.05, yc + 0.42, tz + tr + 0.012, 'z', 28));
    filterLabel = { text: 'Filter ×3', at: [fx + 0.05, dh + 0.3, pz] };
  }

  return {
    object: root,
    info: `${cfg.model} · ${cfg.kw} kW · FAD ${cfg.fad} · ถังลม 600 L`,
    labels: [
      { text: `ปั๊มลมสกรู ${cfg.model}`, at: [0, ch + 0.15, 0] },
      { text: 'ถังลม 600 L', at: [tx, 2.15, tz] },
      { text: 'Air dryer', at: [dx, dh + 0.2, dz + 0.1] },
      filterLabel,
    ],
    views: left ? { a: [-0.6, 1.8, 4.6], b: [-0.6, 1.9, -4.4], target: [-0.6, 0.85, 0] } : { a: [0.95, 1.8, 4.6], b: [0.95, 1.9, -4.4], target: [0.95, 0.85, 0] },
    update() {},
  };
}
