// Reads card fine print and turns it into rules the optimizer can use.
// In a real product a language model would do this reading, constrained to this exact output shape,
// and a person would approve each new card before it goes live. Here it is a transparent rule-based
// stand-in so the demo runs offline. Anything it cannot read confidently is flagged, never guessed.

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5 };
const CATS = [
  ['dining', /restaurants?|dining/], ['groceries', /supermarkets?|grocery|groceries/], ['gas', /gas stations?|fuel/],
  ['travel', /travel|airlines?|hotels?/], ['transit', /transit|rideshare/], ['online', /online shopping|online/],
  ['wholesale', /wholesale clubs?/], ['streaming', /streaming/], ['phone', /phone plans?|wireless/], ['drugstore', /drugstores?|pharmac/],
];
const num = s => +String(s).replace(/[$,]/g, '');

export function readTerms(text) {
  const out = { earn: [], flags: [], read: [] };
  const sentences = text.replace(/\bU\.S\. /g, 'US ').split(/(?<=[A-Za-z0-9%)]\.)\s+(?=[A-Z0-9$])/).filter(Boolean);
  let pendingRotating = null;
  for (const raw of sentences) {
    const s = raw.toLowerCase().replace(/\bu\.s\. /g, 'us '); let used = false;
    const earn = s.match(/earn (?:unlimited )?(\d+(?:\.\d+)?)(%| ?x)(?: cash back| points| miles)? (?:on|at) (.+?)(?:\.|$)/);
    if (earn) {
      const rate = +earn[1], what = earn[3].split(/ and \d/)[0], cats = CATS.filter(([, re]) => re.test(what)).map(([c]) => c);
      const cap = s.match(/up to \$([\d,]+)/), period = s.match(/each (quarter|year|month)|per (calendar )?(year|quarter|month)/);
      const rule = { rate, unit: earn[2].trim() === '%' ? 'percent' : 'points', cats: /every purchase|all other|everything else|all (\w+ )?purchases/.test(what) ? ['*'] : /bonus categor/.test(what) ? ['rotating'] : cats };
      if (cap) rule.cap = { amount: num(cap[1]), period: period ? (period[1] || period[3]) : 'year' };
      if (/activate/.test(s)) rule.activation = true;
      const after = s.match(/then (\d+(?:\.\d+)?)/); if (after) rule.after = +after[1];
      if (rule.cats[0] === 'rotating') { pendingRotating = rule; out.earn.push(rule); used = true; }
      else if (!rule.cats.length) out.flags.push({ text: raw, why: 'Found a reward rate but not which purchases it covers' });
      else { out.earn.push(rule); used = true; }
      // "4X at restaurants and 3X on travel" style sentences can hold two rates
      const second = s.match(/and (\d+(?:\.\d+)?)(%| ?x)(?: cash back| points| miles)? (?:on|at) (.+?)(?:\.|$)/);
      if (second) { const c2 = CATS.filter(([, re]) => re.test(second[3])).map(([c]) => c); if (c2.length) out.earn.push({ rate: +second[1], unit: rule.unit, cats: c2 }); }
    }
    const q = s.match(/^this quarter: (.+?)\.?$/);
    if (q && pendingRotating) { pendingRotating.rotatingNow = CATS.filter(([, re]) => re.test(q[1])).map(([c]) => c); used = true; }
    if (/no rewards/.test(s)) { out.noRewards = true; used = true; }
    if (/debit card|checking account|health savings/.test(s)) { out.apr = 0; out.kind = /health savings/.test(s) ? 'hsa' : 'debit'; used = true; }
    const intro = s.match(/(\d+(?:\.\d+)?)% intro apr on balance transfers for (\d+) months/); if (intro) { out.intro = { apr: +intro[1] / 100, months: +intro[2] }; used = true; }
    const then = s.match(/then a variable apr of (\d+(?:\.\d+)?)%/); if (then) out.apr = +then[1] / 100;
    const btf = s.match(/balance transfer fee of (\d+(?:\.\d+)?)%/); if (btf) { out.transferFee = +btf[1] / 100; used = true; }
    if (/no processing fee/.test(s)) { out.fee = out.fee ?? 0; used = true; }
    const fee = s.match(/annual fee(?: of)? \$([\d,]+)|\$([\d,]+) annual fee/); if (fee) { out.fee = num(fee[1] || fee[2]); used = true; }
    if (/no annual fee/.test(s)) { out.fee = 0; used = true; }
    const apr = s.match(/(\d+(?:\.\d+)?)% ?(?:variable )?apr|apr of (\d+(?:\.\d+)?)%/); if (apr && !/intro/.test(s)) { out.apr = +(apr[1] || apr[2]) / 100; used = true; }
    if (/no foreign transaction fees?/.test(s)) { out.fx = 0; used = true; }
    else { const fx = s.match(/foreign transaction fee(?: of|:)? (\d+(?:\.\d+)?)%/); if (fx) { out.fx = +fx[1] / 100; used = true; } }
    const bonus = s.match(/\$([\d,]+) bonus after you spend \$([\d,]+).*?(?:first )?(\d+|three|six) months?/); if (bonus) { out.signup = { bonus: num(bonus[1]), spend: num(bonus[2]), months: WORDS[bonus[3]] || +bonus[3] }; used = true; }
    const credit = s.match(/up to \$([\d,]+) in statement credits each (month|year)/); if (credit) { out.credits = [{ amount: num(credit[1]), period: credit[2] }]; used = true; }
    const war = s.match(/extended warranty adds (one|two|\d+) (?:additional )?years?/); if (war) { out.warrantyMonths = 12 * (WORDS[war[1]] || +war[1]); used = true; }
    if (/cell phone protection/.test(s)) { out.phone = true; used = true; }
    if (used) out.read.push(raw); else if (/fee|apr|bonus|cash back|points|credit/.test(s)) out.flags.push({ text: raw, why: 'Mentions money but did not match a known pattern. A person should check it.' });
  }
  const known = { earn: out.earn.length || out.noRewards, fee: out.fee !== undefined || out.kind, apr: out.apr !== undefined, fx: out.fx !== undefined || out.kind === 'hsa' || out.noRewards };
  const parts = 5, got = Object.values(known).filter(Boolean).length + (out.flags.length ? 0 : 1);
  out.confidence = +(got / parts).toFixed(2);
  out.needsReview = out.flags.length > 0 || out.confidence < 0.8;
  return out;
}
