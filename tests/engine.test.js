import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend, replay, plan, payoff, readTerms, classify, evalTerms, evalMerchants, CARDS, PEOPLE, walletState, evaluate, NOW } from '../src/index.js';

test('interest beats rewards: never send new spending to a card you carry a balance on', () => {
  for (const m of ['Hilltop Grocers', 'Shopline', 'Pacific Fuel', 'Bulkhaus Club']) {
    const r = recommend('jordan', { merchant: m, amount: 120 });
    assert.notEqual(r.best.cardId, 'ridgeline-rotate', m);
  }
  const ridge = recommend('jordan', { merchant: 'Shopline', amount: 100 }).options.find(o => o.cardId === 'ridgeline-rotate');
  assert.ok(ridge.net < 0, 'a 5% card at 26.2% APR should lose money');
});

test('the carried balance costs Jordan more than his rewards earn', () => {
  const r = replay('jordan');
  assert.ok(r.actual < 0);
  assert.ok(r.buckets.interest > r.buckets.card);
});

test('caps are respected', () => {
  const P = PEOPLE.theo, st = walletState(P), t = { ts: NOW, merchant: 'Greenleaf Market', amount: 500, cat: 'groceries' };
  st['halden-gas-grocery'].caps['2026'] = 5800;
  const e = evaluate('halden-gas-grocery', st['halden-gas-grocery'], t, {});
  assert.equal(e.rewards.toFixed(2), (200 * 0.03 + 300 * 0.01).toFixed(2));
});

test('rotating categories only pay when activated', () => {
  const r = recommend('maya', { merchant: 'Shopline', amount: 100 });
  const ridge = r.options.find(o => o.cardId === 'ridgeline-rotate');
  assert.ok(ridge.tips.some(t => t.k === 'activate'));
});

test('foreign fees and no-FX cards', () => {
  const r = recommend('maya', { merchant: 'Casa do Fado', amount: 100 });
  assert.ok(r.options.find(o => o.cardId === 'halden-everyday').parts.some(p => p.k === 'fx'));
  assert.ok(!r.options.find(o => o.cardId === 'northwind-table').parts.some(p => p.k === 'fx'));
});

test('HSA wins medical, and is refused elsewhere', () => {
  assert.equal(recommend('theo', { merchant: 'Osei Family Dental', amount: 300 }).best.cardId, 'lakeside-hsa');
  assert.ok(recommend('theo', { merchant: 'Noodle Lab', amount: 30 }).ineligible.some(x => x.cardId === 'lakeside-hsa'));
});

test('business card only for business, and tax payments count the processor fee', () => {
  assert.ok(recommend('theo', { merchant: 'Noodle Lab', amount: 30 }).ineligible.some(x => x.cardId === 'kiln-business'));
  const tax = recommend('theo', { merchant: 'Treasury tax payment', amount: 3000 });
  const oneP = tax.options.find(o => o.cardId === 'halden-gas-grocery');
  assert.ok(oneP.net < 0, 'a 1% card loses money on a 1.85% processing fee');
});

test('every recommendation adds up', () => {
  const r = recommend('maya', { merchant: 'Voltix Electronics', amount: 1299 });
  for (const o of r.options) assert.equal(o.net.toFixed(2), o.parts.reduce((a, p) => a + p.v, 0).toFixed(2));
});

test('replay buckets add up to what was left on the table', () => {
  for (const p of ['maya', 'jordan', 'theo']) {
    const r = replay(p), sum = Object.values(r.buckets).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - r.left) < 0.05, p);
    assert.equal(JSON.stringify(replay(p).buckets), JSON.stringify(r.buckets), 'deterministic');
  }
});

test('payoff math and the balance transfer suggestion', () => {
  const a = payoff(3400, 0.262, 450), b = payoff(3400, 0.249, 450, { introApr: 0, introMonths: 18, fee: 0.03 });
  assert.ok(a.interest > 300 && b.interest === 0 && b.fee === 102);
  assert.ok(plan('jordan').actions.some(x => x.k === 'transfer'));
});

test('the plan can say no to new cards', () => {
  for (const p of ['jordan', 'theo']) assert.ok(plan(p).tidy.some(a => a.k === 'nextcard'));
});

test('reads fine print into rules', () => {
  const r = readTerms(CARDS['ridgeline-rotate'].terms);
  assert.equal(r.earn[0].rate, 5); assert.equal(r.earn[0].cap.amount, 1500); assert.ok(r.earn[0].activation);
  assert.deepEqual(r.earn[0].rotatingNow, ['online', 'wholesale']);
  assert.equal(readTerms(CARDS['northwind-table'].terms).fee, 250);
});

test('classifier says when it is unsure', () => {
  assert.equal(classify('Golden Wok').confidence < 0.7, true);
  assert.equal(classify('Pacific Fuel').cat, 'gas');
});

test('evaluation: held-out misses are mostly caught, never silent for merchants', () => {
  const t = evalTerms('held'), m = evalMerchants('held');
  assert.ok(t.caught >= t.silent);
  assert.equal(m.silent, 0);
});
