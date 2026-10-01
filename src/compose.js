// Assembles the screen for this moment. Three rules it never breaks:
// 1. The model decides the layout, never the action. Anything that moves money or locks a card
//    is shown as a prepared form and waits for an explicit confirm.
// 2. Anchors stay put. Balance is always first and "Show the full app" is always last, so the
//    screen changes shape without the person ever feeling lost.
// 3. Every block carries the reason it is there, and every hidden block carries the reason it is not.
import { COMPONENTS, STATIC_HOME } from './components.js';
import { PEOPLE } from './data.js';
import { signals } from './ground.js';

const RECIPES = {
  dispute:  [['duplicatePair', 'The charge you mean, side by side with its twin'], ['merchantCard', 'Who charged you, so you can be sure'], ['disputeForm', 'Already filled in from the charge']],
  lost:     [['freezeCard', 'Stops new charges in one tap, reversible'], ['txnList', 'Recent charges, unusual ones marked'], ['replaceCard', 'A new card number once you are ready']],
  freeze:   [['cardStatus', 'What the card can do right now'], ['freezeCard', 'You asked to pause the card']],
  send:     [['payeePicker', 'Your saved people'], ['sendForm', 'Amount and person filled in from what you said']],
  payBill:  [['billList', 'What is due and when'], ['payBill', 'The bill you meant, ready to pay']],
  spending: [['spendBreakdown', 'This month by category'], ['budgetHint', 'One thing that would change the picture']],
  fee:      [['feeExplainer', 'Why the fee happened, in plain words'], ['txnList', 'The payments that caused it']],
  travel:   [['travelNotice', 'Tell us where you are going'], ['cardStatus', 'Your card works there']],
  goal:     [['goalProgress', 'Where your goal stands'], ['moveMoney', 'Top it up from your main account']],
  limit:    [['cardStatus', 'Your current limit'], ['limitChange', 'The new limit you asked for']],
  balance:  [['txnList', 'What moved recently']],
  human:    [['talkToPerson', 'A person who can see what you see here']],
};

const PLAIN = {
  duplicatePair: 'You were charged twice', disputeForm: 'Ask for your money back', freezeCard: 'Lock your card',
  merchantCard: 'Who took the money', txnList: 'Recent payments', feeExplainer: 'Why you paid a fee',
  spendBreakdown: 'Where your money went', payBill: 'Pay this bill', sendForm: 'Send money', confirmStep: 'Check, then say yes',
};

export function compose(u, ev, opts = {}) {
  const p = PEOPLE[opts.person], prefs = { pins: [], hides: [], ...(p?.prefs || {}), ...(opts.prefs || {}) };
  const blocks = [], hidden = [], add = (id, reason, extra = {}) => {
    if (blocks.some(b => b.id === id)) return;
    const c = COMPONENTS[id];
    blocks.push({ id, title: prefs.plain && PLAIN[id] ? PLAIN[id] : c.title, reason, risk: c.risk, needsConfirm: c.risk === 'high', ...extra });
  };

  add('balance', 'Always here, always in the same place');
  const lowConfidence = u.intent === 'unknown' || u.confidence < .45 || u.ambiguous;

  if (lowConfidence) {
    add('clarify', u.intent === 'unknown' ? 'Not sure what you need yet, so nothing is guessed' : `Not sure between ${[u.label, ...u.alternatives.map(a => a.label)].slice(0, 2).join(' and ')}`, { options: [u.intent, ...u.alternatives.map(a => a.id)].filter(x => x && x !== 'unknown') });
  }
  if (!lowConfidence || u.intent !== 'unknown') {
    let recipe = RECIPES[u.intent] || [];
    if (u.intent === 'dispute' && ev.reason !== 'duplicate') recipe = recipe.filter(([id]) => id !== 'duplicatePair').concat(ev.reason === 'unusual' ? [['freezeCard', 'These look like someone else, so locking the card is one tap away']] : []);
    if (u.intent === 'freeze' && ev.related?.length) recipe = [['freezeCard', 'You asked to lock the card'], ['txnList', 'Charges that do not look like you, which may be why you are locking it'], ['talkToPerson', 'If these were not you, a person can help get the money back'], ['cardStatus', 'What the card can do right now']];
    if (lowConfidence) recipe = recipe.filter(([id]) => COMPONENTS[id].risk === 'low'); // no actions on a guess
    for (const [id, why] of recipe) add(id, why);
  }
  for (const id of prefs.pins) add(id, 'You pinned this', { pinned: true });
  if (u.entities?.urgent && !blocks.some(b => b.id === 'talkToPerson')) add('talkToPerson', 'This sounds urgent, so a person is one tap away');

  // a confirm step follows any block that would change money or the card
  const actions = blocks.filter(b => b.risk !== 'low');
  if (actions.length) add('confirmStep', 'Nothing happens until you say yes, and you can undo for 10 seconds');
  add('fullApp', 'Everything else is still here if you want it');

  // honour hides, except safety and anchors
  for (const id of prefs.hides) {
    const i = blocks.findIndex(b => b.id === id);
    if (i > -1 && !COMPONENTS[id].anchor && id !== 'confirmStep') { blocks.splice(i, 1); hidden.push({ id, reason: 'You asked not to see this' }); }
  }
  const shown = new Set(blocks.map(b => b.id));
  for (const id of STATIC_HOME) if (!shown.has(id) && !hidden.some(h => h.id === id)) hidden.push({ id, reason: 'Not needed for this' });

  // steps to finish: say it, fill each gap, review each action, confirm once
  const steps = 1 + (lowConfidence ? 1 : 0) + (ev.gaps?.length || 0) + (actions.length ? actions.length + 1 : 0);
  return {
    intent: u.intent, label: u.label, confidence: u.confidence, lowConfidence, blocks, hidden, steps,
    confirmations: actions.map(a => a.id), textScale: prefs.textScale || 1, plain: !!prefs.plain,
    evidence: ev.facts || [], gaps: ev.gaps || [],
  };
}

// The opening screen, before anyone types: anchors plus whatever the account says is worth knowing.
export function home(personId, now, opts = {}) {
  const s = signals(personId, now), p = PEOPLE[personId];
  const prefs = { pins: [], ...(p.prefs || {}), ...(opts.prefs || {}) };
  const blocks = [{ id: 'balance', title: 'Balance', reason: 'Always here, always in the same place', risk: 'low' }];
  if (s.length) blocks.push({ id: 'alerts', title: prefs.plain ? 'Worth a look' : 'Alerts', reason: `${s.length} thing${s.length > 1 ? 's' : ''} in your account worth knowing`, risk: 'low', items: s });
  blocks.push({ id: 'txnList', title: prefs.plain ? PLAIN.txnList : 'Recent activity', reason: 'What moved recently', risk: 'low' });
  for (const id of prefs.pins) if (!blocks.some(b => b.id === id)) blocks.push({ id, title: COMPONENTS[id].title, reason: 'You pinned this', risk: COMPONENTS[id].risk, pinned: true });
  blocks.push({ id: 'fullApp', title: 'Show the full app', reason: 'Everything else is still here if you want it', risk: 'low' });
  return { intent: 'home', blocks, signals: s, textScale: prefs.textScale || 1, plain: !!prefs.plain };
}
