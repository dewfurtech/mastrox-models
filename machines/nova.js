import * as THREE from 'three';
import { M, box, cyl, decal, logo, tube, button, std } from './lib.js';

// Mastrox Nova CNC side drilling machines.
// Nova X2 / X4 / X6: a cabinet with a gridded table and a bridge along the back that carries the
// spindle heads (X2: 2 horizontal; X4: + 2 vertical; X6: + 2 diagonal). Sizes from the brochures;
// head positions, the back of the machine and the left-end unit are guesses from the photos.
// Nova XS: a six-side drill with an enclosed head housing and a long feed table; only one photo,
// so most of its shape is a guess.
// Origin on the floor at the center, operator facing +z.

export const NOVAS = {
  'nova-x2': { name: 'Nova X2', label: 'X2', size: [3.5, 1.2, 1.45], heads: ['h', 'h'], screenOnTop: false },
  'nova-x4': { name: 'Nova X4', label: 'X4', size: [3.8, 1.5, 1.5], heads: ['v', 'h', 'h', 'v'], screenOnTop: true },
  'nova-x6': { name: 'Nova X6', label: 'X6', size: [3.8, 1.2, 1.45], heads: ['v', 'h', 'd', 'd', 'h', 'v'], screenOnTop: true },
};

const TABLE_Y = 0.9;

function gridTable(w, d) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = Math.round(1024 * d / w);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a3d42';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#26282c';
  ctx.lineWidth = 3;
  const step = c.width / 40;
  for (let x = -c.height; x < c.width + c.height; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + c.height, c.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + c.height, 0); ctx.lineTo(x, c.height); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
}

// One spindle unit hanging from the bridge. 'h' drills into the panel's back edge, 'v' drills down
// into its face, 'd' is tilted 45°. The group's origin is the top of the unit (the bridge's
// underside, at world height topY, depth z). The spindle is placed so its bit tip rests just clear
// of the panel and reaches into it on the plunge stroke. Returns the parts that move.
const PANEL_TOP = TABLE_Y + 0.018;
function head(kind, topY, z, backEdgeZ) {
  const g = new THREE.Group();
  // Body: from the bridge down to just above the panel (shorter on the low-bridge X4 / X6).
  const bodyH = Math.min(0.26, topY - (PANEL_TOP + 0.045));
  g.add(box(0.12, bodyH, 0.14, M.alu, 0, -bodyH / 2, 0));
  g.add(box(0.03, 0.03, 0.03, M.yellow, 0.05, -0.05, 0.075)); // tool number tag
  const spindle = new THREE.Group();
  spindle.add(cyl(0.045, 0.16, M.motor, 0, 0, 0));
  const bit = cyl(0.005, 0.07, M.chrome, 0, -0.115, 0, 'y', 8);
  spindle.add(bit);
  const TIP = 0.15, CLEAR = 0.008; // spindle center to bit tip; gap to the panel at rest
  let tip;
  if (kind === 'h') { spindle.rotation.x = -Math.PI / 2; tip = new THREE.Vector3(0, TABLE_Y + 0.009, backEdgeZ - CLEAR); }
  if (kind === 'v') tip = new THREE.Vector3(0, PANEL_TOP + CLEAR, z + 0.12);
  if (kind === 'd') { spindle.rotation.x = -Math.PI / 4; tip = new THREE.Vector3(0, PANEL_TOP + CLEAR, z + 0.17); }
  const plunge = new THREE.Vector3(0, -1, 0).applyQuaternion(spindle.quaternion);
  // Spindle center in the head's local frame.
  spindle.position.copy(tip).addScaledVector(plunge, -TIP).sub(new THREE.Vector3(0, topY, z));
  g.add(spindle);
  if (kind === 'h') g.add(box(0.05, Math.max(0.01, -bodyH - spindle.position.y), 0.04, M.alu, 0, (-bodyH + spindle.position.y) / 2, Math.min(-0.05, spindle.position.z + 0.06))); // hanger
  g.add(cyl(0.035, 0.03, M.brass, 0, -bodyH - 0.012, -0.03, 'y', 16)); // dust brush ring
  const rest = spindle.position.clone();
  return { group: g, spindle, bit, rest, plunge, tipRest: tip, kind };
}

export function createNova(id) {
  const cfg = NOVAS[id];
  const [L, D, H] = cfg.size;
  const X0 = -L / 2, X1 = L / 2, ZB = -D / 2, ZF = D / 2;
  const root = new THREE.Group();
  root.name = cfg.name;
  const dark = std('#2b2d31', { roughness: 0.75 });

  // Base cabinet in three panels, feet, big model letters on the front right.
  root.add(box(L - 0.3, TABLE_Y - 0.1, D - 0.4, dark, 0.05, (TABLE_Y - 0.1) / 2 + 0.06, -0.05));
  for (let i = 1; i < 3; i++) root.add(box(0.008, TABLE_Y - 0.2, 0.004, M.frame, X0 + 0.2 + (L - 0.3) * i / 3, TABLE_Y / 2, ZF - 0.25 + 0.002));
  for (const x of [X0 + 0.35, 0.05, X1 - 0.25]) {
    root.add(box(0.3, 0.06, D - 0.3, M.frame, x, 0.03, -0.05));
    root.add(cyl(0.03, 0.02, M.steel, x, 0.01, ZF - 0.12, 'y', 12));
  }
  const letters = decal(cfg.label, { w: 0.62, color: '#f07a22', font: '300 160px "IBM Plex Sans Thai", sans-serif' });
  letters.position.set(X1 - 0.55, 0.45, ZF - 0.25 + 0.004);
  root.add(letters);

  // Gridded table with a wing at the front left.
  // The table starts just behind the back fence, leaving room for the horizontal spindles.
  const tz0 = ZB + 0.22, tz1 = -0.02 + (D - 0.25) / 2;
  const tableMat = gridTable(L - 0.2, tz1 - tz0);
  const table = new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.04, tz1 - tz0), [M.frame, M.frame, tableMat, M.frame, M.frame, M.frame]);
  table.position.set(0.05, TABLE_Y - 0.02, (tz0 + tz1) / 2);
  table.receiveShadow = table.castShadow = true;
  root.add(table);
  root.add(box(0.75, 0.035, 0.42, tableMat, X0 + 0.35, TABLE_Y - 0.02, ZF - 0.15));
  root.add(box(0.05, 0.12, 0.35, M.frame, X0 + 0.05, TABLE_Y - 0.1, ZF - 0.15));

  // Bridge along the back on two end posts.
  const bz = ZB + 0.18;
  for (const x of [X0 + 0.12, X1 - 0.12]) root.add(box(0.16, H - TABLE_Y, 0.22, dark, x, (TABLE_Y + H) / 2, bz));
  root.add(box(L - 0.05, 0.24, 0.2, dark, 0.05 - 0.025, H - 0.12 - (cfg.screenOnTop ? 0.12 : 0), bz));
  const beamY = H - 0.12 - (cfg.screenOnTop ? 0.12 : 0);
  const badge = logo(0.7);
  badge.position.set(X0 + 0.65, beamY, bz + 0.101);
  root.add(badge);
  const tagW = 0.42;
  root.add(box(tagW, 0.2, 0.004, M.orange, X1 - 0.38, beamY, bz + 0.101));
  const tag = decal(cfg.name, { w: 0.28, color: '#1d1f22' });
  tag.position.set(X1 - 0.33, beamY - 0.04, bz + 0.104);
  root.add(tag);
  for (const x of [-0.3, 0.6]) root.add(cyl(0.022, 0.01, M.green, x, beamY + 0.04, bz + 0.105, 'z', 16)); // indicator lamps

  // Touch screen: on a post above the bridge for X4 / X6, set into the bridge on X2.
  const screen = new THREE.Group();
  const sw = cfg.screenOnTop ? 0.42 : 0.24, sh = cfg.screenOnTop ? 0.3 : 0.17;
  screen.add(box(sw, sh, 0.06, M.white, 0, 0, 0));
  screen.add(box(sw * 0.82, sh * 0.72, 0.01, M.screen, 0, 0.01, 0.031));
  screen.add(button(M.red, sw * 0.38, -sh * 0.38, 0.035, 0.015));
  if (cfg.screenOnTop) {
    screen.position.set(-0.35, H - 0.15, bz + 0.03);
    root.add(box(0.06, 0.12, 0.06, M.frame, -0.35, H - 0.3, bz));
  } else {
    screen.position.set(-0.55, beamY, bz + 0.105);
  }
  root.add(screen);

  // Spindle heads in pairs under the bridge, spread over the panel, plus pneumatic panel presses.
  const PIECE_L = 0.9, PIECE_D = 0.4;
  const pieceZ = bz + 0.07 + PIECE_D / 2; // back edge 70 mm in front of the bridge's center line
  const backEdge = pieceZ - PIECE_D / 2;
  const pairs = Math.ceil(cfg.heads.length / 2);
  const heads = cfg.heads.map((kind, i) => {
    const pair = Math.floor(i / 2);
    const x = (pairs === 1 ? 0 : -0.27 + 0.54 * pair / (pairs - 1)) + (i % 2 ? 0.08 : -0.08);
    const top = beamY - 0.12;
    const h = head(kind, top, bz + 0.03, backEdge);
    h.group.position.set(x, top, bz + 0.03);
    root.add(h.group);
    root.add(tube([[x, top - 0.02, bz - 0.05], [x + 0.05, beamY + 0.05, bz - 0.15], [x + 0.1, beamY + 0.1, bz - 0.1]], 0.02, M.hose, 12));
    return h;
  });
  for (const x of [-0.5, 0.5]) {
    const len = beamY - 0.12 - (PANEL_TOP + 0.03);
    root.add(cyl(0.025, len, M.alu, x, PANEL_TOP + 0.03 + len / 2, bz + 0.09, 'y', 12)); // hangs from the bridge
    root.add(box(0.06, 0.02, 0.06, M.rubber, x, PANEL_TOP + 0.02, bz + 0.09));
  }
  // Back fence behind the panel, with gaps where the horizontal spindles reach through.
  {
    const fx0 = X0 + 0.15, fx1 = X1 - 0.05, gaps = heads.filter(h => h.kind === 'h').map(h => h.group.position.x).sort((a, b) => a - b);
    let from = fx0;
    for (const gx of [...gaps, null]) {
      const to = gx === null ? fx1 : gx - 0.05;
      if (to - from > 0.02) root.add(box(to - from, 0.05, 0.03, M.steel, (from + to) / 2, TABLE_Y + 0.025, backEdge - 0.025));
      if (gx !== null) from = gx + 0.05;
    }
  }

  // Left-end unit: spindle motor on a slide with its dust hose (the machine's end-drilling station).
  root.add(box(0.2, 0.5, 0.3, M.alu, X0 - 0.02, TABLE_Y + 0.2, bz + 0.15));
  root.add(cyl(0.06, 0.16, M.motor, X0 - 0.02, TABLE_Y + 0.38, bz + 0.15));
  root.add(tube([[X0 - 0.02, TABLE_Y + 0.46, bz + 0.15], [X0 - 0.12, H - 0.08, bz], [X0 + 0.15, H - 0.1, bz - 0.05]], 0.04, std('#c9a77a', { roughness: 0.6 }), 16));
  root.add(cyl(0.05, 0.14, M.red, X0 + 0.12, H - 0.15, bz + 0.12, 'y', 16)); // signal tower
  root.add(cyl(0.05, 0.05, M.green, X0 + 0.12, H - 0.055, bz + 0.12, 'y', 16));

  // A 900 × 400 × 18 mm cabinet side slides in against the back fence, gets drilled, slides out.
  const piece = box(PIECE_L, 0.018, PIECE_D, M.panel, 0, TABLE_Y + 0.009, pieceZ);
  root.add(piece);

  // Holes each head leaves in the panel, shown once its stroke bottoms out: dowel holes in the
  // back edge for horizontal heads, hinge / shelf-pin holes in the face for vertical and diagonal.
  const holeMat = std('#2a1d12', { roughness: 1, metalness: 0 });
  const holes = new THREE.Group();
  piece.add(holes);
  function drillHoles() {
    // A pair of holes where each bit went in, in the panel's own frame.
    piece.updateMatrixWorld(true);
    const inv = piece.matrixWorld.clone().invert();
    for (const h of heads) {
      for (const dx of [-0.016, 0.016]) {
        const at = h.tipRest.clone().add(new THREE.Vector3(h.group.position.x + dx, 0, 0));
        if (h.kind === 'h') at.z = backEdge - 0.001; else at.y = PANEL_TOP + 0.0005;
        if (h.kind === 'd') at.addScaledVector(new THREE.Vector3(0, 0, 1), 0.01);
        at.applyMatrix4(inv);
        holes.add(h.kind === 'h' ? cyl(0.004, 0.003, holeMat, at.x, at.y, at.z, 'z', 12)
          : cyl(h.kind === 'v' ? 0.005 : 0.0065, 0.003, holeMat, at.x, at.y, at.z, 'y', 14));
      }
    }
  }
  const clearHoles = () => holes.clear();
  const stops = { in: X0 - 0.1, drill: 0, out: X1 + 0.1 }; // panel center x
  const cycle = [['in', 3], ['drill', 2.5], ['out', 3], ['reset', 0.5]];
  const total = cycle.reduce((a, [, t]) => a + t, 0);
  let t = 0, phase = 'in';

  return {
    object: root,
    workpiece: piece,
    pieceLabel: 'แผ่นงาน',
    info: () => `หัวเจาะ ${cfg.heads.length} หัว · ${{ in: 'ป้อนแผ่น', drill: 'กำลังเจาะ', out: 'ส่งออก', reset: 'รอแผ่นถัดไป' }[phase]}`,
    labels: heads.map((h, i) => ({ text: { h: 'แนวนอน', v: 'แนวตั้ง', d: 'ทแยง' }[cfg.heads[i]], at: [h.group.position.x, beamY + 0.25 + (i % 3) * 0.09, bz] })),
    views: { a: [L * 0.45, 2.3, 3.6], b: [-L * 0.55, 2.2, -3.2], target: [0, 0.9, 0] },
    update(dt) {
      t = (t + dt) % total;
      let acc = 0;
      for (const [name, dur] of cycle) {
        if (t < acc + dur) {
          phase = name;
          const k = (t - acc) / dur, e = k * k * (3 - 2 * k);
          piece.position.x = name === 'in' ? THREE.MathUtils.lerp(stops.in, stops.drill, e)
            : name === 'drill' ? stops.drill
            : name === 'out' ? THREE.MathUtils.lerp(stops.drill, stops.out, e) : stops.in;
          if (name === 'in') clearHoles();
          if (name === 'drill' && k > 0.5 && !holes.children.length) drillHoles();
          const stroke = name === 'drill' ? Math.sin(k * Math.PI) * 0.02 : 0; // 8 mm clearance + 12 mm into the panel
          for (const h of heads) {
            h.bit.rotation.y += (name === 'drill' ? 60 : 0) * dt;
            h.spindle.position.copy(h.rest).addScaledVector(h.plunge, stroke);
          }
          break;
        }
        acc += dur;
      }
    },
  };
}

export function createNovaXS() {
  const L = 5.35, D = 2.8, H = 2.15;
  const X0 = -L / 2, X1 = L / 2;
  const root = new THREE.Group();
  root.name = 'Nova XS';
  const grey = std('#8f959b', { roughness: 0.6, metalness: 0.3 });
  const dark = std('#2b2d31', { roughness: 0.75 });

  // Head housing on the right: grey shell, amber window, orange name strip, open lower frame.
  const hx0 = X1 - 2.0, hz0 = -D / 2, hz1 = 0.35;
  const hxc = (hx0 + X1) / 2, hzc = (hz0 + hz1) / 2, hw = X1 - hx0, hd = hz1 - hz0;
  root.add(box(hw, H - 1.15, hd, dark, hxc, (1.15 + H) / 2, hzc));
  root.add(box(0.12, H, hd, grey, X1 - 0.06, H / 2, hzc)); // right side panel
  root.add(box(0.1, H - 1.15, hd, grey, hx0 + 0.05, (1.15 + H) / 2, hzc));
  root.add(box(hw - 0.5, 0.6, 0.01, M.amber, hxc - 0.12, 1.6, hz1 + 0.005));
  root.add(box(0.2, 0.75, 0.01, M.orange, X1 - 0.27, 1.55, hz1 + 0.006));
  const strip = decal('Nova XS', { w: 0.6, color: '#1d1f22', bg: '#f07a22' });
  strip.rotation.z = -Math.PI / 2;
  strip.position.set(X1 - 0.27, 1.55, hz1 + 0.012);
  root.add(strip);
  const side = decal('mastrox', { w: 1.1, color: '#2b2d31' });
  side.rotation.set(0, Math.PI / 2, -Math.PI / 2);
  side.position.set(X1 + 0.002, 1.25, hzc);
  root.add(side);
  for (const x of [hx0 + 0.1, X1 - 0.15]) for (const z of [hz0 + 0.1, hz1 - 0.1]) root.add(box(0.12, 1.15, 0.12, dark, x, 0.575, z));
  root.add(box(hw - 0.2, 0.12, hd - 0.2, dark, hxc, 0.885, hzc)); // lower bed, flush with the feed table so the panel slides over it
  // Mechanics visible under the housing: vacuum receiver, motor, hoses.
  root.add(cyl(0.16, 0.5, std('#5f6a75', { metalness: 0.4 }), hxc - 0.3, 0.55, hzc + 0.2, 'x', 24));
  for (const dx of [-0.18, 0.18]) root.add(box(0.06, 0.39, 0.2, dark, hxc - 0.3 + dx, 0.195, hzc + 0.2)); // receiver saddles
  root.add(cyl(0.1, 0.22, M.motor, hxc + 0.3, 0.45, hzc + 0.3, 'x', 20));
  root.add(box(0.26, 0.35, 0.2, dark, hxc + 0.3, 0.175, hzc + 0.3)); // motor stand
  const copper = std('#b8693a', { metalness: 0.5, roughness: 0.5 });
  root.add(tube([[hxc - 0.6, 0.3, hz1 - 0.1], [hxc - 0.9, 0.6, hz1 + 0.3], [hxc - 0.4, 0.9, hz1 + 0.1], [hxc + 0.2, 0.8, hz1 - 0.2]], 0.045, copper, 30));
  root.add(tube([[hxc + 0.5, 0.2, hz1 - 0.2], [hxc + 0.7, 0.5, hz1 + 0.1], [hxc + 0.3, 0.95, hz1 - 0.1]], 0.04, copper, 30));

  // Long feed table running out to the left, on a steel frame with a pedestal leg.
  const tz0 = -0.35, tz1 = 0.75, tx0 = X0, tx1 = hx0 + 0.2;
  root.add(box(tx1 - tx0, 0.05, tz1 - tz0, std('#4a4f57'), (tx0 + tx1) / 2, 0.92, (tz0 + tz1) / 2));
  root.add(box(tx1 - tx0, 0.04, 0.06, M.steel, (tx0 + tx1) / 2, 0.96, tz0 + 0.05)); // gripper rail
  root.add(box(tx1 - tx0, 0.12, 0.08, dark, (tx0 + tx1) / 2, 0.84, tz1 - 0.04));
  root.add(box(0.5, 0.85, 0.5, dark, X0 + 0.5, 0.45, (tz0 + tz1) / 2)); // pedestal
  root.add(box(tx1 - tx0 - 0.6, 0.08, 0.08, dark, (tx0 + tx1) / 2 + 0.2, 0.25, 0.25)); // tie bar, pedestal to housing leg
  // Second, narrower outfeed table in front of the housing.
  // (Starts where the feed table ends, so the two tops don't overlap and flicker.)
  root.add(box(1.2, 0.05, D / 2 - 0.05 - tz1, std('#4a4f57'), hx0 - 0.3, 0.92, (tz1 + D / 2 - 0.05) / 2));
  for (const x of [hx0 - 0.85, hx0 + 0.25]) root.add(box(0.08, 0.895, 0.08, dark, x, 0.4475, D / 2 - 0.1));

  // Touch screen on a pivot arm at the infeed side of the housing.
  root.add(box(0.06, 0.555, 0.06, M.frame, hx0 - 0.9, 0.945 + 0.555 / 2, tz0 + 0.1)); // screen post, standing on the table
  const screen = new THREE.Group();
  screen.add(box(0.48, 0.34, 0.07, M.body, 0, 0, 0));
  const face = decal('mastrox', { w: 0.36, color: '#1d1f22', bg: '#f07a22' });
  face.position.z = 0.036;
  screen.add(face);
  screen.add(box(0.5, 0.03, 0.2, M.frame, 0, -0.2, 0.06));
  screen.position.set(hx0 - 0.9, 1.65, tz0 + 0.15);
  screen.rotation.y = 0.35;
  root.add(screen);
  root.add(cyl(0.03, 0.18, M.green, hx0 - 0.04, H - 0.3, hz1 + 0.04, 'y', 12)); // signal tower on the housing corner

  const piece = box(0.9, 0.018, 0.55, M.panel, 0, 0.955, 0.2);
  root.add(piece);
  let t = 0;

  return {
    object: root,
    workpiece: piece,
    pieceLabel: 'แผ่นงาน',
    info: 'เจาะ 6 ด้าน · หัวบนคู่ · ตัวเลือก ATC',
    labels: [
      { text: 'ห้องหัวเจาะ (ปิดกระจก)', at: [hxc, H + 0.15, hzc] },
      { text: 'โต๊ะป้อนแผ่น', at: [X0 + 1.2, 1.15, 0.2] },
    ],
    views: { a: [1.0, 2.8, 5.8], b: [-2.0, 2.6, -5.5], target: [0, 1.0, 0] },
    update(dt) {
      t = (t + dt) % 10;
      const k = t < 5 ? t / 5 : (10 - t) / 5;
      piece.position.x = THREE.MathUtils.lerp(X0 + 0.6, hx0 + 0.4, k * k * (3 - 2 * k));
    },
  };
}
