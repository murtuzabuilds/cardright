import { replay, plan, evalTerms, evalMerchants, evalMerchantsModel, MODEL_MERCHANT_RAN, money } from '../src/index.js';
console.log('\nWallet replay: one year of synthetic spending');
for (const p of ['maya', 'jordan', 'theo']) {
  const r = replay(p), pl = plan(p);
  console.log(`  ${p.padEnd(7)} kept ${money(r.actual).padStart(9)}  could keep ${money(r.best).padStart(9)}  left on the table ${money(r.left).padStart(8)}  plan worth ${money(pl.total).padStart(9)} a year${pl.oneTime ? ` plus ${money(pl.oneTime)} one time` : ''}  top move: ${pl.actions[0].title}`);
}
for (const [label, fn] of [['Fine print reader', evalTerms], ['Merchant categories, name rules', evalMerchants]]) for (const w of ['tuned', 'held']) {
  const r = fn(w);
  console.log(`\n${label}, ${w === 'tuned' ? 'tuned set' : 'held-out set'} (${r.n})`);
  console.log(`  correct            ${Math.round((r.fieldAccuracy ?? r.accuracy) * 100)}%${r.fieldAccuracy !== undefined ? ' of fields' : ''}`);
  console.log(`  misses flagged     ${r.caught}`);
  console.log(`  misses not flagged ${r.silent}`);
}
// The model row: saved answers from a real model run, checked against CardRight's name rules.
for (const w of ['tuned', 'held']) {
  const r = evalMerchantsModel(w);
  console.log(`\nMerchant categories, model with the rules as a check (run ${MODEL_MERCHANT_RAN}), ${w === 'tuned' ? 'tuned set' : 'held-out set'} (${r.n})`);
  console.log(`  correct            ${Math.round(r.accuracy * 100)}% (${r.right} of ${r.n})`);
  console.log(`  misses flagged     ${r.caughtWithRules}`);
  console.log(`  misses not flagged ${r.silentWithRules}`);
}
