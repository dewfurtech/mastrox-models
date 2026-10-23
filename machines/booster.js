import * as THREE from 'three';
import { M, box, cyl, decal, logo, warning, tube, button, std } from './lib.js';

// Body panels: slate grey from the user's colour sample (21 Oct 2026).
const BODY = std('#454b53', { roughness: 0.75 });

// Mastrox Booster edge banders (e6 / e7 / e10, sold earlier as Booster 05 / 06 / 08).
// Built in meters with the origin on the floor under the machine's center.
// Panels feed along +x; the orange roller rail is on one long side, the amber windows on the other.
// The parts are built with the rail toward +z, then the whole machine is turned round at the end so
// the amber-window side (the brochure "front") faces +z and the roller / conveyor side faces −z.
// e6 follows the real photos in "machine docs/Booster e6"; e7 and e10 reuse that body
// at their brochure sizes, with the extra stations their brochures list.

export const STATION_NAMES = {
  sepspray: 'Separation spray',
  premill: 'Pre-milling',
  upperglue: 'Upper glue pot',
  upperglue2: 'Upper glue pot #2',
  rough: 'Rough trimming',
  hotair: 'Hot air (Zero Line)',
  glue: 'Gluing (หม้อกาว EVA)',
  press: 'Press roller',
  end: 'End trimming',
  fine: 'Fine trimming',
  contour: 'Contour rounding',
  scrape: 'Radius scraping',
  flat: 'Flat scraping',
  spray: 'Cleaning spray',
  buff: 'Buffing',
};

export const BOOSTERS = {
  'booster-e6': {
    name: 'Booster e6', length: 2.54, depth: 0.536,
    stations: ['glue', 'press', 'end', 'fine', 'scrape', 'buff'],
    mullions: [-0.15],
  },
  'booster-e7': {
    name: 'Booster e7', length: 2.85, depth: 0.536,
    stations: ['premill', 'glue', 'press', 'end', 'fine', 'scrape', 'buff'],
    mullions: [-0.05],
  },
  'booster-e10': {
    name: 'Booster e10', length: 3.55, depth: 0.64,
    stations: ['premill', 'glue', 'press', 'end', 'fine', 'contour', 'scrape', 'flat', 'spray', 'buff'],
    mullions: [-0.62, 0.02, 0.66],
    split: 0.02, // e10's housing is two cabinets joined here
  },
};

const HEIGHT = 1.316;
const WORK_Y = 0.88; // top of the chain track, where the panel's underside rides
const FEED = 9 / 60; // 9 m/min in m/s
const ZT = -0.09; // tool line, just behind the panel edge

// Station builders. Each adds its parts at x and returns meshes to spin.
// They are drawn for Booster heights (WORK_Y, ZT); the Moon places them in an offset group.
export const STATIONS = {
  premill(g, x) {
    const spin = [];
    for (const dx of [-0.06, 0.06]) {
      const cutter = cyl(0.045, 0.06, M.steel, x + dx, WORK_Y + 0.02, ZT + 0.02, 'y', 20);
      g.add(cutter);
      spin.push({ mesh: cutter, speed: 50 });
      g.add(cyl(0.05, 0.16, M.motor, x + dx, WORK_Y + 0.14, ZT + 0.02));
    }
    g.add(box(0.26, 0.04, 0.12, M.alu, x, WORK_Y + 0.24, ZT));
    return spin;
  },
  glue(g, x) {
    g.add(box(0.2, 0.16, 0.16, M.alu, x, 0.98, ZT - 0.03));
    g.add(cyl(0.05, 0.08, M.steel, x - 0.02, 1.1, ZT - 0.03));
    g.add(warning(x, 0.96, ZT - 0.111, Math.PI));
    g.add(cyl(0.012, 0.18, M.yellow, x + 0.11, 1.0, ZT + 0.02)); // applicator roller
    return [];
  },
  press(g, x) {
    g.add(cyl(0.05, 0.1, M.steel, x, WORK_Y + 0.05, -0.05));
    g.add(cyl(0.025, 0.08, M.steel, x + 0.11, WORK_Y + 0.05, -0.03));
    g.add(cyl(0.025, 0.08, M.steel, x + 0.18, WORK_Y + 0.05, -0.03));
    g.add(cyl(0.035, 0.18, M.motor, x, 1.1, -0.1));
    return [];
  },
  end(g, x) {
    const spin = [];
    for (const [y, tilt] of [[1.06, 0.35], [0.82, -0.35]]) {
      const unit = new THREE.Group();
      unit.add(cyl(0.05, 0.16, M.motor, 0, 0, 0, 'z'));
      const saw = cyl(0.06, 0.004, M.disc, 0, 0, 0.085, 'z', 32);
      unit.add(saw);
      spin.push({ mesh: saw, speed: 40 });
      unit.position.set(x, y, ZT - 0.06);
      unit.rotation.x = tilt;
      g.add(unit);
    }
    g.add(box(0.04, 0.4, 0.04, M.alu, x + 0.1, 1.0, ZT - 0.08)); // slide post
    return spin;
  },
  fine(g, x) {
    const spin = [];
    for (const [y, dir] of [[1.08, 1], [0.78, -1]]) {
      g.add(cyl(0.045, 0.14, M.motor, x, y, ZT - 0.04));
      const head = cyl(0.03, 0.03, M.steel, x, y - dir * 0.085, ZT - 0.04, 'y', 12);
      g.add(head);
      spin.push({ mesh: head, speed: 60 });
    }
    g.add(box(0.07, 0.4, 0.05, M.alu, x + 0.07, 0.98, ZT - 0.1));
    g.add(box(0.03, 0.03, 0.03, M.orange, x + 0.07, 1.16, ZT - 0.06)); // depth knob
    return spin;
  },
  contour(g, x) {
    // Corner-rounding unit: a carriage that rides on rails and follows the panel's ends.
    const spin = [];
    g.add(box(0.2, 0.34, 0.1, M.alu, x, 0.99, ZT - 0.1));
    for (const [y, dir] of [[1.06, 1], [0.8, -1]]) {
      g.add(cyl(0.04, 0.12, M.motor, x, y, ZT - 0.02));
      const head = cyl(0.028, 0.03, M.steel, x, y - dir * 0.075, ZT - 0.02, 'y', 12);
      g.add(head);
      spin.push({ mesh: head, speed: 60 });
    }
    for (const y of [0.88, 1.12]) g.add(cyl(0.008, 0.26, M.chrome, x, y, ZT - 0.16, 'x', 10));
    return spin;
  },
  scrape(g, x) {
    for (const y of [0.97, 0.8]) {
      g.add(box(0.07, 0.05, 0.06, M.alu, x, y, ZT - 0.02));
      g.add(cyl(0.012, 0.08, M.steel, x - 0.05, y + 0.04, ZT - 0.05));
    }
    return [];
  },
  flat(g, x) {
    g.add(box(0.1, 0.05, 0.08, M.alu, x, WORK_Y + 0.09, ZT + 0.02));
    g.add(box(0.08, 0.004, 0.06, M.steel, x, WORK_Y + 0.06, ZT + 0.03)); // blade
    g.add(cyl(0.012, 0.1, M.steel, x - 0.04, WORK_Y + 0.15, ZT + 0.02));
    return [];
  },
  spray(g, x) {
    for (const y of [WORK_Y + 0.07, WORK_Y - 0.05]) g.add(cyl(0.008, 0.05, M.brass, x, y, ZT + 0.02, 'z', 10));
    g.add(cyl(0.04, 0.14, M.white, x + 0.06, 1.08, ZT - 0.08)); // fluid bottle
    return [];
  },
  sepspray(g, x) {
    for (const y of [WORK_Y + 0.06, WORK_Y - 0.04]) g.add(cyl(0.008, 0.05, M.brass, x, y, ZT + 0.03, 'z', 10));
    g.add(cyl(0.035, 0.12, M.white, x, 1.08, ZT - 0.08));
    return [];
  },
  upperglue(g, x) {
    // Glue pot above the panel line: melt tank, heated nozzle reaching down to the edge.
    g.add(box(0.22, 0.2, 0.18, M.alu, x, 1.12, ZT - 0.05));
    g.add(warning(x, 1.1, ZT - 0.141, Math.PI));
    g.add(box(0.06, 0.18, 0.05, M.steel, x + 0.08, WORK_Y + 0.11, ZT + 0.01));
    g.add(cyl(0.012, 0.16, M.yellow, x + 0.11, WORK_Y + 0.06, ZT + 0.03));
    for (let i = 0; i < 3; i++) g.add(cyl(0.006, 0.25, M.white, x - 0.06 + i * 0.03, 1.32, ZT - 0.1, 'y', 6)); // heater cables
    return [];
  },
  upperglue2(g, x) { return STATIONS.upperglue(g, x); },
  rough(g, x) { return STATIONS.fine(g, x); },
  hotair(g, x) {
    g.add(box(0.12, 0.08, 0.1, M.motor, x, WORK_Y + 0.16, ZT - 0.04));
    g.add(cyl(0.015, 0.12, M.chrome, x, WORK_Y + 0.08, ZT + 0.01, 'y', 12));
    g.add(cyl(0.02, 0.04, M.red, x + 0.07, WORK_Y + 0.16, ZT - 0.04, 'x', 12));
    return [];
  },
  buff(g, x) {
    const spin = [];
    for (const dir of [1, -1]) {
      const wheel = cyl(0.06, 0.04, M.buff, x + dir * 0.06, WORK_Y + dir * 0.06, ZT, 'z', 24);
      g.add(wheel);
      spin.push({ mesh: wheel, speed: 25 * dir });
      g.add(cyl(0.04, 0.12, M.motor, x + dir * 0.06, WORK_Y + dir * 0.06, ZT - 0.08, 'z'));
    }
    return spin;
  },
};
export const DUSTY = new Set(['premill', 'end', 'fine', 'rough', 'contour']);

// Vertical mounting rib on the downstream side of a station, from the cabinet top up to yTop,
// that the station's units bolt to (without it they hang in the air behind the panel line).
export function stationRib(g, x, yTop) {
  g.add(box(0.06, yTop - 0.83, 0.15, M.frame, x + 0.13, (0.83 + yTop) / 2, ZT - 0.045));
}

// Induction motor with its axis along +x, mounted on the end face at x = xEnd.
const MOTOR_GREY = std('#5a5e63', { roughness: 0.55, metalness: 0.35 });
let grilleMat = null;
function feedMotor(xEnd, y, z) {
  if (!grilleMat) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#4a4e53'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#15171a';
    for (let i = 6; i < 122; i += 9) for (let j = 6; j < 122; j += 9) if (Math.hypot(i - 60, j - 60) < 56) g.fillRect(i, j, 6, 6);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    grilleMat = std('#ffffff', { map: tex, roughness: 0.6, metalness: 0.3 });
  }
  const g = new THREE.Group();
  g.name = 'FeedMotor';
  g.position.set(xEnd, y, z);
  g.add(box(0.03, 0.24, 0.24, M.frame, 0.015, 0, 0));                                  // bracket plate on the end cap
  g.add(box(0.16, 0.18, 0.13, MOTOR_GREY, 0.11, 0, 0));                                // right-angle gearbox
  // The motor itself, built along +x, then turned 90° so it runs across the machine with the fan grille
  // facing the amber side (photo).
  const m = new THREE.Group();
  m.rotation.y = Math.PI / 2;
  m.position.set(0.11, 0, -0.065 + 0.03);
  g.add(m);
  const R = 0.1, BODY_L = 0.2;
  m.add(cyl(R + 0.02, 0.025, MOTOR_GREY, 0.045, 0, 0, 'x', 28));                      // mounting flange
  m.add(cyl(R, BODY_L, MOTOR_GREY, 0.06 + BODY_L / 2, 0, 0, 'x', 28));                 // body
  for (let i = 0; i < 14; i++) {                                                        // cooling fins
    const a = i * Math.PI * 2 / 14;
    const fin = box(BODY_L - 0.02, 0.016, 0.004, MOTOR_GREY, 0.06 + BODY_L / 2, Math.cos(a) * (R + 0.006), Math.sin(a) * (R + 0.006));
    fin.rotation.x = a;
    m.add(fin);
  }
  const capX = 0.06 + BODY_L;
  m.add(cyl(R + 0.008, 0.07, MOTOR_GREY, capX + 0.035, 0, 0, 'x', 28));               // fan cover
  const grille = new THREE.Mesh(new THREE.CircleGeometry(R - 0.004, 28), grilleMat);    // square-mesh end
  grille.rotation.y = Math.PI / 2;
  grille.position.x = capX + 0.071;
  m.add(grille);
  m.add(box(0.1, 0.07, 0.09, M.frame, 0.06 + BODY_L * 0.55, R + 0.04, 0));             // terminal box
  m.add(warning(0.06 + BODY_L * 0.55, R + 0.035, 0.046, 0, 0.7));                      // its yellow sticker, facing out
  m.add(cyl(0.012, 0.03, M.frame, 0.06 + BODY_L * 0.55, R + 0.045, -0.06, 'z', 12));   // cable gland
  return g;
}

export function createBooster(id) {
  const cfg = BOOSTERS[id];
  const L = cfg.length, X0 = -L / 2, X1 = L / 2;
  // Body depth: the brochure figure looked too thin next to the real machines, so it is drawn 1.4× deeper
  // (user's call, 21 Oct 2026). Cabinet, hood, rail and roller supports all follow from it.
  const DEPTH = cfg.depth * 1.4;
  const Z_BACK = -DEPTH / 2, Z_FRONT = DEPTH / 2;
  const root = new THREE.Group();
  root.name = cfg.name;

  // Stations spread evenly between the edge feed and the outfeed end.
  const first = X0 + 0.45, last = X1 - 0.37;
  const stations = cfg.stations.map((s, i, a) => ({ id: s, name: STATION_NAMES[s], x: first + (last - first) * i / (a.length - 1) }));

  // Lower cabinet, recessed on the operator side under the rail.
  {
    const zb = Z_BACK, zf = Z_FRONT - 0.168, cz = (zb + zf) / 2, d = zf - zb;
    root.add(box(L, 0.72, d, BODY, 0, 0.44, cz));
    root.add(box(L + 0.01, 0.03, d + 0.01, M.frame, 0, 0.815, cz));
    const zDoor = zb - 0.002;
    // Doors on the amber side, two per cabinet, covering the whole face end to end and from the top
    // band down to the plinth (photo of the Booster 05 / e6).
    const edges = cfg.split != null ? [X0 + 0.008, cfg.split, X1 - 0.008] : [X0 + 0.008, X1 - 0.008];
    const doors = [];
    for (let i = 0; i < edges.length - 1; i++) {
      const mid = (edges[i] + edges[i + 1]) / 2;
      doors.push([edges[i], mid], [mid, edges[i + 1]]);
    }
    const DY0 = 0.095, DY1 = 0.795, DH = DY1 - DY0, DC = (DY0 + DY1) / 2;
    for (const [x0, x1] of doors) {
      root.add(box(x1 - x0 - 0.008, DH, 0.006, BODY, (x0 + x1) / 2, DC, zDoor - 0.002));
      root.add(box(0.006, DH, 0.004, M.frame, x1, DC, zDoor));
      for (const hx of [x0 + 0.06, x1 - 0.06]) root.add(cyl(0.009, 0.01, M.steel, hx, DY1 - 0.05, zDoor - 0.008, 'z', 12));
      root.add(warning((x0 + x1) / 2 - (x1 - x0) * 0.25, DY1 - 0.09, zDoor - 0.009, Math.PI));
    }
    // Big mastrox logo across the lower part of the left-hand door (as seen from the amber side), in the
    // rounded thin brand font, "mas" light grey and "trox" orange (photo of the Booster 05 / e6).
    // Comfortaa is loaded by rakete-real.js, which registry.js imports first.
    const [da, db] = doors[doors.length - 1];             // the door at X1: left-hand from the amber side
    const lw = Math.min(0.95, (db - da) * 0.72);
    const back = logo(lw, '#e4e4e2');
    // Product photos (Docs\ภาพเครื่อง): the word starts right at the door's outer edge and sits in the
    // lower third, its middle ~69% down the door (e7: ~60%).
    const down = cfg.name === 'Booster e7' ? 0.6 : 0.69;
    back.position.set(db - 0.035 - lw / 2, DY1 - DH * down, zDoor - 0.01);
    back.rotation.y = Math.PI;
    root.add(back);
    const strip = decal(cfg.name, { w: 0.36, color: '#1d1f22', bg: '#f07a22', font: '400 110px "IBM Plex Sans Thai", sans-serif' });
    strip.rotation.set(0, Math.PI, Math.PI / 2);
    strip.position.set(X0 + 0.17, 0.4, zDoor - 0.01);
    root.add(strip);
    root.add(box(0.07, 0.07, 0.04, M.yellow, X0 + 0.07, 0.66, zb - 0.02));
    root.add(cyl(0.022, 0.03, M.red, X0 + 0.07, 0.66, zb - 0.05, 'z'));
    root.add(box(0.07, 0.09, 0.05, M.frame, X0 + 0.07, 0.2, zb - 0.025));
    root.add(box(0.28, 0.06, 0.004, M.frame, 0.25, 0.2, zf + 0.002)); // vent slot
    for (const x of [X0 + 0.22, X1 - 0.22]) {
      for (const z of [zb + 0.06, zf - 0.06]) {
        root.add(box(0.12, 0.02, 0.1, M.bodyDark, x, 0.075, z));
        root.add(cyl(0.008, 0.06, M.steel, x, 0.045, z, 'y', 10));
        root.add(cyl(0.03, 0.012, M.steel, x, 0.006, z, 'y', 20));
      }
    }
  }

  // Chain track and the support rail with orange rollers.
  {
    const zc = 0.05;
    root.add(box(L + 0.24, 0.05, 0.12, M.frame, 0.06, WORK_Y - 0.045, zc));
    const pads = Math.floor((L + 0.2) / 0.05);
    const pad = new THREE.InstancedMesh(new THREE.BoxGeometry(0.046, 0.02, 0.1), M.chain, pads);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < pads; i++) pad.setMatrixAt(i, mtx.makeTranslation(X0 - 0.06 + i * 0.05 + 0.025, WORK_Y - 0.01, zc));
    pad.castShadow = pad.receiveShadow = true;
    root.add(pad);

    const zr = Z_FRONT - 0.053;
    root.add(box(L + 0.3, 0.06, 0.1, M.rail, 0.04, WORK_Y - 0.05, zr));
    root.add(box(L + 0.3, 0.012, 0.11, M.alu, 0.04, WORK_Y - 0.084, zr));
    const n = Math.floor((L + 0.26) / 0.042);
    const roll = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.016, 0.016, 0.04, 16), M.roller, n);
    const rot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    for (let i = 0; i < n; i++) {
      roll.setMatrixAt(i, new THREE.Matrix4().makeTranslation(X0 - 0.1 + i * 0.042 + 0.021, WORK_Y - 0.016, Z_FRONT - 0.123).multiply(rot));
    }
    roll.castShadow = true;
    root.add(roll);
    for (const x of [X0 + 0.1, 0, X1 - 0.1]) root.add(box(0.05, 0.12, Z_FRONT - 0.1, M.bodyDark, x, WORK_Y - 0.14, (Z_FRONT + 0.1) / 2 - 0.02));
    root.add(box(0.26, 0.05, 0.012, M.steel, X0 + 0.02, WORK_Y + 0.02, 0.0)); // infeed fence
  }

  // Pressure beam over the chain, holding the top belt that clamps the panel.
  {
    const zc = 0.075, y0 = 0.975;
    root.add(box(L - 0.14, HEIGHT - y0, 0.17, BODY, -0.02, (y0 + HEIGHT) / 2, zc));
    root.add(box(L - 0.14, 0.03, 0.12, M.frame, -0.02, y0 - 0.015, 0.05));
    const wheels = Math.floor((L - 0.3) / 0.11);
    for (let i = 0; i < wheels; i++) root.add(cyl(0.022, 0.07, M.chain, X0 + 0.22 + i * 0.11, WORK_Y + 0.06, 0.05, 'z', 16));
    const front = logo(0.62);
    front.position.set(-0.25, 1.16, zc + 0.09);
    root.add(front);
    const strip = decal(cfg.name, { w: 0.28, color: '#1d1f22', bg: '#f07a22', font: '400 110px "IBM Plex Sans Thai", sans-serif' });
    strip.rotation.z = Math.PI / 2;
    strip.position.set(X1 - 0.17, 1.16, zc + 0.09);
    root.add(strip);
    // No height crank on the beam end (removed at the user's request); an empty slot keeps editor paths.
    root.add(new THREE.Group());
  }

  // Tools, dust hoses, feed motor.
  const spin = [];
  for (const s of stations) { spin.push(...STATIONS[s.id](root, s.x)); stationRib(root, s.x, 1.27); }
  for (const s of stations.filter(s => DUSTY.has(s.id))) {
    root.add(tube([[s.x, 1.0, -0.2], [s.x + 0.06, 1.18, Z_BACK + 0.05], [s.x + 0.1, 1.27, -0.15]], 0.026));
  }
  // Feed motor on the outfeed end (photo): grey finned body lying along the feed, square-mesh fan cover
  // on the outer end, black terminal box on top, bolted through a flange to a bracket on the end cap.
  // (Two children, as the old motor had, so editor edits saved by part path stay on the right parts.)
  root.add(feedMotor(X1, 0.95, 0.0), new THREE.Group());

  // Amber hood over the back half, hinged at the pressure beam so the whole cover tips up.
  let hoodPivot;
  {
    const y0 = 0.83, y1 = HEIGHT, zh = -0.01, t = 0.008;
    const w = L - 0.16, xc = -0.03, dz = zh - Z_BACK, zm = (Z_BACK + zh) / 2;
    hoodPivot = new THREE.Group();
    hoodPivot.position.set(0, y1, zh);
    const add = m => { m.position.y -= y1; m.position.z -= zh; hoodPivot.add(m); };
    add(box(w, 0.03, 0.03, M.frame, xc, y1 - 0.015, Z_BACK + 0.015));
    add(box(w, 0.025, dz - 0.03, M.amber, xc, y1 - 0.035, zm));
    add(box(w, y1 - y0 - 0.06, t, M.amber, xc, (y0 + y1) / 2 - 0.02, Z_BACK + t / 2));
    add(box(w, 0.02, 0.012, M.frame, xc, y0 + 0.01, Z_BACK + 0.006));
    for (const mx of cfg.mullions) add(box(0.016, y1 - y0, 0.012, M.frame, mx, (y0 + y1) / 2, Z_BACK + 0.006));
    for (const x of [xc - w / 2, xc + w / 2]) {
      add(box(t, y1 - y0 - 0.03, dz, M.amber, x, (y0 + y1) / 2, zm));
      add(box(0.016, y1 - y0, 0.016, M.frame, x, (y0 + y1) / 2, Z_BACK + 0.008));
    }
    if (cfg.split != null) add(box(0.05, y1 - y0, dz, BODY, cfg.split, (y0 + y1) / 2, zm));
    root.add(box(0.07, y1 - y0, dz, BODY, X0 + 0.035, (y0 + y1) / 2, zm));
    root.add(box(0.07, y1 - y0, dz, BODY, X1 - 0.035, (y0 + y1) / 2, zm));
    // No dust port on top of the beam (the real Boosters don't have one). Two empty slots stand where its
    // two parts were, so editor edits saved by part path still land on the right parts.
    root.add(new THREE.Group(), new THREE.Group());
    root.add(hoodPivot);
  }

  // Infeed end: edge coil table and the control box.
  {
    const cx = X0 - 0.2, cz = -0.12, cy = WORK_Y + 0.04;
    root.add(cyl(0.33, 0.006, M.disc, cx, cy, cz, 'y', 48));
    root.add(cyl(0.06, 0.03, M.frame, cx, cy + 0.02, cz));
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 40), M.coil);
    coil.rotation.x = Math.PI / 2;
    coil.scale.z = 0.8;
    coil.position.set(cx + 0.03, cy + 0.025, cz + 0.04);
    root.add(coil);
    root.add(box(0.3, 0.03, 0.04, M.frame, X0 - 0.07, cy - 0.04, cz + 0.05));
    root.add(cyl(0.012, 0.1, M.frame, X0 - 0.18, cy - 0.1, cz + 0.08, 'y', 10));
    root.add(box(0.3, 0.06, 0.03, M.steel, X0 + 0.02, WORK_Y + 0.06, -0.05)); // edge feed guide

    // The face points toward −z, so +x here is the viewer's left: screen left, switches right.
    const panel = new THREE.Group();
    panel.add(box(0.44, 0.3, 0.11, BODY, 0, 0, 0));
    panel.add(box(0.2, 0.13, 0.01, M.screen, 0.06, 0.04, -0.056));
    panel.add(box(0.07, 0.035, 0.01, M.frame, -0.15, 0.1, -0.056));
    for (const x of [0.15, 0.08, 0.01]) panel.add(button(M.frame, x, -0.1, -0.065));
    panel.add(button(M.green, -0.15, 0.03, -0.065));
    panel.add(button(M.red, -0.15, -0.07, -0.065, 0.022));
    // Hangs just past the infeed end on a bracket off the end cap, above the coil table,
    // facing the amber side.
    panel.position.set(X0 - 0.3, 1.2, Z_BACK + 0.12);
    root.add(panel);
    root.add(box(0.18, 0.06, 0.06, M.frame, X0 - 0.08, 1.2, Z_BACK + 0.14)); // bracket
    root.add(box(0.06, 0.06, 0.16, M.frame, X0 - 0.03, 1.2, Z_BACK + 0.08)); // foot on the end cap
  }

  const glow = new THREE.PointLight('#ffae52', 0.6, L * 0.9, 1.5);
  glow.position.set(0, 1.1, -0.15);
  root.add(glow);

  // A 600 × 400 × 18 mm board; its edge band grows as the board passes the glue pot.
  const piece = new THREE.Group();
  const len = 0.6, dep = 0.4, th = 0.018;
  piece.add(box(len, th, dep, M.panel, 0, th / 2, dep / 2 - 0.05));
  const band = box(1, th + 0.004, 0.002, M.band, 0, th / 2, -0.051);
  piece.add(band);
  piece.position.set(X0 - 0.6, WORK_Y, 0);
  root.add(piece);

  let hoodTarget = 0;
  const glueX = stations.find(s => s.id === 'glue').x;

  // Turn the machine round: amber windows to +z (front), roller rail to −z (back), infeed at +x.
  // Everything above is in the machine's own frame, so labels, the panel and editor paths stay put.
  root.rotation.y = Math.PI;

  return {
    object: root,
    workpiece: piece,
    labels: stations.map((s, i) => ({ text: `${i + 1}. ${s.name}`, at: [s.x, 1.42 + (i % 2) * 0.09, -0.15] })),
    open: { label: 'ฝาครอบ', set(v) { hoodTarget = v ? 1.1 : 0; } },
    pieceLabel: 'แผ่นงาน',
    info: `ป้อนแผ่น ${FEED * 60} m/min · ${stations.length} สถานี`,
    views: { a: [-L * 0.9, 2.0, 4.2], b: [L * 0.95, 1.9, -4.0], target: [0, 0.85, 0] },
    update(dt) {
      for (const { mesh, speed } of spin) mesh.rotation.y += speed * dt;
      hoodPivot.rotation.x += (hoodTarget - hoodPivot.rotation.x) * Math.min(1, dt * 4);
      piece.position.x += FEED * dt;
      if (piece.position.x - len / 2 > X1 + 0.4) piece.position.x = X0 - 0.6;
      const covered = THREE.MathUtils.clamp(piece.position.x + len / 2 - glueX, 0, len);
      band.visible = covered > 0.001;
      band.scale.x = Math.max(covered, 0.001);
      band.position.x = len / 2 - covered / 2;
    },
  };
}
