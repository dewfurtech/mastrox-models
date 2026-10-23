import * as THREE from 'three';
import { M, box, cyl, logo, button, std } from './lib.js';

// Mastrox Aurora SlideShell: two-tray vacuum membrane press. One heated shell runs on rails and
// covers one tray while the operator loads the other.
// Brochure: 8000 × 2030 × 1320 mm, 2300 kg, trays 3000 × 1300 × 50 mm, 36 kW heating.
// The rail drive, the film-roll racks at both ends and the back are guesses from the photos.
// Origin on the floor at the center; the operator faces +z.

const L = 8.0, D = 2.03, H = 1.32;
const BASE_TOP = 0.82;
const TRAY = [3.0, 1.3];
const TRAY_X = [-2.0, 2.0];

export function createAuroraSlide() {
  const root = new THREE.Group();
  root.name = 'Aurora SlideShell';
  const body = std('#34373c', { roughness: 0.75 });
  const baseL = L - 0.6, baseD = 1.6;

  // Base cabinet with doors along the front.
  root.add(box(baseL, BASE_TOP - 0.06, baseD, body, 0, (BASE_TOP - 0.06) / 2 + 0.06, 0));
  root.add(box(baseL - 0.1, 0.06, baseD - 0.1, M.frame, 0, 0.03, 0));
  const doors = 9;
  for (let i = 0; i < doors; i++) {
    const x = -baseL / 2 + baseL * (i + 0.5) / doors;
    root.add(box(baseL / doors - 0.03, BASE_TOP - 0.25, 0.005, body, x, BASE_TOP / 2, baseD / 2 + 0.003));
    root.add(box(0.02, 0.09, 0.02, M.frame, x + baseL / doors * 0.35, BASE_TOP / 2 + 0.05, baseD / 2 + 0.015));
  }
  root.add(cyl(0.05, 0.02, M.white, baseL / 2 - 0.35, BASE_TOP - 0.2, baseD / 2 + 0.012, 'z', 24)); // vacuum gauge

  // Two trays: dark vacuum table inside a red-edged membrane frame.
  for (const x of TRAY_X) {
    root.add(box(TRAY[0] + 0.12, 0.05, TRAY[1] + 0.12, M.frame, x, BASE_TOP + 0.025, 0));
    root.add(box(TRAY[0], 0.01, TRAY[1], std('#2b2d30', { roughness: 0.9 }), x, BASE_TOP + 0.055, 0));
    for (const s of [-1, 1]) {
      root.add(box(TRAY[0] + 0.12, 0.02, 0.03, M.red, x, BASE_TOP + 0.06, s * (TRAY[1] / 2 + 0.05)));
      root.add(box(0.03, 0.02, TRAY[1] + 0.12, M.red, x + s * (TRAY[0] / 2 + 0.05), BASE_TOP + 0.06, 0));
    }
    // Clamp posts on the membrane frame.
    for (let i = 0; i < 6; i++) root.add(cyl(0.015, 0.1, M.steel, x - TRAY[0] / 2 + 0.25 + i * 0.5, BASE_TOP + 0.1, -TRAY[1] / 2 - 0.05, 'y', 10));
  }

  // Rails along both long sides for the shell's wheels.
  for (const z of [-0.88, 0.88]) {
    root.add(box(baseL, 0.05, 0.08, M.frame, 0, BASE_TOP - 0.02, z));
    root.add(cyl(0.012, baseL, M.steel, 0, BASE_TOP + 0.015, z, 'x', 10));
  }

  // Film racks at both ends: a frame with hooks for up to four PVC colours.
  for (const s of [-1, 1]) {
    const x = s * (L / 2 - 0.03);
    for (const z of [-0.8, 0.8]) root.add(box(0.05, H - 0.1, 0.05, M.frame, x, (H - 0.1) / 2, z));
    for (const y of [0.35, 0.65, 0.95]) root.add(box(0.05, 0.05, 1.65, M.frame, x, y, 0));
    for (const z of [-0.8, 0.8]) {
      const hook = box(0.25, 0.04, 0.04, M.frame, x - s * 0.12, 0.95, z);
      root.add(hook);
    }
  }

  // The heated shell: a low dark box on wheels with two lamps, a control box and a drive motor.
  const shell = new THREE.Group();
  const sl = TRAY[0] + 0.35, sh = H - BASE_TOP - 0.02, sd = D - 0.05;
  shell.add(box(sl, sh, sd, body, 0, BASE_TOP + sh / 2 + 0.02, 0));
  shell.add(box(sl + 0.02, 0.04, sd + 0.02, M.frame, 0, BASE_TOP + 0.04, 0));
  for (const x of [-0.95, 0.55]) shell.add(box(0.24, 0.08, 0.02, M.lamp, x, BASE_TOP + 0.24, sd / 2 + 0.005));
  shell.add(box(sl - 0.1, 0.012, 0.01, M.orange, 0, BASE_TOP + 0.09, sd / 2 + 0.006)); // orange edge light
  for (const x of [-0.6, -0.45]) shell.add(box(0.12, 0.05, 0.08, M.orange, x, BASE_TOP + 0.1, sd / 2 + 0.03)); // handles
  const panel = new THREE.Group();
  panel.add(box(0.36, 0.42, 0.12, M.body, 0, 0, 0));
  panel.add(box(0.26, 0.15, 0.01, M.screen, 0, 0.1, 0.061));
  [[M.white, -0.1], [M.white, 0], [M.white, 0.1]].forEach(([m, x]) => panel.add(button(m, x, -0.05, 0.065, 0.015)));
  [[M.green, -0.06], [M.red, 0.06]].forEach(([m, x]) => panel.add(button(m, x, -0.14, 0.065, 0.02)));
  panel.position.set(0.95, BASE_TOP + sh / 2, sd / 2 + 0.06);
  shell.add(panel);
  shell.add(box(0.22, 0.2, 0.3, M.motor, sl / 2 + 0.11, BASE_TOP + 0.25, -0.5)); // gear motor on the end
  shell.add(cyl(0.08, 0.22, M.motor, sl / 2 + 0.11, BASE_TOP + 0.25, -0.24, 'z', 16));
  for (const x of [-sl / 2 + 0.2, sl / 2 - 0.2]) for (const z of [-0.88, 0.88]) shell.add(cyl(0.05, 0.05, M.frame, x, BASE_TOP + 0.04, z, 'z', 16));
  shell.add(new THREE.Group()); // the logo used to ride here; it is on the base now (keeps editor paths)
  root.add(shell);

  // Board blanks on both trays.
  // Bare MDF door blanks on both trays; a tray's blanks come out wrapped in gloss film after its
  // press, and are swapped for fresh blanks halfway through the other tray's press.
  const pieces = new THREE.Group();
  const trays = TRAY_X.map(x => {
    const set = [];
    for (const dz of [-0.33, 0.33]) for (const dx of [-0.9, 0, 0.9]) {
      const p = box(0.7, 0.018, 0.5, M.panel, x + dx, BASE_TOP + 0.07, dz);
      pieces.add(p);
      set.push(p);
    }
    return set;
  });
  const film = (set, on) => { for (const p of set) p.material = on ? M.film : M.panel; };
  root.add(pieces);

  // Shell cycle: press on one tray, travel, press on the other.
  const cycle = [['press', 6], ['move', 4], ['press', 6], ['move', 4]];
  let t = 0, phase = 'press', auto = true;
  shell.position.x = TRAY_X[0];

  // Logo low on the base front at the left end, under the parked shell (photo). Added last so the
  // editor paths of the other parts don't move.
  const badge = logo(0.88);
  badge.position.set(-baseL / 2 + 0.06 + 0.44, 0.27, baseD / 2 + 0.009);
  root.add(badge);

  return {
    object: root,
    workpiece: pieces,
    pieceLabel: 'แผ่นงาน',
    open: { label: 'สลับถาด', on: 'วนอัต.', off: 'หยุด', initial: true, set(v) { auto = v; } },
    info: () => `2 ถาด 3000 × 1300 · ฮีตเตอร์ 36 kW · ${phase === 'press' ? 'กำลังอัด' : 'ตู้ความร้อนกำลังเลื่อน'}`,
    labels: [
      { text: 'ตู้ความร้อน (เลื่อนได้)', at: [0, H + 0.35, 0] },
      { text: 'ถาด A', at: [TRAY_X[0], BASE_TOP + 0.1, 0.75] },
      { text: 'ถาด B', at: [TRAY_X[1], BASE_TOP + 0.1, 0.75] },
    ],
    views: { a: [3.0, 3.6, 7.5], b: [-3.5, 3.4, -7.0], target: [0, 0.8, 0] },
    update(dt) {
      if (!auto) return;
      t = (t + dt) % 20;
      let acc = 0;
      for (let i = 0; i < cycle.length; i++) {
        const [name, dur] = cycle[i];
        if (t < acc + dur) {
          phase = name;
          const from = TRAY_X[i < 2 ? 0 : 1], to = TRAY_X[i < 2 ? 1 : 0];
          const k = (t - acc) / dur, e = k * k * (3 - 2 * k);
          shell.position.x = name === 'press' ? from : THREE.MathUtils.lerp(from, to, e);
          film(trays[0], i === 1 || (i === 2 && k < 0.5));
          film(trays[1], i === 3 || (i === 0 && k < 0.5));
          break;
        }
        acc += dur;
      }
    },
  };
}
