export { CARDS, CATEGORY } from './cards.js';
export { MERCHANTS, classify } from './merchants.js';
export { PEOPLE, NOW, yearOfSpending } from './people.js';
export { evaluate, rank, apply, explain, walletState, money, ASSUME, qKey } from './optimize.js';
export { replay } from './replay.js';
export { plan, payoff } from './plan.js';
export { readTerms } from './terms.js';
export { evalTerms, evalMerchants, TERMS_HELD_OUT, MERCHANT_HELD_OUT } from './evals.js';
import { PEOPLE, NOW } from './people.js';
import { MERCHANTS, classify } from './merchants.js';
import { walletState, rank, explain } from './optimize.js';

// One purchase in, one recommendation out, with the reasoning.
export function recommend(personId, { merchant, amount, foreign = false, business = false, cat }) {
  const P = PEOPLE[personId], c = cat ? { cat, confidence: 1, source: 'chosen' } : classify(merchant);
  const t = { ts: NOW, merchant, amount, cat: c.cat, foreign: foreign || !!MERCHANTS[merchant]?.foreign, business };
  const r = rank(t, P, walletState(P));
  return { purchase: t, category: c, ...r, sentence: explain(r, t) };
}
