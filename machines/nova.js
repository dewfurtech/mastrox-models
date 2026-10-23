import * as THREE from 'three';
import { M, box, cyl, decal, logo, tube, button, std } from './lib.js';

// Mastrox Nova X2 / X4 / X6: a cabinet with a gridded table and a bridge along the back that
// carries air clamps (one per entry in `heads`: X2 2, X4 4, X6 6). Per the user (22 Oct 2026) there
// are no drill motors under the bridge and the drilling unit is not modelled; the panel is fed in
// from the front. Sizes from the brochures; the back of the machine is a guess.
// Origin on the floor at the center, operator facing +z. (Nova XS is in nova-xs.js.)

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

// One air clamp hanging from the bridge (the user, 22 Oct 2026: no drill motors under the beam,
// only clamps; the drilling unit is not part of this machine). An aluminium cylinder body with a
// rod and a rubber pad that drops onto the panel near its back edge. The group's origin is the top
// of the unit (the bridge's underside, world height topY). Returns the plunger that moves.
const PANEL_TOP = TABLE_Y + 0.018;
const CLAMP_LIFT = 0.03; // pad clearance above the panel when open
function clamp(topY) {
  const g = new THREE.Group();
  const bodyH = Math.min(0.17, topY - (PANEL_TOP + CLAMP_LIFT + 0.06));
  g.add(box(0.075, bodyH, 0.075, M.alu, 0, -bodyH / 2, 0.06));
  g.add(box(0.085, 0.02, 0.085, M.frame, 0, -0.01, 0.06)); // mounting block under the beam
  g.add(box(0.085, 0.015, 0.085, M.frame, 0, -bodyH + 0.0075, 0.06)); // end cap
  const plunger = new THREE.Group();
  const padY = PANEL_TOP + CLAMP_LIFT - topY;      // pad bottom, local, when open
  const rodTop = -bodyH + 0.03, rodLen = rodTop - (padY + 0.02);
  plunger.add(cyl(0.011, rodLen, M.chrome, 0, rodTop - rodLen / 2, 0.06, 'y', 12));
  plunger.add(box(0.07, 0.02, 0.06, M.rubber, 0, padY + 0.01, 0.075)); // rubber pad
  g.add(plunger);
  return { group: g, plunger };
}

export function createNova(id) {
  const cfg = NOVAS[id];
  const [L, D, H] = cfg.size;
  const X0 = -L / 2, X1 = L / 2, ZB = -D / 2, ZF = D / 2;
  const root = new THREE.Group();
  root.name = cfg.name;
  const dark = std('#3a3d42', { roughness: 0.72, metalness: 0.15 }); // charcoal, as in the photos

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
  for (const x of [X0 + 0.12, X1 - 0.12]) root.add(box(0.16, H - TABLE_Y, 0.18, dark, x, (TABLE_Y + H) / 2, bz)); // posts sit just behind the beam face, so the logo runs over them
  root.add(box(L - 0.05, 0.24, 0.2, dark, 0.05 - 0.025, H - 0.12 - (cfg.screenOnTop ? 0.12 : 0), bz));
  const beamY = H - 0.12 - (cfg.screenOnTop ? 0.12 : 0);
  // Logo from the left end of the bridge, right after the post (photos: about a quarter of the
  // length on X4 / X6, smaller on the X2 where the screen sits next to it).
  // Beam front as in the photos: big logo from the beam's left end, a black knob just after it,
  // square boxes with a green button, and the orange name plate near the right end.
  const BEAM_X0 = X0 + 0.05, BF = bz + 0.101;
  // bold cut, as on the real beam; the plane includes 5 % clear space each side (X6 letters ~0.92 m)
  const lw = L * (cfg.screenOnTop ? 0.266 : 0.19);
  const badge = logo(lw, '#f2f2f2', undefined, { bold: true });
  badge.position.set(BEAM_X0 + lw / 2, beamY, BF);
  root.add(badge);
  const tagW = 0.55, tagX = X1 - 0.28 - tagW / 2;
  root.add(box(tagW, 0.2, 0.004, M.orange, tagX, beamY, BF));
  const tag = decal(cfg.name.replace('X', 'x'), { w: 0.3, color: '#1d1f22', font: '300 130px Comfortaa, "IBM Plex Sans Thai", sans-serif' });
  tag.position.set(tagX + tagW / 2 - 0.17, beamY - 0.03, BF + 0.003);
  root.add(tag);
  // two push-button boxes (alu square, green button); the first group also carries the black knob
  [BEAM_X0 + 1.43 * L / 3.8, BEAM_X0 + 2.39 * L / 3.8].forEach((x, i) => {
    const g = new THREE.Group();
    g.add(box(0.1, 0.1, 0.012, M.alu, x, beamY + 0.02, BF + 0.006));
    g.add(cyl(0.022, 0.012, M.green, x, beamY + 0.02, BF + 0.017, 'z', 16));
    if (i === 0 && cfg.screenOnTop) g.add(cyl(0.028, 0.03, M.frame, BEAM_X0 + lw + 0.03, beamY + 0.02, BF + 0.015, 'z', 20));
    root.add(g);
  });

  // Touch screen: a light-grey box standing on the bridge for X4 / X6 (white button, selector,
  // e-stop under the screen); set into the bridge on X2.
  const screen = new THREE.Group();
  const sw = cfg.screenOnTop ? 0.49 : 0.24, sh = cfg.screenOnTop ? 0.37 : 0.17;
  const shell = std('#dcdfe2', { roughness: 0.45, metalness: 0.3 });
  screen.add(box(sw, sh, 0.07, shell, 0, 0, 0));
  screen.add(box(sw * 0.86, sh * 0.62, 0.01, M.screen, 0, sh * 0.12, 0.036));
  if (cfg.screenOnTop) {
    const word = logo(sw * 0.4, '#e9eef4');
    word.position.set(0, sh * 0.17, 0.042);
    screen.add(word);
    screen.add(cyl(0.016, 0.015, M.white, -sw * 0.25, -sh * 0.36, 0.04, 'z', 16));
    screen.add(cyl(0.016, 0.02, M.frame, 0, -sh * 0.36, 0.042, 'z', 16));
    screen.add(cyl(0.024, 0.008, M.yellow, sw * 0.3, -sh * 0.36, 0.038, 'z', 18));
    screen.add(cyl(0.02, 0.02, M.red, sw * 0.3, -sh * 0.36, 0.046, 'z', 18));
  } else {
    screen.add(button(M.red, sw * 0.38, -sh * 0.38, 0.035, 0.015));
  }
  if (cfg.screenOnTop) {
    // Photo: the screen box stands straight on top of the bridge, over the end of the logo.
    const beamTop = beamY + 0.12, sx = X0 + 0.28 * L;
    screen.position.set(sx, beamTop + 0.004 + sh / 2, bz + 0.03);
    root.add(box(sw - 0.04, 0.004, 0.06, M.frame, sx, beamTop + 0.002, bz + 0.03)); // foot strip
  } else {
    screen.position.set(BEAM_X0 + lw + 0.14, beamY, bz + 0.105); // right after the logo (X2 photo)
  }
  root.add(screen);

  // Air clamps in pairs under the bridge, spread along it as in the photos (X6: three groups about a
  // quarter of the length apart), each with a black coiled air hose beside it.
  const pairs = Math.ceil(cfg.heads.length / 2), SPREAD = pairs === 1 ? 0 : pairs === 2 ? 0.75 : 0.95;
  const PIECE_L = pairs === 1 ? 0.9 : 2 * SPREAD + 0.5, PIECE_D = 0.4;
  const pieceZ = bz + 0.07 + PIECE_D / 2; // back edge 70 mm in front of the bridge's center line
  const backEdge = pieceZ - PIECE_D / 2;
  const top = beamY - 0.12;
  const clamps = cfg.heads.map((_, i) => {
    const pair = Math.floor(i / 2);
    const x = (pairs === 1 ? 0 : -SPREAD + 2 * SPREAD * pair / (pairs - 1)) + (i % 2 ? 0.08 : -0.08);
    const c = clamp(top);
    c.group.position.set(x, top, bz + 0.03);
    root.add(c.group);
    const coil = [];
    for (let k = 0; k <= 96; k++) { const a = k / 96 * Math.PI * 2 * 7; coil.push([x + 0.06 + Math.cos(a) * 0.02, top - 0.01 - k / 96 * 0.14, bz + 0.13 + Math.sin(a) * 0.02]); }
    root.add(tube(coil, 0.0045, M.hose, 300));
    return c;
  });
  // Back fence the panel is pushed against.
  root.add(box(X1 - X0 - 0.2, 0.05, 0.03, M.steel, 0.05, TABLE_Y + 0.025, backEdge - 0.025));

  // Left end as in the photos: two air cylinders standing on the beam, a black corrugated cable
  // conduit arching off the end down to the base, and a clear dust hose coiled behind it.
  // (Five parts, in the slots of the old end unit, so editor paths after them don't move.)
  const beamTop = beamY + 0.12;
  const airCyl = x => {
    const g = new THREE.Group();
    g.add(cyl(0.032, 0.2, M.alu, x, beamTop + 0.1, bz - 0.02, 'y', 20));
    g.add(box(0.075, 0.03, 0.075, M.frame, x, beamTop + 0.015, bz - 0.02)); // bottom block
    g.add(box(0.075, 0.03, 0.075, M.frame, x, beamTop + 0.2, bz - 0.02));   // top cap
    g.add(tube([[x, beamTop + 0.215, bz - 0.02], [x + 0.03, beamTop + 0.3, bz - 0.05], [x + 0.1, beamTop + 0.24, bz - 0.06], [x + 0.14, beamTop + 0.13, bz - 0.04]], 0.006, M.hose, 20));
    return g;
  };
  root.add(airCyl(X0 + 0.12));
  root.add(airCyl(X0 + 0.26));
  root.add(tube([[X0 + 0.06, beamTop - 0.02, bz - 0.06], [X0 - 0.1, beamTop - 0.08, bz + 0.02], [X0 - 0.2, TABLE_Y + 0.15, bz + 0.15], [X0 - 0.14, TABLE_Y - 0.05, bz + 0.3]], 0.04, std('#141518', { roughness: 0.55 }), 30));
  root.add(tube([[X0 + 0.02, beamTop + 0.03, bz - 0.12], [X0 - 0.1, beamTop - 0.03, bz - 0.1], [X0 - 0.06, beamTop - 0.12, bz - 0.02], [X0 + 0.04, beamTop - 0.08, bz + 0.0]], 0.045, new THREE.MeshPhysicalMaterial({ color: '#d8c3a8', roughness: 0.35, metalness: 0.3, transparent: true, opacity: 0.8 }), 24));
  root.add(box(0.14, 0.12, 0.1, std('#b7babd', { roughness: 0.5, metalness: 0.4 }), X0 + 0.42, beamTop + 0.06, bz - 0.04)); // valve box behind the cylinders

  // The panel is fed in from the front (operator side) up to the back fence, the clamps drop onto
  // it, then let go and it comes back out to the front.
  const piece = box(PIECE_L, 0.018, PIECE_D, M.panel, 0, TABLE_Y + 0.009, pieceZ);
  root.add(piece);
  // Added last so editor paths of the parts above stay put: control box on the left post, red
  // carriages under both posts on their rails, and the aluminium strip along the beam's underside.
  {
    const pf = bz + 0.09; // post front
    root.add(box(0.09, 0.11, 0.012, M.white, X0 + 0.12, TABLE_Y + 0.22, pf + 0.006));
    root.add(box(0.05, 0.015, 0.003, M.red, X0 + 0.12, TABLE_Y + 0.255, pf + 0.013));
    root.add(cyl(0.012, 0.03, M.frame, X0 + 0.12, TABLE_Y + 0.2, pf + 0.025, 'z', 12)); // selector knob
    for (const x of [X0 + 0.12, X1 - 0.12]) {
      root.add(box(0.03, 0.012, 0.4, M.steel, x, TABLE_Y + 0.006, bz + 0.1)); // rail
      for (const dz of [-0.07, 0.07]) root.add(box(0.2, 0.035, 0.07, M.red, x, TABLE_Y + 0.03, bz + dz)); // carriages, wider than the post
    }
    root.add(box(L - 0.6, 0.012, 0.03, M.alu, 0.05 - 0.15, beamY - 0.126, bz + 0.085));
  }

  const zOut = ZF + PIECE_D / 2 + 0.05;            // panel centre z, held just in front of the machine
  const cycle = [['in', 3], ['clamp', 2.5], ['out', 3], ['wait', 0.8]];
  const total = cycle.reduce((a, [, t]) => a + t, 0);
  let t = 0, phase = 'in';
  const ease = k => k * k * (3 - 2 * k);

  return {
    object: root,
    workpiece: piece,
    pieceLabel: 'แผ่นงาน',
    info: () => `ตัวจับลม ${clamps.length} ตัว · ${{ in: 'ป้อนแผ่นจากด้านหน้า', clamp: 'ตัวจับกดแผ่น', out: 'ส่งแผ่นออกด้านหน้า', wait: 'รอแผ่นถัดไป' }[phase]}`,
    labels: [{ text: 'ตัวจับแผ่น (ลม)', at: [0, beamY + 0.3, bz] }],
    views: { a: [L * 0.45, 2.3, 3.6], b: [-L * 0.55, 2.2, -3.2], target: [0, 0.9, 0] },
    update(dt) {
      t = (t + dt) % total;
      let acc = 0;
      for (const [name, dur] of cycle) {
        if (t < acc + dur) {
          phase = name;
          const k = (t - acc) / dur;
          piece.position.z = name === 'in' ? THREE.MathUtils.lerp(zOut, pieceZ, ease(k))
            : name === 'clamp' ? pieceZ
            : name === 'out' ? THREE.MathUtils.lerp(pieceZ, zOut, ease(k)) : zOut;
          // pads drop in the first fifth of the clamp phase and lift in the last fifth
          const down = name === 'clamp' ? ease(Math.min(1, k / 0.2, (1 - k) / 0.2)) : 0;
          for (const c of clamps) c.plunger.position.y = -down * (CLAMP_LIFT - 0.001);
          break;
        }
        acc += dur;
      }
    },
  };
}

// Nova XS lives in nova-xs.js.
