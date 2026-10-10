export { CARDS, CATEGORY, AS_OF } from './cards.js';
export { MERCHANTS, classify } from './merchants.js';
export { PEOPLE, NOW, yearOfSpending } from './people.js';
export { evaluate, rank, apply, explain, walletState, money, ASSUME, qKey, pointValue, midApr } from './optimize.js';
export { replay } from './replay.js';
export { plan, payoff } from './plan.js';
export { readTerms } from './terms.js';
export { FACTS, QUIRKS, DISCLAIMER } from './sources.js';
export { evalTerms, evalMerchants, TERMS_HELD_OUT, MERCHANT_HELD_OUT, MERCHANT_TUNED } from './evals.js';
export { modelCategory, pickCategory, MODEL_URL } from './model.js';
import { PEOPLE, NOW } from './people.js';
import { MERCHANTS, classify } from './merchants.js';
import { walletState, rank, explain } from './optimize.js';

// One purchase in, one recommendation out, with the reasoning.
export function recommend(personId, { merchant, amount, foreign = false, business = false, cat }) {
  const P = PEOPLE[personId], c = cat ? { cat, confidence: 1, source: 'chosen' } : classify(merchant);
  const t = { ts: NOW, merchant, amount, cat: c.cat, foreign: foreign || !!MERCHANTS[merchant]?.foreign, business };
  const r = rank(t, P, walletState(P));
  if (!r.best) return { purchase: t, category: c, ...r, sentence: 'No card in this wallet can take that purchase.' };
  return { purchase: t, category: c, ...r, sentence: explain(r, t) };
}
