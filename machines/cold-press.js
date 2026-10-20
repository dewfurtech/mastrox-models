import * as THREE from 'three';
import { M, box, cyl, decal, std, button } from './lib.js';

// Mastrox Cold Presso, 60 t hydraulic cold press.
// Brochure: 2950 × 1270 × 2280 mm, 2000 kg, table 2500 × 1250 mm, max opening 1000 mm, 4 cylinders.
// Origin on the floor at the center; the operator faces +z.

const L = 2.95, D = 1.27, H = 2.28;
const BED_TOP = 0.56;
const OPEN = 1.0; // max gap between the bed and the platen
const BEAM_Y0 = BED_TOP + OPEN + 0.14; // underside of the top beam
const BEAM_Y1 = H - 0.2;
const STACK = 0.24; // height of the stack of glued panels being pressed

function stripes(w, h) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = Math.max(32, Math.round(1024 * h / w));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2c218';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#1d1f22';
  const step = c.height * 1.4;
  for (let x = -c.height; x < c.width + c.height; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, c.height); ctx.lineTo(x + step / 2, c.height); ctx.lineTo(x + step / 2 + c.height * 0.6, 0); ctx.lineTo(x + c.height * 0.6, 0);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
}

export function createColdPress() {
  const root = new THREE.Group();
  root.name = 'Cold Presso 60T';
  const steel = std('#4a5059', { roughness: 0.7, metalness: 0.3 });
  const xc = L / 2 - 0.15;

  // Base tray and the bed with its cell grid.
  root.add(box(L, 0.24, D - 0.2, steel, 0, 0.12, 0));
  root.add(box(2.6, BED_TOP - 0.24, 1.25, steel, 0, (0.24 + BED_TOP) / 2, 0));
  const lip = box(2.6, 0.12, 0.02, stripes(2.6, 0.12), 0, BED_TOP - 0.07, 0.63);
  lip.rotation.x = -0.25;
  root.add(lip);
  for (let i = 0; i <= 4; i++) root.add(box(0.05, 0.06, 1.22, steel, -1.25 + i * 0.625, BED_TOP + 0.03, 0));
  root.add(box(2.55, 0.02, 1.22, std('#3a3f46', { roughness: 0.8 }), 0, BED_TOP - 0.01, 0));

  // Columns and the top beam.
  for (const s of [-1, 1]) {
    root.add(box(0.3, BEAM_Y1 - 0.24, 0.46, steel, s * xc, (0.24 + BEAM_Y1) / 2, -0.05));
    root.add(box(0.16, 0.9, 0.2, std('#3f454d'), s * (xc - 0.1), 0.85, 0.05)); // inner web
  }
  root.add(box(L, BEAM_Y1 - BEAM_Y0, 0.5, steel, 0, (BEAM_Y0 + BEAM_Y1) / 2, -0.05));
  const name = decal('Presso', { w: 0.95, color: '#f07a22', font: '400 130px "IBM Plex Sans Thai", sans-serif' });
  name.position.set(0.55, (BEAM_Y0 + BEAM_Y1) / 2, 0.201);
  root.add(name);
  const badge = decal('mastrox', { w: 0.32, color: '#1d1f22', bg: '#f07a22' });
  badge.position.set(-0.85, (BEAM_Y0 + BEAM_Y1) / 2 + 0.02, 0.201);
  root.add(badge);

  // Cylinder barrels sticking out of the beam (two visible at the back), rods down to the platen.
  for (const s of [-1, 1]) root.add(cyl(0.065, H - BEAM_Y1 + 0.1, M.frame, s * 0.62, H - (H - BEAM_Y1 + 0.1) / 2, -0.15));
  const platen = new THREE.Group();
  platen.add(box(2.5, 0.12, 1.22, steel, 0, -0.06, 0));
  platen.add(box(2.52, 0.02, 1.24, M.frame, 0, -0.12, 0));
  root.add(platen);
  const rods = [];
  for (const x of [-0.62, 0.62]) {
    for (const z of [-0.15, 0.15]) {
      const rod = cyl(0.045, 1, M.chrome, x, 0, z, 'y', 20);
      rods.push(rod);
      root.add(rod);
      root.add(cyl(0.075, 0.06, M.frame, x, BEAM_Y0 - 0.03, z, 'y', 20)); // gland
    }
  }

  // Control panel on the right column: pressure gauge and push buttons.
  const panel = new THREE.Group();
  panel.add(box(0.16, 0.5, 0.06, M.white, 0, 0, 0));
  panel.add(cyl(0.05, 0.02, M.white, 0, 0.17, 0.035, 'z', 28));
  panel.add(cyl(0.042, 0.022, std('#f7f7f5', { roughness: 0.3 }), 0, 0.17, 0.04, 'z', 28));
  for (const [x, y, m] of [[-0.035, 0.03, M.green], [0.035, 0.03, M.red], [-0.035, -0.06, M.frame], [0.035, -0.06, M.frame], [-0.035, -0.15, M.green], [0.035, -0.15, M.red]]) {
    panel.add(button(m, x, y, 0.035));
  }
  panel.position.set(xc + 0.0, 1.45, 0.22);
  root.add(panel);
  // Hydraulic power unit behind the right column.
  root.add(box(0.5, 0.45, 0.4, M.navy, xc - 0.1, 0.46, -0.48));
  root.add(cyl(0.11, 0.3, M.motor, xc - 0.1, 0.84, -0.48));

  // Stack of boards with wet glue between them. Under pressure the glue squeezes out to the edges
  // and the stack settles; after the hold it has cured into one laminated block.
  const stack = new THREE.Group();
  stack.position.y = BED_TOP;
  const wet = std('#f2dc7a', { roughness: 0.15, metalness: 0, emissive: '#5a4a10', emissiveIntensity: 0.2 });
  const cured = std('#b59a6a', { roughness: 0.8, metalness: 0 });
  const glueLines = [], beads = [];
  for (let i = 0; i < 8; i++) {
    stack.add(box(2.4, 0.026, 1.18, i % 2 ? M.panel : std('#cdbb9c', { roughness: 0.85 }), 0, 0.013 + i * 0.03, 0));
    if (i === 7) break;
    const line = box(2.4, 0.004, 1.18, wet, 0, 0.028 + i * 0.03, 0);
    stack.add(line);
    glueLines.push(line);
    // Glue bead that squeezes out along the front edge while pressing.
    const bead = cyl(0.004, 2.3, wet, 0, 0.028 + i * 0.03, 0.592, 'x', 8);
    bead.scale.set(1, 1, 0.01);
    stack.add(bead);
    beads.push(bead);
  }
  root.add(stack);
  const SQUEEZE = 0.94; // stack height after pressing, as a fraction
  function setStack(f, curedNow) {
    // f: 0 = fresh, 1 = fully pressed.
    stack.scale.y = THREE.MathUtils.lerp(1, SQUEEZE, f);
    for (const b of beads) { b.scale.set(1, 1, Math.max(f, 0.01)); b.material = curedNow ? cured : wet; }
    for (const g of glueLines) g.material = curedNow ? cured : wet;
  }

  // Press cycle: down → hold → up → wait, in seconds.
  const cycle = [['down', 4], ['hold', 4], ['up', 4], ['wait', 3]];
  const total = cycle.reduce((a, [, t]) => a + t, 0);
  const topY = BED_TOP + OPEN, pressY = BED_TOP + STACK, squeezedY = BED_TOP + STACK * SQUEEZE;
  let t = 0, auto = true, phase = 'wait', curY = 0;

  function place(y) {
    curY = y;
    platen.position.y = y + 0.12;
    for (const rod of rods) {
      const len = BEAM_Y0 - (y + 0.12);
      rod.scale.y = len;
      rod.position.y = y + 0.12 + len / 2;
    }
  }
  place(topY);

  return {
    object: root,
    workpiece: stack,
    pieceLabel: 'แผ่นงาน',
    open: { label: 'รอบอัด', on: 'วนอัต.', off: 'หยุด', initial: true, set(v) {
      if (v && !auto) t = total - 3; // pick up at the start of the pause, with the platen up
      auto = v;
      if (!v) phase = 'up';
    } },
    info: () => `แรงอัด 60 ตัน · ช่องเปิด ${OPEN * 1000} mm · สถานะ: ${{ down: 'กำลังลง', hold: 'กำลังอัด', up: 'กำลังขึ้น', wait: 'พัก' }[phase]}`,
    labels: [
      { text: 'กระบอกไฮดรอลิก ×4', at: [0.62, BEAM_Y0 - 0.3, 0.2] },
      { text: 'โต๊ะ 2500 × 1250', at: [-0.9, BED_TOP + 0.05, 0.6] },
    ],
    views: { a: [2.6, 2.3, 4.2], b: [-3.0, 2.2, -3.6], target: [0, 1.1, 0] },
    update(dt) {
      if (!auto) {
        // Stopped: open the press smoothly and leave it there.
        if (Math.abs(topY - curY) > 1e-4) place(curY + (topY - curY) * Math.min(1, dt * 2));
        else phase = 'wait';
        return;
      }
      t = (t + dt) % total;
      let acc = 0;
      for (const [name, dur] of cycle) {
        if (t < acc + dur) {
          phase = name;
          const k = (t - acc) / dur, ease = k * k * (3 - 2 * k);
          place(name === 'down' ? THREE.MathUtils.lerp(topY, pressY, ease)
            : name === 'hold' ? THREE.MathUtils.lerp(pressY, squeezedY, ease)
            : name === 'up' ? THREE.MathUtils.lerp(squeezedY, topY, ease) : topY);
          // Fresh stack while the press comes down; squeezed during the hold; cured block after.
          if (name === 'down') setStack(0, false);
          if (name === 'hold') setStack(ease, k > 0.9);
          if (name === 'up' || name === 'wait') setStack(1, true);
          break;
        }
        acc += dur;
      }
    },
  };
}
