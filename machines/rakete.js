import * as THREE from 'three';
import { M, box, cyl, decal, logo, tube, button, std } from './lib.js';

// Mastrox Rakete CNC nesting routers.
// 3500A is a stand-alone router with a separate control cabinet (3350 × 1960 × 2210 mm).
// 3500Ant / 4800Ant / 5000AF are 10 m lines (10335 × 2260 × 2150 mm): scissor lift table at the
// infeed (+x), the router in the middle, an aluminium belt conveyor at the outfeed (−x).
// Sizes, table sizes and tool counts come from the brochures. The gantry internals, the lift and
// conveyor details, and the back of every machine are guesses drawn from the brochure photos.
// Origin on the floor at the center; the operator faces +z.

export const RAKETES = {
  'rakete-3500a': { name: 'Rakete 3500A', line: false, table: [2.45, 1.22], boxGantry: false, heads: 1, magazine: 'linear' },
  'rakete-3500ant': { name: 'Rakete 3500Ant', line: true, table: [2.5, 1.22], boxGantry: false, heads: 1, magazine: 'linear' },
  'rakete-4800ant': { name: 'Rakete 4800Ant', line: true, table: [2.8, 1.22], boxGantry: true, heads: 1, magazine: 'disc' },
  'rakete-5000af': { name: 'Rakete 5000AF', line: true, table: [2.8, 1.22], boxGantry: true, heads: 2, magazine: 'disc', label: true },
};

const BED_TOP = 0.86;
const silver = std('#c3c7cb', { roughness: 0.5, metalness: 0.35 });
const dark = std('#2e3135', { roughness: 0.75 });
const mdf = std('#b9a882', { roughness: 0.9, metalness: 0 });

function spindleHead(withWindow) {
  const g = new THREE.Group();
  g.add(box(0.34, 0.42, 0.3, silver, 0, 0, 0));
  if (withWindow) g.add(box(0.22, 0.26, 0.01, M.amber, 0, 0.02, 0.152));
  g.add(cyl(0.08, 0.3, M.motor, 0, -0.32, 0.0));
  const brush = cyl(0.13, 0.1, std('#e9dcc0', { roughness: 1, metalness: 0 }), 0, -0.48, 0, 'y', 28);
  g.add(brush);
  const bit = cyl(0.008, 0.08, M.chrome, 0, -0.56, 0, 'y', 8);
  g.add(bit);
  return { group: g, bit };
}

// The router: bed, vacuum table, gantry riding along x, magazine. Returns the moving parts.
function router(root, cfg, cx) {
  const [tl, tw] = cfg.table;
  const bedL = tl + 0.55, bedW = 1.85;
  const X0 = cx - bedL / 2, X1 = cx + bedL / 2;
  root.add(box(bedL, BED_TOP - 0.1, bedW, silver, cx, (BED_TOP - 0.1) / 2 + 0.1, 0));
  root.add(box(bedL + 0.04, 0.1, bedW - 0.1, dark, cx, 0.05, 0));
  root.add(box(bedL, 0.05, 0.06, M.steel, cx, BED_TOP + 0.02, bedW / 2 - 0.05)); // X rail front
  root.add(box(bedL, 0.05, 0.06, M.steel, cx, BED_TOP + 0.02, -bedW / 2 + 0.05)); // X rail back
  root.add(box(bedL, 0.04, 0.02, dark, cx, BED_TOP - 0.06, bedW / 2 + 0.002));
  const front = logo(1.2, '#2e3135');
  front.position.set(cx - 0.2, 0.45, bedW / 2 + 0.002);
  root.add(front);
  const tag = decal(cfg.name.replace('Rakete ', ''), { w: 0.32, color: '#1d1f22', bg: '#f07a22' });
  tag.position.set(X1 - 0.3, 0.72, bedW / 2 + 0.003);
  root.add(tag);
  // Pneumatic valves in a row along the front, as on the photos.
  for (let i = 0; i < 6; i++) root.add(cyl(0.015, 0.06, M.frame, X1 - 0.9 + i * 0.12, 0.62, bedW / 2 + 0.03, 'z', 10));
  // Vacuum table with a spoil board.
  root.add(box(tl + 0.1, 0.05, tw + 0.1, dark, cx, BED_TOP + 0.025, 0));
  root.add(box(tl, 0.02, tw, mdf, cx, BED_TOP + 0.06, 0));

  // Gantry: side plates riding the X rails and a beam across z with the Z carriage.
  const gantry = new THREE.Group();
  const beamY = BED_TOP + 0.85;
  for (const s of [-1, 1]) gantry.add(box(0.36, beamY - BED_TOP + 0.1, 0.14, cfg.boxGantry ? silver : dark, 0, (beamY + BED_TOP) / 2 - 0.05, s * (bedW / 2 - 0.05)));
  if (cfg.boxGantry) {
    gantry.add(box(0.7, 0.55, bedW + 0.05, silver, -0.1, beamY + 0.1, 0));
    gantry.add(box(0.012, 0.32, 0.75, M.amber, 0.25, beamY - 0.02, 0.35));
    const name = decal(cfg.name, { w: 0.45, color: '#2e3135' });
    name.rotation.y = Math.PI / 2;
    name.position.set(0.252, beamY + 0.25, -0.35);
    gantry.add(name);
    const badge = decal('mastrox', { w: 0.3, color: '#1d1f22', bg: '#f07a22' });
    badge.rotation.y = Math.PI / 2;
    badge.position.set(0.252, beamY + 0.32, -0.7);
    gantry.add(badge);
  } else {
    gantry.add(box(0.22, 0.32, bedW + 0.05, dark, 0, beamY + 0.05, 0));
    gantry.add(box(0.02, 0.04, bedW, M.steel, 0.12, beamY + 0.12, 0)); // Y rail
    gantry.add(box(0.02, 0.04, bedW, M.steel, 0.12, beamY - 0.06, 0));
  }
  const carriage = new THREE.Group();
  const heads = [];
  for (let i = 0; i < cfg.heads; i++) {
    const h = spindleHead(!cfg.boxGantry);
    h.group.position.set(0.32, beamY - 0.15, (i - (cfg.heads - 1) / 2) * 0.38);
    carriage.add(h.group);
    heads.push(h);
    // Dust hose from the brush up over the gantry.
    carriage.add(tube([[0.32, beamY - 0.5, (i - (cfg.heads - 1) / 2) * 0.38 + 0.12], [0.45, beamY + 0.15, 0.1], [0.2, beamY + 0.4, 0], [-0.1, beamY + 0.45, -0.2]], 0.07, std('#e9e4dc', { roughness: 0.6, metalness: 0 }), 30));
  }
  if (cfg.label) {
    carriage.add(box(0.2, 0.25, 0.2, M.white, 0.32, beamY - 0.1, -0.5)); // label printer
    carriage.add(cyl(0.04, 0.12, M.frame, 0.32, beamY - 0.3, -0.5, 'y', 16));
  }
  gantry.add(carriage);
  // Drag chain on top of the gantry.
  gantry.add(box(0.08, 0.2, 0.12, M.frame, -0.1, beamY + 0.3, 0.0));
  gantry.add(tube([[-0.1, beamY + 0.4, 0], [-0.4, beamY + 0.45, 0], [-0.8, beamY + 0.4, 0], [-1.0, beamY + 0.3, -bedW / 2 + 0.1]], 0.05, M.frame, 20));
  gantry.position.x = X1 - 0.35; // parked at the infeed end
  root.add(gantry);

  // Tool magazine: a row of 12 holders along the front edge, or a 12-slot disc on the gantry side.
  if (cfg.magazine === 'linear') {
    // Sits inboard of the gantry's side plates (which run over it) on a mounting rail.
    const mz = bedW / 2 - 0.2;
    root.add(box(12 * 0.09 + 0.04, 0.02, 0.08, dark, X0 + 0.25 + 5.5 * 0.09, BED_TOP + 0.01, mz));
    for (let i = 0; i < 12; i++) {
      root.add(cyl(0.03, 0.08, M.white, X0 + 0.25 + i * 0.09, BED_TOP + 0.06, mz, 'y', 12));
      root.add(cyl(0.012, 0.08, M.chrome, X0 + 0.25 + i * 0.09, BED_TOP + 0.14, mz, 'y', 8));
    }
  } else {
    const disc = new THREE.Group();
    disc.add(cyl(0.28, 0.04, dark, 0, 0, 0, 'y', 36));
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      disc.add(cyl(0.02, 0.1, M.chrome, Math.cos(a) * 0.22, -0.06, Math.sin(a) * 0.22, 'y', 8));
    }
    disc.position.set(0.0, beamY - 0.35, -bedW / 2 + 0.3);
    gantry.add(disc);
  }
  return { gantry, carriage, heads, X0, X1, tl, bedW };
}

// A sheet laid out with cabinet parts in rows (sides, shelves, rails), the way nesting software
// packs them. `cut(p)` grooves each part's outline in order as p runs 0 → 1, returns where the
// cutter is (sheet-local x, z), and at p = 1 swaps the sheet for the separated parts.
const KERF = 0.008, MARGIN = 0.012;
const ROW_HEIGHTS = [0.56, 0.36, 0.18];
const PART_LENGTHS = [0.72, 0.6, 0.45, 0.72, 0.38, 0.3];
const groove = std('#4a3a28', { roughness: 0.95, metalness: 0 });

function nestedSheet(len, wid) {
  const group = new THREE.Group();
  const th = 0.018;
  const board = box(len, th, wid, M.panel, 0, 0, 0);
  group.add(board);

  // Lay out the parts row by row, left to right, until the sheet is full.
  const parts = [];
  let z = -wid / 2 + MARGIN, i = 0;
  for (const h of ROW_HEIGHTS) {
    if (z + h > wid / 2 - MARGIN) break;
    let x = -len / 2 + MARGIN;
    for (;;) {
      const w = PART_LENGTHS[i++ % PART_LENGTHS.length];
      if (x + w > len / 2 - MARGIN) break;
      parts.push({ x0: x, z0: z, x1: x + w, z1: z + h });
      x += w + KERF;
    }
    z += h + KERF;
  }

  // Each part gets four groove strips (revealed as the cutter passes) and a loose piece for after.
  const grooves = new THREE.Group();
  const loose = new THREE.Group();
  loose.visible = false;
  const paths = parts.map(p => {
    const corners = [[p.x0, p.z0], [p.x1, p.z0], [p.x1, p.z1], [p.x0, p.z1], [p.x0, p.z0]];
    const edges = [];
    for (let e = 0; e < 4; e++) {
      const [ax, az] = corners[e], [bx, bz] = corners[e + 1];
      const elen = Math.hypot(bx - ax, bz - az);
      const geo = new THREE.BoxGeometry(1, th + 0.001, KERF);
      geo.translate(0.5, 0, 0); // grows from its start corner
      const strip = new THREE.Mesh(geo, groove);
      strip.position.set(ax, 0, az);
      strip.rotation.y = -Math.atan2(bz - az, bx - ax);
      strip.scale.x = 0.0001;
      grooves.add(strip);
      edges.push({ ax, az, bx, bz, len: elen, strip });
    }
    loose.add(box(p.x1 - p.x0 - KERF, th, p.z1 - p.z0 - KERF, M.panel, (p.x0 + p.x1) / 2, 0, (p.z0 + p.z1) / 2));
    return edges;
  });
  group.add(grooves, loose);
  const perimeter = paths.flat().reduce((a, e) => a + e.len, 0);

  const api = {
    group,
    count: parts.length,
    current: 0,
    reset() {
      board.visible = grooves.visible = true;
      loose.visible = false;
      for (const e of paths.flat()) e.strip.scale.x = 0.0001;
      api.current = 0;
      return api;
    },
    cut(p) {
      let left = THREE.MathUtils.clamp(p, 0, 1) * perimeter;
      let tool = { x: parts[0].x0, z: parts[0].z0 };
      paths.forEach((edges, pi) => {
        for (const e of edges) {
          const f = THREE.MathUtils.clamp(left / e.len, 0, 1);
          e.strip.scale.x = Math.max(f * e.len, 0.0001);
          if (left > 0) {
            tool = { x: e.ax + (e.bx - e.ax) * f, z: e.az + (e.bz - e.az) * f };
            api.current = pi;
          }
          left -= e.len;
        }
      });
      const done = p >= 1;
      board.visible = grooves.visible = !done;
      loose.visible = done;
      return tool;
    },
  };
  return api;
}

function controlCabinet(x, z, rotY) {
  const g = new THREE.Group();
  g.add(box(0.6, 1.85, 0.55, silver, 0, 0.925 + 0.08, 0));
  g.add(box(0.62, 0.08, 0.57, dark, 0, 0.04, 0));
  g.add(box(0.3, 0.22, 0.01, M.screen, 0, 1.45, 0.28));
  g.add(box(0.3, 0.03, 0.12, dark, 0, 1.28, 0.33)); // keyboard shelf
  const v = decal('mastrox', { w: 1.2, color: '#2e3135' });
  v.rotation.z = -Math.PI / 2;
  v.position.set(0.12, 0.9, 0.278);
  g.add(v);
  g.add(cyl(0.035, 0.22, M.red, -0.2, 2.04, 0, 'y', 12)); // signal tower
  g.add(cyl(0.035, 0.07, M.yellow, -0.2, 2.18, 0, 'y', 12));
  g.add(cyl(0.035, 0.07, M.green, -0.2, 2.25, 0, 'y', 12));
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

function scissorLift(root, x0, x1) {
  const cx = (x0 + x1) / 2, len = x1 - x0;
  root.add(box(len, 0.1, 1.1, dark, cx, 0.05, 0));
  const top = box(len, 0.08, 1.25, dark, cx, BED_TOP - 0.04, 0);
  root.add(top);
  // Yellow / black hazard edge along the platform.
  for (let i = 0; i < Math.floor(len / 0.12); i++) root.add(box(0.06, 0.07, 0.006, i % 2 ? M.frame : M.yellow, x0 + 0.06 + i * 0.12, BED_TOP - 0.04, 0.63));
  // Crossed scissor arms on both sides.
  for (const z of [-0.45, 0.45]) {
    for (const s of [-1, 1]) {
      const arm = box(len * 0.75, 0.07, 0.05, M.frame, cx, (BED_TOP - 0.08 + 0.1) / 2, z);
      arm.rotation.z = s * Math.atan2(BED_TOP - 0.2, len * 0.7);
      root.add(arm);
    }
  }
  root.add(cyl(0.05, BED_TOP - 0.18, M.chrome, cx + 0.3, (0.1 + BED_TOP - 0.08) / 2, 0, 'y', 14)); // lift cylinder, base to platform
}

function beltConveyor(root, x0, x1) {
  const cx = (x0 + x1) / 2, len = x1 - x0;
  const belt = std('#3b4a5c', { roughness: 0.85, metalness: 0 });
  root.add(box(len, 0.03, 1.3, belt, cx, BED_TOP + 0.04, 0));
  for (const z of [-0.68, 0.68]) root.add(box(len, 0.1, 0.06, M.alu, cx, BED_TOP, z));
  const legs = Math.max(2, Math.round(len / 0.8));
  for (let i = 0; i <= legs; i++) {
    const x = x0 + 0.1 + (len - 0.2) * i / legs;
    for (const z of [-0.65, 0.65]) root.add(box(0.05, BED_TOP - 0.05, 0.05, M.alu, x, (BED_TOP - 0.05) / 2, z));
    root.add(box(0.04, 0.04, 1.3, M.alu, x, 0.35, 0));
    for (const z of [-0.65, 0.65]) root.add(cyl(0.02, 0.02, M.steel, x, 0.01, z, 'y', 10));
  }
  root.add(box(len, 0.04, 0.04, M.alu, cx, 0.35, 0.65));
  root.add(box(len, 0.04, 0.04, M.alu, cx, 0.35, -0.65));
  // Drive end: roller, gear motor and the sloped chip hopper.
  root.add(cyl(0.06, 1.3, M.steel, x0, BED_TOP + 0.0, 0, 'z', 18));
  root.add(cyl(0.09, 0.22, M.motor, x0 + 0.05, BED_TOP - 0.18, 0.78, 'z', 18));
  root.add(box(0.18, 0.18, 0.16, M.gearGreen, x0 + 0.05, BED_TOP - 0.18, 0.65));
  const hopper = box(0.45, 0.06, 1.4, silver, x0 - 0.2, BED_TOP - 0.15, 0);
  hopper.rotation.z = 0.55;
  root.add(hopper);
}

export function createRakete(id) {
  const cfg = RAKETES[id];
  const root = new THREE.Group();
  root.name = cfg.name;

  let r, cab, liftX, outX, lineL;
  if (!cfg.line) {
    // Stand-alone: router on the right, cabinet on its own at the left end.
    r = router(root, cfg, 0.27);
    root.add(controlCabinet(-1.37, -0.3, Math.PI / 2));
  } else {
    lineL = 10.335;
    const X0 = -lineL / 2, X1 = lineL / 2;
    liftX = [X1 - 2.6, X1];
    outX = [X0 + 0.25, X0 + 3.5];
    r = router(root, cfg, (liftX[0] + outX[1]) / 2);
    scissorLift(root, liftX[0] + 0.05, liftX[1]);
    beltConveyor(root, outX[0], outX[1]);
    root.add(controlCabinet(outX[1] - 0.6, -1.0, 0));
  }

  // Panel: a sheet that comes off the lift, is cut into cabinet parts, and leaves on the conveyor.
  const [tl, tw] = cfg.table;
  const nest = nestedSheet(tl - 0.1, tw - 0.05);
  const sheet = nest.group;
  sheet.position.y = BED_TOP + 0.08;
  root.add(sheet);
  const tableX = (r.X0 + r.X1) / 2;
  const cycle = cfg.line ? [['feed', 4], ['cut', 16], ['out', 4], ['reset', 0.5]] : [['cut', 16], ['done', 3]];
  const total = cycle.reduce((a, [, t]) => a + t, 0);
  let t = 0, phase = cycle[0][0];
  sheet.position.x = tableX;
  const headZ = -(cfg.heads - 1) / 2 * 0.38; // the first head does the cutting
  const headX = 0.32;
  let gantryTo = r.X1 - 0.35, carriageTo = 0;

  return {
    object: root,
    workpiece: sheet,
    pieceLabel: 'แผ่นไม้',
    info: () => `โต๊ะ ${tl * 1000} × ${tw * 1000} · ทูล 12 ตัว · ${{ feed: 'ดึงแผ่นจากโต๊ะยก', cut: `กำลังกัดชิ้นที่ ${nest.current + 1}/${nest.count}`, done: `ตัดเสร็จ ${nest.count} ชิ้น`, out: `ส่งออก ${nest.count} ชิ้นทางสายพาน`, reset: 'รอแผ่นถัดไป' }[phase]}`,
    labels: cfg.line
      ? [{ text: 'โต๊ะยก (X-lift)', at: [(liftX[0] + liftX[1]) / 2, 1.3, 0] }, { text: cfg.name, at: [tableX, 2.45, 0] }, { text: 'สายพานขาออก', at: [(outX[0] + outX[1]) / 2, 1.3, 0] }]
      : [{ text: 'หัว ATC 9 kW', at: [0.6, 2.3, 0] }, { text: 'ตู้คอนโทรล', at: [-1.37, 2.45, -0.3] }],
    views: cfg.line
      ? { a: [3.5, 4.2, 8.5], b: [-4.0, 4.0, -8.0], target: [0, 0.9, 0] }
      : { a: [2.8, 2.6, 4.2], b: [-3.2, 2.5, -3.8], target: [0, 1.0, 0] },
    update(dt) {
      t = (t + dt) % total;
      let acc = 0;
      for (const [name, dur] of cycle) {
        if (t < acc + dur) {
          phase = name;
          const k = (t - acc) / dur, e = k * k * (3 - 2 * k);
          if (name === 'feed') sheet.position.x = THREE.MathUtils.lerp((liftX[0] + liftX[1]) / 2, tableX, e);
          if (name === 'out') sheet.position.x = THREE.MathUtils.lerp(tableX, (outX[0] + outX[1]) / 2, e);
          if (name === 'feed' || name === 'reset') nest.reset();
          if (name === 'reset') sheet.position.x = (liftX[0] + liftX[1]) / 2;
          if (name === 'cut') {
            // Follow the toolpath: the gantry carries the cutter round each part's outline in turn.
            sheet.position.x = tableX;
            if (!cfg.line && k < 0.02) nest.reset();
            const p = nest.cut(k);
            gantryTo = tableX + p.x - headX;
            carriageTo = p.z - headZ;
          }
          if (name === 'done' || name === 'out') nest.cut(1);
          break;
        }
        acc += dur;
      }
      if (phase !== 'cut') { gantryTo = r.X1 - 0.35; carriageTo = 0; }
      // Ease toward the target so moves between parts and back to park don't jump.
      const ease = Math.min(1, dt * (phase === 'cut' ? 10 : 2));
      r.gantry.position.x += (gantryTo - r.gantry.position.x) * ease;
      r.carriage.position.z += (carriageTo - r.carriage.position.z) * ease;
      for (const h of r.heads) h.bit.rotation.y += (phase === 'cut' ? 80 : 0) * dt;
    },
  };
}
