import * as THREE from 'three';
import { M, box, cyl, decal, logo, warning, tube, button } from './lib.js';
import { STATIONS, STATION_NAMES, DUSTY, stationRib } from './booster.js';

// Mastrox Moon edge banders (Moon 10 / 40 / 40d / 80), the professional line above the Booster.
// Sizes and station lists come from the brochures; the brochures only show the amber-window side,
// so the operator side, both ends and every tool's shape are drawn from the Booster and are guesses.
// Same axes as the Booster: panels feed along +x, +z is the operator side, −z the amber windows.

export const MOONS = {
  'moon-10': {
    name: 'Moon 10', length: 4.5, height: 1.68, open: 1.3, feed: 18,
    stations: ['upperglue', 'press', 'end', 'rough', 'fine', 'scrape', 'flat', 'spray', 'buff'],
  },
  'moon-40': {
    name: 'Moon 40', length: 6.5, height: 1.6, open: 1.9, feed: 18,
    stations: ['sepspray', 'premill', 'upperglue', 'press', 'end', 'rough', 'fine', 'contour', 'scrape', 'flat', 'spray', 'buff'],
  },
  'moon-40d': {
    name: 'Moon 40d', length: 8.0, height: 1.6, open: 2.3, feed: 18,
    stations: ['sepspray', 'premill', 'upperglue', 'upperglue2', 'press', 'end', 'rough', 'fine', 'contour', 'scrape', 'flat', 'spray', 'buff', 'hotair'],
  },
  'moon-80': {
    // The brochure says "4 Round Corner ×13 unit" without listing them; this order is a guess
    // built from the Moon 40 list with a second corner-rounding unit.
    name: 'Moon 80', length: 6.5, height: 1.6, open: 1.9, feed: 16,
    stations: ['sepspray', 'premill', 'upperglue', 'press', 'end', 'rough', 'fine', 'contour', 'contour', 'scrape', 'flat', 'spray', 'buff'],
  },
};

const D = 1.0, Z_BACK = -D / 2, Z_FRONT = D / 2;
const WORK_Y = 0.95;
const TOOL_SCALE = 1.25; // Moon units are larger than the Booster's

export function createMoon(id) {
  const cfg = MOONS[id];
  const L = cfg.length, H = cfg.height, X0 = -L / 2, X1 = L / 2;
  const FEED = cfg.feed / 60;
  const root = new THREE.Group();
  root.name = cfg.name;

  const first = X0 + 0.55, last = X1 - 0.7;
  const stations = cfg.stations.map((s, i, a) => ({ id: s, name: STATION_NAMES[s], x: first + (last - first) * i / (a.length - 1) }));
  const hoodX0 = X0 + cfg.open, hoodX1 = X1 - 0.35;

  // Lower cabinet: a row of doors on the back with handles and warning signs, feet blocks under.
  const cabZ1 = Z_FRONT - 0.25, cabD = cabZ1 - Z_BACK, cabZ = (Z_BACK + cabZ1) / 2;
  root.add(box(L - 0.1, 0.78, cabD, M.body, 0, 0.47, cabZ));
  root.add(box(L - 0.08, 0.03, cabD + 0.02, M.frame, 0, 0.875, cabZ));
  const doorW = 0.62, doors = Math.floor((L - 0.3) / doorW);
  for (let i = 0; i < doors; i++) {
    const x = X0 + 0.15 + doorW * (i + 0.5);
    root.add(box(doorW - 0.03, 0.62, 0.005, M.body, x, 0.5, Z_BACK - 0.004));
    root.add(box(0.07, 0.015, 0.02, M.frame, x - doorW * 0.3, 0.76, Z_BACK - 0.012));
    root.add(box(0.07, 0.015, 0.02, M.frame, x + doorW * 0.3, 0.76, Z_BACK - 0.012));
    if (i % 2 === 0) root.add(warning(x, 0.66, Z_BACK - 0.008, Math.PI));
  }
  const back = logo(0.5, '#e9e9e9');
  back.rotation.y = Math.PI;
  back.position.set(X0 + 0.5, 0.36, Z_BACK - 0.008);
  root.add(back);
  for (let x = X0 + 0.3; x < X1; x += 1.4) {
    for (const z of [Z_BACK + 0.12, cabZ1 - 0.12]) root.add(box(0.16, 0.08, 0.14, M.frame, x, 0.04, z));
  }

  // Operator side: chain track, top pressure beam with rollers, support rail with orange rollers.
  root.add(box(L + 0.3, 0.06, 0.14, M.frame, 0.1, WORK_Y - 0.05, 0.06));
  const pads = Math.floor((L + 0.2) / 0.055);
  const pad = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.022, 0.12), M.chain, pads);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < pads; i++) pad.setMatrixAt(i, mtx.makeTranslation(X0 - 0.05 + i * 0.055, WORK_Y - 0.011, 0.06));
  root.add(pad);
  root.add(box(L - 0.2, 0.12, 0.18, M.body, 0, WORK_Y + 0.33, 0.09)); // pressure beam
  const wheels = Math.floor((L - 0.4) / 0.1);
  for (let i = 0; i < wheels; i++) root.add(cyl(0.03, 0.09, M.chain, X0 + 0.3 + i * 0.1, WORK_Y + 0.08, 0.06, 'z', 16));
  root.add(box(L - 0.2, 0.18, 0.04, M.alu, 0, WORK_Y + 0.18, 0.06)); // roller carrier
  const zr = Z_FRONT - 0.07;
  root.add(box(L + 0.1, 0.07, 0.12, M.rail, 0, WORK_Y - 0.06, zr));
  const nRoll = Math.floor((L + 0.1) / 0.05);
  const roll = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.019, 0.019, 0.05, 14), M.roller, nRoll);
  const rot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  for (let i = 0; i < nRoll; i++) roll.setMatrixAt(i, new THREE.Matrix4().makeTranslation(X0 - 0.1 + i * 0.05, WORK_Y - 0.02, Z_FRONT - 0.16).multiply(rot));
  root.add(roll);
  for (let x = X0 + 0.1; x < X1; x += 1.2) root.add(box(0.06, 0.16, 0.32, M.bodyDark, x, WORK_Y - 0.17, Z_FRONT - 0.18));

  // Frame: top rail along the back, posts at both ends and at the module joint.
  root.add(box(L - 0.1, 0.07, 0.08, M.frame, 0, H - 0.035, Z_BACK + 0.04));
  root.add(box(L - 0.1, 0.07, 0.08, M.frame, 0, H - 0.035, 0.0));
  for (const x of [X0 + 0.06, hoodX0, X1 - 0.06]) root.add(box(0.1, H - 0.88, 0.08, M.frame, x, (0.88 + H) / 2, Z_BACK + 0.04));

  // Tools, scaled up from the Booster's and placed in offset groups.
  const spin = [];
  for (const s of stations) {
    const g = new THREE.Group();
    g.position.set(s.x, WORK_Y - 0.88 * TOOL_SCALE, -0.09 - -0.09 * TOOL_SCALE);
    g.scale.setScalar(TOOL_SCALE);
    spin.push(...STATIONS[s.id](g, 0));
    stationRib(g, 0, (H - 0.08 - g.position.y) / TOOL_SCALE);
    root.add(g);
    if (DUSTY.has(s.id)) root.add(tube([[s.x, WORK_Y + 0.1, -0.25], [s.x + 0.08, H - 0.3, Z_BACK + 0.1], [s.x + 0.12, H - 0.12, -0.2]], 0.035));
  }

  // Amber window hood: bays from the end of the open infeed section to the outfeed cap, hinged at the front.
  const y0 = WORK_Y + 0.02, y1 = H - 0.07, zh = 0.0;
  const hood = new THREE.Group();
  hood.position.set(0, y1, zh);
  const add = m => { m.position.y -= y1; m.position.z -= zh; hood.add(m); };
  const w = hoodX1 - hoodX0, xc = (hoodX0 + hoodX1) / 2, dz = zh - Z_BACK;
  add(box(w, y1 - y0, 0.008, M.amber, xc, (y0 + y1) / 2, Z_BACK + 0.006));
  add(box(w, 0.008, dz, M.amber, xc, y1 - 0.004, (Z_BACK + zh) / 2));
  const bays = Math.max(2, Math.round(w / 0.8));
  for (let i = 0; i <= bays; i++) add(box(0.025, y1 - y0, 0.02, M.frame, hoodX0 + w * i / bays, (y0 + y1) / 2, Z_BACK + 0.01));
  add(box(w, 0.03, 0.02, M.frame, xc, y0 + 0.015, Z_BACK + 0.01));
  add(box(w, 0.03, 0.02, M.frame, xc, (y0 + y1) / 2 + 0.03, Z_BACK + 0.01)); // mid rail
  root.add(hood);
  const glow = new THREE.PointLight('#ffae52', 1.2, L, 1.5);
  glow.position.set(xc, (y0 + y1) / 2, -0.25);
  root.add(glow);

  // Outfeed cap with the model strip and the feed motor.
  root.add(box(0.3, H - 0.88, 0.5, M.body, X1 - 0.15, (0.88 + H) / 2, Z_BACK + 0.25));
  const strip = decal(cfg.name.toLowerCase(), { w: 0.42, color: '#1d1f22', bg: '#f07a22', font: '400 110px "IBM Plex Sans Thai", sans-serif' });
  strip.rotation.set(0, Math.PI, Math.PI / 2);
  strip.position.set(X1 - 0.12, (0.88 + H) / 2 + 0.05, Z_BACK - 0.003);
  root.add(strip);
  root.add(cyl(0.14, 0.32, M.motor, X1 - 0.1, WORK_Y + 0.25, -0.2, 'x'));
  root.add(cyl(0.15, 0.03, M.frame, X1 + 0.07, WORK_Y + 0.25, -0.2, 'x'));

  // Infeed: edge coil table, the three-knob edge feed box, and the touch screen on a swing arm.
  const cx = X0 + 0.45, cz = -0.25;
  root.add(cyl(0.38, 0.008, M.disc, cx, WORK_Y + 0.05, cz, 'y', 48));
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 40), M.orange);
  coil.rotation.x = Math.PI / 2;
  coil.scale.z = 0.7;
  coil.position.set(cx, WORK_Y + 0.08, cz);
  root.add(coil);
  const feedBox = new THREE.Group();
  feedBox.add(box(0.26, 0.12, 0.1, M.alu, 0, 0, 0));
  for (let i = 0; i < 3; i++) feedBox.add(button(M.knob, -0.08 + i * 0.08, 0, -0.06, 0.02));
  feedBox.rotation.y = Math.PI;
  feedBox.position.set(X0 + 0.95, WORK_Y + 0.12, -0.32);
  root.add(feedBox);
  const arm = [[X0 + 0.06, H - 0.07, Z_BACK + 0.04], [X0 + 0.06, H - 0.02, Z_BACK + 0.04], [X0 + 0.25, H - 0.02, Z_BACK - 0.1]];
  root.add(tube(arm, 0.025, M.white, 12));
  const screen = new THREE.Group();
  screen.add(box(0.5, 0.36, 0.08, M.body, 0, 0, 0));
  screen.add(box(0.36, 0.26, 0.01, M.screen, 0.04, 0, -0.045));
  for (let i = 0; i < 3; i++) screen.add(button([M.red, M.white, M.green][i], -0.2, 0.08 - i * 0.08, -0.05, 0.012));
  screen.position.set(X0 + 0.25, H - 0.24, Z_BACK - 0.12);
  root.add(screen);

  // A 800 × 450 × 18 mm board; its band appears once it has passed the (first) glue pot.
  const piece = new THREE.Group();
  const len = 0.8, th = 0.018;
  piece.add(box(len, th, 0.45, M.panel, 0, th / 2, 0.2));
  const band = box(1, th + 0.004, 0.002, M.band, 0, th / 2, -0.026);
  piece.add(band);
  piece.position.set(X0 - 0.8, WORK_Y, 0);
  root.add(piece);
  const glueX = stations.find(s => s.id === 'upperglue').x;

  let target = 0;
  return {
    object: root,
    workpiece: piece,
    pieceLabel: 'แผ่นงาน',
    open: { label: 'ฝาครอบ', set(v) { target = v ? 1.0 : 0; } },
    info: `ป้อนแผ่น ${cfg.feed} m/min (ช่วง 12–23) · ${stations.length} สถานี`,
    labels: stations.map((s, i) => ({ text: `${i + 1}. ${s.name}`, at: [s.x, H + 0.12 + (i % 2) * 0.1, -0.2] })),
    views: { a: [L * 0.55, 2.6, 5.5], b: [-L * 0.6, 2.4, -5.2], target: [0, 0.9, 0] },
    update(dt) {
      for (const { mesh, speed } of spin) mesh.rotation.y += speed * dt;
      hood.rotation.x += (target - hood.rotation.x) * Math.min(1, dt * 3);
      piece.position.x += FEED * dt;
      if (piece.position.x - len / 2 > X1 + 0.5) piece.position.x = X0 - 0.8;
      const covered = THREE.MathUtils.clamp(piece.position.x + len / 2 - glueX, 0, len);
      band.visible = covered > 0.001;
      band.scale.x = Math.max(covered, 0.001);
      band.position.x = len / 2 - covered / 2;
    },
  };
}

