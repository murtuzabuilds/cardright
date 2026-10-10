// The plan: a short list of moves, ranked by dollars per year, each with the math behind it.
// Nothing here is a product placement. The "next card" check can, and often does, say no.
import { CARDS, CATEGORY } from './cards.js';
import { PEOPLE, NOW } from './people.js';
import { replay } from './replay.js';
import { money, walletState, signupPace, bonusValue, shortDate } from './optimize.js';

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

  // 1. Which card for which kind of spending, measured with the person's real activation habits
  //    (the rotating 5% move below counts the activation dollars, so they are not counted here too)
  const rules = [...R.cats].sort((a, b) => b.cardGap - a.cardGap).filter(c => c.cardGap > 5).slice(0, 5).map(c => ({ cat: c.label, card: CARDS[c.smartCard].short, v: c.cardGap, spend: c.spend }));
  if (rules.length) add({ k: 'routing', title: 'Use the right card for each kind of spending', v: rules.reduce((a, r) => a + r.v, 0), rules,
    math: rules.map(r => `${r.cat} → ${r.card}: +${money(r.v)} on ${money(r.spend)} a year`).join('\n') });

  // 2. Interest on new spending
  if (R.buckets.interest > 1) {
    const w = P.wallet.find(x => x.carry), c = CARDS[w.id];
    add({ k: 'stop', title: `Stop putting new spending on ${c.short} until it is paid off`, v: R.buckets.interest,
      math: `You carry ${money(w.balance)} there at ${(w.apr * 100).toFixed(2)}%. Every new purchase starts paying interest the day you buy it, which cost ${money(R.buckets.interest)} last year. Its rewards earned back far less.` });
  }

  // 3. The carried balance itself
  const carried = P.wallet.find(x => x.carry && x.balance > 0);
  if (carried && P.monthlyPayment) {
    const c = CARDS[carried.id], now = payoff(carried.balance, carried.apr, P.monthlyPayment);
    const bt = Object.entries(CARDS).find(([, x]) => x.market && x.intro);
    if (bt) {
      const [id, b] = bt, alt = payoff(carried.balance, (b.apr[0] + b.apr[1]) / 2, P.monthlyPayment, { introApr: b.intro.apr, introMonths: b.intro.months, fee: b.intro.transferFee });
      const save = now.interest - (alt.interest + alt.fee);
      if (save > 0) add({ k: 'transfer', title: `Move the ${m0(carried.balance)} balance to a 0% transfer card`, v: save, card: id, oneTime: true,
        math: `Paying ${money(P.monthlyPayment)} a month: on ${c.short} it takes ${now.months} months and ${money(now.interest)} in interest. On a ${b.intro.months}-month 0% card like ${b.name} it takes ${alt.months} months, costing a ${money(alt.fee)} transfer fee (${b.intro.transferFee * 100}%) and ${money(alt.interest)} interest. Approval and the transfer limit depend on your credit. CardRight is not paid for this suggestion.` });
    }
  }

  // 4. Bonus categories
  const rot = P.wallet.filter(w => CARDS[w.id].earn?.some(e => e.rotating));
  if (R.buckets.activation > 1) add({ k: 'activate', title: 'Turn on rotating 5% categories every quarter', v: R.buckets.activation,
    math: `${rot.map(w => CARDS[w.id].short).join(' and ')} only ${rot.length > 1 ? 'pay' : 'pays'} 5% in quarters you activate. You skipped some last year, which cost ${money(R.buckets.activation)}. This quarter: ${rot.map(w => { const e = CARDS[w.id].earn.find(x => x.rotating); return `${CARDS[w.id].short} pays 5% on ${e.rotating['2026Q4'].cats.map(c => CATEGORY[c].toLowerCase()).join(' and ')}, up to ${m0(e.cap.amount)} a ${e.cap.period}`; }).join('; ')}.` });

  // 5. Tax: HSA and business spending. The saving comes from using pre-tax HSA money, not from the card swiped.
  if (R.buckets.tax > 1) {
    const med = R.rows.filter(r => r.best.parts.some(p => p.k === 'tax')), medAmt = med.reduce((a, r) => a + r.t.amount, 0);
    const rewards = med.reduce((a, r) => a + (r.best.parts.find(p => p.k === 'rewards')?.v || 0), 0), cards = [...new Set(med.map(r => r.best.name))];
    add({ k: 'hsa', title: 'Cover medical bills with your HSA money', v: R.buckets.tax,
      math: `Money in an HSA goes in before tax. Last year ${money(medAmt)} of medical bills were paid with after-tax money instead. At a ${Math.round(P.taxRate * 100)}% tax rate, covering them from the HSA would have saved about ${money(R.buckets.tax)}. The saving comes from the HSA, not from the card: pay with ${cards.join(' or ')} and reimburse yourself from the HSA${rewards > 0.005 ? `, which also keeps ${money(rewards)} in card rewards,` : ''} or pay with the HSA card directly. Either way it needs enough money in the HSA. Keep the receipts.` });
  }
  const bizCard = P.wallet.find(w => CARDS[w.id].type === 'business');
  const biz = R.rows.filter(r => r.t.business), bizOnPersonal = bizCard ? biz.filter(r => r.actual.cardId !== bizCard.id) : [];
  if (bizOnPersonal.length) {
    const amt = bizOnPersonal.reduce((a, r) => a + r.t.amount, 0);
    add({ k: 'business', title: 'Put work spending on the business card', v: 0, tidy: true,
      math: `${money(amt)} of work expenses went on a personal card. Keeping them on ${CARDS[bizCard.id].short} makes them easy to deduct and to prove at tax time, at a similar rewards rate.` });
  }

  // 6. Sign-up bonuses: one time, so never part of the yearly total. Only a move when it is at risk.
  for (const w of P.wallet) {
    const c = CARDS[w.id]; if (!c.signup || !w.signup) continue;
    const deadline = w.opened + c.signup.days * DAY, left = c.signup.spend - w.signup.spent, days = Math.max(0, Math.round((deadline - NOW) / DAY));
    if (left <= 0 || days <= 0) continue;
    const pace = signupPace(P, walletState(P), { offers: P.offers, taxRate: P.taxRate, redeem: P.redeem })[w.id] || 0;
    const daily = R.spend / 365, monthly = R.spend / 12, ahead = daily * days, projected = pace * days, short = left - projected;
    const needShare = left / ahead, usualShare = pace / daily, bonusVal = bonusValue(c.signup, c.pv[P.redeem === 'travel' ? 'travel' : 'cash']);
    const name = `${c.short} sign-up bonus (${c.signup.points ? c.signup.points.toLocaleString('en-US') + ' points, about ' : ''}${m0(bonusVal)})`, when = shortDate(deadline);
    const pctOf = v => `${Math.round(v * 100)}%`;
    const head = `${money(left)} to go in ${days} days. You spend about ${money(monthly)} a month, about ${money(ahead)} before ${when}, so ${c.short} needs about ${pctOf(Math.min(1, needShare))} of it.`;
    if (short <= 0) add({ k: 'signup', title: `On track for the ${name} by ${when}`, v: 0, tidy: true, oneTime: true,
      math: `${head} The cards CardRight already picks for you put about ${pctOf(usualShare)} of your spending on ${c.short}, roughly ${money(projected)} by then, so the bonus comes without changing anything. That is why it is not added to any single purchase or to the yearly total.` });
    else add({ k: 'signup', title: `Move some spending to ${c.short} to get the ${name} before ${when}`, v: bonusVal - short * 0.02, oneTime: true,
      math: `${head} The cards CardRight would otherwise pick put only about ${pctOf(usualShare)} on it, roughly ${money(projected)}, so you would be about ${money(short)} short.${needShare > 1 ? ' Even all of your usual spending may not be enough.' : ''} Moving ${money(short)} from cards that earn up to about 2% costs at most ${money(short * 0.02)}. This is one time, so it is kept out of the yearly total.` });
  }

  // 7. Annual fees: does each card earn back what it costs?
  for (const w of P.wallet) {
    const c = CARDS[w.id]; if (!c.fee) continue;
    // judged over a full year of ownership, without the one-time sign-up bonus
    const full = replay(personId, { openAll: true }), without = replay(personId, { exclude: [w.id], openAll: true }), adds = full.best - without.best;
    const verdict = adds - c.fee;
    add({ k: 'fee', title: verdict >= 0 ? `${c.short} earns its ${m0(c.fee)} fee` : w.signup ? `After the bonus, downgrade or cancel ${c.short} before its ${m0(c.fee)} fee renews` : `Downgrade or cancel ${c.short}: it does not earn its ${m0(c.fee)} fee`, v: verdict >= 0 ? 0 : -verdict, keep: verdict >= 0, tidy: verdict >= 0, saves: verdict < 0,
      math: verdict >= 0 ? `Used well, it adds ${money(adds)} a year over your other cards. Minus the ${money(c.fee)} fee that leaves ${money(verdict)} a year.`
        : `Used well, it adds only ${money(adds)} a year over your other cards, ${money(-verdict)} less than its ${money(c.fee)} fee. Switching to a no-fee card from the same bank, or cancelling, would save that ${money(-verdict)} a year.${w.signup ? ' Get the sign-up bonus first: it is worth far more than one year of the fee.' : ''} Check the effect on your credit history before you cancel.` });
  }

  // 8. Next card, judged on your own spending
  const market = Object.entries(CARDS).filter(([, x]) => x.market && !x.intro);
  const tries = market.map(([id, c]) => { const r = replay(personId, { extraCards: [{ id, limit: 8000, opened: 0 }] }); return { id, c, gain: r.best - R.best - c.fee }; }).sort((a, b) => b.gain - a.gain);
  const top = tries[0];
  add({ k: 'nextcard', title: top && top.gain > 50 ? `${top.c.short} would add ${m0(top.gain)} a year` : 'No new card is worth it for you right now', v: top && top.gain > 50 ? top.gain : 0, tidy: !(top && top.gain > 50),
    math: tries.map(t => `${t.c.name}: ${t.gain >= 0 ? '+' : ''}${money(t.gain)} a year after fees, on your real spending`).join('\n') + '\nNo bank pays CardRight for these results.' });

  const ranked = acts.filter(a => !a.tidy).sort((a, b) => b.v - a.v), tidy = acts.filter(a => a.tidy);
  // total is what repeats every year; one-time items such as a sign-up bonus are kept apart
  return { person: personId, replay: R, actions: ranked, tidy, total: +ranked.filter(a => !a.oneTime).reduce((a, x) => a + x.v, 0).toFixed(2), oneTime: +ranked.filter(a => a.oneTime).reduce((a, x) => a + x.v, 0).toFixed(2) };
}
