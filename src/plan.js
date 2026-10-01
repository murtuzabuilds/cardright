// The plan: a short list of moves, ranked by dollars per year, each with the math behind it.
// Nothing here is a product placement. The "next card" check can, and often does, say no.
import { CARDS, CATEGORY } from './cards.js';
import { PEOPLE, NOW } from './people.js';
import { replay } from './replay.js';
import { money } from './optimize.js';

const DAY = 864e5;
const m0 = v => '$' + Math.round(v).toLocaleString('en-US');

// Months and interest to clear a balance with a fixed monthly payment.
export function payoff(balance, apr, payment, { introApr = null, introMonths = 0, fee = 0 } = {}) {
  let b = balance + balance * fee, interest = 0, m = 0;
  while (b > 0.005 && m < 600) {
    const r = (m < introMonths && introApr !== null ? introApr : apr) / 12, i = b * r;
    if (payment <= i) return { months: Infinity, interest: Infinity, fee: balance * fee };
    interest += i; b = b + i - payment; m++;
  }
  return { months: m, interest: +interest.toFixed(2), fee: +(balance * fee).toFixed(2) };
}

export function plan(personId) {
  const P = PEOPLE[personId], R = replay(personId), acts = [];
  const add = (a) => acts.push({ ...a, v: +(a.v || 0).toFixed(2) });

  // 1. Which card for which kind of spending
  const rules = [...R.cats].sort((a, b) => b.cardGap - a.cardGap).filter(c => c.cardGap > 5).slice(0, 5).map(c => ({ cat: c.label, card: CARDS[c.bestCard].name, v: c.cardGap, spend: c.spend }));
  if (rules.length) add({ k: 'routing', title: 'Use the right card for each kind of spending', v: rules.reduce((a, r) => a + r.v, 0), rules,
    math: rules.map(r => `${r.cat} → ${r.card}: +${money(r.v)} on ${money(r.spend)} a year`).join('\n') });

  // 2. Interest on new spending
  if (R.buckets.interest > 1) {
    const w = P.wallet.find(x => x.carry), c = CARDS[w.id];
    add({ k: 'stop', title: `Stop putting new spending on ${c.name} until it is paid off`, v: R.buckets.interest,
      math: `You carry ${money(w.balance)} there at ${(c.apr * 100).toFixed(1)}%. Every new purchase starts paying interest the day you buy it, which cost ${money(R.buckets.interest)} last year. Its rewards earned back far less.` });
  }

  // 3. The carried balance itself
  const carried = P.wallet.find(x => x.carry && x.balance > 0);
  if (carried && P.monthlyPayment) {
    const c = CARDS[carried.id], now = payoff(carried.balance, c.apr, P.monthlyPayment);
    const bt = Object.entries(CARDS).find(([, x]) => x.market && x.intro);
    if (bt) {
      const [id, b] = bt, alt = payoff(carried.balance, b.apr, P.monthlyPayment, { introApr: b.intro.apr, introMonths: b.intro.months, fee: b.intro.transferFee });
      const save = now.interest - (alt.interest + alt.fee);
      if (save > 0) add({ k: 'transfer', title: `Move the ${m0(carried.balance)} balance to a 0% transfer card`, v: save, card: id,
        math: `Paying ${money(P.monthlyPayment)} a month: on ${c.name} it takes ${now.months} months and ${money(now.interest)} in interest. On a ${b.intro.months}-month 0% card like ${b.name} it takes ${alt.months} months, costing a ${money(alt.fee)} transfer fee and ${money(alt.interest)} interest. CardRight is not paid for this suggestion.` });
    }
  }

  // 4. Bonus categories
  if (R.buckets.activation > 1) add({ k: 'activate', title: 'Turn on rotating 5% categories every quarter', v: R.buckets.activation,
    math: `Ridgeline only pays 5% in quarters you activate. You skipped some last year, which cost ${money(R.buckets.activation)}. This quarter: online shopping and wholesale clubs, up to $1,500.` });

  // 5. Tax: HSA and business spending
  if (R.buckets.tax > 1) add({ k: 'hsa', title: 'Pay medical bills from your HSA card', v: R.buckets.tax,
    math: `HSA money goes in before tax. At a ${Math.round(P.taxRate * 100)}% tax rate, paying ${money(R.rows.filter(r => r.best.cardId === 'lakeside-hsa').reduce((a, r) => a + r.t.amount, 0))} of medical costs from it instead of a personal card saved about ${money(R.buckets.tax)} last year.` });
  const biz = R.rows.filter(r => r.t.business), bizOnPersonal = biz.filter(r => r.actual.cardId !== 'kiln-business');
  if (bizOnPersonal.length) {
    const amt = bizOnPersonal.reduce((a, r) => a + r.t.amount, 0);
    add({ k: 'business', title: 'Put work spending on the business card', v: 0, tidy: true,
      math: `${money(amt)} of work expenses went on a personal card. The rewards are the same 2%, but keeping them on Kiln Business makes them easy to deduct and to prove at tax time.` });
  }

  // 6. Sign-up bonus at risk
  for (const w of P.wallet) {
    const c = CARDS[w.id]; if (!c.signup || !w.signup) continue;
    const deadline = w.opened + c.signup.days * DAY, left = c.signup.spend - w.signup.spent, days = Math.max(0, Math.round((deadline - NOW) / DAY));
    const monthly = R.spend / 12, onTrackIfAll = monthly * days / 30;
    add({ k: 'signup', title: `Hit the ${m0(c.signup.bonus)} ${c.name} bonus before ${new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`, v: c.signup.bonus - left * 0.01,
      math: `${money(left)} to go in ${days} days. You usually spend about ${money(monthly)} a month, so it only works if most spending goes on ${c.name} until then${onTrackIfAll < left ? ', and even that may fall short' : ''}. Giving up about 1% elsewhere on ${money(left)} costs roughly ${money(left * 0.01)}.` });
  }

  // 7. Annual fees: does each card earn back what it costs?
  for (const w of P.wallet) {
    const c = CARDS[w.id]; if (!c.fee) continue;
    // judged over a full year of ownership, without the one-time sign-up bonus
    const full = replay(personId, { openAll: true }), without = replay(personId, { exclude: [w.id], openAll: true }), adds = full.best - without.best;
    const verdict = adds - c.fee;
    add({ k: 'fee', title: verdict >= 0 ? `${c.name} earns its ${m0(c.fee)} fee` : w.signup ? `After the bonus, ${c.name} falls short of its ${m0(c.fee)} fee` : `${c.name} does not earn its ${m0(c.fee)} fee`, v: verdict >= 0 ? 0 : -verdict, keep: verdict >= 0, tidy: verdict >= 0,
      math: `Used well, it adds ${money(adds)} a year over your other cards. Minus the ${money(c.fee)} fee that is ${verdict >= 0 ? '+' : ''}${money(verdict)}.${verdict < 0 ? (w.signup ? ' Get the sign-up bonus first, then revisit before the fee renews.' : ' Ask about a no-fee version, or cancel after checking the effect on your credit history.') : ''}` });
  }

  // 8. Next card, judged on your own spending
  const market = Object.entries(CARDS).filter(([, x]) => x.market && !x.intro);
  const tries = market.map(([id, c]) => { const r = replay(personId, { extraCards: [{ id, limit: 8000, opened: 0 }] }); return { id, c, gain: r.best - R.best - c.fee }; }).sort((a, b) => b.gain - a.gain);
  const top = tries[0];
  add({ k: 'nextcard', title: top && top.gain > 50 ? `${top.c.name} would add ${m0(top.gain)} a year` : 'No new card is worth it for you right now', v: top && top.gain > 50 ? top.gain : 0, tidy: !(top && top.gain > 50),
    math: tries.map(t => `${t.c.name}: ${t.gain >= 0 ? '+' : ''}${money(t.gain)} a year after fees, on your real spending`).join('\n') + '\nNo bank pays CardRight for these results.' });

  const ranked = acts.filter(a => !a.tidy).sort((a, b) => b.v - a.v), tidy = acts.filter(a => a.tidy);
  return { person: personId, replay: R, actions: ranked, tidy, total: +ranked.reduce((a, x) => a + x.v, 0).toFixed(2) };
}
