// Three made-up people holding real cards, with a year of synthetic spending at real merchants.
// The people are invented. Their situations are built from published figures: about 47% of
// cardholders carry a balance (Bankrate, Jan 2026), the average rate on accounts charged interest is
// 22.15% (Federal Reserve G.19, Q2 2026), and household spending levels follow the BLS Consumer
// Expenditure Survey for 2024. See sources.js.
//
// CardRight never needs a card number. A wallet is just which cards you hold and a few facts about them.
import { MERCHANTS } from './merchants.js';

export const NOW = Date.UTC(2026, 9, 1, 12); // 1 Oct 2026, the first day of Q4
const D = (y, m, d) => Date.UTC(y, m - 1, d, 12);

export const PEOPLE = {
  maya: {
    id: 'maya', name: 'Maya Okafor', first: 'Maya', color: '#E8B04B', redeem: 'travel',
    blurb: 'Consultant in Chicago. Travels for work, pays every card in full, and reaches for her Gold card by reflex.',
    taxRate: 0.24,
    wallet: [
      { id: 'amex-gold', limit: 25000, balance: 0, opened: D(2022, 4, 2) },
      { id: 'chase-sapphire-preferred', limit: 14000, balance: 0, apr: 0.2124, opened: D(2026, 8, 25), signup: { spent: 4620 } },
      { id: 'chase-freedom-flex', limit: 8000, balance: 0, apr: 0.2249, opened: D(2021, 8, 20), activated: ['2026Q1'] },
      { id: 'citi-double-cash', limit: 9000, balance: 0, apr: 0.2149, opened: D(2020, 2, 11) },
      { id: 'capone-360-debit', limit: Infinity, balance: 0, opened: D(2018, 6, 1) },
    ],
    habit: () => 'amex-gold',
    offers: [],
  },
  jordan: {
    id: 'jordan', name: 'Jordan Reyes', first: 'Jordan', color: '#C8553D', redeem: 'cash',
    blurb: 'Two years out of school. Carries a balance on the first card he ever got, and puts everything on it for the 5%.',
    taxRate: 0.12, monthlyPayment: 450,
    wallet: [
      { id: 'discover-it', limit: 4500, balance: 3400, apr: 0.2649, carry: true, carryMonths: 3, opened: D(2022, 9, 1), activated: ['2025Q4'] },
      { id: 'wf-active-cash', limit: 3000, balance: 0, apr: 0.2474, opened: D(2024, 1, 15) },
      { id: 'capone-360-debit', limit: Infinity, balance: 0, opened: D(2021, 9, 1) },
    ],
    habit: () => 'discover-it',
    offers: [],
  },
  theo: {
    id: 'theo', name: 'Theo Lindqvist', first: 'Theo', color: '#8DB8A2', redeem: 'cash',
    blurb: 'Freelance designer in Madison. Pays in full, but runs everything through one card: work, groceries, the dentist, even his taxes.',
    taxRate: 0.24,
    wallet: [
      { id: 'chase-freedom-unlimited', limit: 12000, balance: 0, apr: 0.2224, opened: D(2019, 5, 5) },
      { id: 'chase-ink-unlimited', limit: 15000, balance: 0, apr: 0.2074, opened: D(2024, 3, 1) },
      { id: 'amex-bcp', limit: 10000, balance: 0, apr: 0.2274, opened: D(2022, 2, 9) },
      { id: 'capone-savor', limit: 7000, balance: 0, apr: 0.2349, opened: D(2023, 6, 14) },
      { id: 'apple-card', limit: 8000, balance: 0, apr: 0.2249, opened: D(2023, 11, 3) },
      { id: 'fidelity-hsa', limit: 5200, balance: 0, opened: D(2024, 1, 1) },
      { id: 'bank-transfer', limit: Infinity, balance: 0, opened: D(2015, 1, 1) },
    ],
    habit: () => 'chase-freedom-unlimited',
    offers: [],
  },
};

// Deterministic random numbers so every replay gives the same answer.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

// Monthly patterns: [merchant, times per month, typical amount, spread, extra flags]
const PATTERNS = {
  maya: [
    ['Starbucks', 8, 6.5, .3], ['Sweetgreen', 4, 16, .2], ['Neighborhood restaurant', 3, 68, .4], ['DoorDash', 2, 34, .3],
    ['Whole Foods Market', 4, 92, .35], ["Trader Joe's", 2, 58, .3], ['Costco', .8, 170, .4], ['Target', 1, 70, .5],
    ['Shell', 1.5, 46, .2], ['Uber', 5, 22, .5], ['Lyft', 1, 19, .4], ['City transit', 4, 5, 0],
    ['Delta Air Lines', .4, 430, .4], ['Marriott', .3, 380, .3], ['Amazon', 3, 45, .7],
    ['Netflix', 1, 17.99, 0], ['Spotify', 1, 11.99, 0], ['Verizon', 1, 75, 0], ['CVS', .6, 24, .4], ['Ticketmaster', .2, 140, .3], ["Macy's", .3, 90, .4],
  ],
  jordan: [
    ['Chipotle', 6, 12, .2], ['Starbucks', 4, 6, .3], ['DoorDash', 2, 26, .3], ["Trader Joe's", 3, 55, .3], ['Kroger', 2, 62, .3],
    ['Walmart', 1.5, 58, .5], ['Shell', 3, 38, .2], ['Uber', 2, 17, .5], ['Amazon', 4, 32, .7], ['Costco', .5, 120, .4],
    ['Netflix', 1, 17.99, 0], ['Spotify', 1, 11.99, 0], ['Verizon', 1, 60, 0], ['Electric utility', 1, 85, .3], ['CVS', .5, 18, .4], ['AMC Theatres', .5, 28, .3],
  ],
  theo: [
    ['Starbucks', 8, 6, .3], ['Neighborhood restaurant', 2, 70, .4], ['Chipotle', 3, 13, .2], ['Kroger', 4, 95, .35], ['Whole Foods Market', 1.5, 80, .3],
    ['Costco', 1, 190, .4], ['Shell', 3, 52, .2], ['Verizon', 1, 85, 0], ['Netflix', 1, 17.99, 0], ['Spotify', 1, 11.99, 0],
    ['Adobe', 1, 59.99, 0, { business: true }], ['Figma', 1, 45, 0, { business: true }], ['Print shop', 1.2, 310, .5, { business: true }],
    ['Delta Air Lines', .25, 380, .3, { business: true }], ['CVS', 1, 30, .5], ['Walgreens', .5, 25, .4], 
    ["Lowe's", .4, 60, .6], ['Uber', 1, 24, .4], ['Electric utility', 1, 110, .3], ['Apple Store', .15, 1400, .3, { business: true }],
  ],
};

// One-off events that make a year real.
const EVENTS = {
  maya: [[D(2025, 11, 28), 'Best Buy', 1299, {}], [D(2026, 3, 14), 'Hotel in Lisbon', 412.5, { foreign: true }], [D(2026, 3, 15), 'Restaurant in Lisbon', 86.4, { foreign: true }], [D(2026, 3, 16), 'Hotel in Lisbon', 412.5, { foreign: true }], [D(2026, 3, 17), 'Restaurant in Lisbon', 64, { foreign: true }]],
  jordan: [[D(2025, 12, 20), 'Best Buy', 899, {}], [D(2026, 8, 2), 'Delta Air Lines', 310, {}]],
  theo: [[D(2025, 11, 6), 'Dentist', 185, {}], [D(2026, 2, 19), 'Dentist', 1150, {}], [D(2026, 5, 12), 'Dentist', 185, {}], [D(2026, 7, 8), 'Urgent care', 220, {}],
    [D(2026, 1, 15), 'IRS (Pay1040)', 3000, {}], [D(2026, 4, 15), 'IRS (Pay1040)', 3000, {}], [D(2026, 6, 15), 'IRS (Pay1040)', 3000, {}], [D(2026, 9, 15), 'IRS (Pay1040)', 3000, {}]],
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
