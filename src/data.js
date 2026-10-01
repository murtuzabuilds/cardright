// Synthetic data for a fictional bank, Aurel. Every person, merchant and number here is made up.
export const BANK = { name: 'Aurel', tagline: 'A fictional bank used to demo Liminal' };

const D = (d, h = 12, m = 0) => Date.UTC(2026, 8, d, h, m); // September 2026

export const PEOPLE = {
  maya: {
    id: 'maya', name: 'Maya Okafor', first: 'Maya', blurb: 'Travels for work. Just back from Lisbon.',
    prefs: { textScale: 1, plain: false },
    accounts: [{ id: 'chk', name: 'Everyday', balance: 4182.37 }, { id: 'sav', name: 'Rainy day', balance: 9100 }],
    cards: [{ id: 'c1', name: 'Aurel Debit', last4: '4417', frozen: false, limit: 2500 }],
    payees: [{ id: 'p1', name: 'Jonas Weber', handle: '@jonas' }, { id: 'p2', name: 'Priya Nair', handle: '@priya' }],
    bills: [{ id: 'b1', name: 'Northline Mobile', amount: 64.0, due: D(28) }],
    goals: [{ id: 'g1', name: 'Japan trip', target: 5000, saved: 1850 }],
    txns: [
      { id: 't1', ts: D(14, 9), merchant: 'Pastelaria Aurora', city: 'Lisbon', country: 'PT', amount: -4.8, category: 'Food', currency: 'EUR' },
      { id: 't2', ts: D(14, 20), merchant: 'Casa do Fado', city: 'Lisbon', country: 'PT', amount: -86.4, category: 'Food', currency: 'EUR' },
      { id: 't3', ts: D(15, 11), merchant: 'Tram 28 Tours', city: 'Lisbon', country: 'PT', amount: -32.0, category: 'Travel', currency: 'EUR' },
      { id: 't4', ts: D(15, 19), merchant: 'Hotel Miradouro', city: 'Lisbon', country: 'PT', amount: -412.5, category: 'Travel', currency: 'EUR' },
      { id: 't5', ts: D(15, 19, 2), merchant: 'Hotel Miradouro', city: 'Lisbon', country: 'PT', amount: -412.5, category: 'Travel', currency: 'EUR' },
      { id: 't6', ts: D(16, 8), merchant: 'Airport Taxi LIS', city: 'Lisbon', country: 'PT', amount: -38.0, category: 'Travel', currency: 'EUR' },
      { id: 't7', ts: D(17, 9), merchant: 'Bean & Barrow', city: 'Chicago', country: 'US', amount: -6.25, category: 'Food', currency: 'USD' },
      { id: 't8', ts: D(18, 13), merchant: 'Payroll Halden Co', city: 'Chicago', country: 'US', amount: 3650, category: 'Income', currency: 'USD' },
      { id: 't9', ts: D(19, 18), merchant: 'Greenleaf Market', city: 'Chicago', country: 'US', amount: -124.9, category: 'Groceries', currency: 'USD' },
      { id: 't10', ts: D(21, 21), merchant: 'StreamBox', city: 'Online', country: 'US', amount: -15.99, category: 'Subscriptions', currency: 'USD' },
      { id: 't11', ts: D(23, 12), merchant: 'Bean & Barrow', city: 'Chicago', country: 'US', amount: -5.75, category: 'Food', currency: 'USD' },
      { id: 't12', ts: D(24, 10), merchant: 'Fee: foreign transaction', city: 'Aurel', country: 'US', amount: -29.4, category: 'Fees', currency: 'USD' },
    ],
  },
  theo: {
    id: 'theo', name: 'Theo Lindqvist', first: 'Theo', blurb: 'Runs a two-person design studio.',
    prefs: { textScale: 1, plain: false },
    accounts: [{ id: 'biz', name: 'Studio', balance: 18240.11 }, { id: 'tax', name: 'Tax pot', balance: 6200 }],
    cards: [{ id: 'c2', name: 'Aurel Business', last4: '9031', frozen: false, limit: 8000 }],
    payees: [{ id: 'p3', name: 'Ines Duarte', handle: '@ines' }, { id: 'p4', name: 'Kiln Print Co', handle: '@kiln' }],
    bills: [{ id: 'b2', name: 'Studio rent', amount: 2100, due: D(30) }, { id: 'b3', name: 'Cloud tools', amount: 189, due: D(26) }],
    goals: [{ id: 'g2', name: 'Q4 taxes', target: 9000, saved: 6200 }],
    txns: [
      { id: 'u1', ts: D(10), merchant: 'Client: Osprey Labs', city: 'Online', country: 'US', amount: 7800, category: 'Income', currency: 'USD' },
      { id: 'u2', ts: D(12), merchant: 'Kiln Print Co', city: 'Portland', country: 'US', amount: -640, category: 'Supplies', currency: 'USD' },
      { id: 'u3', ts: D(15), merchant: 'Cloud tools', city: 'Online', country: 'US', amount: -189, category: 'Software', currency: 'USD' },
      { id: 'u4', ts: D(18), merchant: 'Ines Duarte', city: 'Online', country: 'US', amount: -2400, category: 'Contractors', currency: 'USD' },
      { id: 'u5', ts: D(22), merchant: 'Client: Fernhill', city: 'Online', country: 'US', amount: 4200, category: 'Income', currency: 'USD' },
      { id: 'u6', ts: D(24), merchant: 'Corner Office Supply', city: 'Portland', country: 'US', amount: -212.4, category: 'Supplies', currency: 'USD' },
    ],
  },
  ruth: {
    id: 'ruth', name: 'Ruth Abara', first: 'Ruth', blurb: 'Retired teacher. Prefers large text and plain words.',
    prefs: { textScale: 1.25, plain: true },
    accounts: [{ id: 'chk2', name: 'Everyday', balance: 2310.05 }, { id: 'sav2', name: 'Savings', balance: 41200 }],
    cards: [{ id: 'c3', name: 'Aurel Debit', last4: '2268', frozen: false, limit: 1500 }],
    payees: [{ id: 'p5', name: 'Daniel Abara', handle: '@daniel' }, { id: 'p6', name: 'Lakeside Pharmacy', handle: '@lakeside' }],
    bills: [{ id: 'b4', name: 'City Water', amount: 48.2, due: D(27) }, { id: 'b5', name: 'Brightline Power', amount: 96.4, due: D(29) }],
    goals: [],
    txns: [
      { id: 'r1', ts: D(5), merchant: 'Pension deposit', city: 'Aurel', country: 'US', amount: 2600, category: 'Income', currency: 'USD' },
      { id: 'r2', ts: D(9), merchant: 'Lakeside Pharmacy', city: 'Madison', country: 'US', amount: -42.1, category: 'Health', currency: 'USD' },
      { id: 'r3', ts: D(16), merchant: 'Hilltop Grocers', city: 'Madison', country: 'US', amount: -88.3, category: 'Groceries', currency: 'USD' },
      { id: 'r4', ts: D(23, 3), merchant: 'QuickCart Online', city: 'Online', country: 'US', amount: -349.99, category: 'Shopping', currency: 'USD' },
      { id: 'r5', ts: D(23, 3, 4), merchant: 'QuickCart Online', city: 'Online', country: 'US', amount: -289.0, category: 'Shopping', currency: 'USD' },
    ],
  },
};
export function when(ts) { const d = new Date(ts); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); }
