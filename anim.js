// Keyframe animation made in editor.html, stored per machine next to the edits.
//   { duration: 5, loop: true, tracks: { "<part path>": [ { t, p:[x,y,z], q:[x,y,z,w], s:[x,y,z], ease } ] } }
// Paths are the same part paths edits.js uses. `ease` is how the move from this key to the next
// one runs: 'smooth' (slow-fast-slow), 'linear', or 'step' (jump at the next key).
import * as THREE from 'three';
import { nodeAt, storeName } from './edits.js';

const KEY = id => `mastrox-anim:${storeName(id)}`;
export const EASES = { smooth: 'นุ่ม', linear: 'คงที่', step: 'กระโดด' };

export const emptyAnim = () => ({ duration: 5, loop: true, tracks: {} });

export function loadAnim(id) {
  try {
    const a = JSON.parse(localStorage.getItem(KEY(id)) || 'null');
    return a && a.tracks ? a : emptyAnim();
  } catch { return emptyAnim(); }
}

export function saveAnim(id, anim) {
  try {
    if (hasKeys(anim)) localStorage.setItem(KEY(id), JSON.stringify(anim));
    else localStorage.removeItem(KEY(id));
    return true;
  } catch { return false; }
}

export const hasKeys = anim => !!anim && Object.values(anim.tracks).some(k => k.length);

const ease = (kind, x) => (kind === 'linear' ? x : kind === 'step' ? 0 : x * x * (3 - 2 * x));
const vA = new THREE.Vector3(), vB = new THREE.Vector3(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion();

// Put one part where its keys say it is at time t.
export function poseNode(o, keys, t) {
  if (!keys.length) return;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const a = keys[i], b = keys[i + 1];
  if (!b || t <= a.t) {
    o.position.fromArray(a.p); o.quaternion.fromArray(a.q); o.scale.fromArray(a.s);
    return;
  }
  const x = ease(a.ease, Math.min(1, (t - a.t) / Math.max(1e-6, b.t - a.t)));
  o.position.copy(vA.fromArray(a.p).lerp(vB.fromArray(b.p), x));
  o.quaternion.copy(qA.fromArray(a.q).slerp(qB.fromArray(b.q), x));
  o.scale.copy(vA.fromArray(a.s).lerp(vB.fromArray(b.s), x));
}

export function poseAt(root, anim, t) {
  if (!anim) return;
  for (const [path, keys] of Object.entries(anim.tracks)) {
    const o = nodeAt(root, path);
    if (o) poseNode(o, keys, t);
  }
}

// Wrap or clamp a running clock to the animation's length.
export const timeOf = (anim, clock) => (anim.loop ? clock % anim.duration : Math.min(clock, anim.duration));

export function keyOf(o, t, easeKind = 'smooth') {
  return { t: +t.toFixed(3), p: o.position.toArray(), q: o.quaternion.toArray(), s: o.scale.toArray(), ease: easeKind };
}

export function setKey(anim, path, key) {
  const keys = (anim.tracks[path] ||= []);
  const at = keys.findIndex(k => Math.abs(k.t - key.t) < 1e-3);
  if (at >= 0) keys[at] = { ...key, ease: keys[at].ease ?? key.ease };
  else keys.push(key);
  keys.sort((a, b) => a.t - b.t);
}

// An AnimationClip for the glTF exporter, sampled so the eases look the same in Blender.
export function toClip(root, anim, name = 'Animation', fps = 30) {
  const tracks = [];
  const n = Math.max(2, Math.round(anim.duration * fps) + 1);
  const tmp = new THREE.Object3D();
  for (const [path, keys] of Object.entries(anim.tracks)) {
    const o = nodeAt(root, path);
    if (!o || !keys.length) continue;
    const times = [], pos = [], quat = [], scl = [];
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * anim.duration;
      poseNode(tmp, keys, t);
      times.push(t);
      pos.push(...tmp.position.toArray());
      quat.push(...tmp.quaternion.toArray());
      scl.push(...tmp.scale.toArray());
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${o.uuid}.position`, times, pos));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${o.uuid}.quaternion`, times, quat));
    tracks.push(new THREE.VectorKeyframeTrack(`${o.uuid}.scale`, times, scl));
  }
  return tracks.length ? new THREE.AnimationClip(name, anim.duration, tracks) : null;
}
