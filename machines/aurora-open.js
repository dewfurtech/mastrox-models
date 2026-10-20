import * as THREE from 'three';
import { M, box, cyl, logo, button, std } from './lib.js';

// Mastrox Aurora OpenShell, single-tray vacuum membrane press with a lift-up heated lid.
// Brochure: 2603 × 1372 × 1308 mm, 1200 kg, table 2550 × 1300 × 50 mm, 18.7 kW heating.
// Origin on the floor at the center; the operator faces +z. The lid hinges at the back.

const L = 2.603, D = 1.372, H = 1.308;
const BODY_TOP = 0.9;
const LID_H = H - BODY_TOP;
const ZF = D / 2 - 0.02, ZB = -D / 2 + 0.02;

export function createAuroraOpen() {
  const root = new THREE.Group();
  root.name = 'Aurora OpenShell';
  const body = std('#34373c', { roughness: 0.75 });

  // Cabinet on a plinth, three front doors.
  root.add(box(L - 0.1, 0.08, D - 0.12, M.frame, 0, 0.04, 0));
  root.add(box(L - 0.05, BODY_TOP - 0.08, D - 0.05, body, 0, (0.08 + BODY_TOP) / 2, 0));
  const zDoor = (D - 0.05) / 2 + 0.002;
  const doors = [[-1.25, -0.42], [-0.42, 0.42], [0.42, 1.25]];
  for (const [x0, x1] of doors) {
    root.add(box(x1 - x0 - 0.02, BODY_TOP - 0.3, 0.004, body, (x0 + x1) / 2, (0.14 + BODY_TOP - 0.12) / 2, zDoor));
    root.add(box(0.006, BODY_TOP - 0.3, 0.006, M.frame, x1 - 0.01, (0.14 + BODY_TOP - 0.12) / 2, zDoor + 0.001));
  }
  // Vacuum gauge, switch row, logo.
  root.add(cyl(0.06, 0.03, M.white, -1.0, 0.6, zDoor + 0.015, 'z', 32));
  root.add(cyl(0.05, 0.032, std('#f7f7f5', { roughness: 0.3 }), -1.0, 0.6, zDoor + 0.02, 'z', 32));
  root.add(box(0.012, 0.045, 0.004, M.red, -0.99, 0.61, zDoor + 0.037));
  const row = [[M.red, 0.02], [M.white, 0.012], [M.green, 0.012], [M.white, 0.012], [M.white, 0.012], [M.white, 0.012], [M.white, 0.012], [M.frame, 0.012]];
  row.forEach(([m, r], i) => root.add(button(m, -0.3 + i * 0.075, 0.72, zDoor + 0.01, r)));
  const badge = logo(0.55, '#f2f2f2');
  badge.position.set(-0.85, 0.3, zDoor + 0.004);
  badge.rotation.z = 0.25;
  root.add(badge);
  root.add(box(0.12, 0.08, 0.004, M.white, 1.05, 0.72, zDoor + 0.002)); // rating plate
  root.add(box(0.04, 0.1, 0.02, M.navy, -0.48, 0.74, zDoor + 0.01)); // key switch

  // Vacuum table and membrane.
  root.add(box(2.55, 0.05, 1.3, std('#2b2d30', { roughness: 0.9 }), 0, BODY_TOP + 0.025, 0));
  const membrane = box(2.5, 0.004, 1.25, std('#d9cfbf', { roughness: 0.7 }), 0, BODY_TOP + 0.052, 0);
  root.add(membrane);

  // Six MDF door blanks on the table. Once the lid has been shut for a few seconds they are
  // wrapped in gloss film; shutting the lid again starts a fresh batch.
  const pieces = new THREE.Group();
  for (const dz of [-0.32, 0.32]) for (const dx of [-0.85, 0, 0.85]) pieces.add(box(0.72, 0.018, 0.5, M.panel, dx, BODY_TOP + 0.064, dz));
  root.add(pieces);
  const film = on => pieces.children.forEach(p => (p.material = on ? M.film : M.panel));
  let closedFor = 0, filmed = false;

  // Lid: a prism with a sloped front, extruded along x and hinged at the back top edge.
  const prof = new THREE.Shape();
  const zf = ZF - ZB; // depth measured from the hinge
  prof.moveTo(0, 0);
  prof.lineTo(zf, 0);
  prof.lineTo(zf, 0.11);
  prof.lineTo(zf - 0.42, LID_H);
  prof.lineTo(0, LID_H);
  prof.lineTo(0, 0);
  const lidGeo = new THREE.ExtrudeGeometry(prof, { depth: L - 0.02, bevelEnabled: false });
  // The profile is drawn as (depth from hinge, height); rotating −90° about y turns depth into +z
  // and the extrusion into −x, which the translate centers.
  lidGeo.rotateY(-Math.PI / 2);
  lidGeo.translate(L / 2 - 0.01, 0, 0);
  const lidMesh = new THREE.Mesh(lidGeo, body);
  lidMesh.castShadow = lidMesh.receiveShadow = true;

  const lid = new THREE.Group();
  lid.position.set(0, BODY_TOP + LID_H, ZB);
  const lidBody = new THREE.Group();
  lidBody.position.y = -LID_H;
  lidBody.add(lidMesh);
  // Heater tubes under the lid, glowing while heating.
  const heaterMat = std('#ff7a1a', { emissive: '#ff5a00', emissiveIntensity: 0.4 });
  for (let i = 0; i < 5; i++) lidBody.add(cyl(0.012, L - 0.3, heaterMat, 0, 0.03, 0.15 + i * 0.23, 'x', 10));
  // Front of the lid: two lamps, orange handles, toggle clamps hanging over the cabinet.
  const slope = Math.atan2(LID_H - 0.11, 0.42);
  for (const x of [-0.75, 0.75]) {
    const lamp = box(0.18, 0.07, 0.03, M.lamp, x, 0.2, zf - 0.21);
    lamp.rotation.x = -(Math.PI / 2 - slope);
    lidBody.add(lamp);
  }
  for (const x of [-0.95, -0.2, 0.55, 1.15]) lidBody.add(box(0.14, 0.03, 0.05, M.orange, x, 0.14, zf + 0.02));
  for (const x of [-1.2, -0.35, 0.4, 1.2]) {
    lidBody.add(box(0.04, 0.12, 0.04, M.steel, x, 0.0, zf + 0.02));
    lidBody.add(box(0.03, 0.09, 0.03, M.red, x, -0.08, zf + 0.045));
  }
  lid.add(lidBody);
  root.add(lid);

  // Fixed hinge blocks at the back.
  for (const x of [-1.0, 0, 1.0]) root.add(box(0.12, 0.08, 0.06, M.frame, x, BODY_TOP + LID_H - 0.04, ZB - 0.03));

  // Pneumatic lift cylinders on both ends, from the cabinet to the lid.
  const struts = [-1, 1].map(s => {
    const barrel = cyl(0.03, 1, M.steel, 0, 0, 0, 'y', 16);
    const rod = cyl(0.012, 1, M.chrome, 0, 0, 0, 'y', 12);
    root.add(barrel, rod);
    return { s, barrel, rod };
  });
  const lidAnchor = new THREE.Vector3(0, -0.22, zf - 0.25); // in the lid's hinge frame
  const up = new THREE.Vector3(0, 1, 0);
  function placeStruts() {
    lid.updateMatrixWorld(true);
    for (const { s, barrel, rod } of struts) {
      const a = new THREE.Vector3(s * (L / 2 + 0.005), 0.45, ZF - 0.25); // against the cabinet's end
      const b = new THREE.Vector3(s * (L / 2 + 0.005), lidAnchor.y, lidAnchor.z).applyMatrix4(lid.matrix);
      const dir = b.clone().sub(a);
      const len = dir.length();
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
      barrel.quaternion.copy(q);
      barrel.scale.y = 0.42;
      barrel.position.copy(a).addScaledVector(dir, 0.21 / len);
      rod.quaternion.copy(q);
      rod.scale.y = len - 0.3;
      rod.position.copy(a).addScaledVector(dir, (0.3 + (len - 0.3) / 2) / len);
    }
  }

  // The lid swings up about the back hinge (negative x rotation lifts the front).
  let target = 0;
  placeStruts();

  return {
    object: root,
    workpiece: pieces,
    pieceLabel: 'แผ่นงาน',
    open: { label: 'ฝา', set(v) { target = v ? -1.0 : 0; } },
    info: 'ถาดเดี่ยว 2550 × 1300 · ฮีตเตอร์ 18.7 kW · ปั๊ม 3 kW',
    labels: [
      { text: 'ฝาความร้อน (Open Shell)', at: [0, H + 0.12, 0] },
      { text: 'โต๊ะสุญญากาศ 2550 × 1300', at: [0.9, BODY_TOP + 0.08, 0.3] },
    ],
    views: { a: [2.4, 2.1, 3.6], b: [-2.6, 2.0, -3.4], target: [0, 0.75, 0] },
    update(dt) {
      const before = lid.rotation.x;
      lid.rotation.x += (target - lid.rotation.x) * Math.min(1, dt * 2.5);
      const shut = target === 0 && lid.rotation.x > -0.02;
      if (shut && closedFor === 0 && filmed) { filmed = false; film(false); }
      closedFor = shut ? closedFor + dt : 0;
      if (closedFor > 2.5 && !filmed) { filmed = true; film(true); }
      heaterMat.emissiveIntensity = lid.rotation.x < -0.05 ? 0.15 : 0.9;
      if (Math.abs(lid.rotation.x - before) > 1e-5) placeStruts();
    },
  };
}
