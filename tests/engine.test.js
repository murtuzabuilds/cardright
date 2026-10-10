import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend, replay, plan, payoff, readTerms, classify, evalTerms, evalMerchants, CARDS, PEOPLE, walletState, evaluate, rank, apply, explain, NOW, knownMerchant, toggleCarry, toggleActivate } from '../src/index.js';

const opt = (r, id) => r.options.find(o => o.cardId === id);

test('interest beats rewards: never send new spending to a card you carry a balance on', () => {
  for (const m of ['Chipotle', "Trader Joe's", 'Shell', 'Amazon', 'Electric utility']) {
    const r = recommend('jordan', { merchant: m, amount: 60 });
    assert.notEqual(r.best.cardId, 'discover-it', m);
  }
  // even with this quarter's 5% restaurants activated, 26.49% interest for three months costs more
  const P = PEOPLE.jordan, st = walletState(P, { activateAll: true });
  const e = evaluate('discover-it', st['discover-it'], { ts: NOW, merchant: 'Chipotle', amount: 100, cat: 'dining' }, { redeem: 'cash' });
  assert.equal(e.rewards, 5);
  assert.ok(e.net < 0);
});

test('the carried balance costs Jordan more than his rewards earn', () => {
  const r = replay('jordan');
  assert.ok(r.actual < 0);
  assert.ok(r.buckets.interest > r.buckets.card);
});

test('Costco takes only Visa credit cards', () => {
  const r = recommend('maya', { merchant: 'Costco', amount: 180 });
  assert.equal(CARDS[r.best.cardId].network, 'Visa');
  for (const id of ['amex-gold', 'chase-freedom-flex', 'citi-double-cash']) assert.ok(r.ineligible.some(x => x.cardId === id), id);
  assert.ok(opt(r, 'capone-360-debit'), 'debit still works');
  assert.ok(recommend('jordan', { merchant: 'Costco', amount: 120 }).ineligible.some(x => x.cardId === 'discover-it'));
});

test('superstores are not grocery stores', () => {
  const walmart = recommend('theo', { merchant: 'Walmart', amount: 100 }), kroger = recommend('theo', { merchant: 'Kroger', amount: 100 });
  assert.equal(opt(kroger, 'amex-bcp').rewards, 6);
  assert.equal(opt(walmart, 'amex-bcp').rewards, 1);
});

test('caps are respected', () => {
  const P = PEOPLE.theo, st = walletState(P), t = { ts: NOW, merchant: 'Kroger', amount: 500, cat: 'groceries' };
  st['amex-bcp'].caps['0|2026'] = 5800;
  const e = evaluate('amex-bcp', st['amex-bcp'], t, { redeem: 'cash' });
  assert.equal(e.rewards.toFixed(2), (200 * 0.06 + 300 * 0.01).toFixed(2));
});

test('rotating categories only pay when activated, and rates never stack', () => {
  const r = recommend('maya', { merchant: 'Whole Foods Market', amount: 100 });
  const ff = opt(r, 'chase-freedom-flex');
  assert.equal(ff.rewards, 1);
  assert.ok(ff.tips.some(t => t.k === 'activate'));
  const st = walletState(PEOPLE.maya, { activateAll: true });
  const dining = evaluate('chase-freedom-flex', st['chase-freedom-flex'], { ts: NOW, merchant: 'Chipotle', amount: 100, cat: 'dining' }, { redeem: 'cash' });
  assert.equal(dining.rewards, 5, '5% rotating, not 5% plus the 3% dining rate');
});

test('Apple Pay rates need a merchant that takes Apple Pay', () => {
  assert.equal(opt(recommend('theo', { merchant: 'Starbucks', amount: 100 }), 'apple-card').rewards, 2);
  const w = opt(recommend('theo', { merchant: 'Walmart', amount: 100 }), 'apple-card');
  assert.equal(w.rewards, 1);
  assert.ok(w.tips.some(t => t.k === 'applepay'));
  assert.equal(opt(recommend('theo', { merchant: 'Walgreens', amount: 100 }), 'apple-card').rewards, 3);
});

test('points are worth more for travel than for cash', () => {
  const t = { ts: NOW, merchant: 'Neighborhood restaurant', amount: 100, cat: 'dining' }, st = walletState(PEOPLE.maya);
  assert.equal(evaluate('amex-gold', st['amex-gold'], t, { redeem: 'cash' }).rewards, 4);
  assert.equal(+evaluate('amex-gold', st['amex-gold'], t, { redeem: 'travel' }).rewards.toFixed(2), 5.2);
});

test('foreign fees and no-FX cards', () => {
  const r = recommend('maya', { merchant: 'Restaurant in Lisbon', amount: 100 });
  assert.ok(opt(r, 'citi-double-cash').parts.some(p => p.k === 'fx'));
  assert.ok(!opt(r, 'amex-gold').parts.some(p => p.k === 'fx'));
});

test('HSA: the tax saving comes from the HSA, not the card, so the best rewards card still wins', () => {
  const r = recommend('theo', { merchant: 'Dentist', amount: 300 });
  // every way to pay gets the same tax saving (pay by card, reimburse from the HSA), so rewards decide
  for (const o of r.options) assert.equal(o.parts.find(p => p.k === 'tax').v, 72, o.name);
  assert.equal(r.best.cardId, 'chase-freedom-unlimited');
  assert.equal(r.best.net, 72 + 4.5);
  assert.equal(opt(r, 'fidelity-hsa').net, 72);
  assert.match(r.sentence, /reimburse yourself from your HSA/);
  assert.ok(recommend('theo', { merchant: 'Chipotle', amount: 30 }).ineligible.some(x => x.cardId === 'fidelity-hsa'));
  // the replay credits the tax only where HSA money was not used, and the plan says so plainly
  const R = replay('theo'), med = R.rows.filter(x => x.t.cat === 'medical');
  assert.ok(med.every(x => !x.actual.parts.some(p => p.k === 'tax') && x.best.parts.some(p => p.k === 'tax')));
  const hsa = plan('theo').actions.find(a => a.k === 'hsa');
  assert.match(hsa.math, /comes from the HSA, not from the card/);
});

test('paying taxes by card loses to a free bank transfer unless the card earns more than the fee', () => {
  const tax = recommend('theo', { merchant: 'IRS (Pay1040)', amount: 3000 });
  assert.equal(tax.best.cardId, 'bank-transfer');
  assert.equal(opt(tax, 'chase-freedom-unlimited').net, -7.5); // 1.5% back minus the 1.75% fee
  assert.ok(recommend('theo', { merchant: 'Chipotle', amount: 30 }).ineligible.some(x => x.cardId === 'chase-ink-unlimited'), 'business card only for business');
});

test('every recommendation adds up', () => {
  for (const [p, q] of [['maya', { merchant: 'Best Buy', amount: 1299 }], ['jordan', { merchant: 'Verizon', amount: 60 }], ['theo', { merchant: 'Kroger', amount: 110 }]]) {
    for (const o of recommend(p, q).options) assert.equal(o.net.toFixed(2), o.parts.reduce((a, x) => a + x.v, 0).toFixed(2));
  }
});

test('replay buckets add up to what was left on the table, and replays are deterministic', () => {
  for (const p of ['maya', 'jordan', 'theo']) {
    const r = replay(p), sum = Object.values(r.buckets).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - r.left) < 0.05, p);
    assert.equal(JSON.stringify(replay(p).buckets), JSON.stringify(r.buckets));
  }
});

test('payoff math and the balance transfer suggestion', () => {
  const a = payoff(3400, 0.2649, 450), b = payoff(3400, 0.23, 450, { introApr: 0, introMonths: 21, fee: 0.05 });
  assert.ok(a.interest > 300 && b.interest === 0 && b.fee === 170);
  assert.ok(plan('jordan').actions.some(x => x.k === 'transfer'));
});

test('the plan can say no to new cards and checks annual fees both ways', () => {
  for (const p of ['jordan', 'theo']) assert.ok(plan(p).tidy.some(a => a.k === 'nextcard'));
  assert.ok(plan('theo').tidy.some(a => a.k === 'fee' && a.keep));
});

test('reads fine print into rules', () => {
  const r = readTerms(CARDS['discover-it'].terms);
  assert.equal(r.earn[0].rate, 5); assert.equal(r.earn[0].cap.amount, 1500); assert.ok(r.earn[0].activation);
  assert.equal(readTerms(CARDS['amex-gold'].terms).fee, 325);
  assert.ok(readTerms(CARDS['apple-card'].terms).needsReview, 'conditional rates are sent to a person');
});

test('classifier says when it is unsure', () => {
  assert.equal(classify('Golden Wok').confidence < 0.7, true);
  assert.equal(classify('Costco').cat, 'wholesale');
});

test('evaluation: held-out misses are mostly caught, never silent for merchants', () => {
  const t = evalTerms('held'), m = evalMerchants('held');
  assert.ok(t.caught >= t.silent);
  assert.equal(m.silent, 0);
});

test('every card carries its sources and nothing in the wallets is unknown', () => {
  for (const [id, c] of Object.entries(CARDS)) assert.ok(c.sources?.length, id);
  for (const p of Object.values(PEOPLE)) for (const w of p.wallet) assert.ok(CARDS[w.id], w.id);
});

// ---- sign-up bonuses are all or nothing ----
const DAY = 864e5;
const mayaWith = (daysOpen, spent) => {
  const P = { ...PEOPLE.maya, id: 'maya', wallet: PEOPLE.maya.wallet.map(w => ({ ...w })) };
  const w = P.wallet.find(x => x.id === 'chase-sapphire-preferred'); w.opened = NOW - daysOpen * DAY; w.signup = { spent };
  return P;
};

test('a sign-up bonus that would be earned anyway is not spread across purchases', () => {
  const r = recommend('maya', { merchant: 'Costco', amount: 180 }), csp = opt(r, 'chase-sapphire-preferred');
  assert.equal(r.best.cardId, 'chase-sapphire-preferred');
  assert.equal(csp.net, 2.52, '180 x 1X x 1.4 cents, nothing else');
  assert.ok(!csp.parts.some(p => p.k === 'bonus'));
  assert.ok(csp.tips.some(t => t.k === 'bonusok'));
  assert.equal(r.best.score, r.best.net);
  // and the replay never credits bonus progress per purchase
  for (const p of ['maya', 'jordan', 'theo']) assert.ok(replay(p).rows.every(x => !x.best.parts.some(q => q.k === 'bonus')), p);
});

test('a sign-up bonus at risk changes the pick, shown as its own line and kept out of what you keep', () => {
  const P = mayaWith(60, 3500), st = walletState(P), t = { ts: NOW, merchant: 'Whole Foods Market', amount: 96, cat: 'groceries' };
  const r = rank(t, P, st), csp = r.options.find(o => o.cardId === 'chase-sapphire-preferred');
  assert.equal(r.best.cardId, 'chase-sapphire-preferred');
  assert.equal(csp.net, 1.34, 'what you keep is only the rewards');
  assert.ok(csp.signup.short > 0 && csp.score > csp.net);
  assert.ok(csp.tips[0].k === 'bonus' && /could miss it by Oct 31/.test(csp.tips[0].text));
  assert.match(explain(r, t), /sign-up bonus you could otherwise miss by Oct 31/);
  // a bonus that cannot be reached in time is not chased
  const P2 = mayaWith(75, 1500), r2 = rank(t, P2, walletState(P2));
  assert.equal(r2.best.cardId, 'amex-gold');
  assert.ok(r2.options.find(o => o.cardId === 'chase-sapphire-preferred').tips.some(x => x.k === 'bonusgone'));
});

test('the plan keeps one-time bonuses out of the yearly total and computes the share needed', () => {
  const pl = plan('maya'), su = [...pl.actions, ...pl.tidy].find(a => a.k === 'signup');
  assert.ok(su.oneTime && su.tidy, 'on track, so nothing to do');
  assert.match(su.math, /needs about \d+% of it/);
  assert.doesNotMatch(su.math, /most spending/);
  assert.equal(pl.total, +pl.actions.filter(a => !a.oneTime).reduce((a, x) => a + x.v, 0).toFixed(2));
  const fee = pl.actions.find(a => a.k === 'fee' && !a.keep);
  if (fee) { assert.ok(fee.saves); assert.match(fee.title, /downgrade or cancel/i); assert.doesNotMatch(fee.math, /\+\$/); }
});

test('known merchants match whatever the case or spacing, so their rules apply', () => {
  for (const typed of ['costco', 'COSTCO', '  Costco  ', 'cOsTcO']) {
    assert.equal(knownMerchant(typed), 'Costco');
    assert.equal(classify(typed).source, 'known merchant');
    const r = recommend('maya', { merchant: typed, amount: 180 });
    assert.equal(CARDS[r.best.cardId].network, 'Visa', typed);
    assert.ok(r.ineligible.some(x => x.cardId === 'amex-gold'), typed);
  }
  assert.equal(knownMerchant('trader joe’s'), "Trader Joe's");
  assert.equal(knownMerchant('whole   foods market'), 'Whole Foods Market');
  assert.equal(opt(recommend('maya', { merchant: 'uber', amount: 10 }), 'amex-gold').parts.find(p => p.k === 'credit').v, 10, 'Uber Cash still applies');
  assert.equal(knownMerchant('Golden Wok'), null);
});

test('plan routing and the rotating 5% move never count the same dollars twice', () => {
  for (const p of ['maya', 'jordan', 'theo']) {
    const R = replay(p), pl = plan(p), routing = pl.actions.find(a => a.k === 'routing'), act = pl.actions.find(a => a.k === 'activate');
    const catSum = R.cats.reduce((a, c) => a + c.cardGap, 0);
    assert.ok(Math.abs(catSum - R.buckets.card) < 0.05, p + ': category gaps are the wrong-card bucket');
    assert.ok((routing?.v || 0) <= R.buckets.card + 0.05, p);
    assert.ok((routing?.v || 0) + (act?.v || 0) <= R.buckets.card + R.buckets.activation + 0.05, p);
  }
});

test('wallet toggles keep the purchases already made this session', () => {
  const P = { ...PEOPLE.jordan, wallet: PEOPLE.jordan.wallet.map(w => ({ ...w, activated: [...(w.activated || [])] })) }, st = walletState(P);
  const t = { ts: NOW, merchant: 'Chipotle', amount: 40, cat: 'dining' }, res = rank(t, P, st).best;
  apply(st, res, t); st[res.cardId].balance += t.amount;
  const before = JSON.stringify({ caps: st[res.cardId].caps, bal: st[res.cardId].balance });
  toggleActivate(P, [st], 'discover-it', '2026Q4');
  assert.ok(st['discover-it'].activated.has('2026Q4'));
  toggleCarry(P, [st], 'discover-it');
  assert.equal(st['discover-it'].carry, false);
  assert.equal(JSON.stringify({ caps: st[res.cardId].caps, bal: st[res.cardId].balance }), before);
});

test('ties are called ties, and no activate nudge on a card that is not recommended', () => {
  const a = { cardId: 'citi-double-cash', name: 'Double Cash', net: 2, score: 2, parts: [{ k: 'rewards', label: 'Rewards', v: 2 }], tips: [] };
  const b = { ...a, cardId: 'wf-active-cash', name: 'Active Cash' }, t = { ts: NOW, merchant: 'Golden Wok', amount: 100, cat: 'other' };
  const said = explain({ best: a, options: [a, b] }, t);
  assert.match(said, /It ties with Active Cash/); assert.doesNotMatch(said, /\$0\.00 more/);
  const jr = recommend('jordan', { merchant: 'Electric utility', amount: 85 });
  assert.ok(!opt(jr, 'discover-it').tips.some(x => x.k === 'activate'), 'Discover carries a balance and still loses money');
  assert.doesNotMatch(plan('maya').actions.find(a => a.k === 'activate').math, /each/);
});

test('the README counts the cards honestly', async () => {
  const { readFileSync } = await import('node:fs');
  const md = readFileSync(new URL('../README.md', import.meta.url), 'utf8'), v = Object.values(CARDS);
  const credit = v.filter(c => ['credit', 'business'].includes(c.type)).length, debit = v.filter(c => ['debit', 'hsa'].includes(c.type)).length;
  assert.match(md, new RegExp(`${credit + debit} real US cards`)); assert.match(md, new RegExp(`${credit} credit cards`)); assert.match(md, new RegExp(`${debit} debit cards`));
  const tests = (readFileSync(new URL('./engine.test.js', import.meta.url), 'utf8').match(/^test\(/gm).length) + (readFileSync(new URL('./model.test.js', import.meta.url), 'utf8').match(/^test\(/gm).length);
  assert.match(md, new RegExp(`npm test +# ${tests} tests`));
});
