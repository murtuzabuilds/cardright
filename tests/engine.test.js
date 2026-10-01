import test from 'node:test';
import assert from 'node:assert/strict';
import { run, understand, duplicates, unusual, home, evaluate, PEOPLE, prefs, NOW, COMPONENTS } from '../src/index.js';

test('finds the double hotel charge', () => {
  const d = duplicates(PEOPLE.maya.txns);
  assert.equal(d.length, 1);
  assert.equal(d[0].merchant, 'Hotel Miradouro');
  assert.equal(d[0].minutesApart, 2);
});

test('flags 3am charges at a new store', () => {
  const u = unusual(PEOPLE.ruth.txns);
  assert.deepEqual(u.map(x => x.txn), ['r4', 'r5']);
});

test('a dispute screen is built around the evidence', () => {
  const { plan, evidence } = run('I think the hotel in Lisbon charged me twice', 'maya');
  assert.equal(plan.intent, 'dispute');
  assert.equal(evidence.target, 't5');
  assert.ok(plan.blocks.some(b => b.id === 'duplicatePair'));
  assert.ok(plan.evidence[0].text.includes('Hotel Miradouro'));
});

test('anchors never move', () => {
  for (const [p, t] of [['maya', 'send Jonas $40'], ['ruth', 'my card was stolen'], ['theo', 'asdf qwerty']]) {
    const b = run(t, p).plan.blocks;
    assert.equal(b[0].id, 'balance');
    assert.equal(b.at(-1).id, 'fullApp');
  }
});

test('anything that moves money or locks a card waits for a yes', () => {
  for (const [p, t] of [['maya', 'send Jonas $40'], ['theo', 'raise my limit to 12000'], ['ruth', 'please lock my card'], ['theo', 'pay the studio rent']]) {
    const { plan } = run(t, p);
    const risky = plan.blocks.filter(b => b.risk === 'high');
    assert.ok(risky.length > 0, t);
    assert.ok(risky.every(b => b.needsConfirm), t);
    assert.ok(plan.blocks.some(b => b.id === 'confirmStep'), t);
  }
});

test('no actions on a guess', () => {
  const { plan } = run('why is my balance lower than last week', 'ruth');
  assert.ok(plan.lowConfidence);
  assert.ok(plan.blocks.some(b => b.id === 'clarify'));
  assert.ok(plan.blocks.every(b => b.risk === 'low'));
});

test('urgent requests surface a person', () => {
  const { plan } = run('someone used my card at 3 in the morning', 'ruth');
  assert.ok(plan.blocks.some(b => b.id === 'talkToPerson'));
  assert.ok(plan.blocks.some(b => b.id === 'freezeCard'));
});

test('plain mode rewrites titles and keeps text large for Ruth', () => {
  const { plan } = run('please lock my card', 'ruth');
  assert.equal(plan.textScale, 1.25);
  assert.ok(plan.blocks.some(b => b.title === 'Lock your card'));
});

test('pins stay, hides are honoured, anchors cannot be hidden', () => {
  let p = prefs.fresh();
  p = prefs.pin(p, 'goalProgress');
  p = prefs.hide(p, 'payeePicker');
  p = prefs.hide(p, 'balance');
  const { plan } = run('send Jonas $40', 'maya', { prefs: p });
  assert.ok(plan.blocks.some(b => b.id === 'goalProgress' && b.pinned));
  assert.ok(!plan.blocks.some(b => b.id === 'payeePicker'));
  assert.equal(plan.blocks[0].id, 'balance');
});

test('a correction is remembered for the same words', () => {
  const before = understand('my wallet is gone', 'maya');
  assert.notEqual(before.intent, 'lost');
  const p = prefs.correct(prefs.fresh(), 'my wallet is gone', 'lost');
  assert.equal(understand('My wallet is gone!', 'maya', p).intent, 'lost');
});

test('every hidden block says why', () => {
  const { plan } = run('what is this foreign transaction fee', 'maya');
  assert.ok(plan.hidden.length > 0);
  assert.ok(plan.hidden.every(h => h.reason && COMPONENTS[h.id]));
});

test('home screen leads with what is worth knowing', () => {
  const h = home('maya', NOW);
  assert.ok(h.signals.some(s => s.kind === 'duplicate'));
  assert.ok(h.signals.some(s => s.kind === 'bill'));
});

test('evaluation: tuned set, held-out set, and safety invariants', () => {
  const a = evaluate(), b = evaluate('held-out');
  assert.equal(a.n, 30); assert.equal(b.n, 15);
  assert.ok(a.safe && a.anchored && b.safe && b.anchored);
  assert.ok(a.liminalSteps < a.staticSteps);
  // most held-out misses should be caught as "not sure" rather than shown confidently
  assert.ok(b.caughtMisses > b.confidentMisses);
});
