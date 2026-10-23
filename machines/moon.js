import * as THREE from 'three';
import { M, box, cyl, decal, logo, warning, tube, button, std } from './lib.js';
import { STATIONS, STATION_NAMES, DUSTY, stationRib } from './booster.js';

// Mastrox Moon edge banders (Moon 10 / 40 / 40d / 80), the professional line above the Booster.
// Rebuilt from the product photos (Docs\ภาพเครื่อง\Moon 40 / Moon 80, brochure pages of Moon 10 and
// Moon 40d), all taken from the amber-glass side with the infeed on the left:
//   grey cabinet on feet, doors with two slot handles and a warning sign each, a grey band under the
//   glass; thick grey posts split the top into modules; the infeed module has glass only on its top
//   half and is open below (edge coil table, feed box with blue knobs, glue pot); a low extension at
//   the outfeed end carries the feed motor; the touch screen hangs on a white swing arm off the
//   infeed end; orange "moonNN" tag on the last post and/or low on the cabinet.
// The glass side faces +z, panels feed along +x, the outrigger roller rail is on the −z side.
// Module positions are fractions of the length measured off each photo. The back and the tools'
// shapes (from the Booster) are guesses.

export const MOONS = {
  'moon-10': {
    name: 'Moon 10', length: 4.5, height: 1.68, feed: 18,
    stations: ['upperglue', 'press', 'end', 'rough', 'fine', 'scrape', 'flat', 'spray', 'buff'],
    layout: { infeed: 0.30, joints: [0.57], last: 0.81, ext: 0.85, logo: 0.17, tagLow: true, tagTop: true },
  },
  'moon-40': {
    name: 'Moon 40', length: 6.5, height: 1.6, feed: 18,
    stations: ['sepspray', 'premill', 'upperglue', 'press', 'end', 'rough', 'fine', 'contour', 'scrape', 'flat', 'spray', 'buff'],
    layout: { infeed: 0.34, joints: [0.62], last: 0.88, ext: 0.905, logo: 0.08, tagLow: true, tagTop: false },
  },
  'moon-40d': {
    name: 'Moon 40d', length: 8.0, height: 1.6, feed: 18,
    stations: ['sepspray', 'premill', 'upperglue', 'upperglue2', 'press', 'end', 'rough', 'fine', 'contour', 'scrape', 'flat', 'spray', 'buff', 'hotair'],
    layout: { infeed: 0.40, joints: [0.58, 0.75], last: 0.91, ext: 0.93, logo: 0.08, tagLow: false, tagTop: true },
  },
  'moon-80': {
    // The brochure says "4 Round Corner ×13 unit" without listing them; this order is a guess
    // built from the Moon 40 list with a second corner-rounding unit.
    name: 'Moon 80', length: 6.5, height: 1.6, feed: 16,
    stations: ['sepspray', 'premill', 'upperglue', 'press', 'end', 'rough', 'fine', 'contour', 'contour', 'scrape', 'flat', 'spray', 'buff'],
    layout: { infeed: 0.40, joints: [0.59, 0.75], last: 0.915, ext: 0.935, logo: 0.08, tagLow: false, tagTop: true },
  },
};

const D = 1.0, ZG = D / 2, ZR = -D / 2;  // glass face (front) / roller side (back)
const WORK_Y = 0.75;                     // chain top: the panel's underside (bottom of the glass in the photos)
const CAB_Y = 0.55;                      // cabinet top (about a third of the height in the photos); grey band up to WORK_Y
const TOOL_SCALE = 1.25;                 // Moon units are larger than the Booster's
const POST_W = 0.15, JOINT_W = 0.04;
const BRAND = '300 130px Comfortaa, "IBM Plex Sans Thai", sans-serif';

// Box spanning [x0,x1] × [y0,y1] × [z0,z1].
const span = (x0, x1, y0, y1, z0, z1, mat) => box(x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

export function createMoon(id) {
  const cfg = MOONS[id], lay = cfg.layout;
  const L = cfg.length, H = cfg.height, X0 = -L / 2, X1 = L / 2;
  const FEED = cfg.feed / 60;
  const fx = f => X0 + f * L;
  const root = new THREE.Group();
  root.name = cfg.name;

  // Paint as in the photos.
  const body = std('#5f646a', { roughness: 0.7, metalness: 0.2 });
  const post = std('#565b61', { roughness: 0.65, metalness: 0.2 });
  const band = std('#6b7177', { roughness: 0.6, metalness: 0.25 });
  const seam = std('#2c2f33', { roughness: 0.8 });
  const black = std('#1c1d20', { roughness: 0.8 });

  // Where the modules are: infeed post, thin joints, last post (with the name strip), extension.
  const P1 = fx(lay.infeed), PL = fx(lay.last), PX = fx(lay.ext);
  const joints = lay.joints.map(fx);
  const YT = H - 0.08;                    // underside of the top frame
  const YI = WORK_Y + (YT - WORK_Y) * 0.42; // bottom of the infeed glass (the infeed is open below)

  // ---------- Cabinet ----------
  const cz0 = -0.25;                      // cabinet back face (the roller rail overhangs behind it)
  root.add(span(X0, X1, 0.08, CAB_Y, cz0, ZG, body));
  // feet under the posts
  for (const x of [X0 + 0.1, P1 + POST_W / 2, ...joints, PL + (PX - PL) / 2, X1 - 0.1]) {
    root.add(span(x - 0.09, x + 0.09, 0, 0.08, ZG - 0.2, ZG - 0.04, black));
    root.add(span(x - 0.09, x + 0.09, 0, 0.08, cz0 + 0.04, cz0 + 0.2, black));
  }
  // doors: one or two per module, each with two slot handles near the top and a warning sign
  const bays = [[X0, P1 + POST_W], [P1 + POST_W, joints[0]]];
  for (let i = 0; i < joints.length - 1; i++) bays.push([joints[i], joints[i + 1]]);
  bays.push([joints[joints.length - 1], PL], [PL, PX], [PX, X1]);
  for (const [a, b] of bays) {
    const n = Math.max(1, Math.round((b - a) / 1.05)), w = (b - a) / n;
    for (let i = 0; i < n; i++) {
      const x0 = a + w * i, xc = x0 + w / 2;
      root.add(span(x0 - 0.004, x0 + 0.004, 0.1, CAB_Y - 0.01, ZG, ZG + 0.004, seam)); // door seam
      if (w < 0.3) continue;
      for (const s of [-1, 1]) root.add(span(xc + s * w * 0.36 - 0.035, xc + s * w * 0.36 + 0.035, CAB_Y - 0.075, CAB_Y - 0.06, ZG, ZG + 0.006, seam)); // slot handles
      root.add(warning(xc, CAB_Y - 0.105, ZG + 0.004, 0, 0.9));
    }
  }
  root.add(span(X1 - 0.004, X1, 0.1, CAB_Y - 0.01, ZG, ZG + 0.004, seam));
  // grey band between the cabinet and the glass, with two grooves
  root.add(span(X0, PL, CAB_Y, WORK_Y, ZG - 0.03, ZG - 0.005, band));
  for (const y of [CAB_Y + 0.06, CAB_Y + 0.13]) root.add(span(P1 + POST_W, PL, y - 0.004, y + 0.004, ZG - 0.005, ZG - 0.002, seam));

  // logo low at the infeed end; level tag low at the end of the glass (Moon 10 / 40)
  const lw = L * lay.logo;
  const badge = logo(lw, '#e9e9e9');
  badge.position.set(X0 + 0.04 + lw / 2, 0.3, ZG + 0.006);
  root.add(badge);
  if (lay.tagLow) {
    const tw = L * (cfg.name === 'Moon 10' ? 0.083 : 0.058);
    const tag = new THREE.Group();
    tag.add(span(-tw / 2, tw / 2, -tw * 0.14, tw * 0.14, 0, 0.004, M.orange));
    const t = decal(cfg.name.toLowerCase().replace(' ', ''), { w: tw * 0.85, color: '#2a2018', font: BRAND });
    t.position.z = 0.006;
    tag.add(t);
    tag.position.set(PL - 0.03 - tw / 2, 0.3, ZG + 0.004);
    root.add(tag);
  }

  // ---------- Frame: end post, infeed post, joints, last post, top rail ----------
  root.add(span(X0, X0 + 0.08, WORK_Y, H, ZG - 0.12, ZG, post));
  root.add(span(P1, P1 + POST_W, CAB_Y, H, ZG - 0.14, ZG + 0.01, post));
  for (const x of joints) root.add(span(x - JOINT_W / 2, x + JOINT_W / 2, WORK_Y, H, ZG - 0.1, ZG, post));
  root.add(span(PL, PX, CAB_Y, H, ZG - 0.14, ZG + 0.01, post));
  root.add(span(X0, PX, YT, H, ZG - 0.12, ZG, post)); // top rail along the glass
  root.add(span(X0, PX, YT, H, ZR + 0.25, ZR + 0.33, post)); // top rail at the back
  for (const x of [X0 + 0.04, P1 + POST_W / 2, PL + (PX - PL) / 2]) root.add(span(x - 0.04, x + 0.04, WORK_Y, H, ZR + 0.25, ZR + 0.33, post)); // back posts
  if (lay.tagTop) {
    // orange strip down the last post, name reading top to bottom
    const sw = (PX - PL) * 0.78, sy0 = WORK_Y + (YT - WORK_Y) * 0.12;
    root.add(span(PL + ((PX - PL) - sw) / 2, PX - ((PX - PL) - sw) / 2, sy0, YT - 0.02, ZG + 0.01, ZG + 0.014, M.orange));
    const t = decal(cfg.name.toLowerCase().replace(' ', ''), { w: (YT - 0.02 - sy0) * 0.85, color: '#2a2018', font: BRAND });
    t.rotation.z = -Math.PI / 2;
    t.position.set((PL + PX) / 2, (sy0 + YT - 0.02) / 2, ZG + 0.017);
    root.add(t);
  }

  // ---------- Operator side (back): chain track, pressure beam, roller rail ----------
  root.add(span(X0 - 0.05, X1 + 0.1, WORK_Y - 0.08, WORK_Y - 0.02, -0.13, 0.01, black));
  const pads = Math.floor((L + 0.1) / 0.055);
  const pad = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.022, 0.12), M.chain, pads);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < pads; i++) pad.setMatrixAt(i, mtx.makeTranslation(X0 - 0.02 + i * 0.055, WORK_Y - 0.011, -0.06));
  root.add(pad);
  root.add(span(X0 + 0.1, PL, WORK_Y + 0.27, WORK_Y + 0.39, -0.18, 0.0, body)); // pressure beam
  const wheels = Math.floor((PL - X0 - 0.3) / 0.1);
  for (let i = 0; i < wheels; i++) root.add(cyl(0.03, 0.09, M.chain, X0 + 0.25 + i * 0.1, WORK_Y + 0.08, -0.06, 'z', 16));
  root.add(span(X0 + 0.1, PL, WORK_Y + 0.09, WORK_Y + 0.27, -0.08, -0.04, M.alu)); // roller carrier
  const zr = ZR + 0.07;
  root.add(span(X0 - 0.05, X1 + 0.05, WORK_Y - 0.095, WORK_Y - 0.025, zr - 0.06, zr + 0.06, M.rail));
  const nRoll = Math.floor((L + 0.1) / 0.05);
  const roll = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.019, 0.019, 0.05, 14), M.roller, nRoll);
  const rot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  for (let i = 0; i < nRoll; i++) roll.setMatrixAt(i, new THREE.Matrix4().makeTranslation(X0 - 0.03 + i * 0.05, WORK_Y - 0.02, ZR + 0.16).multiply(rot));
  root.add(roll);
  for (let x = X0 + 0.15; x < X1; x += 1.2) root.add(span(x - 0.03, x + 0.03, WORK_Y - 0.26, WORK_Y - 0.095, ZR + 0.02, cz0, body)); // rail brackets

  // ---------- Tools (Booster units scaled up), turned to face the glass side ----------
  const first = X0 + 0.45, lastX = PL - 0.2;
  const stations = cfg.stations.map((s, i, a) => ({ id: s, name: STATION_NAMES[s], x: first + (lastX - first) * i / (a.length - 1) }));
  const spin = [];
  for (const s of stations) {
    const g = new THREE.Group();
    // Booster tools sit on the −z side; a half turn puts them on the glass side (no mirroring).
    g.position.set(s.x, WORK_Y - 0.88 * TOOL_SCALE, -(-0.09 + 0.09 * TOOL_SCALE));
    g.rotation.y = Math.PI;
    g.scale.setScalar(TOOL_SCALE);
    spin.push(...STATIONS[s.id](g, 0));
    stationRib(g, 0, (YT - g.position.y) / TOOL_SCALE);
    root.add(g);
    if (DUSTY.has(s.id)) root.add(tube([[s.x, WORK_Y + 0.1, 0.25], [s.x + 0.08, YT - 0.25, ZG - 0.12], [s.x + 0.12, YT - 0.05, 0.2]], 0.035));
  }

  // ---------- Glass ----------
  const glassPanes = (parent, x0, x1, y0, y1, z, n) => {
    parent.add(span(x0, x1, y0, y1, z - 0.004, z + 0.004, M.amber));
    for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n; parent.add(span(x - 0.012, x + 0.012, y0, y1, z - 0.01, z + 0.01, post)); }
    parent.add(span(x0, x1, y0 - 0.012, y0 + 0.018, z - 0.012, z + 0.012, post)); // bottom rail (offset so its faces don't line up with the glass)
  };
  // infeed: fixed glass in the top part only, its own top
  glassPanes(root, X0 + 0.08, P1, YI, YT, ZG - 0.06, Math.max(2, Math.round((P1 - X0) / 0.75)));
  root.add(span(X0 + 0.08, P1, YT - 0.012, YT - 0.006, ZG - 0.07, 0.0, M.amber));
  // main hood over the glass modules, hinged along the top at z = 0 so it lifts open
  const hood = new THREE.Group();
  hood.position.set(0, YT, 0);
  const hx0 = P1 + POST_W, mods = [hx0, ...joints.map(x => x + JOINT_W / 2), PL];
  for (let i = 0; i < mods.length - 1; i++) {
    const a = i === 0 ? mods[0] : mods[i], b = i < mods.length - 2 ? joints[i] - JOINT_W / 2 : PL;
    glassPanes(hood, a, b, WORK_Y + 0.02 - YT, -0.006, ZG - 0.06, Math.max(2, Math.round((b - a) / 0.75)));
  }
  hood.add(span(hx0, PL, -0.008, 0, 0.0, ZG - 0.06, M.amber)); // glass roof
  root.add(hood);
  const glow = new THREE.PointLight('#ffae52', 1.2, L, 1.5);
  glow.position.set((hx0 + PL) / 2, (WORK_Y + YT) / 2, 0.25);
  root.add(glow);

  // ---------- Outfeed extension: feed motor on the low cabinet ----------
  root.add(span(PX, X1, CAB_Y, WORK_Y, cz0, ZG, body));
  // Square gearbox at the back of the extension; the motor comes off its front face and runs across
  // the machine with its fan end facing the glass side (user, 22 Oct 2026).
  {
    const xm = (PX + X1) / 2, my = WORK_Y + 0.15;
    const grey = std('#5a5e63', { roughness: 0.55, metalness: 0.35 });
    root.add(span(xm - 0.16, xm + 0.16, WORK_Y, WORK_Y + 0.03, -0.24, 0.02, black)); // foot plate
    root.add(span(xm - 0.13, xm + 0.13, WORK_Y + 0.03, my + 0.13, -0.22, 0.0, grey)); // gearbox
    root.add(cyl(0.05, 0.08, M.steel, xm, my, -0.26, 'z', 20)); // output shaft cap into the drive
    const R = 0.12, z0 = 0.0;
    root.add(cyl(R + 0.025, 0.03, grey, xm, my, z0 + 0.015, 'z', 28)); // flange on the gearbox
    root.add(cyl(R, 0.28, grey, xm, my, z0 + 0.03 + 0.14, 'z', 28)); // body
    for (let i = 0; i < 14; i++) { // cooling fins
      const a = i * Math.PI * 2 / 14;
      const fin = box(0.004, 0.018, 0.26, grey, xm + Math.cos(a) * (R + 0.007), my + Math.sin(a) * (R + 0.007), z0 + 0.17);
      fin.rotation.z = a;
      root.add(fin);
    }
    root.add(cyl(R + 0.008, 0.08, grey, xm, my, z0 + 0.35, 'z', 28)); // fan cover
    root.add(cyl(R - 0.01, 0.004, std('#1c1e21', { roughness: 0.7 }), xm, my, z0 + 0.392, 'z', 28)); // grille face
    root.add(span(xm - 0.05, xm + 0.05, my + R, my + R + 0.07, z0 + 0.1, z0 + 0.22, black)); // terminal box
  }

  // ---------- Infeed: edge coil table, feed box, touch screen on a swing arm ----------
  // The coil table stands out in front of the infeed, just past the screen, on a steel arm off the
  // machine's front face (user, 22 Oct 2026), clear of the screen and the operator's spot.
  const CR = 0.4, cx = X0 + 0.62, cz = ZG + 0.38;
  root.add(cyl(CR, 0.008, M.disc, cx, WORK_Y + 0.06, cz, 'y', 48));
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 40), M.orange);
  coil.rotation.x = Math.PI / 2;
  coil.scale.z = 0.7;
  coil.position.set(cx + 0.04, WORK_Y + 0.09, cz);
  root.add(coil);
  root.add(cyl(0.022, 0.06, M.steel, cx, WORK_Y + 0.03, cz, 'y', 12)); // coil table spindle
  root.add(span(cx - 0.025, cx + 0.025, WORK_Y - 0.03, WORK_Y + 0.02, ZG - 0.06, cz + 0.03, M.steel)); // steel arm out of the front
  root.add(span(cx - 0.08, cx + 0.08, WORK_Y - 0.08, WORK_Y + 0.04, ZG - 0.004, ZG + 0.012, M.steel)); // mounting plate on the front face
  const feedBox = new THREE.Group();
  feedBox.add(box(0.3, 0.13, 0.1, M.alu, 0, 0, 0));
  for (let i = 0; i < 3; i++) feedBox.add(button(M.knob, -0.09 + i * 0.09, 0, 0.06, 0.022));
  feedBox.position.set(X0 + (P1 - X0) * 0.62, WORK_Y + 0.11, ZG - 0.12);
  root.add(feedBox);
  root.add(tube([[X0 + 0.04, YT, ZG - 0.06], [X0 + 0.04, H + 0.1, ZG - 0.06], [X0 - 0.12, H + 0.1, ZG - 0.02], [X0 - 0.2, H + 0.03, ZG + 0.03]], 0.028, M.white, 16));
  const screen = new THREE.Group();
  screen.add(box(0.56, 0.38, 0.09, body, 0, 0, 0));
  screen.add(box(0.36, 0.26, 0.01, std('#2d3a46', { roughness: 0.3, emissive: '#3a4c5c', emissiveIntensity: 0.5 }), 0.03, 0, 0.046));
  const word = logo(0.2, '#e9e9e9');
  word.position.set(0.03, 0, 0.052);
  screen.add(word);
  [M.white, M.red, M.white, M.green].forEach((m, i) => screen.add(button(m, -0.22, 0.12 - i * 0.075, 0.05, 0.013)));
  const side = logo(0.3, '#e9e9e9');
  side.rotation.z = -Math.PI / 2;
  side.position.set(0.245, 0, 0.047);
  screen.add(side);
  screen.position.set(X0 - 0.2, H - 0.16, ZG + 0.05);
  root.add(screen);

  // ---------- A 800 × 450 × 18 mm board; its band appears once it has passed the (first) glue pot ----------
  const piece = new THREE.Group();
  const len = 0.8, th = 0.018;
  piece.add(box(len, th, 0.45, M.panel, 0, th / 2, -0.2));
  const edge = box(1, th + 0.004, 0.002, M.band, 0, th / 2, 0.026);
  piece.add(edge);
  piece.position.set(X0 - 0.8, WORK_Y, 0);
  root.add(piece);
  const glueX = stations.find(s => s.id === 'upperglue').x;

  let target = 0;
  return {
    object: root,
    workpiece: piece,
    pieceLabel: 'แผ่นงาน',
    open: { label: 'ฝาครอบ', set(v) { target = v ? -1.0 : 0; } },
    info: `ป้อนแผ่น ${cfg.feed} m/min (ช่วง 12–23) · ${stations.length} สถานี`,
    labels: stations.map((s, i) => ({ text: `${i + 1}. ${s.name}`, at: [s.x, H + 0.12 + (i % 2) * 0.1, 0.2] })),
    views: { a: [L * 0.2, 2.3, 5.2 + L * 0.3], b: [-L * 0.4, 2.3, -5.2], target: [0, 0.9, 0] },
    update(dt) {
      for (const { mesh, speed } of spin) mesh.rotation.y += speed * dt;
      hood.rotation.x += (target - hood.rotation.x) * Math.min(1, dt * 3);
      piece.position.x += FEED * dt;
      if (piece.position.x - len / 2 > X1 + 0.5) piece.position.x = X0 - 0.8;
      const covered = THREE.MathUtils.clamp(piece.position.x + len / 2 - glueX, 0, len);
      edge.visible = covered > 0.001;
      edge.scale.x = Math.max(covered, 0.001);
      edge.position.x = len / 2 - covered / 2;
    },
  };
}
