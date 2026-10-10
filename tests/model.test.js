import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modelCategory, pickCategory, classify, recommend } from '../src/index.js';

const fake = body => async () => new Response(JSON.stringify(body), { status: 200 });

test('only a category CardRight knows comes back from the model', async () => {
  assert.deepEqual(await modelCategory('Trattoria Bella', { fetchImpl: fake({ cat: 'dining', sure: true, why: 'Italian restaurant', model: 'm' }) }), { cat: 'dining', sure: true, why: 'Italian restaurant', model: 'm' });
  assert.equal(await modelCategory('X', { fetchImpl: fake({ cat: 'use-the-amex', sure: true }) }), null);
  assert.equal(await modelCategory('X', { fetchImpl: async () => new Response('{}', { status: 502 }) }), null);
  assert.equal(await modelCategory('X', { fetchImpl: async () => { throw new Error('offline'); } }), null);
  assert.equal(await modelCategory('', { fetchImpl: fake({ cat: 'dining' }) }), null);
});

test('a person, then a known merchant, then the model, then the name rules', () => {
  const rules = classify('Golden Wok'), model = { cat: 'dining', sure: true, why: 'Chinese restaurant', model: 'm' };
  assert.equal(pickCategory({ chosen: 'groceries', known: false, model, rules }).cat, 'groceries');
  assert.equal(pickCategory({ chosen: null, known: true, model, rules: classify('Costco') }).cat, 'wholesale');
  const m = pickCategory({ chosen: null, known: false, model, rules });
  assert.equal(m.cat, 'dining'); assert.ok(m.confidence >= 0.7); assert.match(m.note, /engine still picks the card/);
  assert.ok(pickCategory({ chosen: null, known: false, model: { ...model, sure: false }, rules }).confidence < 0.7, 'an unsure model still asks the person');
  assert.equal(pickCategory({ chosen: null, known: false, model: null, rules }).cat, 'other');
});

test('the card is still chosen by the engine from the category, the same way every time', () => {
  const a = recommend('maya', { merchant: 'Golden Wok', amount: 60, cat: 'dining' }), b = recommend('maya', { merchant: 'Golden Wok', amount: 60, cat: 'dining' });
  assert.equal(a.best.cardId, b.best.cardId); assert.equal(a.best.net, b.best.net);
});
