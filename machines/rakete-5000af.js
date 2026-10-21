import * as THREE from 'three';
import { M, box, cyl, decal, logo, tube, std } from './lib.js';
import { nestedSheet } from './rakete.js';

// Mastrox Rakete 5000AF: the fully automatic nesting line (10335 × 2260 × 2150 mm, 4300 kg).
// Built from the brochure, the website photos of the 3500A (same bed and cabinet family) and the
// frames of the "mastrox Rakete 5000AF / CNC Nesting" video (youtu.be/5J6XCsvHIec):
//   +x  scissor lift (X-lift) with the sheet stack at the infeed
//       box-gantry router; the spindle carriage rides the conveyor face of the gantry and its
//       operator end is enclosed by the amber-window housing, where the 12-tool disc magazine
//       waits: for a tool change the spindle simply drives into the housing. The vacuum-cup bar
//       on the lift face drags sheets in and sweeps the cut parts out
//   −x  aluminium belt conveyor at the outfeed, control cabinet standing behind it
// Auto Flip is not modelled. Origin on the floor at the center; the operator faces +z.
//
// Heights that have to agree (all y, meters):
//   spoil board top 0.945 · sheet on table 0.945–0.963 · stack top sheet 0.924–0.942
//   cup bar at rest 1.05, dropped onto the stack 0.942, dropped behind the parts 0.952
//   spindle nose 1.08 (+ Z lift) · tool flange in the disc 1.255 ± 0.025 · housing floor top 1.0

const LINE = 10.335, HALF = LINE / 2;
const BED_TOP = 0.86, TABLE_TOP = 0.945; // top of the spoil board
const TABLE = [2.8, 1.22];
const SHEET = [2.44, 1.17];
const W = 1.9; // bed width

const silver = std('#c6c9cc', { roughness: 0.5, metalness: 0.3 });
const dark = std('#2e3135', { roughness: 0.75 });
const charcoal = std('#3a3d42', { roughness: 0.8 });
const hoodMat = std('#9a9ea3', { roughness: 0.6, metalness: 0.2 });
const hose = std('#e9e4dc', { roughness: 0.6, metalness: 0 });
const belt = std('#3b4a5c', { roughness: 0.85, metalness: 0 });
const brush = std('#ece3cf', { roughness: 1, metalness: 0 });
const mdf = std('#b9a882', { roughness: 0.9, metalness: 0 });
// Lighter amber than the shared one so the tool disc inside the housing reads clearly.
const window_ = new THREE.MeshPhysicalMaterial({ color: '#ffb04a', roughness: 0.1, metalness: 0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });

// Spoil board with the grid of the vacuum table showing through.
function boardMaterial() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#b9a882';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(70,55,35,.35)';
  g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(7, 3);
  return std('#ffffff', { map: t, roughness: 0.9, metalness: 0 });
}

// ISO30 tool holder with a cutter, flange centered on the group origin.
function toolHolder() {
  const g = new THREE.Group();
  g.add(cyl(0.028, 0.05, M.chrome, 0, 0, 0, 'y', 12)); // flange
  g.add(cyl(0.016, 0.1, M.steel, 0, -0.075, 0, 'y', 8)); // taper / collet
  g.add(cyl(0.006, 0.07, M.chrome, 0, -0.16, 0, 'y', 6)); // cutter
  return g;
}

function bed(root, cx, L, tableX) {
  const x0 = cx - L / 2, x1 = cx + L / 2;
  root.add(box(L - 0.2, 0.12, W - 0.3, dark, cx, 0.06, 0)); // plinth
  for (const x of [x0 + 0.35, cx, x1 - 0.35]) for (const s of [-1, 1]) root.add(box(0.32, 0.05, 0.22, dark, x, 0.025, s * (W / 2 - 0.12))); // foot pads
  root.add(box(L, 0.66, W, silver, cx, 0.45, 0)); // body 0.12 – 0.78
  root.add(box(L + 0.02, 0.08, W + 0.02, dark, cx, 0.82, 0)); // top frame 0.78 – 0.86
  for (const s of [-1, 1]) {
    root.add(box(L, 0.04, 0.05, M.steel, cx, BED_TOP + 0.02, s * (W / 2 - 0.06))); // X linear rail, top 0.88
    root.add(box(L, 0.02, 0.03, M.chrome, cx, BED_TOP + 0.01, s * (W / 2 - 0.14))); // rack
  }
  root.add(box(L, 0.06, 0.14, M.frame, cx, BED_TOP + 0.03, -W / 2 - 0.1)); // X drag-chain tray along the back
  const front = logo(1.3, '#2e3135');
  front.position.set(cx - 0.5, 0.42, W / 2 + 0.002);
  root.add(front);
  const tag = decal('Rakete 5000AF', { w: 0.45, color: '#1d1f22', bg: '#f07a22' });
  tag.position.set(x1 - 0.45, 0.66, W / 2 + 0.003);
  root.add(tag);
  for (let i = 0; i < 6; i++) root.add(cyl(0.015, 0.05, M.frame, x1 - 1.25 + i * 0.12, 0.6, W / 2 + 0.025, 'z', 10)); // valve knobs
  // Vacuum table and spoil board.
  root.add(box(TABLE[0] + 0.12, 0.06, TABLE[1] + 0.12, dark, tableX, BED_TOP + 0.03, 0));
  root.add(box(TABLE[0], TABLE_TOP - BED_TOP - 0.06, TABLE[1], boardMaterial(), tableX, (TABLE_TOP + BED_TOP + 0.06) / 2, 0));
  // Pneumatic origin stoppers along the front and the outfeed end (clear of the sheet's footprint).
  for (let i = 0; i < 4; i++) root.add(cyl(0.02, 0.06, M.brass, tableX - 1.0 + i * 0.65, BED_TOP + 0.09, TABLE[1] / 2 + 0.03, 'y', 12));
  for (let i = 0; i < 3; i++) root.add(cyl(0.02, 0.06, M.brass, tableX - TABLE[0] / 2 - 0.03, BED_TOP + 0.09, -0.4 + i * 0.4, 'y', 12));
  // Red / blue air lines along the front rail.
  root.add(tube([[x0 + 0.3, BED_TOP - 0.05, W / 2 + 0.01], [cx, BED_TOP - 0.03, W / 2 + 0.03], [x1 - 0.3, BED_TOP - 0.05, W / 2 + 0.01]], 0.006, M.red, 10));
  root.add(tube([[x0 + 0.3, BED_TOP - 0.08, W / 2 + 0.01], [cx, BED_TOP - 0.06, W / 2 + 0.03], [x1 - 0.3, BED_TOP - 0.08, W / 2 + 0.01]], 0.006, M.knob, 10));
}

// The box gantry. Returns the parts that move.
const HEAD = -0.85, LOADER = 0.9; // spindle axis and cup bar, x from the gantry center
const DISC_Y = 1.255, DISC_Z = 0.95; // tool flange height in the magazine; disc center along the gantry
function gantry() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(box(0.4, 0.42, 0.16, silver, 0, 1.11, s * (W / 2 - 0.08))); // legs on the X rails, 0.9 – 1.32
  g.add(box(0.85, 0.55, 1.6, silver, 0, 1.575, -0.3)); // main box, y 1.3 – 1.85, z −1.1 – 0.5
  // Housing round the operator end of the spindle's travel: x −1.06 – −0.25, z 0.6 – 1.22, y 0.95 – 2.05.
  // Dark frame, amber on the front, outer side and roof; open toward −z where the carriage drives in.
  g.add(box(0.81, 0.05, 0.62, charcoal, -0.655, 0.975, 0.91)); // floor
  g.add(box(0.81, 0.05, 0.62, window_, -0.655, 2.025, 0.91)); // roof (the dust hose passes through it)
  for (const x of [-1.035, -0.275]) for (const z of [0.625, 1.195]) g.add(box(0.05, 1.1, 0.05, charcoal, x, 1.5, z)); // posts
  g.add(box(0.71, 1.0, 0.01, window_, -0.655, 1.5, 1.215)); // front window
  g.add(box(0.01, 1.0, 0.52, window_, -1.055, 1.5, 0.91)); // outer side window
  g.add(box(0.01, 1.0, 0.52, charcoal, -0.255, 1.5, 0.91)); // inner wall toward the gantry leg
  g.add(box(0.13, 1.0, 0.03, charcoal, -0.315, 1.5, 0.625)); // back wall stub; the rest is the carriage opening
  // Disc magazine inside, under the spindle's path: a small plate on its index motor with
  // 12 forks at the rim, each holding a tool. Slot 0 starts facing the carriage (−z).
  const disc = new THREE.Group();
  disc.add(cyl(0.13, 0.02, M.disc, 0, 0, 0, 'y', 36));
  disc.add(cyl(0.05, 0.06, dark, 0, 0.02, 0, 'y', 16)); // hub, top 1.305
  disc.add(cyl(0.06, 0.245, dark, 0, -0.1325, 0, 'y', 16)); // index motor down to the floor
  const slots = [];
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6, x = Math.cos(a), z = Math.sin(a);
    disc.add(box(0.14, 0.02, 0.05, M.white, x * 0.2, 0, z * 0.2).rotateY(-a)); // fork
    const tool = toolHolder();
    tool.position.set(x * 0.22, 0, z * 0.22);
    disc.add(tool);
    slots.push(tool);
  }
  disc.position.set(HEAD, DISC_Y, DISC_Z);
  disc.rotation.y = Math.PI / 2;
  g.add(disc);
  // Name on the lift side, logo on the conveyor side.
  const name = decal('Rakete 5000AF', { w: 0.6, color: '#2e3135' });
  name.rotation.y = Math.PI / 2;
  name.position.set(0.427, 1.58, -0.3);
  g.add(name);
  const badge = decal('mastrox', { w: 0.3, color: '#1d1f22', bg: '#f07a22' });
  badge.rotation.y = Math.PI / 2;
  badge.position.set(0.427, 1.76, -0.85);
  g.add(badge);
  const back = logo(0.6, '#2e3135');
  back.rotation.y = -Math.PI / 2;
  back.position.set(-0.427, 1.58, -0.3);
  g.add(back);
  // Y rails on the conveyor face run the full length, into the housing, so the spindle reaches the disc.
  g.add(box(0.04, 0.18, 2.2, silver, -0.41, 1.26, 0)); // rail mount under the box edge
  for (const y of [1.2, 1.75]) g.add(box(0.03, 0.04, 2.2, M.steel, -0.44, y, 0));
  // Spindle carriage, entirely outside the box (x < −0.44).
  const carriage = new THREE.Group();
  carriage.add(box(0.12, 0.72, 0.45, silver, -0.5, 1.57, 0)); // plate on the rails
  carriage.add(box(0.16, 0.83, 0.28, dark, -0.56, 1.435, 0)); // Z slide, 1.02 – 1.85
  carriage.add(cyl(0.05, 0.12, M.motor, -0.56, 1.91, 0, 'y', 16)); // Z servo
  const head = new THREE.Group(); // rides up and down the Z slide
  head.add(box(0.1, 0.3, 0.26, silver, -0.69, 1.28, 0)); // saddle on the slide face
  head.add(box(0.12, 0.3, 0.2, silver, -0.78, 1.3, 0)); // spindle bracket
  head.add(cyl(0.085, 0.4, silver, HEAD, 1.28, 0, 'y', 24)); // spindle, nose at 1.08
  const hold = toolHolder(); // the tool in the spindle
  hold.position.set(HEAD, 1.055, 0);
  hold.visible = false;
  head.add(hold);
  const hoodG = new THREE.Group(); // dust hood lifts clear for a tool change
  hoodG.add(box(0.3, 0.12, 0.28, hoodMat, HEAD, 1.05, 0));
  hoodG.add(cyl(0.13, 0.03, brush, HEAD, 0.975, 0, 'y', 24));
  hoodG.add(tube([[HEAD, 1.11, 0.12], [HEAD - 0.1, 1.5, 0.18], [HEAD - 0.2, 1.85, 0.1], [-0.2, 1.88, -0.3], [0.1, 1.8, -0.9]], 0.06, hose, 30));
  head.add(hoodG);
  carriage.add(head);
  carriage.add(box(0.16, 0.22, 0.16, M.white, -0.56, 1.2, 0.33)); // label printer, clears the housing floor
  carriage.add(cyl(0.02, 0.08, dark, -0.56, 1.06, 0.33, 'y', 10));
  g.add(carriage);
  // Vacuum-cup bar on the lift face: drags sheets in, sweeps parts out. Cups rest 1.05 above the floor.
  g.add(box(0.6, 0.05, 0.12, M.steel, 0.65, 1.275, 0));
  const loader = new THREE.Group();
  loader.add(box(0.08, 0.08, 1.1, dark, 0, 1.2, 0));
  for (const z of [-0.4, 0.4]) {
    loader.add(cyl(0.015, 0.085, M.chrome, 0, 1.1175, z, 'y', 10));
    loader.add(cyl(0.07, 0.025, M.rubber, 0, 1.0625, z, 'y', 20));
  }
  loader.add(tube([[0, 1.24, 0], [0.1, 1.7, 0], [0, 2.05, -0.2], [-0.3, 2.1, -0.6]], 0.05, hose, 24));
  loader.position.x = LOADER;
  g.add(loader);
  // Drag chains over the top and down the back leg into the tray.
  g.add(tube([[-0.44, 1.9, 0], [-0.3, 2.0, 0], [0, 2.02, -0.5], [0.2, 1.95, -1.05]], 0.045, M.frame, 20));
  g.add(tube([[0.1, 1.3, -1.0], [0.3, 1.15, -1.08], [0.6, 0.92, -1.05]], 0.04, M.frame, 12));
  return { group: g, carriage, head, hold, hoodG, loader, disc, slots };
}

function scissorLift(root, x0, x1, stackX) {
  const cx = (x0 + x1) / 2, len = x1 - x0;
  root.add(box(len, 0.1, 1.2, dark, cx, 0.05, 0));
  root.add(box(len, 0.08, 1.3, dark, cx, 0.83, 0)); // platform, top 0.87
  for (let i = 0; i < Math.floor(len / 0.12); i++) root.add(box(0.06, 0.07, 0.006, i % 2 ? M.frame : M.yellow, x0 + 0.06 + i * 0.12, 0.83, 0.653));
  for (const z of [-0.45, 0.45]) for (const s of [-1, 1]) {
    const arm = box(len * 0.75, 0.07, 0.05, M.frame, cx, 0.45, z);
    arm.rotation.z = s * Math.atan2(0.62, len * 0.72);
    root.add(arm);
  }
  root.add(cyl(0.05, 0.68, M.chrome, cx + 0.3, 0.45, 0, 'y', 14));
  for (let i = 0; i < 3; i++) root.add(box(SHEET[0], 0.018, SHEET[1], mdf, stackX, 0.879 + i * 0.018, 0)); // sheets waiting, top 0.924
  // Level sensor on its post beside the lift.
  root.add(cyl(0.025, 1.5, M.white, x1 - 0.3, 0.75, -0.75, 'y', 12));
  root.add(box(0.06, 0.08, 0.06, M.orange, x1 - 0.3, 1.52, -0.75));
}

function beltConveyor(root, x0, x1) {
  const cx = (x0 + x1) / 2, len = x1 - x0, hw = 0.6;
  root.add(box(len, 0.03, hw * 2, belt, cx, BED_TOP + 0.04, 0));
  for (const z of [-hw - 0.03, hw + 0.03]) root.add(box(len, 0.1, 0.06, M.alu, cx, BED_TOP, z));
  const bays = 4;
  for (let i = 0; i <= bays; i++) {
    const x = x0 + 0.1 + (len - 0.2) * i / bays;
    for (const z of [-hw, hw]) {
      root.add(box(0.045, BED_TOP - 0.05, 0.045, M.alu, x, (BED_TOP - 0.05) / 2, z));
      root.add(cyl(0.025, 0.012, M.steel, x, 0.006, z, 'y', 12)); // leveling foot
    }
    root.add(box(0.045, 0.045, hw * 2, M.alu, x, 0.35, 0));
  }
  for (const z of [-hw, hw]) root.add(box(len, 0.045, 0.045, M.alu, cx, 0.35, z));
  // Drive end: roller, gear motor, electrical box under the belt.
  root.add(cyl(0.06, hw * 2 + 0.1, M.steel, x0, BED_TOP, 0, 'z', 18));
  root.add(cyl(0.09, 0.26, M.motor, x0 + 0.05, BED_TOP - 0.2, hw + 0.2, 'z', 18));
  root.add(box(0.16, 0.16, 0.14, M.alu, x0 + 0.05, BED_TOP - 0.2, hw + 0.05));
  root.add(box(0.6, 0.35, 0.5, dark, x0 + 0.7, BED_TOP - 0.35, 0));
  const chute = box(0.4, 0.03, hw * 2 + 0.1, dark, x0 + 0.08, BED_TOP - 0.25, 0); // drop chute off the end
  chute.rotation.z = 1.0;
  root.add(chute);
  // Diagonal braces between the legs.
  for (let i = 0; i < bays; i++) {
    const xa = x0 + 0.1 + (len - 0.2) * i / bays, xb = x0 + 0.1 + (len - 0.2) * (i + 1) / bays;
    const b = box(Math.hypot(xb - xa, 0.4), 0.035, 0.035, M.alu, (xa + xb) / 2, 0.55, -hw);
    b.rotation.z = Math.atan2(0.4, xb - xa) * (i % 2 ? 1 : -1);
    root.add(b);
  }
}

function controlCabinet(x, z) {
  const g = new THREE.Group();
  g.add(box(0.67, 0.08, 0.52, dark, 0, 0.04, 0));
  g.add(box(0.65, 1.75, 0.5, charcoal, 0, 0.955, 0)); // 0.08 – 1.83
  g.add(box(0.1, 1.6, 0.008, silver, 0.2, 0.98, 0.254)); // silver trim strip
  g.add(box(0.004, 1.55, 0.01, dark, -0.05, 0.98, 0.255)); // door seam
  const v = logo(1.0, '#d5d7da');
  v.rotation.z = -Math.PI / 2;
  v.position.set(-0.12, 0.98, 0.255);
  g.add(v);
  // Screen and keyboard shelf face the conveyor; buttons below.
  g.add(box(0.008, 0.26, 0.34, M.screen, -0.329, 1.45, 0));
  g.add(box(0.14, 0.02, 0.36, dark, -0.4, 1.26, 0));
  for (const [i, m] of [M.green, M.red, M.yellow].entries()) g.add(cyl(0.012, 0.02, m, -0.33, 1.1, -0.12 + i * 0.12, 'x', 12));
  g.add(cyl(0.035, 0.2, M.red, 0.2, 1.93, 0, 'y', 12)); // signal tower
  g.add(cyl(0.035, 0.06, M.yellow, 0.2, 2.06, 0, 'y', 12));
  g.add(cyl(0.035, 0.06, M.green, 0.2, 2.12, 0, 'y', 12));
  g.position.set(x, 0, z);
  return g;
}

export function createRakete5000AF() {
  const root = new THREE.Group();
  root.name = 'Rakete 5000AF';

  const bedCx = 0.875, bedL = 3.95;
  const bedX0 = bedCx - bedL / 2, bedX1 = bedCx + bedL / 2; // −1.1 … 2.85
  const tableX = 0.5; // toward the outfeed, so the spindle reaches the far end of the sheet
  const liftX = [bedX1 - 0.05, HALF];
  const outX = [-HALF + 0.07, bedX0 - 0.2];
  const cabX = -1.6, cabZ = -0.87;
  const stackX = HALF - SHEET[0] / 2 - 0.05;

  bed(root, bedCx, bedL, tableX);
  const g = gantry();
  root.add(g.group);
  scissorLift(root, liftX[0], liftX[1], stackX);
  beltConveyor(root, outX[0], outX[1]);
  root.add(controlCabinet(cabX, cabZ));

  // Standard 2440 × 1220 sheets (the stack on the lift matches).
  const nest = nestedSheet(SHEET[0], SHEET[1]);
  const sheet = nest.group;
  const half = SHEET[0] / 2;
  const liftSheetY = 0.924 + 0.009, tableSheetY = TABLE_TOP + 0.009;
  sheet.position.set(stackX, liftSheetY, 0);
  root.add(sheet);

  // Gantry travel (legs stay on the rails); it waits at the lift end.
  const PARK = bedX1 - 0.15, GMIN = bedX0 + 0.2;
  const UP = 0.25, CLEAR = 0.4, PICK = DISC_Y + 0.025 - 1.08; // Z lift: between parts; over the disc; nose on a flange
  const DROP_STACK = 1.05 - 0.942, DROP_PUSH = 1.05 - 0.952; // cup bar drops
  const cycle = [['load', 5], ['label', 2], ['tool', 4.5], ['cut', 14], ['out', 4.5], ['belt', 2], ['reset', 0.8]];
  const total = cycle.reduce((a, [, t]) => a + t, 0);
  let t = 0, phase = 'load', liftUntil = 0, lastPart = -1;
  let contactG = null, beltFrom = null; // gantry x when the cups took the sheet; sheet x when the belt took over
  let holding = -1, facing = 0, discTurn = Math.PI / 2, step = {}; // tool in the spindle; slot facing the spindle
  let gantryTo = PARK, carriageTo = 0, headTo = UP, hoodTo = 0, loaderYTo = 0;
  g.group.position.x = PARK;
  g.head.position.y = headTo;
  const smooth = k => k * k * (3 - 2 * k);
  const seg = (k, a, b) => THREE.MathUtils.clamp((k - a) / (b - a), 0, 1);
  const lerp = THREE.MathUtils.lerp;
  const ease = (o, key, to, rate, dt) => { o[key] += (to - o[key]) * Math.min(1, dt * rate); };

  return {
    object: root,
    workpiece: sheet,
    pieceLabel: 'แผ่นไม้',
    info: () => `โต๊ะ ${TABLE[0] * 1000} × ${TABLE[1] * 1000} · ทูล 12 ตัว (จาน) · ${{
      load: 'ดูดแผ่นจากโต๊ะยกเข้าโต๊ะ', label: 'ติดฉลากชิ้นงาน', tool: `เปลี่ยนทูล → ช่อง ${facing + 1}`, cut: `กำลังกัดชิ้นที่ ${nest.current + 1}/${nest.count}`,
      out: `กวาดชิ้นงาน ${nest.count} ชิ้นลงสายพาน`, belt: 'สายพานพาชิ้นงานออก', reset: 'รอแผ่นถัดไป',
    }[phase]}`,
    labels: [
      { text: 'โต๊ะยก (X-lift)', at: [(liftX[0] + liftX[1]) / 2, 1.3, 0] },
      { text: 'Rakete 5000AF', at: [bedCx, 2.5, 0] },
      { text: 'สายพานขาออก', at: [(outX[0] + outX[1]) / 2, 1.3, 0] },
      { text: 'ตู้คอนโทรล', at: [cabX, 2.45, cabZ] },
    ],
    views: { a: [3.5, 4.0, 8.5], b: [-4.0, 3.8, -8.0], target: [0, 0.9, 0] },
    update(dt) {
      t = (t + dt) % total;
      let acc = 0, k = 0;
      for (const [name, dur] of cycle) {
        if (t < acc + dur) { phase = name; k = (t - acc) / dur; break; }
        acc += dur;
      }
      headTo = UP; hoodTo = 0; carriageTo = 0; loaderYTo = 0;
      const G = g.group.position, L = g.loader.position;
      if (phase === 'load') {
        // At the lift end the cups drop onto the top sheet, lift it just clear of the stack, and the
        // whole gantry drags it onto the table.
        if (k < 0.05) { nest.reset(); sheet.position.set(stackX, liftSheetY, 0); lastPart = -1; contactG = beltFrom = null; step = {}; }
        const down = smooth(seg(k, 0.05, 0.2)) - smooth(seg(k, 0.88, 1)), pull = smooth(seg(k, 0.25, 0.85));
        gantryTo = lerp(PARK, PARK - (stackX - tableX), pull);
        if (k >= 0.2 && k < 0.88) {
          if (contactG === null) contactG = G.x;
          sheet.position.x = stackX + (G.x - contactG);
          sheet.position.y = lerp(liftSheetY, tableSheetY, smooth(seg(k, 0.22, 0.32)));
          loaderYTo = -DROP_STACK + (sheet.position.y - liftSheetY);
        } else loaderYTo = -DROP_STACK * down;
      }
      if (phase === 'label') {
        // The label head makes a quick pass over the parts before cutting.
        gantryTo = tableX + 0.56 + (k - 0.5) * 1.6;
        carriageTo = Math.sin(k * Math.PI * 3) * 0.45;
      }
      if (phase === 'tool') {
        // Tool change: hood up, spindle drives into the housing over the slot facing it; put the old
        // tool back in its slot, index the disc one slot, pick the next tool, drive back out.
        carriageTo = DISC_Z - 0.22;
        hoodTo = 0.15;
        gantryTo = tableX + 0.5;
        headTo = k < 0.2 ? CLEAR : k < 0.3 ? PICK : k < 0.6 ? CLEAR : k < 0.72 ? PICK : k < 0.9 ? CLEAR : UP;
        if (k >= 0.28 && !step.released) { step.released = true; if (holding >= 0) { g.slots[holding].visible = true; g.hold.visible = false; holding = -1; } }
        if (k >= 0.45 && !step.indexed) { step.indexed = true; facing = (facing + 1) % 12; discTurn += Math.PI / 6; }
        if (k >= 0.7 && !step.grabbed) { step.grabbed = true; holding = facing; g.slots[facing].visible = false; g.hold.visible = true; }
      }
      if (phase === 'cut') {
        // Follow the toolpath: the gantry carries the cutter round each part's outline in turn,
        // lifting the spindle clear when it jumps to the next part.
        const p = nest.cut(k);
        gantryTo = tableX + p.x - HEAD;
        carriageTo = p.z;
        if (nest.current !== lastPart) { lastPart = nest.current; liftUntil = t + 0.45; }
        headTo = t < liftUntil || k < 0.06 ? UP : 0;
      }
      if (phase === 'out') {
        // Back to the lift end, drop the cup bar behind the parts, then sweep them onto the conveyor;
        // the running belt takes over once the leading parts are on it.
        nest.cut(1);
        const down = smooth(seg(k, 0.15, 0.3)), push = smooth(seg(k, 0.3, 1));
        gantryTo = lerp(PARK, GMIN, push);
        loaderYTo = -DROP_PUSH * down;
        if (k >= 0.3) sheet.position.x = tableX + Math.min(0, G.x + LOADER - (tableX + half));
        step = {};
      }
      if (phase === 'belt') {
        // The belt carries the parts on from wherever the push left them, up to the stop sensor at the end.
        nest.cut(1);
        if (beltFrom === null) beltFrom = sheet.position.x;
        sheet.position.x = lerp(beltFrom, outX[0] + half + 0.1, smooth(k));
        gantryTo = PARK;
      }
      if (phase === 'reset') { nest.reset(); sheet.position.set(stackX, liftSheetY, 0); gantryTo = PARK; }
      // Ease toward the targets so moves between parts and back to park don't jump.
      ease(G, 'x', gantryTo, phase === 'cut' ? 10 : 3, dt);
      ease(g.carriage.position, 'z', carriageTo, phase === 'cut' ? 10 : 4, dt);
      ease(g.head.position, 'y', headTo, 6, dt);
      ease(g.hoodG.position, 'y', hoodTo, 6, dt);
      ease(L, 'y', loaderYTo, 6, dt);
      ease(g.disc.rotation, 'y', discTurn, 5, dt);
      g.hold.rotation.y += (phase === 'cut' ? 80 : 0) * dt;
    },
  };
}
