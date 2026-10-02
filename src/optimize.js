// The net value engine. For one purchase it answers: which way of paying leaves the most money with you?
//
//   net = rewards + statement credits + offers + protections + bonus progress + tax saved
//         - interest - foreign fees - processing fees
//
// Every term is shown to the person. This module is fixed, tested math. It never calls a model.
import { CARDS, WARRANTY_CATS } from './cards.js';
import { MERCHANTS } from './merchants.js';

export const ASSUME = {
  warrantyValue: 0.02,   // expected value of an extra warranty year, as a share of the price
  phoneProtection: 4,    // rough monthly value of phone coverage when you pay the bill with the card
  taxCreditFee: 0.0175,  // Pay1040, an IRS-approved processor: 1.75% for credit cards, minimum $2.50
  taxCreditMin: 2.5,
  taxDebitFee: 2.15,     // Pay1040 flat fee for debit cards
  utilizationWarn: 0.30,
};

const DAY = 864e5;
export const qKey = ts => { const d = new Date(ts); return `${d.getUTCFullYear()}Q${Math.floor(d.getUTCMonth() / 3) + 1}`; };
export const periodKey = (ts, period) => { const d = new Date(ts); return period === 'year' ? `${d.getUTCFullYear()}` : period === 'quarter' ? qKey(ts) : `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`; };
export const pct = (v, amount) => amount ? v / amount : 0;
export const money = v => (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isCredit = c => c.type === 'credit' || c.type === 'business';
export const pointValue = (c, mode) => c.pv[mode === 'travel' ? 'travel' : 'cash'];
export const midApr = c => c.apr ? (c.apr[0] + c.apr[1]) / 2 : 0;

// Fresh, mutable state for a wallet: balances, caps used, credits used, bonus progress.
export function walletState(person, { activateAll = false, extra = [], openAll = false } = {}) {
  const st = {};
  for (const w of [...person.wallet, ...extra]) {
    const c = CARDS[w.id];
    st[w.id] = {
      id: w.id, limit: w.limit ?? 10000, balance: w.balance || 0, carry: !!w.carry, carryMonths: w.carryMonths || 0,
      apr: w.apr ?? midApr(c), opened: openAll ? 0 : (w.opened ?? 0), activated: new Set(w.activated || []), activateAll, caps: {}, credits: {},
      signup: c.signup && !openAll ? { ...c.signup, spent: w.signup?.spent || 0, deadline: (w.opened ?? 0) + c.signup.days * DAY } : null,
    };
  }
  return st;
}

// Which earning rules apply to this purchase? A rule can match by category, by named merchant,
// by this quarter's rotating list, and can require Apple Pay.
function matching(card, t) {
  const m = MERCHANTS[t.merchant] || {}, q = qKey(t.ts), out = [];
  for (const r of card.earn || []) {
    if (r.applePay && (m.applePay !== true || t.applePay === false)) continue;
    const rot = r.rotating ? r.rotating[q] || {} : null;
    const cats = rot ? rot.cats || [] : r.cats, merchants = rot ? rot.merchants || [] : r.merchants;
    const hit = (cats && cats.includes(t.cat)) || (merchants && merchants.includes(t.merchant)) || (!cats && !merchants && r.applePay);
    if (hit) out.push(r);
  }
  return out.sort((a, b) => b.rate - a.rate);
}

export function evaluate(cardId, s, t, ctx = {}) {
  const c = CARDS[cardId], m = MERCHANTS[t.merchant] || {}, pv = pointValue(c, ctx.redeem);
  const out = { cardId, name: c.short || c.name, eligible: true, parts: [], tips: [], net: 0 };
  const no = why => ({ ...out, eligible: false, why });
  if (t.ts < s.opened) return no('Not open yet');
  if (c.onlyCats && !c.onlyCats.includes(t.cat)) return no(c.type === 'hsa' ? 'Only for qualified medical costs' : 'Not accepted here');
  if (c.type === 'business' && !t.business) return no('Keep personal spending off the business card');
  if (isCredit(c) && m.accepts && !m.accepts.includes(c.network)) return no(`${t.merchant} only takes ${m.accepts.join(' or ')} credit cards. This is ${c.network === 'Amex' ? 'an American Express' : 'a ' + c.network}.`);
  if (isCredit(c) && s.limit - s.balance < t.amount) return no(`Only ${money(Math.max(0, s.limit - s.balance))} of credit left`);
  const A = t.amount, part = (k, label, v, note) => { if (Math.abs(v) >= 0.005) out.parts.push({ k, label, v: +v.toFixed(2), note }); };
  const pc = rate => +(rate * pv * 100).toFixed(2) + '%';

  // rewards: the highest rule that is active wins. Rates are never stacked.
  const rules = matching(c, t), isOn = r => !r.activation || s.activateAll || s.activated.has(qKey(t.ts));
  const active = rules.filter(isOn), r = active[0], fallback = active[1]?.rate ?? c.base;
  let pts = A * c.base, rateNote = c.base ? `${pc(c.base)} everyday rate` : '';
  if (r) {
    const key = r.cap ? `${c.earn.indexOf(r)}|${periodKey(t.ts, r.cap.period)}` : null, used = key ? s.caps[key] || 0 : 0;
    const room = r.cap ? Math.max(0, r.cap.amount - used) : Infinity, bonusPart = Math.min(A, room);
    pts = bonusPart * r.rate + (A - bonusPart) * (r.after ?? fallback);
    rateNote = `${pc(r.rate)}${r.label ? ' · ' + r.label : ' bonus rate'}${r.cap && bonusPart < A ? `, cap reached after ${money(bonusPart)}` : ''}`;
    if (key) out.bonusUsed = { key, amount: bonusPart };
  }
  const off = rules.find(x => !isOn(x));
  if (off && (!r || off.rate > r.rate)) {
    const extra = (Math.min(A, off.cap?.amount ?? A) * off.rate - Math.min(A, off.cap?.amount ?? A) * (r?.rate ?? c.base)) * pv;
    out.tips.push({ k: 'activate', text: `Activate this quarter's 5% categories on ${c.short || c.name} to earn ${money(extra)} more here.`, v: +extra.toFixed(2) });
  }
  if ((c.earn || []).some(x => x.applePay) && m.applePay !== true) out.tips.push({ k: 'applepay', text: m.applePay === false ? `${t.merchant} does not take Apple Pay, so this earns the 1% physical card rate.` : `Apple Pay is not confirmed here, so this assumes the 1% physical card rate. With Apple Pay it would be 2%.` });
  out.rewards = pts * pv; part('rewards', 'Rewards', out.rewards, rateNote + (pv !== 0.01 ? ` (points valued at ${+(pv * 100).toFixed(2)}¢)` : ''));

  for (const cr of c.credits || []) {
    if (!cr.merchants.includes(t.merchant)) continue;
    const key = `${cr.name}|${periodKey(t.ts, cr.period)}`, left = cr.amount - (s.credits[key] || 0), v = Math.min(A, Math.max(0, left));
    if (v > 0) { part('credit', cr.name, v, `${money(left)} left this ${cr.period}${cr.note ? '. ' + cr.note : ''}`); (out.creditUsed ||= []).push({ key, v }); }
  }
  for (const o of ctx.offers || []) if (o.card === cardId && o.merchant === t.merchant) {
    const v = Math.min(A * o.pct, o.max);
    if (o.active) part('offer', 'Card offer', v, `${Math.round(o.pct * 100)}% back, up to ${money(o.max)}`);
    else out.tips.push({ k: 'offer', text: `Turn on the ${Math.round(o.pct * 100)}% ${t.merchant} offer first to add ${money(v)}.`, v: +v.toFixed(2) });
  }
  if (ctx.protections !== false) {
    if (WARRANTY_CATS.has(t.cat) && c.protections?.warrantyMonths) part('protect', 'Extended warranty', A * ASSUME.warrantyValue, `Adds up to ${c.protections.warrantyMonths} months. Valued at about ${ASSUME.warrantyValue * 100}% of the price, as an estimate`);
    if (t.cat === 'phone' && c.protections?.phone) part('protect', 'Phone protection', ASSUME.phoneProtection, `Covers damage or theft up to ${money(c.protections.phone.max)} with a ${money(c.protections.phone.deductible)} deductible. Rough monthly value`);
  }
  if (s.signup && s.signup.spent < s.signup.spend && t.ts <= s.signup.deadline) {
    const bonus = s.signup.points ? s.signup.points * pv : s.signup.bonus, v = bonus * Math.min(A, s.signup.spend - s.signup.spent) / s.signup.spend;
    part('bonus', 'Sign-up bonus progress', v, `${money(s.signup.spend - s.signup.spent)} to go for ${s.signup.points ? s.signup.points.toLocaleString('en-US') + ' points, worth about ' : ''}${money(bonus)}`);
  }
  if (c.type === 'hsa') part('tax', 'Tax saved', A * (ctx.taxRate ?? 0.22), `Pre-tax HSA money at a ${Math.round((ctx.taxRate ?? 0.22) * 100)}% tax rate`);
  if (t.foreign && c.fx) part('fx', 'Foreign transaction fee', -A * c.fx, `${+(c.fx * 100).toFixed(1)}% of the purchase`);
  if (t.cat === 'taxes' && isCredit(c)) part('fee', 'Card processing fee', -Math.max(ASSUME.taxCreditMin, A * ASSUME.taxCreditFee), `${ASSUME.taxCreditFee * 100}% charged by the IRS-approved processor`);
  if (t.cat === 'taxes' && (c.type === 'debit')) part('fee', 'Card processing fee', -ASSUME.taxDebitFee, 'Flat debit card fee charged by the processor');
  if (s.carry && s.apr) part('interest', 'Interest', -A * s.apr / 12 * s.carryMonths, `${(s.apr * 100).toFixed(2)}% APR. You carry a balance here, so interest starts the day you buy and runs about ${s.carryMonths} months`);

  out.net = +out.parts.reduce((a, p) => a + p.v, 0).toFixed(2);
  if (isCredit(c)) {
    out.utilAfter = (s.balance + A) / s.limit;
    if (out.utilAfter > ASSUME.utilizationWarn && isFinite(s.limit)) out.tips.push({ k: 'util', text: `Puts this card at ${Math.round(out.utilAfter * 100)}% of its limit. Paying it down before the statement date helps your credit score.` });
  }
  return out;
}

export function rank(t, person, st, ctx = {}) {
  const c = { offers: person.offers, taxRate: person.taxRate, redeem: person.redeem, ...ctx };
  const all = Object.keys(st).map(id => evaluate(id, st[id], t, c));
  const ok = all.filter(x => x.eligible).sort((a, b) => b.net - a.net || (a.parts.some(p => p.k === 'interest') - b.parts.some(p => p.k === 'interest')) || ((a.utilAfter || 0) - (b.utilAfter || 0)));
  return { best: ok[0], options: ok, ineligible: all.filter(x => !x.eligible) };
}

// Record a purchase in the wallet state so caps, credits and bonus progress carry forward.
export function apply(st, res, t) {
  const s = st[res.cardId], c = CARDS[res.cardId];
  if (res.bonusUsed?.key) s.caps[res.bonusUsed.key] = (s.caps[res.bonusUsed.key] || 0) + res.bonusUsed.amount;
  for (const cu of res.creditUsed || []) s.credits[cu.key] = (s.credits[cu.key] || 0) + cu.v;
  if (s.signup && t.ts <= s.signup.deadline) s.signup.spent += t.amount;
  // A carried balance is modelled as steady: payments roughly match new spending, so it neither clears nor maxes out.
}

// One plain sentence: why this card, and how far ahead of the next one.
export function explain(r, t) {
  if (!r.best) return 'No card in your wallet can take this purchase.';
  const b = r.best, nx = r.options[1], top = [...b.parts].sort((x, y) => Math.abs(y.v) - Math.abs(x.v))[0];
  let s;
  if (Math.abs(b.net) < 0.005) {
    s = `Use ${b.name}. It earns nothing, but it costs nothing either.`;
    if (nx && nx.net < 0) s += ` ${nx.name} would lose you ${money(-nx.net)} here after fees.`;
  } else {
    s = `Use ${b.name}. You keep ${money(b.net)} on this ${money(t.amount)} purchase`;
    if (top) s += `, mostly from ${top.label.toLowerCase()}`;
    s += '.';
    if (nx) s += ` That is ${money(b.net - nx.net)} more than ${nx.name}.`;
  }
  const bad = r.options.find(o => o.parts.some(p => p.k === 'interest'));
  if (bad && bad !== b) s += ` Avoid ${bad.name}: you carry a balance there, so this would cost ${money(-bad.parts.find(p => p.k === 'interest').v)} in interest.`;
  return s;
}
