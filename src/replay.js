// Wallet replay: run a year of real spending through the engine and show what it would have kept.
// Three runs over the same purchases:
//   actual   the card the person really reached for
//   smart    the best card each time, with their real activation habits
//   best     the best card each time, with every bonus category activated
// The gaps between them split the money left on the table into causes a person can act on.
import { CARDS, CATEGORY } from './cards.js';
import { PEOPLE, yearOfSpending } from './people.js';
import { walletState, evaluate, rank, apply } from './optimize.js';

const sum = (parts, ks) => parts.filter(p => ks.includes(p.k)).reduce((a, p) => a + p.v, 0);
const GAIN = ['rewards', 'credit', 'offer', 'protect', 'bonus'];

export function replay(personId, { extraCards = [], exclude = [], openAll = false } = {}) {
  const base = PEOPLE[personId], P = exclude.length ? { ...base, wallet: base.wallet.filter(w => !exclude.includes(w.id)), habit: t => { const h = base.habit(t); return exclude.includes(h) ? null : h; } } : base, txns = yearOfSpending(personId), ctx = { offers: P.offers, taxRate: P.taxRate };
  const sA = walletState(P, { openAll }), sS = walletState(P, { openAll }), sB = walletState(P, { activateAll: true, extra: extraCards, openAll });
  const tot = { actual: 0, smart: 0, best: 0 }, buckets = { card: 0, activation: 0, interest: 0, fx: 0, tax: 0 };
  const byCat = {}, rows = [];
  for (const t of txns) {
    const habitId = P.habit(t);
    let a = habitId && sA[habitId] ? evaluate(habitId, sA[habitId], t, ctx) : { eligible: false };
    if (!a.eligible) a = rank(t, P, sA, ctx).best; // the habit card can't take it, so they used something else
    apply(sA, a, t);
    const s = rank(t, P, sS, ctx).best; apply(sS, s, t);
    const b = rank(t, P, sB, ctx).best; apply(sB, b, t);
    tot.actual += a.net; tot.smart += s.net; tot.best += b.net;
    buckets.card += sum(s.parts, [...GAIN, 'fee']) - sum(a.parts, [...GAIN, 'fee']);
    buckets.activation += sum(b.parts, [...GAIN, 'fee']) - sum(s.parts, [...GAIN, 'fee']);
    buckets.interest += -sum(a.parts, ['interest']) + sum(b.parts, ['interest']);
    buckets.fx += -sum(a.parts, ['fx']) + sum(b.parts, ['fx']);
    buckets.tax += sum(b.parts, ['tax']) - sum(a.parts, ['tax']);
    const k = t.cat; byCat[k] = byCat[k] || { cat: k, label: CATEGORY[k], spend: 0, actual: 0, best: 0, cardGap: 0, picks: {} };
    byCat[k].cardGap += sum(b.parts, [...GAIN, 'fee']) - sum(a.parts, [...GAIN, 'fee']);
    byCat[k].spend += t.amount; byCat[k].actual += a.net; byCat[k].best += b.net; byCat[k].picks[b.cardId] = (byCat[k].picks[b.cardId] || 0) + t.amount;
    rows.push({ t, actual: a, best: b });
  }
  const r2 = v => +v.toFixed(2);
  Object.keys(buckets).forEach(k => buckets[k] = r2(buckets[k]));
  const cats = Object.values(byCat).map(c => ({ ...c, spend: r2(c.spend), actual: r2(c.actual), best: r2(c.best), gap: r2(c.best - c.actual), cardGap: r2(c.cardGap), bestCard: Object.entries(c.picks).sort((x, y) => y[1] - x[1])[0][0] })).sort((x, y) => y.gap - x.gap);
  const spend = r2(txns.reduce((a, t) => a + t.amount, 0));
  return {
    person: personId, n: txns.length, spend, rows, cats, buckets,
    actual: r2(tot.actual), best: r2(tot.best), left: r2(tot.best - tot.actual),
    actualRate: tot.actual / spend, bestRate: tot.best / spend,
  };
}
