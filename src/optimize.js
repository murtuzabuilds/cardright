// The net value engine. For one purchase it answers: which way of paying leaves the most money with you?
//
//   net = rewards + statement credits + offers + protections + tax saved
//         - interest - foreign fees - processing fees
//
// A sign-up bonus is all or nothing, so it is never spread across purchases. It only counts when it
// changes the decision: when the card CardRight would otherwise pick for each purchase would leave the
// person short of the bonus by its deadline. Then it is shown as its own one-time line and used to rank,
// but it is not added to what this purchase keeps.
//
// Every term is shown to the person. This module is fixed, tested math. It never calls a model.
import { CARDS, WARRANTY_CATS } from './cards.js';
import { MERCHANTS, knownMerchant } from './merchants.js';
import { yearOfSpending } from './people.js';

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
export const shortDate = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const bonusValue = (signup, pv) => signup.points ? signup.points * pv : signup.bonus;
const dollars = v => '$' + Math.round(v).toLocaleString('en-US');
const bonusName = (signup, pv) => `${signup.points ? signup.points.toLocaleString('en-US') + ' point ' : ''}sign-up bonus (about ${dollars(bonusValue(signup, pv))})`;
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
function matching(card, t, name) {
  const m = MERCHANTS[name] || {}, q = qKey(t.ts), out = [];
  for (const r of card.earn || []) {
    if (r.applePay && (m.applePay !== true || t.applePay === false)) continue;
    const rot = r.rotating ? r.rotating[q] || {} : null;
    const cats = rot ? rot.cats || [] : r.cats, merchants = rot ? rot.merchants || [] : r.merchants;
    const hit = (cats && cats.includes(t.cat)) || (merchants && merchants.includes(name)) || (!cats && !merchants && r.applePay);
    if (hit) out.push(r);
  }
  return out.sort((a, b) => b.rate - a.rate);
}

export function evaluate(cardId, s, t, ctx = {}) {
  const name = knownMerchant(t.merchant) ?? t.merchant, c = CARDS[cardId], m = MERCHANTS[name] || {}, pv = pointValue(c, ctx.redeem);
  const out = { cardId, name: c.short || c.name, eligible: true, parts: [], tips: [], net: 0 };
  const no = why => ({ ...out, eligible: false, why });
  if (t.ts < s.opened) return no('Not open yet');
  if (c.onlyCats && !c.onlyCats.includes(t.cat)) return no(c.type === 'hsa' ? 'Only for qualified medical costs' : 'Not accepted here');
  if (c.type === 'business' && !t.business) return no('Keep personal spending off the business card');
  if (isCredit(c) && m.accepts && !m.accepts.includes(c.network)) return no(`${name} only takes ${m.accepts.join(' or ')} credit cards. This is ${c.network === 'Amex' ? 'an American Express' : 'a ' + c.network}.`);
  if (isCredit(c) && s.limit - s.balance < t.amount) return no(`Only ${money(Math.max(0, s.limit - s.balance))} of credit left`);
  const A = t.amount, part = (k, label, v, note) => { if (Math.abs(v) >= 0.005) out.parts.push({ k, label, v: +v.toFixed(2), note }); };
  const pc = rate => +(rate * pv * 100).toFixed(2) + '%';

  // rewards: the highest rule that is active wins. Rates are never stacked.
  const rules = matching(c, t, name), isOn = r => !r.activation || s.activateAll || s.activated.has(qKey(t.ts));
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
  if ((c.earn || []).some(x => x.applePay) && m.applePay !== true) out.tips.push({ k: 'applepay', text: m.applePay === false ? `${name} does not take Apple Pay, so this earns the 1% physical card rate.` : `Apple Pay is not confirmed here, so this assumes the 1% physical card rate. With Apple Pay it would be 2%.` });
  out.rewards = pts * pv; part('rewards', 'Rewards', out.rewards, rateNote + (pv !== 0.01 ? ` (points valued at ${+(pv * 100).toFixed(2)}¢)` : ''));

  for (const cr of c.credits || []) {
    if (!cr.merchants.includes(name)) continue;
    const key = `${cr.name}|${periodKey(t.ts, cr.period)}`, left = cr.amount - (s.credits[key] || 0), v = Math.min(A, Math.max(0, left));
    if (v > 0) { part('credit', cr.name, v, `${money(left)} left this ${cr.period}${cr.note ? '. ' + cr.note : ''}`); (out.creditUsed ||= []).push({ key, v }); }
  }
  for (const o of ctx.offers || []) if (o.card === cardId && (knownMerchant(o.merchant) ?? o.merchant) === name) {
    const v = Math.min(A * o.pct, o.max);
    if (o.active) part('offer', 'Card offer', v, `${Math.round(o.pct * 100)}% back, up to ${money(o.max)}`);
    else out.tips.push({ k: 'offer', text: `Turn on the ${Math.round(o.pct * 100)}% ${name} offer first to add ${money(v)}.`, v: +v.toFixed(2) });
  }
  if (ctx.protections !== false) {
    if (WARRANTY_CATS.has(t.cat) && c.protections?.warrantyMonths) part('protect', 'Extended warranty', A * ASSUME.warrantyValue, `Adds up to ${c.protections.warrantyMonths} months. Valued at about ${ASSUME.warrantyValue * 100}% of the price, as an estimate`);
    if (t.cat === 'phone' && c.protections?.phone) part('protect', 'Phone protection', ASSUME.phoneProtection, `Covers damage or theft up to ${money(c.protections.phone.max)} with a ${money(c.protections.phone.deductible)} deductible. Rough monthly value`);
  }
  // Sign-up bonus: only when the person's usual card choices would miss it (see the note at the top).
  if (s.signup && !ctx.noSignup && s.signup.spent < s.signup.spend && t.ts <= s.signup.deadline) {
    const sg = s.signup, bonus = bonusValue(sg, pv), left = sg.spend - sg.spent, days = Math.max(0, (sg.deadline - t.ts) / DAY);
    const projected = (ctx.pace?.[cardId] ?? 0) * days, short = left - projected;
    const reachable = A + (ctx.pace?._all ?? Infinity) * days >= left;
    if (short > 0.005 && !reachable) {
      out.tips.push({ k: 'bonusgone', text: `The ${bonusName(sg, pv)} needs ${money(left)} more by ${shortDate(sg.deadline)}, more than you usually spend in that time, so CardRight does not chase it.` });
    } else if (short > 0.005) {
      const edge = bonus * Math.min(A, short) / short;
      out.signup = { bonus, left, short: +short.toFixed(2), projected: +projected.toFixed(2), deadline: sg.deadline, progress: Math.min(A, left), edge: +edge.toFixed(2) };
      out.tips.unshift({ k: 'bonus', text: `One-time sign-up bonus, not counted in what you keep: this puts you ${money(Math.min(A, left))} closer to the ${bonusName(sg, pv)} on ${c.short || c.name}. You could miss it by ${shortDate(sg.deadline)}: with the cards CardRight would otherwise pick, you would be about ${money(short)} short.`, v: out.signup.edge });
    } else {
      out.tips.push({ k: 'bonusok', text: `You are on track for the ${bonusName(sg, pv)} by ${shortDate(sg.deadline)} with your usual card choices, so it is not counted here as extra.` });
    }
  }
  // HSA: the tax saving comes from paying with pre-tax HSA money, not from the card that is swiped.
  // Paying with the HSA card, or paying with any card and reimbursing yourself from the HSA, saves the same.
  if (t.cat === 'medical' && (c.type === 'hsa' || ctx.hsa)) {
    const rate = ctx.taxRate ?? 0.22, room = c.type === 'hsa' ? Math.max(0, s.limit - s.balance) : ctx.hsa.room, covered = Math.min(A, room);
    if (covered > 0) {
      part('tax', 'Tax saved with your HSA', covered * rate, c.type === 'hsa'
        ? `Paid straight from pre-tax HSA money, at a ${Math.round(rate * 100)}% tax rate`
        : `Pay with this card, then reimburse yourself from your HSA. Its pre-tax money saves this at a ${Math.round(rate * 100)}% tax rate, whichever card you use`);
      out.hsaUsed = covered;
    }
  }
  if (t.foreign && c.fx) part('fx', 'Foreign transaction fee', -A * c.fx, `${+(c.fx * 100).toFixed(1)}% of the purchase`);
  if (t.cat === 'taxes' && isCredit(c)) part('fee', 'Card processing fee', -Math.max(ASSUME.taxCreditMin, A * ASSUME.taxCreditFee), `${ASSUME.taxCreditFee * 100}% charged by the IRS-approved processor`);
  if (t.cat === 'taxes' && (c.type === 'debit')) part('fee', 'Card processing fee', -ASSUME.taxDebitFee, 'Flat debit card fee charged by the processor');
  if (s.carry && s.apr) part('interest', 'Interest', -A * s.apr / 12 * s.carryMonths, `${(s.apr * 100).toFixed(2)}% APR. You carry a balance here, so interest starts the day you buy and runs about ${s.carryMonths} months`);

  out.net = +out.parts.reduce((a, p) => a + p.v, 0).toFixed(2);
  out.score = +(out.net + (out.signup?.edge || 0)).toFixed(2);
  if (isCredit(c)) {
    out.utilAfter = (s.balance + A) / s.limit;
    if (out.utilAfter > ASSUME.utilizationWarn && isFinite(s.limit)) out.tips.push({ k: 'util', text: `Puts this card at ${Math.round(out.utilAfter * 100)}% of its limit. Paying it down before the statement date helps your credit score.` });
  }
  return out;
}

const hsaId = st => Object.keys(st).find(id => CARDS[id].type === 'hsa');

// How many dollars a day the person's usual routing puts on each card: CardRight's own pick for every
// purchase in their year of spending, with their real activation habits and no sign-up bonus in play.
// Used to project whether a sign-up bonus would be reached anyway before its deadline.
const PACE = new Map();
export function signupPace(person, st, ctx = {}) {
  const ids = Object.keys(st), extra = ids.filter(id => !person.wallet.some(w => w.id === id)).map(id => ({ id, limit: st[id].limit }));
  const key = JSON.stringify([person.id, ids, person.wallet.map(w => [w.id, !!w.carry, w.carryMonths || 0, w.activated || []]), ctx.redeem, ctx.taxRate]);
  if (PACE.has(key)) return PACE.get(key);
  const s2 = walletState({ ...person, wallet: person.wallet.filter(w => ids.includes(w.id)) }, { openAll: true, extra }), sum = {};
  const txns = yearOfSpending(person.id), days = Math.max(1, (txns[txns.length - 1].ts - txns[0].ts) / DAY);
  for (const t of txns) {
    const r = rank(t, person, s2, { ...ctx, noSignup: true });
    if (r.best) { sum[r.best.cardId] = (sum[r.best.cardId] || 0) + t.amount; apply(s2, r.best, t); }
  }
  const pace = Object.fromEntries(ids.map(id => [id, (sum[id] || 0) / days]));
  pace._all = txns.reduce((a, t) => a + t.amount, 0) / days; // all spending, whatever the card
  PACE.set(key, pace);
  return pace;
}

export function rank(t, person, st, ctx = {}) {
  const c = { offers: person.offers, taxRate: person.taxRate, redeem: person.redeem, ...ctx }, h = hsaId(st);
  if (h && c.useHsa !== false && t.cat === 'medical') c.hsa = { id: h, room: Math.max(0, st[h].limit - st[h].balance) };
  if (!c.noSignup && !c.pace && Object.values(st).some(s => s.signup && s.signup.spent < s.signup.spend && t.ts <= s.signup.deadline)) c.pace = signupPace(person, st, c);
  const all = Object.keys(st).map(id => evaluate(id, st[id], t, c));
  const ok = all.filter(x => x.eligible).sort((a, b) => b.score - a.score || b.net - a.net || (a.parts.some(p => p.k === 'interest') - b.parts.some(p => p.k === 'interest')) || ((a.utilAfter || 0) - (b.utilAfter || 0)));
  // No "activate" nudge on a card with a carried balance unless activating would actually make it the right card.
  for (const o of ok) if (o !== ok[0] && o.parts.some(p => p.k === 'interest')) o.tips = o.tips.filter(x => x.k !== 'activate' || o.net + x.v > ok[0].net);
  return { best: ok[0], options: ok, ineligible: all.filter(x => !x.eligible) };
}

// Record a purchase in the wallet state so caps, credits, HSA money and bonus progress carry forward.
export function apply(st, res, t) {
  const s = st[res.cardId], c = CARDS[res.cardId];
  if (res.bonusUsed?.key) s.caps[res.bonusUsed.key] = (s.caps[res.bonusUsed.key] || 0) + res.bonusUsed.amount;
  for (const cu of res.creditUsed || []) s.credits[cu.key] = (s.credits[cu.key] || 0) + cu.v;
  if (res.hsaUsed) { const h = c.type === 'hsa' ? res.cardId : hsaId(st); if (h) st[h].balance += res.hsaUsed; }
  if (s.signup && t.ts <= s.signup.deadline) s.signup.spent += t.amount;
  // A carried balance is modelled as steady: payments roughly match new spending, so it neither clears nor maxes out.
}

// One plain sentence: why this card, and how far ahead of the next one.
export function explain(r, t) {
  if (!r.best) return 'No card in your wallet can take this purchase.';
  const b = r.best, nx = r.options[1], top = [...b.parts].sort((x, y) => Math.abs(y.v) - Math.abs(x.v))[0];
  const tax = b.parts.find(p => p.k === 'tax'), viaHsa = tax && CARDS[b.cardId].type !== 'hsa';
  let s;
  if (b.signup && nx && nx.net > b.net + 0.005) {
    s = `Use ${b.name}. It puts you ${money(b.signup.progress)} closer to a ${dollars(b.signup.bonus)} sign-up bonus you could otherwise miss by ${shortDate(b.signup.deadline)}. On this purchase alone you keep ${money(b.net)}, which is ${money(nx.net - b.net)} less than ${nx.name}, so it is worth it only for the bonus.`;
  } else if (viaHsa) {
    const rest = +(b.net - tax.v).toFixed(2);
    s = `Use ${b.name}, then reimburse yourself from your HSA. The HSA's pre-tax money saves about ${money(tax.v)} whichever card you use${Math.abs(rest) >= 0.005 ? `, and ${b.name} ${rest > 0 ? 'adds' : 'costs'} ${money(Math.abs(rest))}${rest > 0 ? ' in rewards' : ''}` : ''}.`;
    if (nx) s += Math.abs(b.net - nx.net) < 0.005 ? ` ${nx.name} would do just as well.` : ` That is ${money(b.net - nx.net)} more than ${nx.name}.`;
  } else if (Math.abs(b.net) < 0.005) {
    s = `Use ${b.name}. It earns nothing, but it costs nothing either.`;
    if (nx && nx.net < 0) s += ` ${nx.name} would lose you ${money(-nx.net)} here after fees.`;
  } else {
    s = `Use ${b.name}. You keep ${money(b.net)} on this ${money(t.amount)} purchase`;
    if (top) s += `, mostly from ${top.label.toLowerCase()}`;
    s += '.';
    if (nx) s += Math.abs(b.net - nx.net) < 0.005 ? ` It ties with ${nx.name}.` : ` That is ${money(b.net - nx.net)} more than ${nx.name}.`;
  }
  if (b.signup && !(nx && nx.net > b.net + 0.005)) s += ` It also puts you ${money(b.signup.progress)} closer to a ${dollars(b.signup.bonus)} sign-up bonus you could otherwise miss by ${shortDate(b.signup.deadline)}.`;
  const bad = r.options.find(o => o.parts.some(p => p.k === 'interest'));
  if (bad && bad !== b) s += ` Avoid ${bad.name}: you carry a balance there, so this would cost ${money(-bad.parts.find(p => p.k === 'interest').v)} in interest.`;
  return s;
}
