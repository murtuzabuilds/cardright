// How well do the two AI-shaped steps work? Each has a tuned set (used while writing the rules)
// and a held-out set (written afterwards and never used to change the rules).
import { CARDS } from './cards.js';
import { readTerms } from './terms.js';
import { classify } from './merchants.js';

// ---------- fine print ----------
// Truth for the catalog comes from the structured card data itself.
// Fields the text never mentions are not scored (a debit card's terms say nothing about an annual fee).
const truthFromCard = c => ({
  fee: ['debit', 'hsa'].includes(c.type) ? undefined : c.fee, apr: c.apr || 0, fx: ['hsa', 'bank'].includes(c.type) || c.intro ? undefined : c.fx,
  top: Math.max(c.base, ...(c.earn || []).map(r => r.rate)),
});

export const TERMS_HELD_OUT = [
  { text: 'Get 1.5% cash back on all purchases. $0 annual fee. 20.24% variable APR. No foreign transaction fees.', truth: { fee: 0, apr: 0.2024, fx: 0, top: 1.5 } },
  { text: 'Earn 6% cash back at US supermarkets on up to $6,000 per year, then 1%. Earn 3% at gas stations. Earn 1% on other purchases. $95 annual fee. Variable APR of 20.49% to 29.24%. Foreign transaction fee: 2.7%.', truth: { fee: 95, apr: 0.2049, fx: 0.027, top: 6 } },
  { text: 'Earn 2X miles on every purchase. Annual fee of $95. No foreign transaction fees. APR of 21.24%.', truth: { fee: 95, apr: 0.2124, fx: 0, top: 2 } },
  { text: 'Earn 3X points on dining and 2X on travel. Earn 1X everywhere else. $0 annual fee. Variable APR of 19.99%. No foreign transaction fee.', truth: { fee: 0, apr: 0.1999, fx: 0, top: 3 } },
  { text: 'Earn 5% cash back on up to $1,500 in combined purchases in bonus categories each quarter you activate. 1% unlimited cash back on all other purchases. No annual fee. 18.24% to 27.24% Variable APR.', truth: { fee: 0, apr: 0.1824, fx: undefined, top: 5 } },
  { text: 'Unlimited 1.25X miles on every purchase, every day. No annual fee. 19.99% variable APR. No foreign transaction fees.', truth: { fee: 0, apr: 0.1999, fx: 0, top: 1.25 } },
  { text: 'Earn 4% on dining, entertainment and popular streaming services, and 3% at grocery stores. $0 annual fee. Purchase APR of 19.24%. No foreign transaction fee.', truth: { fee: 0, apr: 0.1924, fx: 0, top: 4 } },
  { text: '0% intro APR for 21 months on balance transfers. After that, 18.24% variable APR. Balance transfer fee of 5% of each transfer. No annual fee.', truth: { fee: 0, apr: 0.1824, fx: undefined, top: 0 } },
];

function scoreTerms(text, truth) {
  const r = readTerms(text), checks = {};
  const top = Math.max(0, ...r.earn.map(e => e.rate));
  checks.fee = truth.fee === undefined ? true : r.fee === truth.fee;
  checks.apr = r.apr !== undefined && Math.abs(r.apr - truth.apr) < 1e-6;
  checks.fx = truth.fx === undefined ? true : r.fx === truth.fx;
  checks.top = Math.abs(top - truth.top) < 1e-6;
  const right = Object.values(checks).filter(Boolean).length;
  // A miss is "caught" when the reader itself raised a flag or reported low confidence.
  return { text, checks, right, total: 4, caught: right < 4 && r.needsReview, read: r };
}

export function evalTerms(which = 'tuned') {
  const items = which === 'tuned' ? Object.values(CARDS).map(c => ({ text: c.terms, truth: truthFromCard(c) })) : TERMS_HELD_OUT;
  const rows = items.map(i => scoreTerms(i.text, i.truth));
  const fields = rows.reduce((a, r) => a + r.right, 0), totalF = rows.reduce((a, r) => a + r.total, 0);
  const perfect = rows.filter(r => r.right === r.total).length, missed = rows.filter(r => r.right < r.total);
  return { which, n: rows.length, fieldAccuracy: +(fields / totalF).toFixed(2), perfect, caught: missed.filter(r => r.caught).length, silent: missed.filter(r => !r.caught).length, rows };
}

// ---------- merchant categories ----------
export const MERCHANT_TUNED = [
  ['Rosa Pizza Kitchen', 'dining'], ['Northside Coffee', 'dining'], ['Fresh Fields Market', 'groceries'], ['Lakeview Grocery', 'groceries'],
  ['Summit Fuel', 'gas'], ['Blue Air', 'travel'], ['Harbor Hotel', 'travel'], ['City Cab', 'transit'], ['Metro Parking', 'transit'],
  ['Wave Mobile', 'phone'], ['Corner Pharmacy', 'drugstore'], ['Bright Smile Dental', 'medical'], ['Valley Electric', 'utilities'],
  ['Elm Hardware', 'home'], ['Pixel Electronics', 'electronics'], ['Price Club Warehouse', 'wholesale'], ['gadgets-online.com', 'online'],
];
export const MERCHANT_HELD_OUT = [
  ['Trattoria Bella', 'dining'], ['Golden Wok', 'dining'], ['Sunrise Bagels', 'dining'], ['Village Butcher', 'groceries'],
  ['Corner Bodega', 'groceries'], ['Speedway 4412', 'gas'], ['Delta 0062347', 'travel'], ['Seaside Motel', 'travel'],
  ['Northern Rail', 'transit'], ['Lumen Wireless', 'phone'], ['CVS/pharmacy #102', 'drugstore'], ['Lakes Vision Center', 'medical'],
  ['Midstate Gas Company', 'utilities'], ['Home Depot 2210', 'home'], ['Best Gadgets', 'electronics'], ['Sam\'s Club 6431', 'wholesale'],
  ['Etsy.com', 'online'], ['Tuesday Market Grill', 'dining'],
];

export function evalMerchants(which = 'tuned') {
  const set = which === 'tuned' ? MERCHANT_TUNED : MERCHANT_HELD_OUT;
  const rows = set.map(([name, truth]) => { const r = classify(name); return { name, truth, got: r.cat, confidence: r.confidence, ok: r.cat === truth, unsure: r.confidence < 0.7 }; });
  const miss = rows.filter(r => !r.ok);
  return { which, n: rows.length, accuracy: +(rows.filter(r => r.ok).length / rows.length).toFixed(2), caught: miss.filter(r => r.unsure).length, silent: miss.filter(r => !r.unsure).length, rows };
}
