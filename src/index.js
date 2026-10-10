export { CARDS, CATEGORY, AS_OF } from './cards.js';
export { MERCHANTS, classify, knownMerchant, merchantInfo, merchantKey } from './merchants.js';
export { PEOPLE, NOW, yearOfSpending } from './people.js';
export { evaluate, rank, apply, explain, walletState, money, ASSUME, qKey, pointValue, midApr, signupPace, bonusValue, shortDate } from './optimize.js';
export { replay } from './replay.js';
export { plan, payoff } from './plan.js';
export { readTerms } from './terms.js';
export { FACTS, QUIRKS, DISCLAIMER } from './sources.js';
export { evalTerms, evalMerchants, TERMS_HELD_OUT, MERCHANT_HELD_OUT, MERCHANT_TUNED, evalMerchantsModel, MODEL_MERCHANT_ANSWERS, MODEL_MERCHANT_RAN } from './evals.js';
export { modelCategory, pickCategory, MODEL_URL } from './model.js';
import { PEOPLE, NOW } from './people.js';
import { merchantInfo, knownMerchant, classify } from './merchants.js';
import { walletState, rank, explain } from './optimize.js';

// One purchase in, one recommendation out, with the reasoning.
export function recommend(personId, { merchant, amount, foreign = false, business = false, cat }) {
  const P = PEOPLE[personId], c = cat ? { cat, confidence: 1, source: 'chosen' } : classify(merchant);
  const t = { ts: NOW, merchant: knownMerchant(merchant) ?? merchant, amount, cat: c.cat, foreign: foreign || !!merchantInfo(merchant).foreign, business };
  const r = rank(t, P, walletState(P));
  if (!r.best) return { purchase: t, category: c, ...r, sentence: 'No card in this wallet can take that purchase.' };
  return { purchase: t, category: c, ...r, sentence: explain(r, t) };
}
export { toggleCarry, toggleActivate } from './session.js';
