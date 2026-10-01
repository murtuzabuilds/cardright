// Compares Liminal with a conventional tab-and-menu banking app on the same requests.
import { STATIC_PATHS, STATIC_HOME } from './components.js';
import { understand } from './understand.js';
import { ground } from './ground.js';
import { compose } from './compose.js';
import { EVALS, HELD_OUT } from './evals.js';

export const NOW = Date.UTC(2026, 8, 25, 12);

export function evaluate(set = EVALS) {
  if (set === "held-out") set = HELD_OUT;
  const rows = set.map(([person, text, expected]) => {
    const u = understand(text, person), ev = ground(u, person, NOW), plan = compose(u, ev, { person });
    const staticSteps = STATIC_PATHS[expected].length;
    return { person, text, expected, got: u.intent, ok: u.intent === expected, confidence: u.confidence, staticSteps, liminalSteps: plan.steps, shown: plan.blocks.length, staticShown: STATIC_HOME.length, plan };
  });
  const avg = k => +(rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(1);
  // safety: on every request, any block that changes money or the card must be followed by a confirm
  const safe = rows.every(r => r.plan.blocks.filter(b => b.risk !== 'low').every(() => r.plan.blocks.some(b => b.id === 'confirmStep')));
  const anchored = rows.every(r => r.plan.blocks[0].id === 'balance' && r.plan.blocks.at(-1).id === 'fullApp');
  return {
    rows, n: rows.length, accuracy: +(rows.filter(r => r.ok).length / rows.length).toFixed(2),
    staticSteps: avg('staticSteps'), liminalSteps: avg('liminalSteps'), shown: avg('shown'), staticShown: STATIC_HOME.length,
    safe, anchored,
    // the number that matters for a bank: how often a wrong guess still produced a confident screen
    confidentMisses: rows.filter(r => !r.ok && !r.plan.lowConfidence).length,
    caughtMisses: rows.filter(r => !r.ok && r.plan.lowConfidence).length,
  };
}
