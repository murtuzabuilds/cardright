// A catalog of fictional cards for CardRight. Issuers, names and terms are invented, but each card follows a
// structure that is common in the US market (flat cashback, rotating 5%, dining points, travel
// points with a sign-up bonus, a 0% balance transfer card). Nothing here is a real product.
//
// rate is points per dollar. pv is what one point is worth in dollars, so 2 points at 0.01 is 2%.

export const CARDS = {
  'halden-everyday': {
    name: 'Halden Everyday', issuer: 'Halden Bank', type: 'credit', art: ['#1E3A5F', '#2F5F8F'],
    fee: 0, apr: 0.219, fx: 0.03, pv: 0.01, base: 2, earn: [],
    protections: { warrantyMonths: 12, purchase: true },
    terms: 'Earn unlimited 2% cash back on every purchase. No annual fee. Variable purchase APR of 21.9%. Foreign transaction fee: 3% of each transaction in U.S. dollars. Extended warranty adds one additional year to eligible manufacturer warranties of three years or less.',
  },
  'northwind-table': {
    name: 'Northwind Table', issuer: 'Northwind', type: 'credit', art: ['#3B2A20', '#7A4E33'],
    fee: 250, apr: 0.245, fx: 0, pv: 0.0125, base: 1,
    earn: [{ cats: ['dining'], rate: 4 }, { cats: ['groceries'], rate: 4, cap: { amount: 25000, period: 'year' } }],
    credits: [{ name: 'Dining credit', cats: ['dining'], amount: 10, period: 'month' }],
    protections: { purchase: true, travel: true },
    terms: 'Earn 4X points at restaurants worldwide. Earn 4X points at U.S. supermarkets on up to $25,000 per calendar year in purchases, then 1X. Earn 1X points on all other purchases. Up to $10 in statement credits each month at participating dining partners. Annual fee of $250. No foreign transaction fees. Variable APR of 24.5%.',
  },
  'ridgeline-rotate': {
    name: 'Ridgeline Rotate', issuer: 'Ridgeline Credit Union', type: 'credit', art: ['#20342B', '#3E6B55'],
    fee: 0, apr: 0.262, fx: 0.03, pv: 0.01, base: 1,
    earn: [{ rotating: { '2025Q4': ['online', 'wholesale'], '2026Q1': ['groceries', 'drugstore'], '2026Q2': ['dining', 'home'], '2026Q3': ['gas', 'transit'], '2026Q4': ['online', 'wholesale'] }, rate: 5, cap: { amount: 1500, period: 'quarter' }, activation: true }],
    protections: { purchase: true },
    terms: 'Earn 5% cash back on up to $1,500 in combined purchases in bonus categories each quarter you activate. This quarter: online shopping and wholesale clubs. Earn 1% on all other purchases. No annual fee. Variable APR of 26.2%. Foreign transaction fee of 3%.',
  },
  'aurel-voyage': {
    name: 'Aurel Voyage', issuer: 'Aurel', type: 'credit', art: ['#2B2350', '#5A47A8'],
    fee: 95, apr: 0.23, fx: 0, pv: 0.0125, base: 1,
    earn: [{ cats: ['travel', 'transit'], rate: 3 }, { cats: ['dining'], rate: 3 }],
    protections: { travel: true, rental: true },
    signup: { bonus: 600, spend: 4000, days: 90 },
    terms: 'Earn 3X miles on travel and transit and 3X miles on dining. Earn 1X on everything else. Earn a $600 bonus after you spend $4,000 on purchases in the first 3 months. Annual fee of $95. No foreign transaction fees. Variable APR of 23.0%. Trip delay and rental car coverage included.',
  },
  'halden-gas-grocery': {
    name: 'Halden Fuel and Food', issuer: 'Halden Bank', type: 'credit', art: ['#4A3B12', '#8C7020'],
    fee: 0, apr: 0.199, fx: 0.03, pv: 0.01, base: 1,
    earn: [{ cats: ['gas', 'groceries'], rate: 3, cap: { amount: 6000, period: 'year' } }],
    protections: {},
    terms: 'Earn 3% cash back at gas stations and grocery stores on up to $6,000 in combined purchases each year, then 1%. Earn 1% on all other purchases. No annual fee. Variable APR of 19.9%. Foreign transaction fee of 3%.',
  },
  'cobalt-one': {
    name: 'Cobalt One', issuer: 'Cobalt', type: 'credit', art: ['#0E2A47', '#1C5C9A'],
    fee: 0, apr: 0.249, fx: 0, pv: 0.01, base: 1.5,
    earn: [{ cats: ['phone', 'streaming'], rate: 3 }],
    protections: { phone: true },
    terms: 'Earn 3% cash back on phone plans and streaming services and 1.5% on everything else. No foreign transaction fees. No annual fee. Variable APR of 24.9%. Cell phone protection up to $600 when you pay your monthly phone bill with your card.',
  },
  'aurel-debit': {
    name: 'Aurel Debit', issuer: 'Aurel', type: 'debit', art: ['#2A2F36', '#4A525C'],
    fee: 0, apr: 0, fx: 0.01, pv: 0.01, base: 0, earn: [], protections: {},
    terms: 'Debit card linked to your checking account. No rewards. Foreign transaction fee of 1%.',
  },
  'lakeside-hsa': {
    name: 'Lakeside HSA', issuer: 'Lakeside', type: 'hsa', art: ['#1F4740', '#2F7A6B'],
    fee: 0, apr: 0, fx: 0, pv: 0.01, base: 0, earn: [], protections: {}, onlyCats: ['medical', 'drugstore'],
    terms: 'Health savings account debit card. Use for qualified medical expenses only.',
  },
  'kiln-business': {
    name: 'Kiln Business', issuer: 'Kiln', type: 'business', art: ['#3A1F1A', '#7A3B2E'],
    fee: 0, apr: 0.21, fx: 0.03, pv: 0.01, base: 2, earn: [], protections: { purchase: true },
    terms: 'Earn 2% cash back on all business purchases. No annual fee. Variable APR of 21.0%. Foreign transaction fee of 3%.',
  },
  // Paying straight from a bank account. No rewards, no fees, only accepted for some bills.
  'bank-transfer': {
    name: 'Bank transfer', issuer: 'Checking account', type: 'bank', art: ['#3A4A43', '#56685F'],
    fee: 0, apr: 0, fx: 0, pv: 0.01, base: 0, earn: [], protections: {}, onlyCats: ['taxes', 'utilities'],
    terms: 'Pay directly from your checking account. No rewards and no processing fee.',
  },
  // Not owned by anyone in the demo. Used only by the "next card" check, which takes no referral money.
  'meridian-flat': {
    name: 'Meridian Flat', issuer: 'Meridian', type: 'credit', art: ['#26313C', '#45596E'], market: true,
    fee: 0, apr: 0.229, fx: 0, pv: 0.01, base: 2, earn: [], protections: { warrantyMonths: 12 },
    terms: 'Earn 2% cash back on every purchase. No annual fee. No foreign transaction fees. Variable APR of 22.9%.',
  },
  'halden-balance': {
    name: 'Halden Balance', issuer: 'Halden Bank', type: 'credit', art: ['#2E2E3A', '#55556B'], market: true,
    fee: 0, apr: 0.249, fx: 0.03, pv: 0.01, base: 0, earn: [], protections: {},
    intro: { apr: 0, months: 18, transferFee: 0.03 },
    terms: '0% intro APR on balance transfers for 18 months, then a variable APR of 24.9%. Balance transfer fee of 3%. No annual fee. No rewards.',
  },
};

export const CATEGORY = {
  dining: 'Dining', groceries: 'Groceries', gas: 'Gas', travel: 'Travel', transit: 'Rides and transit',
  online: 'Online shopping', wholesale: 'Wholesale clubs', streaming: 'Streaming', phone: 'Phone bill',
  drugstore: 'Pharmacy', medical: 'Medical', utilities: 'Utilities', home: 'Home and hardware',
  electronics: 'Electronics', other: 'Everything else', taxes: 'Tax payment',
};

// Categories where an extended warranty is likely to matter.
export const WARRANTY_CATS = new Set(['electronics', 'home']);
