import { createBooster } from './booster.js';
import { createMoon } from './moon.js';
import { createNova, createNovaXS } from './nova.js';
import { createRealRakete } from './rakete-real.js';
import { createGlueSpreader } from './glue-spreader.js';
import { createColdPress } from './cold-press.js';
import { createAuroraOpen } from './aurora-open.js';
import { createAuroraSlide } from './aurora-slide.js';
import { createNebula } from './nebula.js';
import { createVAir } from './vair.js';
import { operatorZone, operatorZonesOf } from './lib.js';

// Where the operator stands: in front of the screen / control panel, just outside the machine.
// x, z = center of the floor pad; look = the way the operator faces (toward the controls).
const ZONES = {
  'rakete-3500a': { x: -3.55, z: -1.33, look: [1, 0] }, // in front of the cabinet's screen, beside the chute end
  // line machines: in front of the cabinet behind the conveyor (cabinet at x = -base/2 - 0.55, z = -1.04)
  'rakete-3500ant': { x: -3.38, z: -1.04, look: [1, 0] },
  'rakete-4800ant': { x: -3.55, z: -1.04, look: [1, 0] },
  'rakete-5000af': { x: -3.55, z: -1.04, look: [1, 0] },
  'booster-e6': { x: -1.49, z: -0.8, look: [0.48, 0.88] },
  'booster-e7': { x: -1.65, z: -0.8, look: [0.48, 0.88] },
  'booster-e10': { x: -1.97, z: -0.8, look: [0.48, 0.88] },
  'moon-10': { x: -1.96, z: -1.03, look: [0, 1] },
  'moon-40': { x: -2.96, z: -1.03, look: [0, 1] },
  'moon-40d': { x: -3.71, z: -1.03, look: [0, 1] },
  'moon-80': { x: -2.96, z: -1.03, look: [0, 1] },
  'nova-x2': { x: -0.55, z: 1.01, look: [0, -1] },
  'nova-x4': { x: -0.35, z: 1.16, look: [0, -1] },
  'nova-x6': { x: -0.35, z: 1.01, look: [0, -1] },
  'nova-xs': { x: -0.75, z: 1.14, look: [0.34, -0.94] }, // beside the outfeed table, facing the swing-arm screen
  'nebula': { x: 1.25, z: 0.4, look: [-1, 0] },
  'aurora-open': { x: -0.05, z: 1.08, look: [0, -1] },
  'aurora-slide': { x: 0, z: 1.47, look: [0, -1] }, // the screen rides on the shell, so mid-front between the trays
  'cold-presso': { x: 1.325, z: 1.0, look: [0, -1] },
  'glue-spreader': { x: 0.85, z: 0.8, look: [0, -1] },
  'vair-10': { x: -0.19, z: 0.7, look: [0, -1] },
  'vair-20': { x: -0.23, z: 0.74, look: [0, -1] },
};

// Builds the machine and adds its operator zone as the root's last child (so editor paths of the
// existing parts don't move). Also exposed as machine.operatorZones / root.userData.operatorZones.
function withZone(id, create) {
  return () => {
    const m = create();
    const spec = ZONES[id];
    if (spec) {
      m.object.add(operatorZone(spec));
      m.operatorZones = operatorZonesOf(m.object);
      m.labels = [...(m.labels || []), { text: 'จุดยืนทำงาน', at: [spec.x, 0.05, spec.z] }];
    }
    return m;
  };
}

const BUILDERS = {
  // Rakete family: one detailed builder (machines/rakete-real.js)
  'rakete-3500a': () => createRealRakete('rakete-3500a'),
  'rakete-3500ant': () => createRealRakete('rakete-3500ant'),
  'rakete-4800ant': () => createRealRakete('rakete-4800ant'),
  'rakete-5000af': () => createRealRakete('rakete-5000af'),
  'booster-e6': () => createBooster('booster-e6'),
  'booster-e7': () => createBooster('booster-e7'),
  'booster-e10': () => createBooster('booster-e10'),
  'moon-10': () => createMoon('moon-10'),
  'moon-40': () => createMoon('moon-40'),
  'moon-40d': () => createMoon('moon-40d'),
  'moon-80': () => createMoon('moon-80'),
  'nova-x2': () => createNova('nova-x2'),
  'nova-x4': () => createNova('nova-x4'),
  'nova-x6': () => createNova('nova-x6'),
  'nova-xs': createNovaXS,
  'nebula': createNebula,
  'aurora-open': createAuroraOpen,
  'aurora-slide': createAuroraSlide,
  'cold-presso': createColdPress,
  'glue-spreader': createGlueSpreader,
  'vair-10': () => createVAir('vair-10'),
  'vair-20': () => createVAir('vair-20'),
};

// Every machine that has a 3D model, keyed by its id in data/machines.js, in lineup order.
export const MODELS = Object.fromEntries(Object.entries(BUILDERS).map(([id, create]) => [id, withZone(id, create)]));
