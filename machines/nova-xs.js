import * as THREE from 'three';
import { M, box, cyl, decal, logo, tube, std } from './lib.js';

// Mastrox Nova XS: CNC drilling machine with a gantry head housing and a feed table.
// Layout from the user's K-CAD sketch (Downloads\kcad-model.3mf, 22 Oct 2026), scaled so the body is
// 2.15 m tall: one long body (left column, head housing with a long amber window, electrical
// cabinet at the right end), and a feed table sticking straight out of the front at the left end,
// with a leg near its far end and the monitor on a post on the table, turned 45°.
// Paint and details (logo, orange "Nova XS" strip, side door, brush shoe, dust hoses, blower)
// follow the product photo (Docs\ภาพเครื่อง\Nova Xs.png). The back, the inside and the drive are guesses.
// Origin on the floor at the middle of the footprint; the body runs along x, its front faces +z,
// and the panel feeds along −z from the table into the body.

const H = 2.15;
const S = H / 114;                              // sketch mm → m
const sx = x => (x - 55.5) * S, sz = y => (7.5 - y) * S, sy = z => z * S;

const LX0 = sx(-42), X1 = sx(153);              // body ends
const WX0 = sx(-27.3), WX1 = sx(130.7);         // amber window
const CX0 = sx(132);                            // electrical cabinet, left face
const BZ0 = sz(112), BZ1 = sz(45);              // body back / front
const WY0 = sy(63.1), WY1 = sy(108.1);          // window bottom / top
const TX0 = sx(-30), TX1 = sx(18);              // feed table sides
const TZ1 = sz(-97);                            // table far end
const TY = sy(47.5), TB = sy(36.5);             // table top / underside
const LEG = [sz(-64.2), sz(-73.9)];             // leg, near and far face
const BED = 0.9;                                // bed inside the body (panel slides onto it)
const SLOT = 1.12;                              // top of the open drilling zone under the window
const BRAND = '300 130px Comfortaa, "IBM Plex Sans Thai", sans-serif'; // for the model name strip

// Box spanning [x0,x1] × [y0,y1] × [z0,z1].
const span = (x0, x1, y0, y1, z0, z1, mat) => box(x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

// Box whose bottom face is narrower (in x) than its top: the table leg.
function taperedBox(wTop, wBottom, h, d, mat, x, y, z) {
  const g = new THREE.BoxGeometry(wTop, h, d);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setX(i, p.getX(i) * wBottom / wTop);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Corrugated hose: a tube along the points with a ring every `pitch` meters.
function corrugated(points, r, mat, pitch = 0.035) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r * 0.9, 14), mat));
  const n = Math.floor(curve.getLength() / pitch);
  const ring = new THREE.TorusGeometry(r, r * 0.16, 6, 18);
  const up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= n; i++) {
    const u = i / n, m = new THREE.Mesh(ring, mat);
    m.position.copy(curve.getPointAt(u));
    m.quaternion.setFromUnitVectors(up, curve.getTangentAt(u));
    g.add(m);
  }
  return g;
}

export function createNovaXS() {
  const root = new THREE.Group();
  root.name = 'Nova XS';

  // Paint as in the photo: blue-grey body, lighter grey cabinet and left column, darker window frame.
  const body = std('#69717a', { roughness: 0.78, metalness: 0.15 });
  const light = std('#a8aaac', { roughness: 0.6, metalness: 0.2 });
  const frame = std('#5c646c', { roughness: 0.7, metalness: 0.15 });
  const inside = std('#1f2124', { roughness: 0.85 });
  const black = std('#1c1d20', { roughness: 0.8 });
  const plate = std('#50575e', { roughness: 0.55, metalness: 0.3 });
  const hose = new THREE.MeshPhysicalMaterial({ color: '#cfae94', roughness: 0.35, metalness: 0.35, transparent: true, opacity: 0.85 });
  const amberHose = std('#ffb24a', { roughness: 0.3, metalness: 0.1, emissive: '#c46a10', emissiveIntensity: 0.45 });
  const pane = new THREE.MeshPhysicalMaterial({ color: '#ff8a1c', roughness: 0.12, transparent: true, opacity: 0.5, emissive: '#7a3600', emissiveIntensity: 0.3, side: THREE.DoubleSide, depthWrite: false });

  // ---------- Body ----------
  {
    // lower part and plinth along the whole body (the cabinet adds its own)
    root.add(span(LX0, CX0, 0.1, BED, BZ0, BZ1, body));
    root.add(span(LX0 + 0.03, CX0, 0, 0.1, BZ0 + 0.04, BZ1 - 0.04, black));
    for (const x of [TX1 + 0.6, WX1 - 0.6]) root.add(span(x - 0.06, x + 0.06, BED - 0.14, BED - 0.11, BZ1, BZ1 + 0.006, black)); // hand slots
    // light-grey left column with the logo near the top
    root.add(span(LX0, WX0, BED, H, BZ0, BZ1, light));
    const badge = logo(0.24, '#34373b');
    badge.position.set((LX0 + WX0) / 2, H - 0.14, BZ1 + 0.003);
    root.add(badge);

    // hollow head housing between the column and the cabinet, so the head shows through the window
    root.add(span(WX0, CX0, H - 0.03, H, BZ0 + 0.03, BZ1 - 0.03, frame)); // roof, between the back wall and the front panel
    root.add(span(WX0 + 0.002, CX0 - 0.002, H - 0.035, H - 0.03, BZ0 + 0.035, BZ1 - 0.03, inside)); // roof underside
    root.add(span(WX0, CX0, BED, H, BZ0, BZ0 + 0.03, frame)); // back wall
    root.add(span(WX0 + 0.002, CX0 - 0.002, BED + 0.003, H - 0.035, BZ0 + 0.03, BZ0 + 0.035, inside));
    root.add(span(WX0, CX0, WY1, H, BZ1 - 0.03, BZ1, frame)); // front, above the window
    root.add(span(WX0 + 0.04, WX1, SLOT, WY0, BZ1 - 0.03, BZ1, frame)); // front, below the window
    root.add(span(WX1, CX0, BED, WY1, BZ1 - 0.03, BZ1, frame)); // front, right of the window and the slot
    root.add(span(WX0, WX0 + 0.04, SLOT, WY1, BZ1 - 0.03, BZ1, frame));
    root.add(span(WX0 + 0.04, WX1, WY0, WY1, BZ1 - 0.02, BZ1 - 0.012, pane));
    // open drilling zone under the window: bed, rail beam, hold-down beam
    root.add(span(WX0 + 0.002, CX0 - 0.002, BED - 0.02, BED + 0.003, BZ0 + 0.03, BZ1 - 0.003, plate)); // stands 3 mm proud of the body top so the two faces don't flicker
    root.add(span(WX0, CX0, SLOT - 0.06, SLOT, BZ1 - 0.12, BZ1 - 0.03, black));
    root.add(span(WX0 + 0.05, CX0 - 0.05, BED + 0.14, BED + 0.2, -1.62, -1.56, M.alu));
    for (const x of [WX0 + 0.5, WX1 - 0.4]) root.add(span(x - 0.03, x + 0.03, BED + 0.2, H - 0.035, BZ0 + 0.2, BZ0 + 0.26, M.alu)); // inner uprights
    const glow = new THREE.PointLight('#ffae52', 0.45, 3, 1.5);
    glow.position.set(0, 1.7, (BZ0 + BZ1) / 2);
    root.add(glow);
  }

  // ---------- Electrical cabinet (right end of the body) ----------
  {
    root.add(span(CX0, X1, 0.1, H, BZ0, BZ1, light));
    root.add(span(CX0, X1 - 0.03, 0, 0.1, BZ0 + 0.04, BZ1 - 0.04, black));
    // orange name strip from the top down, reading top to bottom, and two pilot buttons beside it
    const s0 = sx(133), s1 = sx(143);
    root.add(span(s0, s1, sy(67.1), H - 0.002, BZ1, BZ1 + 0.004, M.orange));
    const name = decal('Nova XS', { w: 0.74, color: '#3a2a1c', font: BRAND });
    name.rotation.z = -Math.PI / 2;
    name.position.set((s0 + s1) / 2, 1.72, BZ1 + 0.007);
    root.add(name);
    root.add(cyl(0.016, 0.02, M.green, (s1 + X1) / 2, 1.82, BZ1 + 0.01, 'z', 16));
    root.add(cyl(0.022, 0.02, M.red, (s1 + X1) / 2, 1.74, BZ1 + 0.01, 'z', 16));
    // side (+x): door with an amber window, handle at the front, hinges at the back, logo down the back edge
    const dz0 = BZ0 + 0.36, dz1 = BZ1 - 0.06;
    root.add(span(X1, X1 + 0.006, 0.18, 2.0, dz0, dz1, std('#a3a5a7', { roughness: 0.6, metalness: 0.2 })));
    root.add(span(X1 + 0.006, X1 + 0.01, 1.35, 1.95, dz0 + 0.2, dz1 - 0.15, M.amber));
    root.add(span(X1 + 0.006, X1 + 0.025, 1.1, 1.3, dz1 - 0.07, dz1 - 0.04, M.steel));
    for (const y of [0.4, 1.0, 1.75]) root.add(span(X1 + 0.006, X1 + 0.02, y, y + 0.08, dz0 - 0.02, dz0 + 0.02, black));
    const side = logo(1.1, '#34373b');
    side.rotation.set(0, Math.PI / 2, -Math.PI / 2);
    side.position.set(X1 + 0.004, 1.38, BZ0 + 0.18);
    root.add(side);
  }

  // ---------- Drilling head on a gantry along x, inside the housing ----------
  const head = new THREE.Group();
  const HEAD_Z = -1.2;
  {
    root.add(span(WX0 + 0.05, CX0 - 0.02, 1.9, 1.99, -1.62, -1.47, std('#3a3d41', { roughness: 0.6, metalness: 0.4 }))); // gantry beam
    const headMat = std('#4a4f55', { roughness: 0.5, metalness: 0.5 });
    head.add(span(-0.2, 0.2, 1.3, 1.56, -0.15, 0.15, headMat)); // head block
    head.add(span(-0.1, 0.1, 1.56, 1.9, -0.27, -0.2, black)); // carriage plate up to the beam
    head.add(span(-0.04, 0.04, 1.6, 1.72, 0.12, 0.16, M.white)); // valve block between the hoses
    head.add(span(-0.2, 0.2, 1.16, 1.3, -0.15, 0.2, std('#d9dadb', { roughness: 0.6 }))); // spindle box
    head.add(span(-0.22, 0.22, BED + 0.13, 1.16, -0.12, 0.2, black)); // brush shoe
    for (let i = 0; i < 9; i++) head.add(cyl(0.012, 0.06, M.steel, -0.16 + i * 0.04, BED + 0.1, 0.04, 'y', 8)); // drill bits
    head.add(span(0.24, 0.42, 1.2, 1.3, 0, 0.2, M.white)); // white sensor box beside the shoe
    for (const [dx, s] of [[-0.14, 1], [0.12, -1]]) {
      head.add(corrugated([[dx, 1.56, 0.05], [dx + 0.05 * s, 1.68, 0.09], [dx - 0.04 * s, 1.82, 0.07], [dx + 0.03 * s, 1.95, -0.01], [dx, 2.02, -0.12]], 0.065, amberHose));
    }
    head.position.z = HEAD_Z;
    root.add(head);
  }

  // ---------- Feed table out of the front, at the left end ----------
  const TXC = (TX0 + TX1) / 2;
  {
    root.add(span(TX0, TX1, TB, TY - 0.03, BZ1, TZ1, body)); // slab
    root.add(span(TX0 + 0.05, TX1 - 0.05, TY - 0.03, TY, BZ1, TZ1 - 0.05, plate)); // table top
    for (const [a, b] of [[TX0, TX0 + 0.05], [TX1 - 0.05, TX1]]) root.add(span(a, b, TY - 0.03, TY + 0.012, BZ1, TZ1 - 0.05, body)); // side lips
    root.add(span(TX0, TX1, TY - 0.03, TY + 0.012, TZ1 - 0.05, TZ1, body)); // end lip
    root.add(span(TX1 - 0.05, TX1 - 0.02, TY + 0.012, TY + 0.02, BZ1, TZ1 - 0.05, M.steel)); // gripper rail
    // leg near the far end, narrowing to the floor, on levelling feet
    root.add(taperedBox(TX1 - TX0, (TX1 - TX0) * 0.8, TB - 0.03, LEG[1] - LEG[0], body, TXC, (TB + 0.03) / 2, (LEG[0] + LEG[1]) / 2));
    for (const dx of [-0.28, 0.28]) {
      root.add(cyl(0.006, 0.03, M.steel, TXC + dx, 0.03, (LEG[0] + LEG[1]) / 2, 'y', 8));
      root.add(cyl(0.04, 0.015, M.steel, TXC + dx, 0.008, (LEG[0] + LEG[1]) / 2, 'y', 16));
    }
  }

  // Grippers: a row of clamps riding the table's right-hand rail, holding the panel's edge.
  const grippers = new THREE.Group();
  {
    grippers.add(span(TX1 - 0.06, TX1 - 0.01, TY + 0.02, TY + 0.045, -0.2, 0.2, black));
    for (let i = 0; i < 5; i++) {
      const z = -0.16 + i * 0.08;
      grippers.add(span(TX1 - 0.08, TX1 - 0.02, TY + 0.045, TY + 0.08, z - 0.025, z + 0.025, M.steel)); // clamp on top of the carriage
      grippers.add(span(TX1 - 0.14, TX1 - 0.065, TY + 0.023, TY + 0.045, z - 0.02, z + 0.02, M.steel)); // jaw over the panel edge, under the clamp
    }
    root.add(grippers);
  }

  // Blower and hoses under the table next to the body, foot pedal on the operator side.
  {
    const bz = BZ1 + 0.45;
    root.add(span(TXC - 0.25, TXC + 0.25, 0, 0.06, bz - 0.2, bz + 0.2, black)); // stand
    root.add(cyl(0.15, 0.13, M.motor, TXC - 0.05, 0.3, bz, 'x', 28));
    root.add(cyl(0.12, 0.02, M.alu, TXC + 0.02, 0.3, bz, 'x', 28));
    root.add(cyl(0.085, 0.24, M.motor, TXC - 0.05, 0.3, bz + 0.2, 'z', 20));
    root.add(span(TXC - 0.1, TXC, 0.32, 0.42, bz + 0.15, bz + 0.27, M.white)); // terminal box
    root.add(tube([[TXC - 0.05, 0.45, bz], [TXC - 0.1, 0.58, bz - 0.15], [TXC - 0.05, 0.5, bz - 0.3], [TXC, 0.6, BZ1 + 0.01]], 0.045, hose, 30));
    root.add(tube([[TXC + 0.05, 0.2, bz - 0.1], [TXC + 0.3, 0.12, bz - 0.2], [TXC + 0.45, 0.3, BZ1 + 0.01]], 0.055, hose, 30));
    const pedal = new THREE.Group();
    pedal.add(span(-0.12, 0.12, 0, 0.05, -0.08, 0.08, M.alu));
    pedal.add(span(-0.12, 0.12, 0.05, 0.13, -0.08, -0.02, M.alu));
    pedal.position.set(TX1 + 0.55, 0, 0.75);
    root.add(pedal);
    root.add(tube([[TX1 + 0.55, 0.01, 0.66], [TX1 + 0.4, 0.01, 0.4], [TX1 + 0.1, 0.01, 0.2], [TXC + 0.1, 0.15, bz + 0.1]], 0.008, M.hose, 40));
  }

  // Console as in the product photo: square grey column on a base box, button plate down its front,
  // a wide monitor on an arm at its side, keyboard tray below. It stands on the table where the
  // K-CAD sketch puts its post, turned 45° toward the operator in front of the body.
  // Local frame: origin on the table top at the column, +z = the way the screen faces.
  {
    const con = new THREE.Group();
    con.add(span(-0.2, 0.62, 0, 0.18, -0.2, 0.12, body)); // base box
    const hole = cyl(0.035, 0.01, black, 0.1, 0.09, 0.121, 'z', 20); hole.scale.x = 0.55; con.add(hole); // cable slot
    con.add(span(-0.15, 0.15, 0.18, 1.06, -0.14, 0.1, body)); // column
    con.add(span(-0.14, 0.14, 1.06, 1.1, -0.13, 0.09, black)); // top cap
    con.add(tube([[-0.06, 1.1, -0.05], [-0.12, 1.2, -0.12], [-0.2, 1.12, -0.2], [-0.16, 0.95, -0.16]], 0.012, M.hose, 24)); // cable loop
    // button plate down the column front: pilot lamp, start, stop, e-stop
    con.add(span(-0.08, 0.08, 0.6, 1.0, 0.1, 0.106, M.alu));
    con.add(cyl(0.022, 0.025, std('#7dff9a', { emissive: '#2bd45a', emissiveIntensity: 0.9 }), 0, 0.94, 0.115, 'z', 16));
    con.add(cyl(0.022, 0.02, M.green, 0, 0.86, 0.113, 'z', 16));
    con.add(cyl(0.022, 0.02, std('#8c1a14', { roughness: 0.5 }), 0, 0.78, 0.113, 'z', 16));
    con.add(span(-0.05, 0.05, 0.62, 0.73, 0.106, 0.11, M.red)); // red e-stop backing
    con.add(cyl(0.032, 0.035, M.red, 0, 0.675, 0.125, 'z', 20)); // e-stop
    // wide monitor on a short arm off the column's side
    con.add(span(0.15, 0.24, 0.8, 0.86, -0.04, 0.0, black));
    const mon = new THREE.Group();
    mon.add(span(0, 0.66, -0.19, 0.19, -0.025, 0.015, black)); // bezel
    // screen layers: each one a thin slab 1.5 mm in front of the one below, edges pulled in so no faces line up
    const scr = (x0, x1, y0, y1, color, e) => { const i = e * 0.0015; mon.add(span(x0 + i, x1 - i, y0 + i, y1 - i, 0.015 + e * 0.0015, 0.0165 + e * 0.0015, std(color, { roughness: 0.3, emissive: color, emissiveIntensity: 0.45 }))); };
    scr(0.015, 0.645, -0.17, 0.175, '#f4f6f9', 0);   // screen
    scr(0.015, 0.645, 0.15, 0.175, '#dfe6ef', 1);    // toolbar
    scr(0.6, 0.645, 0.15, 0.175, '#f05a28', 2);      // red tab at the top right
    scr(0.015, 0.22, -0.17, 0.15, '#e9edf2', 1);     // side panel
    scr(0.03, 0.2, -0.04, -0.02, '#3b9b4a', 2);      // progress bar
    scr(0.3, 0.6, -0.08, 0.1, '#f3d9c4', 2);         // panel drawing
    mon.position.set(0.24, 0.84, 0);
    con.add(mon);
    mon.add(span(0.28, 0.38, -0.205, -0.19, -0.01, 0.01, black)); // chin badge
    // keyboard tray on a bracket, keyboard and mouse
    con.add(span(0.15, 0.32, 0.4, 0.44, -0.06, 0.02, body));
    con.add(span(-0.05, 0.9, 0.44, 0.46, 0.0, 0.3, M.alu));
    con.add(span(-0.05, 0.9, 0.46, 0.48, 0.28, 0.3, M.alu)); // front lip
    con.add(span(0.05, 0.56, 0.46, 0.48, 0.07, 0.22, black)); // keyboard
    con.add(span(0.7, 0.76, 0.46, 0.49, 0.1, 0.19, black)); // mouse
    con.position.set(sx(-22.2), TY, sz(0.75));
    con.rotation.y = Math.PI / 4;
    root.add(con);
  }

  // No animation and, for now, no panel on the table (user's requests, 22 Oct 2026); the grippers
  // wait part-way along the table.
  grippers.position.z = TZ1 - 0.75;

  return {
    object: root,
    info: 'เจาะ 6 ด้าน · หัวบนคู่ · ตัวเลือก ATC',
    labels: [
      { text: 'ห้องหัวเจาะ (ปิดกระจก)', at: [0, H + 0.15, (BZ0 + BZ1) / 2] },
      { text: 'ตู้ไฟฟ้า', at: [(CX0 + X1) / 2, H + 0.12, (BZ0 + BZ1) / 2] },
      { text: 'จอคุม', at: [sx(-22.2), sy(99.1) + 0.15, sz(0.75)] },
    ],
    views: { a: [-3.6, 2.7, 5.4], b: [3.6, 2.6, -5.6], target: [-0.2, 1.0, -0.3] },
    update() {},
  };
}
