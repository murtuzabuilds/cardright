import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend, replay, plan, payoff, readTerms, classify, evalTerms, evalMerchants, CARDS, PEOPLE, walletState, evaluate, rank, NOW } from '../src/index.js';

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

test('HSA wins medical bills, and is refused elsewhere', () => {
  assert.equal(recommend('theo', { merchant: 'Dentist', amount: 300 }).best.cardId, 'fidelity-hsa');
  assert.ok(recommend('theo', { merchant: 'Chipotle', amount: 30 }).ineligible.some(x => x.cardId === 'fidelity-hsa'));
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
