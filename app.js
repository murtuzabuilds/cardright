import { CARDS, CATEGORY, MERCHANTS, PEOPLE, NOW, classify, rank, apply, explain, walletState, money, replay, plan, readTerms, evalTerms, evalMerchants } from './src/index.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const m0 = v => (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
const qs = new URLSearchParams(location.search);
const ICON = { tip: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>' };
const PRESETS = {
  maya: [['Saffron Table', 84], ['Voltix Electronics', 1299], ['Hotel Miradouro', 412.5], ['Bulkhaus Club', 180], ['Greenleaf Market', 96]],
  jordan: [['Hilltop Grocers', 120], ['Shopline', 60], ['Pacific Fuel', 45], ['Voltix Electronics', 899]],
  theo: [['Osei Family Dental', 420], ['Kiln Print Co', 640, { business: true }], ['Treasury tax payment', 3000], ['Northline Mobile', 85], ['Greenleaf Market', 110]],
};

const S = {
  person: PEOPLE[qs.get('p')] ? qs.get('p') : 'maya',
  view: ['pay', 'replay', 'plan', 'wallet', 'terms'].includes(qs.get('v')) ? qs.get('v') : 'pay',
  pay: null, pick: null, cat: null,
  session: {}, cache: {},
  terms: null,
};
const sess = () => (S.session[S.person] ||= walletState(PEOPLE[S.person]));
const cached = (k, f) => (S.cache[S.person + k] ||= f());
const invalidate = () => { S.cache = {}; S.session = {}; };
function defaultPay(p) { const [merchant, amount, extra = {}] = PRESETS[p][0]; return { merchant, amount, foreign: !!MERCHANTS[merchant]?.foreign, business: !!extra.business }; }
if (!S.pay) S.pay = qs.get('m') ? { merchant: qs.get('m'), amount: +(qs.get('a') || 50), foreign: false, business: qs.get('b') === '1' } : defaultPay(S.person);

const art = (id, cls = 'cardart', extra = '') => {
  const c = CARDS[id], [a, b] = c.art;
  return `<div class="${cls}" style="background:linear-gradient(135deg,${a},${b})">${cls === 'cardart' ? `<div class="iss">${esc(c.issuer)}</div><div class="row"><span class="chipm"></span><span class="typ">${c.type === 'bank' ? 'ACH' : c.type}</span></div><div class="nm">${esc(c.name)}${extra}</div>` : ''}</div>`;
};
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }

// ---------------- PAY ----------------
function currentPurchase() {
  const p = S.pay, c = S.cat ? { cat: S.cat, confidence: 1, source: 'you chose' } : classify(p.merchant || '');
  return { c, t: { ts: NOW, merchant: p.merchant, amount: +p.amount || 0, cat: c.cat, foreign: p.foreign || !!MERCHANTS[p.merchant]?.foreign, business: p.business } };
}
function partsHTML(o) {
  const max = Math.max(5, ...o.parts.map(p => Math.abs(p.v)));
  return o.parts.map(p => { const w = Math.abs(p.v) / max * 50; return `<div class="prow"><div class="lab"><b>${esc(p.label)}</b><small>${esc(p.note || '')}</small></div><div class="bar" title="${esc(p.label)}: ${money(p.v)}"><i style="${p.v >= 0 ? `left:50%;width:${w}%;background:var(--gain)` : `right:50%;width:${w}%;background:var(--cost)`}"></i></div><div class="val ${p.v >= 0 ? 'pos' : 'neg'}">${p.v >= 0 ? '+' : ''}${money(p.v)}</div></div>`; }).join('')
    + `<div class="prow total"><div class="lab"><b>You keep</b></div><div></div><div class="val ${o.net >= 0 ? 'pos' : 'neg'}">${money(o.net)}</div></div>`;
}
function viewPay() {
  const P = PEOPLE[S.person], { c, t } = currentPurchase(), r = rank(t, P, sess(), { offers: P.offers, taxRate: P.taxRate });
  const sel = r.options.find(o => o.cardId === S.pick) || r.best, sentence = explain(r, t);
  const known = Object.keys(MERCHANTS);
  return `<div class="h"><div><h1>Where are you paying?</h1><p>Say where and how much. CardRight counts what each card pays you and what it costs you, then tells you which one to tap.</p></div></div>
  <div class="pay">
    <div>
      <div class="panel">
        <form class="askbox" id="payForm" autocomplete="off">
          <div class="field"><label for="mIn">Merchant</label><input id="mIn" list="mList" value="${esc(S.pay.merchant)}" placeholder="e.g. Saffron Table"><datalist id="mList">${known.map(k => `<option value="${esc(k)}">`).join('')}</datalist></div>
          <div class="field amt"><label for="aIn">Amount</label><input id="aIn" inputmode="decimal" value="${S.pay.amount}"></div>
          <button class="btn">Find my card</button>
        </form>
        <div class="toggles"><button class="chip ${t.foreign ? 'on' : ''}" data-tog="foreign">Paying abroad</button><button class="chip ${S.pay.business ? 'on' : ''}" data-tog="business">Work expense</button></div>
        <div class="quick">${PRESETS[S.person].map(([m, a, x = {}]) => `<button class="chip" data-preset="${esc(m)}|${a}|${x.business ? 1 : 0}">${esc(m)} · ${m0(a)}</button>`).join('')}</div>
        <div class="cls">Category: <b>${esc(CATEGORY[c.cat])}</b><span class="conf ${c.confidence >= .7 ? 'hi' : 'lo'}">${c.confidence >= .7 ? 'Sure' : 'Not sure'} · ${esc(c.source)}</span>${c.note ? `<span class="note">${esc(c.note)}</span>` : ''}
          ${c.confidence < .7 || S.cat ? `<select id="catSel" aria-label="Correct the category">${Object.entries(CATEGORY).map(([k, v]) => `<option value="${k}" ${k === c.cat ? 'selected' : ''}>${v}</option>`).join('')}</select>` : ''}</div>
      </div>
      ${r.best ? `<div class="panel rise" style="margin-top:16px">
        <div class="win">${art(sel.cardId)}<div><div class="lbl">${sel === r.best ? 'Best card for this' : 'You picked'}</div><div class="big ${sel.net < 0 ? 'neg' : ''}">You keep ${money(sel.net)}</div><p class="say">${esc(sel === r.best ? sentence : `${sel.name} keeps you ${money(sel.net)}. That is ${money(r.best.net - sel.net)} less than ${r.best.name}.`)}</p></div></div>
        <div class="parts">${partsHTML(sel)}</div>
        ${sel.tips.map(x => `<div class="tip" style="margin-top:10px">${ICON.tip}<span>${esc(x.text)}</span></div>`).join('')}
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn" data-commit="${sel.cardId}">Pay with ${esc(sel.name)}</button>${sel !== r.best ? `<button class="btn ghost" data-pick="${r.best.cardId}">Back to the best card</button>` : ''}</div>
      </div>
      <div class="panel" style="margin-top:16px"><div class="k"><span>Every way to pay</span><span>you keep</span></div><div class="opts">
        ${r.options.map((o, i) => `<button class="opt ${i === 0 ? 'best' : ''} ${o === sel ? 'sel' : ''}" data-pick="${o.cardId}">${art(o.cardId, 'mini')}<span><b>${esc(o.name)}</b><small>${esc(o.parts.slice().sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 2).map(p => `${p.label} ${p.v >= 0 ? '+' : ''}${money(p.v)}`).join(' · ') || 'Nothing earned or lost')}</small></span><span class="n ${o.net >= 0 ? 'pos' : 'neg'}">${money(o.net)}</span></button>`).join('')}
        ${r.ineligible.map(o => `<div class="opt off">${art(o.cardId, 'mini')}<span><b>${esc(o.name)}</b><small>${esc(o.why)}</small></span><span></span></div>`).join('')}
      </div></div>` : `<div class="panel" style="margin-top:16px"><p>No card in this wallet can take that purchase.</p></div>`}
    </div>
    ${r.best ? `<div class="phone" aria-label="What CardRight shows at checkout"><div class="notch"></div><div class="scr">
      <div class="time">9:41</div><div class="date">Thursday, October 1</div>
      <div class="notif"><img src="brand/cardright-mark.svg" alt=""><div><div class="t"><span>CARDRIGHT</span><span>now</span></div><b>Tap ${esc(r.best.name)} here</b><p>${esc(t.merchant)}, ${money(t.amount)}. You keep ${money(r.best.net)}${r.options[1] ? `, ${money(r.best.net - r.options[1].net)} more than ${esc(r.options[1].name)}` : ''}.</p></div></div>
      <div class="wcard">${art(r.best.cardId)}</div><div class="tapring"></div><div class="tap">Hold near the reader</div>
    </div></div>` : ''}
  </div>`;
}

// ---------------- REPLAY ----------------
const BUCKETS = [
  ['card', 'Wrong card for the purchase', 'var(--c-card)', 'Rewards, credits and offers a better card would have earned'],
  ['activation', 'Bonus categories not turned on', 'var(--c-act)', 'Rotating 5% that only pays in quarters you activate'],
  ['fx', 'Foreign transaction fees', 'var(--c-fx)', 'Fees a no-FX card would have avoided'],
  ['interest', 'Interest on new spending', 'var(--c-int)', 'Purchases on a card you carry a balance on'],
  ['tax', 'Tax you could have saved', 'var(--c-tax)', 'Medical costs paid with after-tax money instead of the HSA'],
];
function lineChart(R) {
  const months = [], acc = { a: 0, b: 0 };
  for (let k = 0; k < 12; k++) { const y = 2025 + Math.floor((9 + k) / 12), m = (9 + k) % 12; months.push({ y, m, a: 0, b: 0, label: new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) }); }
  for (const row of R.rows) { const d = new Date(row.t.ts), i = (d.getUTCFullYear() - 2025) * 12 + d.getUTCMonth() - 9; if (months[i]) { months[i].a += row.actual.net; months[i].b += row.best.net; } }
  months.forEach(mo => { acc.a += mo.a; acc.b += mo.b; mo.ca = acc.a; mo.cb = acc.b; });
  const W = 640, H = 250, L = 52, Rr = 96, T = 14, B = 30, lo = Math.min(0, ...months.map(m => m.ca)), hi = Math.max(...months.map(m => m.cb));
  const step = niceStep((hi - lo) / 4), y0 = Math.floor(lo / step) * step, y1 = Math.ceil(hi / step) * step;
  const X = i => L + i * (W - L - Rr) / 11, Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const ticks = []; for (let v = y0; v <= y1 + 1e-6; v += step) ticks.push(v);
  const path = k => months.map((mo, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(mo[k]).toFixed(1)}`).join('');
  const last = months[11];
  return `<div class="keyline"><span><i style="background:var(--c-card)"></i>With CardRight</span><span><i style="background:var(--c-act)"></i>What actually happened</span></div>
  <div class="chart" id="lc"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Money kept over the year, cumulative">
    ${ticks.map(v => `<line x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? '#BFB6A2' : '#EAE3D3'}" stroke-width="1"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#7A877F" font-family="JetBrains Mono">${m0(v)}</text>`).join('')}
    ${months.map((mo, i) => i % 2 === 0 ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#7A877F">${mo.label}</text>` : '').join('')}
    <path d="${path('cb')}" fill="none" stroke="#2E8B62" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${path('ca')}" fill="none" stroke="#3F7FD0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${X(11)}" cy="${Y(last.cb)}" r="4.5" fill="#2E8B62" stroke="#FFFDF8" stroke-width="2"/><circle cx="${X(11)}" cy="${Y(last.ca)}" r="4.5" fill="#3F7FD0" stroke="#FFFDF8" stroke-width="2"/>
    <text x="${X(11) + 10}" y="${Y(last.cb) + 4}" font-size="12" font-weight="700" fill="#10261E">${m0(last.cb)}</text>
    <text x="${X(11) + 10}" y="${Y(last.ca) + 4}" font-size="12" font-weight="700" fill="#10261E">${m0(last.ca)}</text>
    <line id="lcX" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="#7A877F" stroke-width="1" opacity="0"/>
    <rect id="lcHit" x="${L}" y="${T}" width="${W - L - Rr}" height="${H - T - B}" fill="transparent"/>
  </svg><div class="tt" id="lcTT"></div></div>`;
  function niceStep(r) { const p = 10 ** Math.floor(Math.log10(Math.max(r, 1))), n = r / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
}
function bindLine(R) {
  const svg = document.querySelector('#lc svg'); if (!svg) return;
  const months = []; let a = 0, b = 0;
  for (let k = 0; k < 12; k++) { const y = 2025 + Math.floor((9 + k) / 12), m = (9 + k) % 12; months.push({ y, m, a: 0, b: 0, label: new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }); }
  for (const row of R.rows) { const d = new Date(row.t.ts), i = (d.getUTCFullYear() - 2025) * 12 + d.getUTCMonth() - 9; if (months[i]) { months[i].a += row.actual.net; months[i].b += row.best.net; } }
  months.forEach(mo => { a += mo.a; b += mo.b; mo.ca = a; mo.cb = b; });
  const hit = $('lcHit'), line = $('lcX'), tt = $('lcTT'), L = 52, W = 640, Rr = 96;
  hit.addEventListener('pointermove', e => {
    const box = svg.getBoundingClientRect(), x = (e.clientX - box.left) / box.width * W, i = Math.max(0, Math.min(11, Math.round((x - L) / ((W - L - Rr) / 11)))), px = L + i * (W - L - Rr) / 11;
    line.setAttribute('x1', px); line.setAttribute('x2', px); line.setAttribute('opacity', .6);
    const mo = months[i]; tt.innerHTML = `${mo.label}<br><span style="color:#8FD3B0">●</span> With CardRight <b>${money(mo.cb)}</b><br><span style="color:#8DB4EC">●</span> Actual <b>${money(mo.ca)}</b>`;
    tt.style.left = (px / W * box.width) + 'px'; tt.style.top = '20px'; tt.style.opacity = 1;
  });
  hit.addEventListener('pointerleave', () => { line.setAttribute('opacity', 0); tt.style.opacity = 0; });
}
function viewReplay() {
  const R = cached('replay', () => replay(S.person)), P = PEOPLE[S.person], tot = Object.values(R.buckets).reduce((a, v) => a + Math.max(0, v), 0) || 1;
  const story = { maya: 'She pays in full and earns plenty, but one favorite card for everything leaves money behind, mostly on shopping, rides and electronics where a 2% card with a warranty does better.', jordan: 'His card pays 5% in bonus quarters, which feels great. But he carries a balance on it, so every purchase starts paying 26% interest. The rewards never stood a chance.', theo: 'He pays in full and stays organised, but medical bills went on a rewards card instead of his pre-tax HSA, and phone, streaming and groceries all had better homes.' }[S.person];
  return `<div class="h"><div><h1>Your last year, rerun</h1><p>CardRight replays ${R.n} real purchases from the last 12 months, picks the best card for each one, and shows exactly where the difference came from.</p></div></div>
  <div class="hero">
    <div class="lead rise"><div class="k"><span>${esc(P.first)} · Oct 2025 to Sep 2026</span></div><div class="num" data-count="${R.left}">${m0(R.left)}</div><p>left on the table last year. ${esc(story)}</p>
      <div class="pair"><div><small>Spent</small><b>${m0(R.spend)}</b></div><div><small>Actually kept</small><b style="color:${R.actual < 0 ? '#FF9B85' : 'inherit'}">${m0(R.actual)}</b></div><div><small>Could have kept</small><b>${m0(R.best)}</b></div></div></div>
    <div class="panel rise"><div class="k"><span>Where it went</span><span>${m0(R.left)}</span></div>
      <div class="stack" role="img" aria-label="Money left on the table by cause">${BUCKETS.filter(([k]) => R.buckets[k] > 0.5).map(([k, l, c]) => `<i style="width:${R.buckets[k] / tot * 100}%;background:${c}" title="${l}: ${money(R.buckets[k])}"></i>`).join('')}</div>
      <div class="legend">${BUCKETS.map(([k, l, c, d]) => `<div style="opacity:${R.buckets[k] > 0.5 ? 1 : .45}"><span style="background:${c}"></span><div>${l}<small>${d}</small></div><b>${money(Math.max(0, R.buckets[k]))}</b></div>`).join('')}</div></div>
  </div>
  <div class="grid2">
    <div class="panel"><div class="k"><span>Money kept, adding up through the year</span></div>${lineChart(R)}</div>
    <div class="panel"><div class="k"><span>By kind of spending</span><span>biggest gaps first</span></div>
      <table><thead><tr><th>Category</th><th class="r">Kept</th><th class="r">Could keep</th><th>Best card</th></tr></thead><tbody>
      ${R.cats.slice(0, 9).map(c => `<tr><td>${esc(c.label)}<div class="note">${m0(c.spend)} spent</div></td><td class="r ${c.actual < 0 ? 'neg' : ''}">${money(c.actual)}</td><td class="r pos">${money(c.best)}</td><td><span class="dot" style="background:${CARDS[c.bestCard].art[1]}"></span>${esc(CARDS[c.bestCard].name)}</td></tr>`).join('')}
      </tbody></table></div>
  </div>`;
}

// ---------------- PLAN ----------------
function viewPlan() {
  const pl = cached('plan', () => plan(S.person)), P = PEOPLE[S.person];
  const actHTML = (a, i, tidy) => `<div class="act ${tidy ? 'tidy' : ''} rise" style="animation-delay:${i * 50}ms"><div class="rk">${tidy ? '✓' : i + 1}</div><div><h3>${esc(a.title)}</h3>
    ${a.rules ? `<div class="rules">${a.rules.map(r => `<div><b>${esc(r.cat)} → ${esc(r.card)}</b><span>+${money(r.v)}</span></div>`).join('')}</div>` : ''}
    <details ${i === 0 && !tidy ? 'open' : ''}><summary>Show the math ▾</summary><div class="math">${esc(a.math)}</div></details></div>
    ${tidy ? '' : `<div class="v">+${m0(a.v)}<small>${a.k === 'signup' ? 'one time' : 'a year'}</small></div>`}</div>`;
  return `<div class="h"><div><h1>${esc(P.first)}'s plan</h1><p>A short list of moves, ranked by what they are worth to you. Every number comes from ${esc(P.first)}'s own spending, and every one shows its math.</p></div></div>
  <div class="plan"><div>${pl.actions.map((a, i) => actHTML(a, i)).join('')}
    ${pl.tidy.length ? `<div class="k" style="margin:22px 0 10px"><span>Checked, nothing to do</span></div>${pl.tidy.map((a, i) => actHTML(a, i, true)).join('')}` : ''}</div>
    <div class="sumcard rise"><div class="k"><span>Worth about</span></div><div class="num">${m0(pl.total)}</div><p>over the next year if ${esc(P.first)} makes these moves. Some are one-time, like a sign-up bonus. The rest repeat every year.</p>
      <p style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.12)">CardRight never takes money from banks for recommendations. When no new card is worth it, it says so.</p></div></div>`;
}

// ---------------- WALLET ----------------
function viewWallet() {
  const P = PEOPLE[S.person], st = sess();
  return `<div class="h"><div><h1>${esc(P.first)}'s wallet</h1><p>CardRight only needs to know which cards you hold. No card numbers, no bank login. Try telling it you carry a balance on a card and watch every recommendation change.</p></div></div>
  <div class="wgrid">${P.wallet.map(w => {
    const c = CARDS[w.id], s = st[w.id], credit = ['credit', 'business'].includes(c.type);
    const rule = (c.earn || [])[0], cap = rule?.cap, key = cap ? (cap.period === 'quarter' ? '2026Q4' : '2026') : null, used = key ? s.caps[key] || 0 : 0;
    const earn = c.earn?.length ? c.earn.map(r => `${+(r.rate * c.pv * 100).toFixed(2)}% on ${(r.rotating ? r.rotating['2026Q4'] : r.cats).map(x => CATEGORY[x].toLowerCase()).join(' and ')}${r.cap ? ` (up to ${m0(r.cap.amount)} a ${r.cap.period})` : ''}${r.activation ? ', needs activation' : ''}`).join('; ') + `; ${+(c.base * c.pv * 100).toFixed(2)}% on everything else` : c.base ? `${+(c.base * c.pv * 100).toFixed(2)}% on everything` : c.type === 'hsa' ? 'Pre-tax money for medical costs' : 'No rewards';
    const util = credit && isFinite(s.limit) ? s.balance / s.limit : 0;
    return `<div class="wc rise">${art(w.id)}
      <div class="earn">${esc(earn)}${c.pv !== 0.01 && c.earn?.length ? `<div class="note">Points valued at ${c.pv * 100}¢ each when used for travel. As cash they are worth 1¢.</div>` : ''}</div>
      <div class="facts">${credit ? `<span>APR</span><b>${(c.apr * 100).toFixed(1)}%</b><span>Annual fee</span><b>${m0(c.fee)}</b>` : ''}<span>Foreign fee</span><b>${c.fx ? (c.fx * 100) + '%' : 'None'}</b>${credit ? `<span>Limit</span><b>${m0(s.limit)}</b>` : ''}</div>
      ${credit ? `<div class="meter"><div style="display:flex;justify-content:space-between"><span>Balance ${m0(s.balance)}</span><span>${Math.round(util * 100)}% of limit</span></div><div class="tr"><i class="${util > .3 ? 'warn' : ''}" style="width:${Math.min(100, util * 100)}%"></i></div></div>` : ''}
      ${cap ? `<div class="meter"><div style="display:flex;justify-content:space-between"><span>Bonus ${cap.period === 'quarter' ? 'this quarter' : 'this year'}${rule.activation ? (s.activated.has('2026Q4') ? ' · active' : ' · not activated') : ''}</span><span>${m0(used)} of ${m0(cap.amount)}</span></div><div class="tr"><i style="width:${used / cap.amount * 100}%"></i></div></div>` : ''}
      ${s.signup ? `<div class="meter"><div style="display:flex;justify-content:space-between"><span>Sign-up bonus ${m0(s.signup.bonus)}</span><span>${m0(Math.min(s.signup.spent, s.signup.spend))} of ${m0(s.signup.spend)}</span></div><div class="tr"><i class="gold" style="width:${Math.min(100, s.signup.spent / s.signup.spend * 100)}%"></i></div></div>` : ''}
      ${rule?.activation ? `<div class="switch"><span>Activate this quarter's 5%</span><button class="sw ok ${s.activated.has('2026Q4') ? 'on' : ''}" data-activate="${w.id}" aria-label="Activate bonus categories"></button></div>` : ''}
      ${credit ? `<div class="switch"><span>I carry a balance on this card</span><button class="sw ${w.carry ? 'on' : ''}" data-carry="${w.id}" aria-label="Carry a balance on ${esc(c.name)}"></button></div>` : ''}
    </div>`; }).join('')}</div>`;
}

// ---------------- FINE PRINT ----------------
function viewTerms() {
  if (!S.terms) S.terms = { id: 'ridgeline-rotate', text: CARDS['ridgeline-rotate'].terms };
  const r = readTerms(S.terms.text), heldT = cached('evT', () => evalTerms('held')), heldM = cached('evM', () => evalMerchants('held'));
  const sentences = S.terms.text.replace(/\bU\.S\. /g, 'US ').split(/(?<=[A-Za-z0-9%)]\.)\s+(?=[A-Z0-9$])/).filter(Boolean);
  const flagged = new Set(r.flags.map(f => f.text));
  const rows = [];
  r.earn.forEach(e => rows.push(['Earns', `${e.rate}${e.unit === 'percent' ? '%' : 'X'} on ${e.cats[0] === '*' ? 'everything' : e.cats[0] === 'rotating' ? `rotating categories${e.rotatingNow ? ` (now ${e.rotatingNow.map(x => CATEGORY[x].toLowerCase()).join(', ')})` : ''}` : e.cats.map(x => CATEGORY[x].toLowerCase()).join(', ')}${e.cap ? `, up to ${m0(e.cap.amount)} a ${e.cap.period}` : ''}${e.after !== undefined ? `, then ${e.after}` : ''}${e.activation ? ', must activate' : ''}`]));
  if (r.fee !== undefined) rows.push(['Annual fee', m0(r.fee)]);
  if (r.apr !== undefined) rows.push(['APR', (r.apr * 100).toFixed(2) + '%']);
  if (r.fx !== undefined) rows.push(['Foreign fee', r.fx ? (r.fx * 100) + '%' : 'None']);
  if (r.signup) rows.push(['Sign-up bonus', `${m0(r.signup.bonus)} after ${m0(r.signup.spend)} in ${r.signup.months} months`]);
  if (r.credits) rows.push(['Credits', r.credits.map(c => `${m0(c.amount)} a ${c.period}`).join(', ')]);
  if (r.warrantyMonths) rows.push(['Warranty', `+${r.warrantyMonths} months`]);
  if (r.intro) rows.push(['Intro APR', `${r.intro.apr * 100}% for ${r.intro.months} months`]);
  if (r.transferFee !== undefined) rows.push(['Transfer fee', (r.transferFee * 100) + '%']);
  return `<div class="h"><div><h1>How the AI reads fine print</h1><p>Card terms change all the time. In a real product a language model reads each card's terms and fills in these exact fields, and a person approves every new card before it is used. Anything it cannot read confidently is flagged, never guessed.</p></div></div>
  <div class="terms"><div class="panel">
    <div class="k"><span>Card terms</span><select id="termSel">${Object.entries(CARDS).map(([id, c]) => `<option value="${id}" ${id === S.terms.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="custom" ${S.terms.id === 'custom' ? 'selected' : ''}>Paste your own…</option></select></div>
    <textarea id="termTx" aria-label="Card terms">${esc(S.terms.text)}</textarea>
    <p class="note" style="margin-top:8px">Edit the text and the rules update as you type. Try changing the annual fee or adding a sentence it should not understand.</p>
  </div>
  <div class="panel"><div class="k"><span>What it understood</span><span class="conf ${r.needsReview ? 'lo' : 'hi'}">${r.needsReview ? 'Needs a person to review' : 'Ready to use'} · ${Math.round(r.confidence * 100)}%</span></div>
    <div style="margin-bottom:14px">${sentences.map(x => `<span class="sent ${flagged.has(x) ? 'flag' : r.read.includes(x) ? 'ok' : ''}">${esc(x)}</span> `).join('')}</div>
    <div class="rulesout">${rows.map(([k, v]) => `<div class="r"><span>${k}</span><b>${esc(v)}</b></div>`).join('') || '<p class="note">Nothing usable found.</p>'}</div>
    ${r.flags.map(f => `<div class="tip" style="margin-top:10px">${ICON.tip}<span>${esc(f.why)}: "${esc(f.text)}"</span></div>`).join('')}
  </div></div>
  <div class="panel" style="margin-top:22px"><div class="k"><span>Tested on examples it was never tuned on</span></div>
    <div class="evals">
      <div class="ev"><b>${Math.round(heldT.fieldAccuracy * 100)}%</b><small>of fields read correctly across ${heldT.n} new card terms. ${heldT.caught} of ${heldT.caught + heldT.silent} imperfect reads flagged themselves for review.</small></div>
      <div class="ev"><b>${Math.round(heldM.accuracy * 100)}%</b><small>of ${heldM.n} unfamiliar merchants put in the right category. All ${heldM.caught} misses came back marked "not sure", so the app asked instead of guessing.</small></div>
    </div></div>`;
}

// ---------------- render + events ----------------
function render() {
  $('who').innerHTML = Object.values(PEOPLE).map(p => `<button role="radio" aria-checked="${p.id === S.person}" class="${p.id === S.person ? 'on' : ''}" data-who="${p.id}"><i style="background:${p.color}">${p.first[0]}</i>${esc(p.first)}</button>`).join('');
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === S.view));
  $('main').innerHTML = { pay: viewPay, replay: viewReplay, plan: viewPlan, wallet: viewWallet, terms: viewTerms }[S.view]();
  if (S.view === 'replay') bindLine(cached('replay', () => replay(S.person)));
  if (S.view === 'replay') countUp();
}
function countUp() {
  const el = document.querySelector('[data-count]'); if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const to = +el.dataset.count, t0 = performance.now();
  const f = now => { const k = Math.min(1, (now - t0) / 900), e = 1 - (1 - k) ** 3; el.textContent = m0(to * e); if (k < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-who],[data-v],[data-preset],[data-tog],[data-pick],[data-commit],[data-carry],[data-activate]'); if (!el) return;
  const d = el.dataset;
  if (d.who) { S.person = d.who; S.pay = defaultPay(d.who); S.pick = null; S.cat = null; return render(); }
  if (d.v) { S.view = d.v; window.scrollTo({ top: 0 }); return render(); }
  if (d.preset) { const [m, a, b] = d.preset.split('|'); S.pay = { merchant: m, amount: +a, foreign: !!MERCHANTS[m]?.foreign, business: b === '1' }; S.pick = null; S.cat = null; return render(); }
  if (d.tog) { S.pay[d.tog] = !S.pay[d.tog]; S.pick = null; return render(); }
  if (d.pick) { S.pick = d.pick === S.pick ? null : d.pick; return render(); }
  if (d.commit) {
    const P = PEOPLE[S.person], { t } = currentPurchase(), st = sess(), res = rank(t, P, st, { offers: P.offers, taxRate: P.taxRate }).options.find(o => o.cardId === d.commit);
    const before = st[d.commit].signup && st[d.commit].signup.spent < st[d.commit].signup.spend;
    apply(st, res, t); if (['credit', 'business'].includes(CARDS[d.commit].type) && !st[d.commit].carry) st[d.commit].balance += t.amount;
    const done = before && st[d.commit].signup.spent >= st[d.commit].signup.spend;
    toast(done ? `Paid. That unlocks the ${money(st[d.commit].signup.bonus)} ${CARDS[d.commit].name} bonus. Recommendations will change now.` : `Paid with ${CARDS[d.commit].name}. Caps, credits and bonus progress updated.`);
    S.pick = null; return render();
  }
  if (d.carry) { const w = PEOPLE[S.person].wallet.find(x => x.id === d.carry); w.carry = !w.carry; if (w.carry && !w.carryMonths) w.carryMonths = 3; invalidate(); toast(w.carry ? `Got it. CardRight will keep new spending off ${CARDS[w.id].name} and count its interest.` : `${CARDS[w.id].name} is paid in full again.`); return render(); }
  if (d.activate) { const w = PEOPLE[S.person].wallet.find(x => x.id === d.activate); w.activated = w.activated || []; const i = w.activated.indexOf('2026Q4'); i > -1 ? w.activated.splice(i, 1) : w.activated.push('2026Q4'); invalidate(); toast(i > -1 ? 'Bonus categories turned off for this quarter.' : 'Activated. Online shopping and wholesale clubs now earn 5%.'); return render(); }
});
document.addEventListener('submit', e => { if (e.target.id !== 'payForm') return; e.preventDefault(); S.pay.merchant = $('mIn').value.trim() || S.pay.merchant; S.pay.amount = +$('aIn').value.replace(/[^0-9.]/g, '') || S.pay.amount; S.pay.foreign = !!MERCHANTS[S.pay.merchant]?.foreign; S.pick = null; S.cat = null; render(); });
document.addEventListener('change', e => {
  if (e.target.id === 'catSel') { S.cat = e.target.value; S.pick = null; render(); }
  if (e.target.id === 'termSel') { const id = e.target.value; S.terms = { id, text: id === 'custom' ? '' : CARDS[id].terms }; render(); }
});
document.addEventListener('input', e => { if (e.target.id === 'termTx') { S.terms = { id: S.terms.id, text: e.target.value }; const pos = e.target.selectionStart; render(); const tx = $('termTx'); tx.focus(); tx.setSelectionRange(pos, pos); } });
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => {}));
render();
