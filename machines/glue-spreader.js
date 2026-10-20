import * as THREE from 'three';
import { M, box, cyl, logo, warning, button, std } from './lib.js';

// Mastrox double-side glue spreader, 1300 class.
// Brochure: 2040 × 850 × 1350 mm, 550 kg, 1350 mm working width, 18 m/min, rollers 200 / 156 mm.
// Origin on the floor at the center. Rollers run along x; boards feed from +z (front) to −z.
// Shapes follow the brochure photo; the back side is a guess.

const W = 2.04, D = 0.85, H = 1.35;
const ROLL = 1.35; // roller length
const FEED = 18 / 60;
const TOP_R = 0.1, BOT_R = 0.078;
const NIP_Y = 0.88; // the board's underside passes here

function perforatedCover(w, h) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = Math.round(1024 * h / w);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e8452a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#1a1a1a';
  const cols = 16, rows = 3;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < cols; i++) {
      const x = (i + 0.5 + (r % 2) * 0.35) * c.width / cols;
      const y = (r + 0.5) * c.height / rows;
      ctx.beginPath();
      ctx.ellipse(x, y, c.width / cols * 0.17, c.height / rows * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1 });
}

function handwheel(x, y, z, side) {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 8, 32), M.frame);
  g.add(rim);
  for (let i = 0; i < 3; i++) {
    const spoke = box(0.006, 0.075, 0.008, M.frame, 0, 0, 0);
    spoke.geometry.translate(0, 0.0375, 0);
    spoke.rotation.z = i * Math.PI * 2 / 3;
    g.add(spoke);
  }
  g.add(cyl(0.012, 0.05, M.frame, 0.055, 0.03, 0.025, 'z', 10)); // grip
  g.add(cyl(0.015, 0.06, M.steel, 0, 0, -0.03, 'z', 12)); // hub
  g.position.set(x, y, z);
  g.rotation.y = side * Math.PI / 2;
  return g;
}

export function createGlueSpreader() {
  const root = new THREE.Group();
  root.name = 'Glue Spreader 1300';
  const frameMat = std('#3d4554', { roughness: 0.7 });
  const xs = W / 2 - 0.17; // frames sit in far enough that the handwheels stay inside the 2040 mm width

  // Side frames with foot plates.
  for (const s of [-1, 1]) {
    root.add(box(0.18, 1.24, 0.62, frameMat, s * xs, 0.64, 0));
    root.add(box(0.26, 0.02, 0.72, frameMat, s * xs, 0.01, 0));
    root.add(box(0.06, 0.4, 0.4, frameMat, s * (xs + 0.11), 1.0, -0.05)); // bearing housing
  }
  // Cross members, front apron, lower tray.
  root.add(box(W - 0.36, 0.08, 0.08, frameMat, 0, 0.12, -0.2));
  root.add(box(W - 0.36, 0.42, 0.02, frameMat, 0, 0.42, 0.27));
  root.add(box(W - 0.36, 0.03, 0.06, frameMat, 0, 0.64, 0.25));
  root.add(box(W - 0.36, 0.02, 0.36, M.bodyDark, 0, 0.66, 0.06)); // glue drip tray

  // Rollers: steel applicator on top, rubber-covered doctor roller below, shafts through the frames.
  const top = cyl(TOP_R, ROLL, M.chrome, 0, NIP_Y + 0.02 + TOP_R, 0.02, 'x', 40);
  const bottom = cyl(BOT_R, ROLL, M.rubber, 0, NIP_Y - BOT_R, 0.02, 'x', 40);
  root.add(top, bottom);
  for (const y of [top.position.y, bottom.position.y]) root.add(cyl(0.025, W - 0.1, M.steel, 0, y, 0.02, 'x', 12));
  root.add(cyl(0.045, ROLL, M.steel, 0, NIP_Y + 0.27, -0.12, 'x', 24)); // glue metering roller

  // Infeed table and outfeed lip.
  root.add(box(W - 0.36, 0.015, 0.22, M.bodyDark, 0, NIP_Y - 0.008, 0.33));
  root.add(box(W - 0.36, 0.03, 0.03, M.steel, 0, NIP_Y - 0.03, 0.44));
  root.add(box(W - 0.36, 0.015, 0.16, M.bodyDark, 0, NIP_Y - 0.03, -0.24));

  // Perforated red guard over the top roller, sloping back.
  const coverH = 0.3;
  const cover = new THREE.Mesh(new THREE.BoxGeometry(ROLL + 0.08, coverH, 0.012),
    [M.redOrange, M.redOrange, M.redOrange, M.redOrange, perforatedCover(ROLL + 0.08, coverH), M.redOrange]);
  cover.position.set(0, NIP_Y + 0.3, 0.16);
  cover.rotation.x = -0.5;
  cover.castShadow = true;
  root.add(cover);
  root.add(box(ROLL + 0.08, 0.015, 0.25, M.redOrange, 0, NIP_Y + 0.45, -0.02)); // top lid
  root.add(cyl(0.01, ROLL + 0.1, M.redOrange, 0, NIP_Y + 0.46, -0.16, 'x', 10)); // lid rod

  // Worm gearboxes on top of each frame, tied by a shaft, to lift the top roller.
  for (const s of [-1, 1]) {
    root.add(box(0.14, 0.1, 0.14, M.gearGreen, s * xs, 1.31, -0.05));
    root.add(cyl(0.04, 0.06, M.gearGreen, s * xs, 1.33, 0.04, 'z', 16));
  }
  root.add(cyl(0.012, 2 * (xs + 0.11), M.steel, 0, 1.33, -0.05, 'x', 10)); // out to the handwheel hub
  root.add(handwheel(xs + 0.15, 1.33, -0.05, 1));
  root.add(handwheel(-(xs + 0.15), 1.0, -0.05, -1));
  root.add(handwheel(xs + 0.15, 0.96, -0.05, 1));

  // Control box on the right frame, warning label, logo on the apron.
  const ctrl = new THREE.Group();
  ctrl.add(box(0.13, 0.22, 0.05, M.white, 0, 0, 0));
  ctrl.add(button(M.red, -0.025, 0.06, 0.03));
  ctrl.add(button(M.red, -0.025, 0.0, 0.03, 0.016));
  ctrl.add(button(M.green, -0.025, -0.06, 0.03));
  ctrl.position.set(xs - 0.02, 1.12, 0.335);
  root.add(ctrl);
  root.add(warning(xs, 0.66, 0.312, 0, 1.4));
  const badge = logo(0.34, '#e9e9e9');
  badge.position.set(-0.55, 0.45, 0.282);
  root.add(badge);
  root.add(box(0.08, 0.1, 0.05, M.frame, xs + 0.02, 0.3, 0.33)); // power socket

  // A 1200 × 600 × 18 mm board fed through the rollers.
  const piece = box(1.2, 0.018, 0.6, M.panel, 0, NIP_Y + 0.009, 0.9);
  root.add(piece);

  // Wet glue on both faces, laid down from the leading edge as the board leaves the nip.
  const glueMat = std('#f1e3a6', { roughness: 0.12, metalness: 0, transparent: true, opacity: 0.85 });
  const coats = [0.0095, -0.0095].map(y => {
    const geo = new THREE.BoxGeometry(1.18, 0.001, 1);
    geo.translate(0, 0, 0.5); // grows from the leading (−z) edge toward the trailing edge
    const coat = new THREE.Mesh(geo, glueMat);
    coat.position.set(0, y, -0.3);
    piece.add(coat);
    return coat;
  });

  return {
    object: root,
    workpiece: piece,
    pieceLabel: 'แผ่นงาน',
    info: `ทากาว 2 หน้า ${FEED * 60} m/min · หน้ากว้าง 1350 mm`,
    labels: [
      { text: 'ลูกกลิ้งทากาวบน Ø200', at: [-0.4, NIP_Y + 0.6, 0.02] },
      { text: 'ลูกกลิ้งล่าง Ø156', at: [0.45, NIP_Y - 0.25, 0.3] },
      { text: 'ปรับระดับ (เฟือง + มือหมุน)', at: [xs, 1.5, -0.05] },
    ],
    views: { a: [1.8, 1.7, 2.8], b: [-1.9, 1.6, -2.6], target: [0, 0.75, 0] },
    update(dt) {
      top.rotation.x -= FEED / TOP_R * dt;
      bottom.rotation.x += FEED / BOT_R * dt;
      piece.position.z -= FEED * dt;
      if (piece.position.z < -0.9) piece.position.z = 0.9;
      const coated = THREE.MathUtils.clamp(0.02 - (piece.position.z - 0.3), 0, 0.6);
      for (const c of coats) c.scale.z = Math.max(coated, 0.0001);
    },
  };
}
