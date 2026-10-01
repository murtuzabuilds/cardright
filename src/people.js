// Three made-up people, their wallets, and a year of synthetic spending for each.
// CardRight never needs a card number. A wallet is just which cards you hold and a few facts about them.
import { MERCHANTS } from './merchants.js';

export const NOW = Date.UTC(2026, 9, 1, 12); // 1 Oct 2026, the first day of Q4
const D = (y, m, d) => Date.UTC(y, m - 1, d, 12);

export const PEOPLE = {
  maya: {
    id: 'maya', name: 'Maya Okafor', first: 'Maya', color: '#E8B04B',
    blurb: 'Travels for work. Pays every card in full. Loves her dining card a little too much.',
    taxRate: 0.24,
    wallet: [
      { id: 'northwind-table', limit: 15000, balance: 0, opened: D(2023, 4, 2), activated: [] },
      { id: 'halden-everyday', limit: 9000, balance: 0, opened: D(2021, 2, 11) },
      { id: 'ridgeline-rotate', limit: 6000, balance: 0, opened: D(2022, 8, 20), activated: ['2026Q2'] },
      { id: 'aurel-voyage', limit: 12000, balance: 0, opened: D(2026, 9, 10), signup: { spent: 3620 } },
    ],
    habit: () => 'northwind-table',
    offers: [{ card: 'halden-everyday', merchant: 'Voltix Electronics', pct: 0.10, max: 50, active: false }, { card: 'northwind-table', merchant: 'Greenleaf Market', pct: 0.05, max: 10, active: true }],
  },
  jordan: {
    id: 'jordan', name: 'Jordan Reyes', first: 'Jordan', color: '#C8553D',
    blurb: 'First job out of school. Carries a balance on one card and puts everything on it.',
    taxRate: 0.12, monthlyPayment: 450,
    wallet: [
      { id: 'ridgeline-rotate', limit: 4000, balance: 3400, carry: true, carryMonths: 3, opened: D(2023, 6, 1), activated: [] },
      { id: 'halden-everyday', limit: 3000, balance: 0, opened: D(2024, 1, 15) },
      { id: 'aurel-debit', limit: Infinity, balance: 0, opened: D(2022, 9, 1) },
    ],
    habit: () => 'ridgeline-rotate',
    offers: [],
  },
  theo: {
    id: 'theo', name: 'Theo Lindqvist', first: 'Theo', color: '#8DB8A2',
    blurb: 'Freelance designer. Pays in full, but uses one personal card for everything, even work and the dentist.',
    taxRate: 0.24,
    wallet: [
      { id: 'halden-everyday', limit: 12000, balance: 0, opened: D(2020, 5, 5) },
      { id: 'kiln-business', limit: 15000, balance: 0, opened: D(2024, 3, 1) },
      { id: 'halden-gas-grocery', limit: 7000, balance: 0, opened: D(2022, 2, 9) },
      { id: 'cobalt-one', limit: 8000, balance: 0, opened: D(2023, 11, 3) },
      { id: 'lakeside-hsa', limit: 5200, balance: 0, opened: D(2024, 1, 1) },
      { id: 'bank-transfer', limit: Infinity, balance: 0, opened: D(2015, 1, 1) },
    ],
    habit: t => t.cat === 'taxes' ? 'bank-transfer' : 'halden-everyday',
    offers: [{ card: 'cobalt-one', merchant: 'StreamBox', pct: 0.2, max: 6, active: true }],
  },
};

// Deterministic random numbers so every replay gives the same answer.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

// Monthly patterns: [merchant, times per month, typical amount, spread, extra flags]
const PATTERNS = {
  maya: [
    ['Bean & Barrow', 9, 6.5, .3], ['Saffron Table', 3, 58, .4], ['Noodle Lab', 2, 31, .3], ['Greenleaf Market', 4, 96, .35],
    ['Targa Superstore', 1, 74, .5], ['Pacific Fuel', 2, 44, .2], ['Hop Rides', 5, 19, .5], ['Skyway Air', .4, 420, .4],
    ['Shopline', 3, 47, .7], ['StreamBox', 1, 15.99, 0], ['Northline Mobile', 1, 64, 0], ['Bulkhaus Club', .7, 160, .4],
    ['Corner Hardware', .5, 38, .5], ['Lakeside Pharmacy', .6, 22, .4],
  ],
  jordan: [
    ['Bean & Barrow', 6, 5.5, .3], ['Noodle Lab', 3, 22, .3], ['Hilltop Grocers', 4, 61, .35], ['Pacific Fuel', 3, 38, .2],
    ['Hop Rides', 3, 16, .5], ['Shopline', 4, 34, .7], ['StreamBox', 1, 15.99, 0], ['Northline Mobile', 1, 55, 0],
    ['Targa Superstore', 1.5, 52, .5], ['Bulkhaus Club', .5, 110, .4], ['Lakeside Pharmacy', .5, 18, .4],
  ],
  theo: [
    ['Bean & Barrow', 8, 6, .3], ['Saffron Table', 2, 64, .4], ['Greenleaf Market', 5, 88, .35], ['Pacific Fuel', 3, 52, .2],
    ['Northline Mobile', 1, 85, 0], ['StreamBox', 1, 15.99, 0], ['Figment Cloud', 1, 189, 0, { business: true }],
    ['Kiln Print Co', 1.2, 310, .5, { business: true }], ['Skyway Air', .25, 380, .3, { business: true }],
    ['Lakeside Pharmacy', 1, 34, .5], ['Osei Family Dental', .3, 240, .5], ['Corner Hardware', .4, 60, .6],
    ['Voltix Electronics', .15, 1400, .3, { business: true }],
  ],
};

// One-off events that make a year real.
const EVENTS = {
  maya: [[D(2026, 3, 14), 'Hotel Miradouro', 412.5, { foreign: true }], [D(2026, 3, 15), 'Casa do Fado', 86.4, { foreign: true }], [D(2026, 3, 16), 'Hotel Miradouro', 412.5, { foreign: true }], [D(2025, 11, 28), 'Voltix Electronics', 1249, {}], [D(2026, 6, 2), 'Casa do Fado', 64, { foreign: true }]],
  jordan: [[D(2025, 12, 20), 'Voltix Electronics', 899, {}], [D(2026, 8, 2), 'Skyway Air', 310, {}]],
  theo: [[D(2026, 1, 15), 'Treasury tax payment', 3000, {}], [D(2026, 4, 15), 'Treasury tax payment', 3000, {}], [D(2026, 6, 15), 'Treasury tax payment', 3000, {}], [D(2026, 9, 15), 'Treasury tax payment', 3000, {}]],
};

export function yearOfSpending(personId) {
  const r = rng(personId.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)), out = [];
  for (let k = 0; k < 12; k++) {
    const y = 2025 + Math.floor((9 + k) / 12), m = ((9 + k) % 12) + 1; // Oct 2025 to Sep 2026
    for (const [merchant, per, amt, spread, extra = {}] of PATTERNS[personId]) {
      let n = Math.floor(per) + (r() < per % 1 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const day = 1 + Math.floor(r() * 27), a = Math.max(2, amt * (1 + (r() * 2 - 1) * spread));
        out.push({ ts: D(y, m, day), merchant, amount: +a.toFixed(2), cat: MERCHANTS[merchant].cat, ...extra });
      }
    }
  }
  for (const [ts, merchant, amount, extra] of EVENTS[personId]) out.push({ ts, merchant, amount, cat: MERCHANTS[merchant].cat, ...extra });
  return out.sort((a, b) => a.ts - b.ts).map((t, i) => ({ id: `${personId}-${i}`, ...t }));
}
