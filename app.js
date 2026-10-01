import { PEOPLE, STATIC_HOME, STATIC_PATHS, COMPONENTS, run, home, prefs as P, duplicates, unusual, categoryTotals, money, when, NOW } from './src/index.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = {
  pin: '<svg viewBox="0 0 24 24"><path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/></svg>',
  hide: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  go: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};
const COLORS = { maya: '#B9A6FF', theo: '#6CE3C9', ruth: '#FFC9A8' };
const TRIES = {
  maya: ['I think the hotel in Lisbon charged me twice', 'what is this foreign transaction fee', 'send Jonas $40 for dinner', 'how much have I saved for the Japan trip', 'my wallet is gone'],
  theo: ['pay the studio rent', 'send Ines 1200 for the September work', 'how much did I spend on supplies', 'raise my limit to 12000'],
  ruth: ["I don't recognize these QuickCart charges", 'someone used my card at 3 in the morning', 'pay the water bill', 'why is my balance lower than last week'],
};
const CMP_TRIES = ['lock my card', 'what bills are due', 'where did my money go this month'];

const qs = new URLSearchParams(location.search);
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const S = {
  person: PEOPLE[qs.get('p')] ? qs.get('p') : 'maya',
  mode: ['liminal', 'static', 'compare'].includes(qs.get('mode')) ? qs.get('mode') : 'liminal',
  text: qs.get('q') || '', res: null, form: {}, done: {},
  prefs: Object.fromEntries(Object.keys(PEOPLE).map(id => [id, { ...P.fresh(), ...(store.get('liminal:prefs:' + id) || {}) }])),
  cmpText: '',
};
const savePrefs = () => store.set('liminal:prefs:' + S.person, S.prefs[S.person]);

// ---------- block renderers ----------
const R = {
  balance(b, c) {
    const [main, ...rest] = c.p.accounts;
    return `<div class="sub">${c.plain ? 'You have this to spend' : esc(main.name)}</div><div class="big">${money(main.balance)}</div>
      <div class="sub">${rest.map(a => `${esc(a.name)} ${money(a.balance)}`).join(' · ')}</div>`;
  },
  alerts(b, c) {
    const say = s => s.kind === 'duplicate' ? `I was charged twice by ${s.merchant}` : s.kind === 'unusual' ? `I don't recognize the ${s.merchant} charges` : `pay the ${c.p.bills.find(x => x.id === s.bill).name} bill`;
    const seen = new Set();
    return b.items.filter(s => { const k = s.kind + (s.merchant || s.bill); if (seen.has(k)) return false; seen.add(k); return true; })
      .map(s => `<button class="signal ${s.kind}" data-run="${esc(say(s))}"><i></i><span>${esc(s.text)}</span><em>${s.kind === 'bill' ? 'Pay' : 'Sort it'}</em></button>`).join('');
  },
  txnList(b, c) {
    const ev = c.ev || {}, hl = new Set([...(ev.related || []), ...(ev.fees || []), ev.target].filter(Boolean));
    let list = [...c.p.txns].sort((a, b) => b.ts - a.ts);
    if (c.u?.intent === 'fee') { list = list.filter(t => t.currency !== 'USD' || t.category === 'Fees'); list.forEach(t => hl.add(t.id)); }
    else if (hl.size) list = [...list.filter(t => hl.has(t.id)), ...list.filter(t => !hl.has(t.id))];
    return list.slice(0, c.u?.intent === 'fee' ? 8 : 5).map(t => `<div class="row ${hl.has(t.id) ? 'hl' : ''}"><div><div class="m">${esc(t.merchant)}${t.disputed ? ' · <span class="s">disputed</span>' : ''}</div><div class="s">${when(t.ts)} · ${esc(t.city)}</div></div><div class="amt ${t.amount > 0 ? 'in' : ''}">${t.amount > 0 ? '+' : '-'}${money(t.amount, t.currency)}</div></div>`).join('');
  },
  duplicatePair(b, c) {
    const d = duplicates(c.p.txns)[0]; if (!d) return '';
    const [a, z] = d.txns.map(id => c.p.txns.find(t => t.id === id));
    const tm = t => new Date(t.ts).toISOString().slice(11, 16);
    return `<div class="pair"><div>First<b>${money(a.amount, a.currency)}</b>${when(a.ts)}, ${tm(a)}</div><div>Second<b>${money(z.amount, z.currency)}</b>${when(z.ts)}, ${tm(z)}</div></div>
      <p class="note" style="margin-top:8px">Same hotel, same amount, ${d.minutesApart} minutes apart. Hotels sometimes do this when a card is tapped twice at check-in.</p>`;
  },
  merchantCard(b, c) {
    const t = c.p.txns.find(x => x.id === c.ev?.target); if (!t) return '';
    const visits = c.p.txns.filter(x => x.merchant === t.merchant).length;
    const line = c.ev.reason === 'unusual' ? `You have not shopped here before. Both charges came in after 3am, four minutes apart.` : `${visits} payment${visits > 1 ? 's' : ''} to them, all in ${esc(t.city)}.`;
    return `<div class="row"><div><div class="m">${esc(t.merchant)}</div><div class="s">${esc(t.city)} · ${esc(t.category)}</div></div></div><p class="note">${line}</p>`;
  },
  disputeForm(b, c) {
    const t = c.p.txns.find(x => x.id === c.ev?.target); if (!t) return `<p class="note">Tell me which charge and I will fill this in.</p>`;
    const reason = c.ev.reason === 'duplicate' ? 'Charged twice' : c.ev.reason === 'unusual' ? 'I did not make this' : 'Something is wrong';
    const total = c.ev.reason === 'unusual' ? c.ev.related.reduce((a, id) => a + Math.abs(c.p.txns.find(x => x.id === id).amount), 0) : Math.abs(t.amount);
    if (t.disputed) return `<p class="done">Opened. ${money(total, t.currency)} is held back while we check, usually 3 to 5 days.</p>`;
    return `<div class="field"><span>Charge</span><b>${esc(t.merchant)}</b></div><div class="field"><span>Reason</span><b>${reason}</b></div><div class="field"><span>Amount</span><b>${money(total, t.currency)}</b></div>
      <button class="act" data-confirm="dispute">Review and send ${ICON.go}</button>`;
  },
  cardStatus(b, c) {
    const k = c.p.cards[0];
    return `<div class="cardviz ${k.frozen ? 'frozen' : ''}"><div>${esc(k.name)}<br>•••• ${k.last4}</div><div>${k.replacing ? 'New card on the way' : ''}</div></div>
      <div class="field" style="border:0;margin-top:6px"><span>Daily limit</span><b>${money(k.limit)}</b></div>`;
  },
  freezeCard(b, c) {
    const k = c.p.cards[0];
    return `<p class="note">${k.frozen ? 'Your card is locked. Nothing new can be charged to it.' : c.plain ? 'This stops anyone using your card. Your bills still get paid. You can unlock it any time.' : 'Stops new card payments right away. Bills and transfers keep working. Unlock any time.'}</p>
      <button class="act ${k.frozen ? 'soft' : 'warn'}" data-confirm="freeze">${ICON.lock} ${k.frozen ? 'Unlock card' : 'Lock card'}</button>`;
  },
  replaceCard(b, c) {
    const k = c.p.cards[0];
    return k.replacing ? `<p class="done">Ordered. It will arrive in 3 to 5 days with a new number.</p>` : `<p class="note">A new card with a new number, at your home address in 3 to 5 days.</p><button class="act soft" data-confirm="replace">Order a new card</button>`;
  },
  payeePicker(b, c) {
    return `<div class="payees">${c.p.payees.map(x => `<button class="payee ${S.form.payee === x.id ? 'on' : ''}" data-payee="${x.id}"><i>${x.name[0]}</i>${esc(x.name.split(' ')[0])}</button>`).join('')}</div>`;
  },
  sendForm(b, c) {
    const to = c.p.payees.find(x => x.id === S.form.payee), main = c.p.accounts[0], amt = +S.form.amount || 0;
    if (S.done.send) return `<p class="done">${esc(S.done.send)}</p>`;
    return `<div class="field"><span>To</span><b>${to ? esc(to.name) : 'Pick someone above'}</b></div>
      <div class="field"><span>Amount</span><input data-f="amount" inputmode="decimal" value="${amt || ''}" placeholder="0.00"></div>
      <div class="field"><span>From</span><b>${esc(main.name)}</b></div>
      ${amt > main.balance ? `<div class="warnline">That is more than ${money(main.balance)} in ${esc(main.name)}.</div>` : ''}
      <button class="act" data-confirm="send" ${!to || !amt || amt > main.balance ? 'disabled' : ''}>Review ${ICON.go}</button>`;
  },
  billList(b, c) {
    return [...c.p.bills].sort((a, z) => a.due - z.due).map(x => `<div class="row ${S.form.bill === x.id ? 'hl' : ''}"><div><div class="m">${esc(x.name)}</div><div class="s">${x.paid ? 'Paid' : 'Due ' + when(x.due)}</div></div><div class="amt">${money(x.amount)}</div></div>`).join('');
  },
  payBill(b, c) {
    const x = c.p.bills.find(z => z.id === S.form.bill); if (!x) return '';
    if (x.paid) return `<p class="done">Paid ${money(x.amount)} to ${esc(x.name)}.</p>`;
    return `<div class="field"><span>Bill</span><b>${esc(x.name)}</b></div><div class="field"><span>Amount</span><b>${money(x.amount)}</b></div><div class="field"><span>Due</span><b>${when(x.due)}</b></div>
      <button class="act" data-confirm="payBill">Review ${ICON.go}</button>`;
  },
  spendBreakdown(b, c) {
    const tot = categoryTotals(c.p.txns), max = tot[0]?.total || 1;
    return `<div class="bars">${tot.slice(0, 6).map(x => `<div class="b"><span>${esc(x.category)}</span><span class="t"><i style="width:${(x.total / max * 100).toFixed(0)}%"></i></span><span class="v">${money(x.total)}</span></div>`).join('')}</div>`;
  },
  budgetHint(b, c) {
    const tot = categoryTotals(c.p.txns), all = tot.reduce((a, x) => a + x.total, 0), top = tot[0];
    const odd = unusual(c.p.txns);
    let s = `${top.category} was ${Math.round(top.total / all * 100)}% of what you spent this month.`;
    if (odd.length) s = `Most of your spending this month was two QuickCart orders made at 3am. If those were not you, we can stop them and get the money back.`;
    else if (top.category === 'Travel') s += ' Almost all of it was the Lisbon trip, so there is nothing to change.';
    else if (top.category === 'Contractors') s += ' That is the studio working, not a leak. Your tax pot is on track.';
    return `<p class="note">${s}</p>${odd.length ? `<button class="act soft" data-run="I don't recognize these QuickCart charges">Look at those charges</button>` : ''}`;
  },
  feeExplainer(b, c) {
    const f = c.p.txns.find(t => t.category === 'Fees'), abroad = c.p.txns.filter(t => t.amount < 0 && t.currency !== 'USD');
    const sum = abroad.reduce((a, t) => a + Math.abs(t.amount), 0);
    if (!f) return `<p class="note">No fees this month.</p>`;
    return `<p class="note">Aurel adds about 3% when you pay in another currency. You made ${abroad.length} card payments in euros in Lisbon, about ${money(sum, 'EUR')} in total, so the fee came to <b>${money(f.amount)}</b>.</p>
      <p class="note" style="margin-top:6px">It was charged correctly. A card without foreign fees would have saved it.</p>`;
  },
  travelNotice(b, c) {
    if (S.done.travel) return `<p class="done">${esc(S.done.travel)}</p>`;
    return `<div class="field"><span>Where</span><b>${esc(c.ev?.city || 'Add a place')}</b></div><div class="field"><span>When</span><b>Next month</b></div>
      <button class="act soft" data-quick="travel">Save notice</button>`;
  },
  goalProgress(b, c) {
    if (!c.p.goals.length) return `<p class="note">No goals yet.</p>`;
    return c.p.goals.map(g => `<div class="row"><div class="m">${esc(g.name)}</div><div class="amt">${money(g.saved)} of ${money(g.target)}</div></div><div class="prog"><i style="width:${Math.min(100, g.saved / g.target * 100).toFixed(0)}%"></i></div><div class="sub">${money(g.target - g.saved)} to go</div>`).join('');
  },
  moveMoney(b, c) {
    if (S.done.move) return `<p class="done">${esc(S.done.move)}</p>`;
    return `<div class="field"><span>Amount</span><input data-f="move" inputmode="decimal" value="${S.form.move || ''}"></div><div class="field"><span>From</span><b>${esc(c.p.accounts[0].name)}</b></div>
      <button class="act soft" data-confirm="move" ${!+S.form.move ? 'disabled' : ''}>Review ${ICON.go}</button>`;
  },
  limitChange(b, c) {
    const k = c.p.cards[0];
    if (S.done.limit) return `<p class="done">${esc(S.done.limit)}</p>`;
    return `<div class="field"><span>Now</span><b>${money(k.limit)}</b></div><div class="field"><span>New</span><input data-f="limit" inputmode="decimal" value="${S.form.limit || ''}"></div>
      <button class="act" data-confirm="limit" ${!+S.form.limit ? 'disabled' : ''}>Review ${ICON.go}</button>`;
  },
  talkToPerson(b, c) {
    return `<p class="note">${c.plain ? 'A real person will see this screen, so you will not have to explain it again.' : 'They will see this screen and what you asked, so you will not have to start over.'}</p>
      <div class="chips" style="margin-top:10px"><button class="chip" data-quick="call">Call now</button><button class="chip" data-quick="chat">Chat</button></div>`;
  },
  clarify(b, c) {
    const opts = (b.options || []).map(id => `<button class="chip" data-intent="${id}">${esc(LABEL[id])}</button>`).join('');
    return `<p class="note" style="margin-bottom:10px">${opts ? 'I want to get this right. Which one is it?' : 'I did not catch that. Pick one, or say it another way.'}</p><div class="chips">${opts || ['dispute', 'lost', 'send', 'payBill', 'spending', 'human'].map(id => `<button class="chip" data-intent="${id}">${esc(LABEL[id])}</button>`).join('')}</div>`;
  },
};
const LABEL = { dispute: 'Dispute a charge', lost: 'Lost or stolen card', freeze: 'Lock my card', send: 'Send money', payBill: 'Pay a bill', spending: 'Understand spending', fee: 'Explain a fee', travel: 'Plan travel', goal: 'Savings goal', limit: 'Change my limit', balance: 'Check balance', human: 'Talk to a person' };

function blockHTML(b, c, { tools = true } = {}) {
  if (b.id === 'confirmStep') return `<div class="lockline">${ICON.lock}<span>${c.plain ? 'Nothing happens until you say yes.' : 'Nothing moves until you say yes. Undo for 10 seconds after.'}</span></div>`;
  if (b.id === 'fullApp') return `<div class="full"><button data-full>Show the full app</button></div>`;
  const body = R[b.id] ? R[b.id](b, c) : '';
  if (!body) return '';
  const anchor = COMPONENTS[b.id]?.anchor;
  const pinned = S.prefs[c.person].pins.includes(b.id);
  const t = tools && !anchor && b.id !== 'clarify' ? `<div class="tools"><button title="${pinned ? 'Unpin' : 'Pin: always show this'}" class="${pinned ? 'on' : ''}" data-pin="${b.id}">${ICON.pin}</button><button title="Not useful: stop showing this" data-hide="${b.id}">${ICON.hide}</button></div>` : '';
  return `<div class="blk ${anchor ? 'anchor' : ''} ${pinned ? 'pinned' : ''}" style="animation-delay:${c.i++ * 60}ms"><h4>${esc(b.title)}</h4>${t}${body}</div>`;
}

function phoneHTML(person, res, { interactive = true, text = '' } = {}) {
  const p = PEOPLE[person], plan = res ? res.plan : home(person, NOW, { prefs: S.prefs[person] });
  const c = { p, person, u: res?.understanding, ev: res?.evidence, plan, plain: plan.plain, i: 0 };
  const hello = plan.plain ? `Hello, ${p.first}` : `Good afternoon, ${p.first}`;
  return {
    ts: plan.textScale,
    html: `<div class="app-top"><div class="hello">${hello}</div><div class="aurel">AUREL</div></div>
    ${interactive ? `<form class="ask" data-ask><input name="q" placeholder="${plan.plain ? 'Tell us what you need' : 'Tell Aurel what you need'}" autocomplete="off" aria-label="Tell Aurel what you need"><button aria-label="Go">${ICON.go}</button></form>` : ''}
    ${res ? `<div class="heard">You said <b>"${esc(text)}"</b>${interactive ? '<button class="x" data-reset>Start over</button>' : ''}</div>` : ''}
    <div class="blocks">${plan.blocks.map(b => blockHTML(b, c, { tools: interactive })).join('')}</div>`,
  };
}

// ---------- reasoning panel ----------
function whyHTML() {
  const rules = `<div class="card"><div class="k">The rules it never breaks</div><div class="rules">
    <div>AI shapes the screen. Only you take the action.</div><div>Balance stays first, the full app stays last. You never get lost.</div>
    <div>Every block says why it is there. Every hidden one says why not.</div><div>Unsure means it asks, never guesses.</div><div>It learns only from what you pin and correct.</div></div></div>`;
  if (S.mode === 'static') {
    const path = S.res ? STATIC_PATHS[S.res.understanding.intent] : null;
    return `<h3>Today's app</h3><p class="lede">One layout for everyone. ${STATIC_HOME.length} blocks on the home screen whether you came to check a balance or because your card was stolen. The job is yours to find.</p>
      ${path ? `<div class="card"><div class="k">To do what you asked</div><div class="effort"><div class="e"><span>Today's app</span><span class="t"><i style="width:${path.length / 9 * 100}%;background:var(--peach)"></i></span><b>${path.length}</b></div><div class="e"><span>Liminal</span><span class="t"><i style="width:${S.res.plan.steps / 9 * 100}%;background:var(--lav)"></i></span><b>${S.res.plan.steps}</b></div></div></div>` : ''}
      <div class="card"><div class="k">Same request, other mode</div><p class="lede">Switch back to Liminal to see the screen this person would get instead.</p></div>`;
  }
  if (!S.res) {
    const h = home(S.person, NOW, { prefs: S.prefs[S.person] });
    return `<h3>Why this screen</h3><p class="lede">Before ${esc(PEOPLE[S.person].first)} types anything, the app opens on what is true in the account right now. Ask it something and watch it reshape.</p>
      <div class="card"><div class="k">Found in the account</div>${h.signals.length ? h.signals.map(s => `<div class="ev">${esc(s.text)}</div>`).join('') : '<p class="lede">Nothing unusual.</p>'}</div>${rules}`;
  }
  const { understanding: u, plan } = S.res, path = STATIC_PATHS[u.intent];
  const col = plan.lowConfidence ? 'var(--peach)' : 'var(--lav)';
  return `<h3>Why this screen</h3>
    <div class="card"><div class="k">Heard</div><div class="quote">"${esc(u.text)}"</div></div>
    <div class="card"><div class="k"><span>Understood</span><span>${u.learned ? 'learned from your correction' : plan.lowConfidence ? 'not sure, so it asks' : ''}</span></div>
      <div class="intent"><span>${esc(u.label)}</span><span style="font-family:var(--mono);font-size:13px;color:${col}">${Math.round(u.confidence * 100)}%</span></div>
      <div class="conf"><i style="width:${u.confidence * 100}%;background:${col}"></i></div>
      ${u.alternatives.length ? `<div class="alts">Also considered: ${u.alternatives.map(a => esc(a.label)).join(', ')}</div>` : ''}
      ${Object.keys(u.entities).length ? `<div class="alts">Picked out: ${Object.entries(u.entities).map(([k, v]) => k === 'urgent' ? 'sounds urgent' : null).filter(Boolean).concat(Object.entries(u.entities).filter(([k]) => k !== 'urgent').map(([k, v]) => `${k} ${esc(k === 'payee' ? PEOPLE[S.person].payees.find(x => x.id === v)?.name : k === 'bill' ? PEOPLE[S.person].bills.find(x => x.id === v)?.name : k === 'goal' ? PEOPLE[S.person].goals.find(x => x.id === v)?.name : k === 'amount' ? money(v) : v)}`)).join(' · ')}</div>` : ''}</div>
    <div class="card"><div class="k">Grounded in</div>${plan.evidence.map(f => `<div class="ev">${esc(f.text)}</div>`).join('') || '<p class="lede">Nothing to check yet.</p>'}${plan.gaps.map(g => `<div class="gap">Still needs: ${esc(g)}</div>`).join('')}</div>
    <div class="card"><div class="k"><span>On screen</span><span>${plan.blocks.length}</span></div><div class="lst">${plan.blocks.map(b => `<div><span class="dot ${b.risk}"></span><b>${esc(b.title)}${b.needsConfirm ? ' · needs your yes' : ''}</b><small>${esc(b.reason)}</small></div>`).join('')}</div></div>
    <div class="card"><details><summary>Left out: ${plan.hidden.length} things today's app would show ▾</summary><div class="lst">${plan.hidden.map(h => `<div><span class="dot off"></span><b>${esc(COMPONENTS[h.id].title)}</b><small>${esc(h.reason)}</small></div>`).join('')}</div></details></div>
    ${path ? `<div class="card"><div class="k">Steps to get it done</div><div class="effort"><div class="e"><span>Today's app</span><span class="t"><i style="width:${path.length / 9 * 100}%;background:var(--peach)"></i></span><b>${path.length}</b></div><div class="e"><span>Liminal</span><span class="t"><i style="width:${plan.steps / 9 * 100}%;background:var(--lav)"></i></span><b>${plan.steps}</b></div></div></div>` : ''}
    ${rules}`;
}

// ---------- static mode ----------
function staticHTML() {
  const p = PEOPLE[S.person], c = { p, person: S.person, plain: false, i: 0 };
  const path = S.res ? STATIC_PATHS[S.res.understanding.intent] : null;
  const blocks = STATIC_HOME.map(id => {
    if (id === 'alerts') return { id, title: 'Alerts', items: [] , empty: true };
    return { id, title: COMPONENTS[id].title };
  });
  const body = blocks.map(b => {
    if (b.id === 'alerts') return `<div class="blk"><h4>Alerts</h4><p class="note">You have ${p.txns.length} new transactions.</p></div>`;
    if (b.id === 'balance') return blockHTML(b, c, { tools: false });
    const inner = b.id === 'payeePicker' ? `<div class="payees">${p.payees.map(x => `<span class="payee"><i>${x.name[0]}</i>${esc(x.name.split(' ')[0])}</span>`).join('')}</div>`
      : b.id === 'travelNotice' ? '<p class="note">Going abroad? Set a travel notice.</p>'
      : b.id === 'moveMoney' ? '<p class="note">Move money between your accounts.</p>'
      : b.id === 'talkToPerson' ? '<p class="note">Help centre, FAQs, contact us.</p>'
      : b.id === 'cardStatus' ? `<p class="note">${esc(p.cards[0].name)} •••• ${p.cards[0].last4}</p>`
      : (R[b.id] ? R[b.id](b, c) : '');
    return `<div class="blk"><h4>${esc(b.title)}</h4>${inner}</div>`;
  }).join('');
  return `<div class="static"><div class="app-top"><div class="hello">Home</div><div class="aurel">AUREL</div></div>
    ${path ? `<div class="pathbox"><b>To do "${esc(S.text)}" here, it takes ${path.length} taps:</b><ol>${path.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
    <div class="blocks">${body}</div><div class="tabs"><span><i></i>Home</span><span><i></i>Accounts</span><span><i></i>Cards</span><span><i></i>Pay</span><span><i></i>Insights</span></div></div>`;
}

// ---------- render ----------
function render() {
  document.querySelectorAll('.mode').forEach(m => m.classList.toggle('on', m.dataset.mode === S.mode));
  const cmp = S.mode === 'compare';
  $('stage').hidden = cmp; $('compare').hidden = !cmp;
  if (cmp) return renderCompare();
  $('people').innerHTML = Object.values(PEOPLE).map(p => `<button class="who ${p.id === S.person ? 'on' : ''}" data-who="${p.id}"><span class="av" style="background:${COLORS[p.id]}">${p.first[0]}</span><span><b>${esc(p.first)}</b><small>${esc(p.blurb)}</small></span></button>`).join('');
  $('tries').innerHTML = TRIES[S.person].map(t => `<button class="try" data-run="${esc(t)}">${esc(t)}</button>`).join('');
  const scr = $('screen');
  if (S.mode === 'static') { scr.style.setProperty('--ts', 1); scr.innerHTML = staticHTML(); }
  else { const { html, ts } = phoneHTML(S.person, S.res, { text: S.text }); scr.style.setProperty('--ts', ts); scr.innerHTML = html; }
  $('why').innerHTML = whyHTML();
}

function renderCompare() {
  $('cmpTries').innerHTML = CMP_TRIES.map(t => `<button class="try" data-cmp="${esc(t)}">${esc(t)}</button>`).join('');
  $('cmpRow').innerHTML = Object.values(PEOPLE).map(p => {
    const res = S.cmpText ? run(S.cmpText, p.id, { prefs: S.prefs[p.id] }) : null;
    const { html, ts } = phoneHTML(p.id, res, { interactive: false, text: S.cmpText });
    const plan = res ? res.plan : home(p.id, NOW);
    const notes = [`${plan.blocks.length} blocks`, plan.textScale > 1 ? `text ${Math.round(plan.textScale * 100)}%` : null, plan.plain ? 'plain words' : null, res?.plan.blocks.some(b => b.id === 'talkToPerson') ? 'a person one tap away' : null].filter(Boolean).join(' · ');
    return `<div class="cmp-col" data-col="${p.id}"><div class="phone"><div class="notch"></div><div class="screen" style="--ts:${ts}">${html}</div></div><div class="cap"><b>${esc(p.first)}</b><small>${esc(p.blurb)}<br>${notes}</small></div></div>`;
  }).join('');
}

function ask(text) {
  text = text.trim(); if (!text) return;
  S.text = text; S.done = {};
  S.res = run(text, S.person, { prefs: S.prefs[S.person] });
  const ev = S.res.evidence, p = PEOPLE[S.person];
  S.form = { payee: ev.payee?.id, amount: ev.amount || '', bill: ev.bill?.id, limit: S.res.understanding.intent === 'limit' ? ev.amount || '' : '', move: S.res.understanding.intent === 'goal' ? 200 : '' };
  if (!S.form.bill && p.bills[0]) S.form.bill = [...p.bills].sort((a, z) => a.due - z.due)[0].id;
  if (S.mode === 'static' && !STATIC_PATHS[S.res.understanding.intent]) S.mode = 'liminal';
  render(); $('screen').scrollTo({ top: 0, behavior: 'smooth' });
}
function rerun() { const keep = { form: S.form, done: S.done }; S.res = run(S.text, S.person, { prefs: S.prefs[S.person] }); Object.assign(S, keep); render(); }

// ---------- actions with confirm + undo ----------
const ACTIONS = {
  dispute: c => { const ev = c.ev, ids = ev.reason === 'unusual' ? ev.related : [ev.target], t = c.p.txns.find(x => x.id === ev.target); const total = ids.reduce((a, id) => a + Math.abs(c.p.txns.find(x => x.id === id).amount), 0); return { title: `Dispute ${money(total, t.currency)}?`, why: `We will ask ${t.merchant} for it back and hold the amount while we check. You will not be charged for this.`, rows: [['Charge', t.merchant], ['Reason', ev.reason === 'duplicate' ? 'Charged twice' : 'I did not make this'], ['Amount', money(total, t.currency)]], go: () => ids.forEach(id => c.p.txns.find(x => x.id === id).disputed = true), msg: 'Dispute opened.' }; },
  freeze: c => { const k = c.p.cards[0]; return { title: k.frozen ? 'Unlock your card?' : 'Lock your card?', why: k.frozen ? 'Card payments will work again straight away.' : 'New card payments will be declined. Bills and transfers keep working. Unlock any time.', rows: [['Card', `${k.name} •••• ${k.last4}`]], go: () => { k.frozen = !k.frozen; }, msg: k.frozen ? 'Card unlocked.' : 'Card locked.' }; },
  replace: c => { const k = c.p.cards[0]; return { title: 'Order a new card?', why: 'Your current card stops working when you activate the new one.', rows: [['Card', `${k.name} •••• ${k.last4}`], ['Arrives', '3 to 5 days']], go: () => { k.replacing = true; }, msg: 'New card ordered.' }; },
  send: c => { const to = c.p.payees.find(x => x.id === S.form.payee), amt = +S.form.amount, a = c.p.accounts[0]; return { title: `Send ${money(amt)} to ${to.name.split(' ')[0]}?`, why: `It leaves ${a.name} now and usually arrives within a minute.`, rows: [['To', to.name], ['Amount', money(amt)], ['From', `${a.name}, ${money(a.balance)} now`]], go: () => { a.balance = +(a.balance - amt).toFixed(2); c.p.txns.push({ id: 'x' + Date.now(), ts: NOW, merchant: to.name, city: 'Online', country: 'US', amount: -amt, category: 'Transfers', currency: 'USD' }); S.done.send = `Sent ${money(amt)} to ${to.name}.`; }, msg: 'Sent.' }; },
  payBill: c => { const b = c.p.bills.find(x => x.id === S.form.bill), a = c.p.accounts[0]; return { title: `Pay ${b.name}?`, why: `${money(b.amount)} from ${a.name}. It is due ${when(b.due)}.`, rows: [['Bill', b.name], ['Amount', money(b.amount)], ['From', a.name]], go: () => { a.balance = +(a.balance - b.amount).toFixed(2); b.paid = true; }, msg: 'Bill paid.' }; },
  move: c => { const amt = +S.form.move, g = c.p.goals[0], a = c.p.accounts[0]; return { title: `Move ${money(amt)} to ${g.name}?`, why: `From ${a.name}. You can move it back any time.`, rows: [['Amount', money(amt)], ['From', a.name], ['To', g.name]], go: () => { a.balance = +(a.balance - amt).toFixed(2); g.saved += amt; S.done.move = `Moved ${money(amt)} to ${g.name}.`; }, msg: 'Moved.' }; },
  limit: c => { const k = c.p.cards[0], amt = +S.form.limit; return { title: `Change your limit to ${money(amt)}?`, why: amt > k.limit * 1.25 ? 'This is a big jump, so we will text you a code before it takes effect.' : 'It takes effect straight away.', rows: [['Now', money(k.limit)], ['New', money(amt)]], go: () => { k.limit = amt; S.done.limit = `Limit is now ${money(amt)}.`; }, msg: 'Limit changed.' }; },
};
let undoTimer;
function confirmSheet(kind) {
  const p = PEOPLE[S.person], c = { p, ev: S.res?.evidence || {} }, a = ACTIONS[kind](c);
  const sh = $('sheet'); sh.hidden = false; sh.style.setProperty('--ts', S.res?.plan.textScale || 1);
  sh.innerHTML = `<div class="in"><h3>${esc(a.title)}</h3><p class="why2">${esc(a.why)}</p>${a.rows.map(([k, v]) => `<div class="field"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}
    <button class="act" data-yes>Yes, do it</button><button class="act soft" data-no>Not now</button></div>`;
  sh.onclick = e => {
    if (e.target === sh || e.target.closest('[data-no]')) { sh.hidden = true; return; }
    if (!e.target.closest('[data-yes]')) return;
    sh.hidden = true;
    const snap = structuredClone(p), doneSnap = { ...S.done };
    a.go(); rerun();
    toast(a.msg, () => { for (const k of Object.keys(snap)) p[k] = snap[k]; S.done = doneSnap; rerun(); toast('Undone.'); });
  };
}
function toast(msg, undo) {
  const t = $('toast'); clearInterval(undoTimer); t.hidden = false;
  if (!undo) { t.innerHTML = `<span>${esc(msg)}</span>`; undoTimer = setTimeout(() => t.hidden = true, 1800); return; }
  let n = 10; const draw = () => t.innerHTML = `<span>${esc(msg)}</span><button data-undo>Undo (${n})</button>`; draw();
  t.onclick = e => { if (e.target.closest('[data-undo]')) { clearInterval(undoTimer); t.hidden = true; undo(); } };
  undoTimer = setInterval(() => { n--; if (n <= 0) { clearInterval(undoTimer); t.hidden = true; } else draw(); }, 1000);
}

// ---------- events ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-run],[data-who],[data-mode],[data-pin],[data-hide],[data-intent],[data-confirm],[data-full],[data-reset],[data-payee],[data-quick],[data-cmp]');
  if (!el) return;
  const d = el.dataset;
  if (d.cmp) { S.cmpText = d.cmp; $('askAllIn').value = d.cmp; return renderCompare(); }
  if (d.run !== undefined) { if (S.mode === 'compare') { S.mode = 'liminal'; const col = el.closest('[data-col]'); if (col) S.person = col.dataset.col; } return ask(d.run); }
  if (d.who) { S.person = d.who; S.res = null; S.text = ''; S.done = {}; return render(); }
  if (d.mode) { S.mode = d.mode; return render(); }
  if (d.pin) { const pr = S.prefs[S.person]; S.prefs[S.person] = pr.pins.includes(d.pin) ? P.unpin(pr, d.pin) : P.pin(pr, d.pin); savePrefs(); return S.res ? rerun() : render(); }
  if (d.hide) { S.prefs[S.person] = P.hide(S.prefs[S.person], d.hide); savePrefs(); toast(`Got it. ${COMPONENTS[d.hide].title} will stay out of the way.`); return S.res ? rerun() : render(); }
  if (d.intent) { S.prefs[S.person] = P.correct(S.prefs[S.person], S.text, d.intent); savePrefs(); return ask(S.text); }
  if (d.confirm !== undefined) return confirmSheet(d.confirm);
  if (d.full !== undefined) { S.mode = 'static'; return render(); }
  if (d.reset !== undefined) { S.res = null; S.text = ''; S.done = {}; return render(); }
  if (d.payee) { S.form.payee = d.payee; return render(); }
  if (d.quick) { if (d.quick === 'travel') { S.done.travel = `Saved. Your card is set for ${S.res?.evidence.city || 'your trip'}.`; render(); } toast(d.quick === 'travel' ? 'Travel notice saved.' : d.quick === 'call' ? 'Calling Aurel (demo). They can see this screen.' : 'Chat opened (demo).'); }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'askAll') { S.cmpText = $('askAllIn').value.trim(); return renderCompare(); }
  if (e.target.matches('[data-ask]')) ask(e.target.q.value);
});
document.addEventListener('input', e => {
  const f = e.target.dataset?.f; if (!f) return;
  S.form[f] = e.target.value.replace(/[^0-9.]/g, '');
  const blk = e.target.closest('.blk'), btn = blk?.querySelector('.act');
  if (btn) btn.disabled = !+S.form[f] || (f === 'amount' && (!S.form.payee || +S.form.amount > PEOPLE[S.person].accounts[0].balance));
});

if (S.text && S.mode !== 'compare') ask(S.text); else { if (qs.get('q') && S.mode === 'compare') S.cmpText = qs.get('q'); render(); }
