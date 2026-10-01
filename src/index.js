export { PEOPLE, BANK, when } from './data.js';
export { COMPONENTS, STATIC_HOME, STATIC_PATHS } from './components.js';
export { understand, INTENTS } from './understand.js';
export { ground, signals, duplicates, unusual, categoryTotals, money } from './ground.js';
export { compose, home } from './compose.js';
export * as prefs from './prefs.js';
export { evaluate, NOW } from './measure.js';
import { understand } from './understand.js';
import { ground } from './ground.js';
import { compose } from './compose.js';
import { NOW } from './measure.js';

// One request in, one screen out.
export function run(text, person, opts = {}) {
  const u = understand(text, person, opts.prefs), ev = ground(u, person, opts.now ?? NOW);
  return { understanding: u, evidence: ev, plan: compose(u, ev, { person, prefs: opts.prefs }) };
}
