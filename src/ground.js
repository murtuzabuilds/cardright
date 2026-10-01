// Grounds an intent in the person's actual account. Nothing is shown because a model "felt" it was
// relevant: every block Liminal assembles points back to evidence found here.
import { PEOPLE, when } from './data.js';

const H = 3600e3;
const spend = t => t.amount < 0;
const money = (n, cur = 'USD') => (cur === 'EUR' ? '€' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export { money };

// Same merchant, same amount, within 48 hours: the classic double charge.
export function duplicates(txns) {
  const out = [];
  const s = txns.filter(spend).sort((a, b) => a.ts - b.ts);
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
    const a = s[i], b = s[j];
    if (b.ts - a.ts > 48 * H) break;
    if (a.merchant === b.merchant && a.amount === b.amount) out.push({ kind: 'duplicate', txns: [a.id, b.id], merchant: a.merchant, amount: a.amount, currency: a.currency, minutesApart: Math.round((b.ts - a.ts) / 60e3) });
  }
  return out;
}

// A charge between midnight and 5am at a merchant the person has never used before.
export function unusual(txns) {
  const seen = new Map();
  const out = [];
  for (const t of [...txns].sort((a, b) => a.ts - b.ts)) {
    const hour = new Date(t.ts).getUTCHours(), first = !seen.has(t.merchant);
    seen.set(t.merchant, (seen.get(t.merchant) || 0) + 1);
    if (spend(t) && hour < 5 && (first || seen.get(t.merchant) <= 2)) out.push({ kind: 'unusual', txn: t.id, merchant: t.merchant, amount: t.amount, why: `${String(hour).padStart(2, '0')}:${String(new Date(t.ts).getUTCMinutes()).padStart(2, '0')} at a store you have not used before` });
  }
  return out;
}

export function categoryTotals(txns) {
  const m = {};
  for (const t of txns.filter(spend)) m[t.category] = +((m[t.category] || 0) + Math.abs(t.amount)).toFixed(2);
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([category, total]) => ({ category, total }));
}

export function upcomingBills(person, now, days = 7) {
  return person.bills.filter(b => b.due >= now && b.due - now <= days * 24 * H).map(b => ({ ...b, dueLabel: when(b.due) }));
}

// Things worth knowing before anyone asks. Used for the opening screen.
export function signals(personId, now) {
  const p = PEOPLE[personId], out = [];
  for (const d of duplicates(p.txns)) out.push({ ...d, text: `${d.merchant} charged ${money(d.amount, d.currency)} twice, ${d.minutesApart} minutes apart.` });
  for (const u of unusual(p.txns)) out.push({ ...u, text: `${money(u.amount)} at ${u.merchant}, ${u.why}.` });
  for (const b of upcomingBills(p, now)) out.push({ kind: 'bill', bill: b.id, text: `${b.name} for ${money(b.amount)} is due ${b.dueLabel}.` });
  return out;
}

export function ground(u, personId, now) {
  const p = PEOPLE[personId], e = u.entities, ev = { facts: [], gaps: [] };
  const fact = (text, ref) => ev.facts.push({ text, ref });
  const main = p.accounts[0], card = p.cards[0];
  ev.account = main; ev.card = card;
  switch (u.intent) {
    case 'dispute': {
      let pool = p.txns.filter(spend);
      if (e.merchant) pool = pool.filter(t => t.merchant === e.merchant);
      if (e.city) pool = pool.filter(t => t.city === e.city) .length ? pool.filter(t => t.city === e.city) : pool;
      if (e.amount) pool = pool.filter(t => Math.abs(Math.abs(t.amount) - e.amount) < 1).length ? pool.filter(t => Math.abs(Math.abs(t.amount) - e.amount) < 1) : pool;
      const dup = duplicates(pool)[0], odd = unusual(p.txns).filter(x => pool.some(t => t.id === x.txn));
      if (dup) { ev.target = dup.txns[1]; ev.reason = 'duplicate'; fact(`Two identical charges from ${dup.merchant}, ${money(dup.amount, dup.currency)} each, ${dup.minutesApart} minutes apart.`, dup.txns); }
      else if (odd.length) { ev.target = odd[0].txn; ev.reason = 'unusual'; ev.related = odd.map(o => o.txn); fact(`${odd.length} charge${odd.length > 1 ? 's' : ''} at ${odd[0].merchant} ${odd[0].why}.`, ev.related); }
      else if (pool.length && (e.merchant || e.amount)) { ev.target = pool[pool.length - 1].id; ev.reason = 'named'; fact(`Found the charge you mentioned: ${pool[pool.length - 1].merchant}.`, [ev.target]); }
      else ev.gaps.push('which charge');
      break;
    }
    case 'lost': case 'freeze': {
      fact(`${card.name} ending ${card.last4} is ${card.frozen ? 'frozen' : 'active'}.`, [card.id]);
      const odd = unusual(p.txns);
      if (odd.length) { ev.related = odd.map(o => o.txn); fact(`${odd.length} recent charge${odd.length > 1 ? 's look' : ' looks'} unusual.`, ev.related); }
      break;
    }
    case 'send': {
      const payee = p.payees.find(x => x.id === e.payee);
      if (payee) { ev.payee = payee; fact(`${payee.name} is one of your saved people.`, [payee.id]); } else ev.gaps.push('who to pay');
      if (e.amount) { ev.amount = e.amount; ev.enough = main.balance >= e.amount; fact(ev.enough ? `${money(main.balance)} in ${main.name} covers it.` : `${main.name} has ${money(main.balance)}, short of ${money(e.amount)}.`, [main.id]); } else ev.gaps.push('how much');
      break;
    }
    case 'payBill': {
      const due = p.bills.find(b => b.id === e.bill) || upcomingBills(p, now, 10)[0] || p.bills[0];
      if (due) { ev.bill = due; ev.enough = main.balance >= due.amount; fact(`${due.name}, ${money(due.amount)}, due ${when(due.due)}.`, [due.id]); }
      else ev.gaps.push('which bill');
      break;
    }
    case 'spending': {
      ev.totals = categoryTotals(p.txns);
      if (ev.totals.length) fact(`Most of this month went to ${ev.totals[0].category.toLowerCase()} (${money(ev.totals[0].total)}).`, []);
      break;
    }
    case 'fee': {
      const fees = p.txns.filter(t => t.category === 'Fees');
      const foreign = p.txns.filter(t => spend(t) && t.currency !== 'USD');
      ev.fees = fees.map(f => f.id); ev.foreignCount = foreign.length;
      if (fees.length) fact(`${fees[0].merchant.replace('Fee: ', '').replace(/^./, c => c.toUpperCase())} fee of ${money(fees[0].amount)}, from ${foreign.length} card payments made abroad.`, ev.fees);
      else ev.gaps.push('which fee');
      break;
    }
    case 'travel': fact(`${card.name} ending ${card.last4} works abroad.`, [card.id]); if (e.city) ev.city = e.city; else ev.gaps.push('where'); break;
    case 'goal': ev.goals = p.goals; if (p.goals[0]) fact(`${p.goals[0].name}: ${money(p.goals[0].saved)} of ${money(p.goals[0].target)}.`, [p.goals[0].id]); break;
    case 'limit': fact(`Current daily limit is ${money(card.limit)}.`, [card.id]); if (e.amount) ev.amount = e.amount; else ev.gaps.push('new limit'); break;
    case 'balance': fact(p.accounts.map(a => `${a.name} ${money(a.balance)}`).join(', ') + '.', p.accounts.map(a => a.id)); if (e.amount) { ev.amount = e.amount; ev.enough = main.balance >= e.amount; } break;
  }
  return ev;
}
