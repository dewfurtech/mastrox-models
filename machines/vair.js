import * as THREE from 'three';
import { M, box, cyl, tube, button, std } from './lib.js';

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
  const grow = cl / 0.8; // the dryer grows with the compressor; sizes below are for the 10HP set
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

  // 600 L receiver tank behind and to the right.
  // The tank stands on its own behind the compressor and dryer, with about 0.6 m of walkway between.
  const tr = 0.325, tankH = 2.0, tx = cl / 2 + 0.55, tz = -cw / 2 - 0.6 - tr;
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
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + 0.3;
    root.add(box(0.05, legs + 0.25, 0.05, M.frame, tx + Math.cos(a) * tr * 0.75, (legs + 0.25) / 2, tz + Math.sin(a) * tr * 0.75));
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
  const dl = 0.42 * grow, dw = 0.62 * grow, dh = 0.7 * grow, dx = tx + 0.15, dz = zf - dw / 2 + 0.05;
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
  v3.position.set(dx + dl / 2 - 0.004 - V_W / 2, v3H / 2 + 0.005, dfz + 0.004); // flush right and bottom
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

  // Two line filters on a wall bracket by the tank, and the piping.
  const fx = tx + tr + 0.2;
  for (let i = 0; i < 2; i++) {
    root.add(cyl(0.045, 0.3, M.lime, fx, 1.05, tz + 0.15 + i * 0.22, 'y', 20));
    root.add(cyl(0.05, 0.06, M.frame, fx, 1.23, tz + 0.15 + i * 0.22, 'y', 20));
  }
  root.add(box(0.03, 1.3, 0.03, M.frame, fx + 0.07, 0.65, tz + 0.26)); // bracket post
  const pipe = M.steel;
  root.add(tube([[-cl / 2 - 0.18, ch * 0.78, -cw * 0.2], [-cl / 2 - 0.2, ch + 0.25, -cw * 0.4], [tx - tr - 0.05, ch + 0.3, tz], [tx - tr + 0.02, yc - 0.3, tz]], 0.018, pipe));
  root.add(tube([[tx, yc + shell / 2 + 0.1, tz], [tx + 0.1, yc + shell / 2 + 0.15, tz + 0.1], [fx, 1.35, tz + 0.15], [fx, 1.26, tz + 0.15]], 0.018, pipe));
  root.add(tube([[fx, 1.26, tz + 0.37], [fx, 1.35, tz + 0.37], [dx - dl * 0.15, dh + 0.14, dz - dw * 0.12], [dx - dl * 0.15, dh + 0.03, dz - dw * 0.12]], 0.018, pipe));

  return {
    object: root,
    info: `${cfg.model} · ${cfg.kw} kW · FAD ${cfg.fad} · ถังลม 600 L`,
    labels: [
      { text: `ปั๊มลมสกรู ${cfg.model}`, at: [0, ch + 0.15, 0] },
      { text: 'ถังลม 600 L', at: [tx, 2.15, tz] },
      { text: 'Air dryer', at: [dx, dh + 0.2, dz + 0.1] },
      { text: 'Filter ×2', at: [fx, 1.5, tz + 0.26] },
    ],
    views: { a: [2.6, 2.0, 3.4], b: [-1.8, 2.0, -3.6], target: [0.6, 0.8, -0.5] },
    update() {},
  };
}
