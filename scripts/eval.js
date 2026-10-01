import { evaluate } from '../src/index.js';
for (const [name, set] of [['Tuned set', undefined], ['Held-out set', 'held-out']]) {
  const r = evaluate(set);
  console.log(`\n${name} (${r.n} requests)`);
  console.log(`  understood correctly   ${Math.round(r.accuracy * 100)}%`);
  console.log(`  steps, static app      ${r.staticSteps}`);
  console.log(`  steps, Liminal         ${r.liminalSteps}`);
  console.log(`  blocks on screen       ${r.shown} vs ${r.staticShown}`);
  console.log(`  misses asked first     ${r.caughtMisses}`);
  console.log(`  misses shown confident ${r.confidentMisses}`);
  console.log(`  confirm before action  ${r.safe ? 'always' : 'NOT ALWAYS'}`);
}
