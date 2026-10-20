import { createBooster } from './booster.js';
import { createMoon } from './moon.js';
import { createNova, createNovaXS } from './nova.js';
import { createRakete } from './rakete.js';
import { createGlueSpreader } from './glue-spreader.js';
import { createColdPress } from './cold-press.js';
import { createAuroraOpen } from './aurora-open.js';
import { createAuroraSlide } from './aurora-slide.js';
import { createNebula } from './nebula.js';
import { createVAir } from './vair.js';

// Every machine that has a 3D model, keyed by its id in data/machines.js, in lineup order.
export const MODELS = {
  'rakete-3500a': () => createRakete('rakete-3500a'),
  'rakete-3500ant': () => createRakete('rakete-3500ant'),
  'rakete-4800ant': () => createRakete('rakete-4800ant'),
  'rakete-5000af': () => createRakete('rakete-5000af'),
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
