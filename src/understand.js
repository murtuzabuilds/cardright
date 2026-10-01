// Turns what someone says into an intent and the details that matter.
// In this prototype it is a transparent, rule-based stand-in so the demo runs offline and every
// decision can be inspected. In a real product an LLM would fill the same output shape, and the
// rest of the pipeline would not change.
import { PEOPLE } from './data.js';

export const INTENTS = {
  dispute:  { label: 'Dispute a charge',      words: ['double', 'charged twice', 'twice', 'dispute', "don't recognize", 'dont recognize', 'not mine', 'wrong charge', 'refund', 'overcharged', 'duplicate', 'charged me'] },
  lost:     { label: 'Lost or stolen card',   words: ['lost', 'stolen', 'missing card', "can't find my card", 'cant find my card', 'someone used'] },
  freeze:   { label: 'Lock a card',         words: ['freeze', 'lock my card', 'block my card', 'pause my card'] },
  send:     { label: 'Send money',            words: ['send', 'pay back', 'transfer to', 'owe', 'split', 'give'] },
  payBill:  { label: 'Pay a bill',            words: ['bill', 'rent', 'utility', 'water', 'power', 'mobile', 'due'] },
  spending: { label: 'Understand spending',   words: ['spend', 'spent', 'spending', 'where did my money', 'budget', 'how much did i', 'too much'] },
  fee:      { label: 'Explain a fee',         words: ['fee', 'charged a fee', 'why was i charged', 'what is this charge'] },
  travel:   { label: 'Plan travel',           words: ['travel', 'trip', 'going to', 'flying', 'abroad', 'vacation'] },
  goal:     { label: 'Savings goal',          words: ['save', 'saving', 'goal', 'put aside'] },
  limit:    { label: 'Change a card limit',   words: ['limit', 'raise my limit', 'increase my limit', 'spending cap'] },
  balance:  { label: 'Check balance',         words: ['balance', 'how much do i have', 'how much money', 'can i afford'] },
  human:    { label: 'Talk to a person',      words: ['person', 'human', 'agent', 'call', 'speak to', 'help me'] },
};

const CITIES = ['lisbon', 'chicago', 'portland', 'madison', 'tokyo', 'paris', 'london', 'mexico city', 'berlin'];
const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (t, w) => new RegExp(`\\b${esc(w)}\\b`).test(t);
const num = s => parseFloat(String(s).replace(/[,$€]/g, ''));

export function extract(text, person) {
  const t = text.toLowerCase(), e = {};
  const amt = text.match(/[$€]\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s?(?:dollars|usd|euros|eur)\b/i);
  if (amt) e.amount = num(amt[1] || amt[2]);
  else { const bare = text.match(/\b(\d{2,}(?:,\d{3})*(?:\.\d+)?)\b(?!\s?(?:am|pm|in the|o'clock))/i); if (bare) e.amount = num(bare[1]); }
  const city = CITIES.find(c => t.includes(c)); if (city) e.city = city.replace(/\b\w/g, m => m.toUpperCase());
  if (person) {
    const m = person.txns.find(x => has(t, x.merchant.toLowerCase().split(' ')[0]) && x.merchant.length > 3 && !/^(fee|client|payroll|pension)/i.test(x.merchant));
    if (m) e.merchant = m.merchant;
    const p = person.payees.find(x => has(t, x.name.toLowerCase().split(' ')[0]) || has(t, x.handle.slice(1)));
    if (p) e.payee = p.id;
    const b = person.bills.find(x => x.name.toLowerCase().split(' ').some(w => w.length > 3 && has(t, w)));
    if (b) e.bill = b.id;
    const g = person.goals.find(x => x.name.toLowerCase().split(' ').some(w => w.length > 2 && has(t, w)));
    if (g) e.goal = g.id;
  }
  if (/\b(yesterday|last night)\b/.test(t)) e.when = 'yesterday';
  else if (/\blast week\b/.test(t)) e.when = 'last week';
  else if (/\bthis month\b/.test(t)) e.when = 'this month';
  if (/\b(stolen|fraud|someone used|not me)\b/.test(t)) e.urgent = true;
  return e;
}

export function understand(text, personId, prefs) {
  const fixed = prefs?.corrections?.[text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()];
  if (fixed && INTENTS[fixed]) return { text, intent: fixed, label: INTENTS[fixed].label, confidence: .99, alternatives: [], ambiguous: false, entities: extract(text, PEOPLE[personId]), learned: true };
  const person = PEOPLE[personId], t = ' ' + text.toLowerCase().replace(/[^a-z0-9'$€.\s]/g, ' ') + ' ';
  const scores = Object.entries(INTENTS).map(([id, d]) => {
    let s = 0; for (const w of d.words) if (t.includes(w)) s += w.includes(' ') ? 1.6 : 1;
    return [id, s];
  });
  const entities = extract(text, person);
  const bump = (id, v) => { const r = scores.find(x => x[0] === id); r[1] += v; };
  // context: the same words mean different things depending on what we know
  if (entities.urgent) { bump('lost', 1.2); bump('freeze', .8); }
  if (entities.payee) bump('send', /\bpay\b/.test(t) ? 2.5 : 1.5);
  if (entities.goal) bump('goal', 1.2);
  if (entities.bill) bump('payBill', 1);
  if (entities.merchant || entities.city) bump('dispute', .4);
  if (/\bfee\b/.test(t)) bump('dispute', -.8);
  scores.sort((a, b) => b[1] - a[1]);
  const [top, second] = scores;
  // Confidence needs both strength (how much evidence) and margin (how clearly it beats the runner-up).
  // A single weak hint should never look sure of itself.
  const strength = Math.min(1, top[1] / 2), margin = top[1] ? (top[1] - (second?.[1] || 0)) / top[1] : 0;
  const confidence = top[1] === 0 ? 0 : Math.min(.99, strength * .7 + margin * .3);
  return {
    text, intent: top[1] > 0 ? top[0] : 'unknown', label: top[1] > 0 ? INTENTS[top[0]].label : 'Not sure yet',
    confidence: +confidence.toFixed(2),
    alternatives: scores.slice(1, 3).filter(x => x[1] > 0).map(([id]) => ({ id, label: INTENTS[id].label })),
    ambiguous: second && second[1] > 0 && top[1] - second[1] < .5,
    entities,
  };
}
