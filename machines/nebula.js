import * as THREE from 'three';
import { M, box, cyl, decal, logo, button, std } from './lib.js';

// Mastrox Nebula sliding panel saw.
// The brochure gives no overall size, only the parts: 3200 mm sliding table, 1300 mm rip fence
// width, 300 mm main blade, 120 mm scoring blade, 0–46° tilt, 75 mm cut height, 750 kg.
// Everything else (cabinet, outrigger, hood arm) is sized from the brochure photo and is a guess.
// The blade cuts along x; the sliding table is on the −z side, the rip fence side on +z.
// Origin on the floor at the blade.

const TABLE_Y = 0.86;
const SLIDE_L = 3.2;
const STROKE = 1.1; // how far the sliding table travels each way

export function createNebula() {
  const root = new THREE.Group();
  root.name = 'Nebula';
  const body = std('#2f3236', { roughness: 0.7 });
  const alu = M.alu;

  // Main cabinet with the orange name plate, control strip and e-stop.
  root.add(box(1.5, TABLE_Y - 0.025, 0.85, body, 0.1, (TABLE_Y - 0.025) / 2, 0.2)); // up to the cast table's underside
  const plate = decal('Nebula', { w: 0.32, color: '#1d1f22', bg: '#f07a22' });
  plate.rotation.y = Math.PI / 2;
  plate.position.set(0.851, TABLE_Y - 0.2, 0.4);
  root.add(plate);
  const badge = logo(0.7, '#e9e9e9');
  badge.rotation.set(0, Math.PI / 2, -0.35);
  badge.position.set(0.852, 0.4, 0.15);
  root.add(badge);
  // Control strip on the cabinet's +x face: pilot lamps, start / stop, tilt read-out.
  const controls = new THREE.Group();
  for (let i = 0; i < 6; i++) controls.add(button(i < 5 ? M.yellow : M.red, -0.12 + i * 0.05, 0, 0, 0.008));
  controls.add(box(0.12, 0.08, 0.004, M.frame, 0.3, 0.12, 0)); // tilt read-out
  controls.rotation.y = Math.PI / 2;
  controls.position.set(0.86, TABLE_Y - 0.25, 0.3);
  root.add(controls);
  root.add(cyl(0.05, 0.03, M.frame, 0.86, TABLE_Y - 0.3, -0.05, 'x', 20)); // tilt handwheel
  root.add(box(0.06, 0.08, 0.06, M.yellow, 0.86, 0.35, 0.55));
  root.add(cyl(0.02, 0.03, M.red, 0.9, 0.35, 0.55, 'x', 16));

  // Cast table right of the blade, extension table and the rip fence on its rail.
  root.add(box(1.1, 0.05, 0.62, std('#c7cbcf', { roughness: 0.4, metalness: 0.5 }), 0, TABLE_Y, 0.33));
  root.add(box(0.9, 0.04, 0.7, alu, 0, TABLE_Y, 0.98));
  root.add(box(0.06, 0.06, 1.35, alu, 0.6, TABLE_Y - 0.02, 0.7)); // rip fence rail
  const fence = box(0.9, 0.08, 0.04, alu, 0, TABLE_Y + 0.06, 0.5);
  root.add(fence);
  root.add(box(0.05, TABLE_Y - 0.1, 0.05, body, -0.35, (TABLE_Y - 0.1) / 2, 1.25));
  root.add(box(0.05, TABLE_Y - 0.1, 0.05, body, 0.35, (TABLE_Y - 0.1) / 2, 1.25));

  // Blades: 300 mm main, 120 mm scoring ahead of it, both just breaking the table.
  const main = cyl(0.15, 0.004, M.disc, 0, TABLE_Y - 0.06, 0.0, 'z', 48);
  const scorer = cyl(0.06, 0.004, M.disc, 0.38, TABLE_Y - 0.03, 0.0, 'z', 32);
  root.add(main, scorer);
  root.add(box(0.03, 0.12, 0.005, M.steel, -0.17, TABLE_Y + 0.05, 0.0)); // riving knife

  // Overhead guard / dust hood on an arm from the right.
  const hood = new THREE.Group();
  hood.add(box(0.38, 0.12, 0.12, std('#e3e5e7', { roughness: 0.5 }), 0, 0, 0));
  hood.add(box(0.2, 0.03, 0.124, M.redOrange, 0.05, 0.03, 0));
  hood.add(cyl(0.05, 0.2, M.frame, 0.1, 0.14, 0, 'y', 16)); // dust port, up into the hood arm
  hood.position.set(0, TABLE_Y + 0.2, 0.0);
  root.add(hood);
  root.add(box(0.03, 0.03, 0.75, M.frame, 0.1, TABLE_Y + 0.42, 0.37));
  root.add(box(0.03, 0.45, 0.03, M.frame, 0.1, TABLE_Y + 0.2, 0.73));

  // Sliding table on its carriage, with the outrigger and crosscut fence at the far end.
  root.add(box(SLIDE_L * 0.55, 0.12, 0.2, body, 0, TABLE_Y - 0.13, -0.2)); // carriage beam
  const slide = new THREE.Group();
  slide.add(box(SLIDE_L, 0.05, 0.36, alu, 0, TABLE_Y, -0.22));
  for (const z of [-0.12, -0.22, -0.32]) slide.add(box(SLIDE_L, 0.006, 0.01, std('#9aa0a6'), 0, TABLE_Y + 0.026, z)); // T-slots
  const arm = box(0.08, 0.05, 1.1, alu, -SLIDE_L / 2 + 0.6, TABLE_Y - 0.02, -0.9);
  slide.add(arm);
  slide.add(box(0.05, TABLE_Y - 0.1, 0.05, alu, -SLIDE_L / 2 + 0.6, (TABLE_Y - 0.1) / 2, -1.4)); // swing leg
  slide.add(box(0.07, 0.07, 2.0, alu, -SLIDE_L / 2 + 0.45, TABLE_Y + 0.04, -1.1)); // crosscut fence
  for (const z of [-0.6, -1.4]) slide.add(box(0.05, 0.06, 0.05, M.frame, -SLIDE_L / 2 + 0.45, TABLE_Y + 0.11, z)); // flip stops
  slide.add(box(0.06, 0.06, 0.06, M.red, SLIDE_L / 2 - 0.05, TABLE_Y + 0.05, -0.22)); // end stop handle
  root.add(slide);

  // A 1200 mm panel on the slider, overhanging the blade line (z = 0): the blade rips a 150 mm
  // strip off it. The kerf grows from the leading end as the panel passes the blade; once through,
  // the strip drops away from the keeper.
  const len = 1.2, th = 0.018, px = -SLIDE_L / 2 + 1.1;
  const piece = new THREE.Group();
  piece.position.set(px, TABLE_Y + 0.035, 0);
  const keep = box(len, th, 0.6, M.panel, 0, 0, -0.3);
  const strip = box(len, th, 0.15, M.panel, 0, 0, 0.075);
  const kerfGeo = new THREE.BoxGeometry(1, th + 0.001, 0.004);
  kerfGeo.translate(-0.5, 0, 0); // grows backward from the leading end
  const kerf = new THREE.Mesh(kerfGeo, std('#4a3a28', { roughness: 1, metalness: 0 }));
  kerf.position.x = len / 2;
  piece.add(keep, strip, kerf);
  slide.add(piece);

  let t = 0;
  return {
    object: root,
    workpiece: piece,
    pieceLabel: 'แผ่นงาน',
    info: 'ใบเลื่อยหลัก 300 mm · ใบนำ 120 mm · เอียง 0–46° · โต๊ะเลื่อน 3200 mm',
    labels: [
      { text: 'โต๊ะเลื่อน 3200', at: [-1.0, TABLE_Y + 0.15, -0.25] },
      { text: 'ฝาครอบดูดฝุ่น', at: [0, TABLE_Y + 0.42, 0] },
      { text: 'รั้วตัดขวาง 1300', at: [0, TABLE_Y + 0.2, 1.0] },
    ],
    views: { a: [2.6, 2.2, 3.2], b: [-2.8, 2.2, -3.0], target: [0, 0.8, 0] },
    update(dt) {
      t += dt;
      main.rotation.y += 60 * dt;
      scorer.rotation.y -= 80 * dt;
      // One slow push through the blade and back, then a short pause.
      const k = (t % 9) / 9;
      slide.position.x = k < 0.45 ? THREE.MathUtils.lerp(-STROKE, STROKE, k / 0.45)
        : k < 0.9 ? THREE.MathUtils.lerp(STROKE, -STROKE, (k - 0.45) / 0.45) : -STROKE;
      // How much of the panel has passed the blade, counted from its leading (+x) end.
      const cut = k >= 0.9 ? 0 : THREE.MathUtils.clamp(slide.position.x + px + len / 2, 0, len);
      const through = k >= 0.45 && k < 0.9;
      kerf.scale.x = Math.max(through ? len : cut, 0.0001);
      strip.position.z = 0.075 + (through ? 0.03 : 0);
    },
  };
}
