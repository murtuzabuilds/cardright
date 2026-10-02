// Real US cards, with terms as publicly listed on 1 October 2026.
//
// CardRight is an independent concept project. It is not affiliated with, sponsored by or endorsed by
// any issuer named here. Card names are trademarks of their owners. Terms change often: every card
// carries the date it was checked and the pages it was checked against, and anything that could not
// be confirmed is left out or noted rather than guessed.
//
// rate is points (or percent) per dollar. pv is what one point is worth in dollars:
//   pv.cash    the baseline value when redeemed simply
//   pv.travel  NerdWallet's estimate when points are transferred to travel partners (29 Sep 2026)
// Bonus rates are never stacked: when two rules match, the higher one is used.

export const AS_OF = '2026-10-01';
const cash = { cash: 0.01, travel: 0.01 };

export const CARDS = {
  'amex-gold': {
    name: 'American Express Gold Card', short: 'Amex Gold', issuer: 'American Express', network: 'Amex', type: 'credit', art: ['#8A6A2B', '#C9A25A'],
    fee: 325, apr: null, fx: 0, pv: { cash: 0.01, travel: 0.013 }, currency: 'Membership Rewards points', base: 1,
    earn: [
      { cats: ['dining'], rate: 4, cap: { amount: 50000, period: 'year' }, after: 1 },
      { cats: ['groceries'], rate: 4, cap: { amount: 25000, period: 'year' }, after: 1 },
      { cats: ['flights'], rate: 3 },
    ],
    credits: [
      { name: 'Dining credit', amount: 10, period: 'month', merchants: ['Grubhub', 'The Cheesecake Factory', 'Five Guys', 'Buffalo Wild Wings', 'Wonder'], note: 'Enrollment required' },
      { name: 'Uber Cash', amount: 10, period: 'month', merchants: ['Uber', 'Uber Eats'] },
      { name: "Dunkin' credit", amount: 7, period: 'month', merchants: ["Dunkin'"], note: 'Enrollment required' },
    ],
    protections: { warrantyMonths: 12, purchase: true },
    notes: ['A charge card with Pay Over Time. Its interest rate is not published on the pages checked, so it is not modelled here.', 'US supermarkets exclude superstores such as Walmart and Target, and warehouse clubs.'],
    sources: ['https://www.americanexpress.com/us/credit-cards/card/gold-card/', 'https://upgradedpoints.com/credit-cards/reviews/american-express-gold-card/dining-credit/', 'https://www.americanexpress.com/us/rewards-info/retail.html'],
    terms: 'Earn 4X points at restaurants worldwide on up to $50,000 per year, then 1X. Earn 4X points at US supermarkets on up to $25,000 per year, then 1X. Earn 3X points on flights. Earn 1X points on all other purchases. Up to $10 in statement credits each month at participating dining partners. Annual fee of $325. No foreign transaction fees.',
  },
  'chase-sapphire-preferred': {
    name: 'Chase Sapphire Preferred', short: 'Sapphire Preferred', issuer: 'Chase', network: 'Visa', type: 'credit', art: ['#12305C', '#2C5FA8'],
    fee: 95, apr: [0.1924, 0.2749], fx: 0, pv: { cash: 0.01, travel: 0.014 }, currency: 'Ultimate Rewards points', base: 1,
    earn: [
      { merchants: ['Lyft'], rate: 5, label: 'Lyft, through 30 Sep 2027' },
      { cats: ['dining'], rate: 3 }, { cats: ['streaming'], rate: 3 }, { cats: ['gas'], rate: 3 },
      { cats: ['flights', 'hotels', 'rideshare', 'transit'], rate: 2, label: 'Travel' },
    ],
    protections: { warrantyMonths: 12, purchase: true, travel: true },
    signup: { points: 75000, spend: 5000, days: 90 },
    notes: ['5X applies to travel booked through Chase Travel, which is not modelled.', 'Gas stations were added at 3X on 15 Jun 2026.'],
    sources: ['https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred', 'https://www.nerdwallet.com/credit-cards/reviews/chase-sapphire-preferred', 'https://media.chase.com/news/Meet-the-New-Chase-Sapphire-Preferred'],
    terms: 'Earn 3X points on dining. Earn 3X points on streaming services. Earn 3X points at gas stations. Earn 2X points on travel. Earn 1X points on all other purchases. Earn a $750 bonus after you spend $5,000 on purchases in the first 3 months. Annual fee of $95. No foreign transaction fees. Variable APR from 19.24%.',
  },
  'chase-freedom-flex': {
    name: 'Chase Freedom Flex', short: 'Freedom Flex', issuer: 'Chase', network: 'Mastercard', type: 'credit', art: ['#1B4E7A', '#3E8BC4'],
    fee: 0, apr: [0.1849, 0.2799], fx: 0, pv: cash, currency: 'cash back', base: 1,
    earn: [
      { rate: 5, cap: { amount: 1500, period: 'quarter' }, activation: true, rotating: {
        '2025Q4': { cats: ['department'] }, '2026Q1': { cats: ['dining'] }, '2026Q2': { cats: ['amazon'], merchants: ['Whole Foods Market'] },
        '2026Q3': { cats: ['gas', 'transit', 'entertainment'] }, '2026Q4': { cats: ['groceries', 'dining'] } } },
      { cats: ['dining'], rate: 3 }, { cats: ['drugstore'], rate: 3 },
    ],
    protections: { warrantyMonths: 12, purchase: true },
    notes: ['The foreign transaction fee was removed in September 2026.', 'Cell phone protection ended on 20 Sep 2026.', 'Grocery stores exclude Walmart and Target.'],
    sources: ['https://creditcards.chase.com/cash-back-credit-cards/freedom/flex', 'https://media.chase.com/news/chase-freedom-2026-q4-categories', 'https://www.nerdwallet.com/credit-cards/learn/chase-freedom-calendar'],
    terms: 'Earn 5% cash back on up to $1,500 in combined purchases in bonus categories each quarter you activate. This quarter: grocery stores and restaurants. Earn 3% on dining and 3% at drugstores. Earn 1% on all other purchases. No annual fee. No foreign transaction fees. Variable APR from 18.49%.',
  },
  'chase-freedom-unlimited': {
    name: 'Chase Freedom Unlimited', short: 'Freedom Unlimited', issuer: 'Chase', network: 'Visa', type: 'credit', art: ['#1F3F6E', '#4273B8'],
    fee: 0, apr: [0.1824, 0.2774], fx: 0.03, pv: cash, currency: 'cash back', base: 1.5,
    earn: [{ cats: ['dining'], rate: 3 }, { cats: ['drugstore'], rate: 3 }],
    protections: { warrantyMonths: 12, purchase: true },
    sources: ['https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited', 'https://www.nerdwallet.com/credit-cards/reviews/chase-freedom-unlimited'],
    terms: 'Earn 3% cash back on dining and 3% at drugstores. Earn 1.5% on all other purchases. No annual fee. Foreign transaction fee of 3%. Variable APR from 18.24%.',
  },
  'chase-ink-unlimited': {
    name: 'Chase Ink Business Unlimited', short: 'Ink Business Unlimited', issuer: 'Chase', network: 'Visa', type: 'business', art: ['#1A2C4A', '#35578F'],
    fee: 0, apr: [0.1674, 0.2474], fx: 0.03, pv: cash, currency: 'cash back', base: 1.5, earn: [],
    protections: { warrantyMonths: 12, purchase: true },
    sources: ['https://creditcards.chase.com/business-credit-cards/ink/unlimited', 'https://www.nerdwallet.com/business/credit-cards/reviews/chase-ink-business-unlimited'],
    terms: 'Earn unlimited 1.5% cash back on all business purchases. No annual fee. Foreign transaction fee of 3%. Variable APR from 16.74%.',
  },
  'citi-double-cash': {
    name: 'Citi Double Cash', short: 'Double Cash', issuer: 'Citi', network: 'Mastercard', type: 'credit', art: ['#0E4A6B', '#1E88B5'],
    fee: 0, apr: [0.1849, 0.2874], fx: 0.03, pv: cash, currency: 'cash back', base: 2, earn: [],
    protections: { warrantyMonths: 24, purchase: true },
    notes: ['2% is 1% when you buy and 1% as you pay.', 'Extended warranty doubles the original warranty, up to 24 months.'],
    sources: ['https://www.citi.com/credit-cards/citi-double-cash-credit-card', 'https://upgradedpoints.com/credit-cards/reviews/citi-double-cash-card/', 'https://milestalk.com/citi-double-cash-card-regains-extended-warranty/'],
    terms: 'Earn unlimited 2% cash back on every purchase. No annual fee. Foreign transaction fee of 3%. Variable APR from 18.49%.',
  },
  'discover-it': {
    name: 'Discover it Cash Back', short: 'Discover it', issuer: 'Discover', network: 'Discover', type: 'credit', art: ['#B5541C', '#F08A3C'],
    fee: 0, apr: [0.1849, 0.2849], fx: 0, pv: cash, currency: 'cash back', base: 1,
    earn: [{ rate: 5, cap: { amount: 1500, period: 'quarter' }, activation: true, rotating: {
      '2025Q4': { cats: ['amazon', 'drugstore'] }, '2026Q1': { cats: ['groceries', 'wholesale', 'streaming'] }, '2026Q2': { cats: ['dining', 'home'] },
      '2026Q3': { cats: ['gas', 'flights', 'transit', 'drugstore'] }, '2026Q4': { cats: ['dining', 'entertainment', 'utilities'] } } }],
    protections: {},
    notes: ['Activation is required each quarter and is not retroactive.'],
    sources: ['https://www.discover.com/credit-cards/cash-back/it-card.html', 'https://www.cnbc.com/select/discover-cash-back-calendar/', 'https://thepointsguy.com/credit-cards/activate-discover-cash-back-quarterly-categories/'],
    terms: 'Earn 5% cash back on up to $1,500 in combined purchases in bonus categories each quarter you activate. This quarter: restaurants and utilities. Earn 1% on all other purchases. No annual fee. No foreign transaction fees. Variable APR from 18.49%.',
  },
  'wf-active-cash': {
    name: 'Wells Fargo Active Cash', short: 'Active Cash', issuer: 'Wells Fargo', network: 'Visa', type: 'credit', art: ['#7A1F1F', '#C0392B'],
    fee: 0, apr: [0.1874, 0.2874], fx: 0.03, pv: cash, currency: 'cash rewards', base: 2, earn: [],
    protections: { phone: { max: 600, deductible: 25 } },
    notes: ['Cell phone protection applies when the monthly phone bill is paid with the card.'],
    sources: ['https://creditcards.wellsfargo.com/active-cash-credit-card/', 'https://www.nerdwallet.com/reviews/credit-cards/wells-fargo-active-cash'],
    terms: 'Earn unlimited 2% cash back on every purchase. No annual fee. Foreign transaction fee of 3%. Variable APR from 18.74%. Cell phone protection up to $600 when you pay your monthly phone bill with your card.',
  },
  'amex-bcp': {
    name: 'Blue Cash Preferred from American Express', short: 'Blue Cash Preferred', issuer: 'American Express', network: 'Amex', type: 'credit', art: ['#1E5B8A', '#3FA0D6'],
    fee: 95, apr: [0.1974, 0.2874], fx: 0.027, pv: cash, currency: 'cash back', base: 1,
    earn: [
      { cats: ['groceries'], rate: 6, cap: { amount: 6000, period: 'year' }, after: 1 },
      { cats: ['streaming'], rate: 6 }, { cats: ['transit', 'rideshare'], rate: 3 }, { cats: ['gas'], rate: 3 },
    ],
    protections: { warrantyMonths: 12, purchase: true },
    notes: ['$0 intro annual fee for the first year, then $95.', 'US supermarkets exclude superstores and warehouse clubs. Gas sold by warehouse clubs does not count as a gas station.'],
    sources: ['https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/', 'https://www.bankrate.com/credit-cards/reviews/blue-cash-preferred-card-from-american-express/', 'https://www.americanexpress.com/us/rewards-info/retail.html'],
    terms: 'Earn 6% cash back at US supermarkets on up to $6,000 per year, then 1%. Earn 6% cash back on streaming services. Earn 3% cash back on transit and 3% at gas stations. Earn 1% on all other purchases. Annual fee of $95. Foreign transaction fee of 2.7%. Variable APR from 19.74%.',
  },
  'capone-savor': {
    name: 'Capital One Savor', short: 'Savor', issuer: 'Capital One', network: 'Mastercard', type: 'credit', art: ['#5A2A1C', '#A9552F'],
    fee: 0, apr: [0.1849, 0.2849], fx: 0, pv: cash, currency: 'cash back', base: 1,
    earn: [{ cats: ['groceries', 'dining', 'entertainment', 'streaming'], rate: 3 }],
    protections: { warrantyMonths: 12 },
    notes: ['Grocery stores exclude superstores like Walmart and Target.', 'Extended warranty is reported by reviewers, not listed on the issuer page.'],
    sources: ['https://www.capitalone.com/credit-cards/savor/', 'https://www.nerdwallet.com/credit-cards/reviews/capital-one-savor'],
    terms: 'Earn 3% cash back at grocery stores and restaurants. Earn 3% on entertainment and streaming services. Earn 1% on all other purchases. No annual fee. No foreign transaction fees. Variable APR from 18.49%.',
  },
  'apple-card': {
    name: 'Apple Card', short: 'Apple Card', issuer: 'Goldman Sachs', network: 'Mastercard', type: 'credit', art: ['#8E949B', '#D5D9DE'], dark: true,
    fee: 0, apr: [0.1749, 0.2774], fx: 0, pv: cash, currency: 'Daily Cash', base: 1,
    earn: [
      { merchants: ['Apple Store', 'Uber', 'Uber Eats', 'Walgreens', 'Exxon'], applePay: true, rate: 3, label: '3% at Apple and select merchants with Apple Pay' },
      { applePay: true, rate: 2, label: '2% with Apple Pay' },
    ],
    protections: {},
    notes: ['2% applies only when paying with Apple Pay. The physical card earns 1%.'],
    sources: ['https://www.apple.com/apple-card/', 'https://learn.applecard.apple/unlimited-daily-cash'],
    terms: 'Earn 3% Daily Cash at Apple and select merchants when you use Apple Pay. Earn 2% on every purchase with Apple Pay. Earn 1% on all other purchases. No annual fee. No foreign transaction fees. Variable APR from 17.49%.',
  },
  'capone-360-debit': {
    name: 'Capital One 360 Checking debit', short: '360 Checking debit', issuer: 'Capital One', network: 'Debit', type: 'debit', art: ['#2A2F36', '#4A525C'],
    fee: 0, apr: null, fx: 0, pv: cash, currency: 'none', base: 0, earn: [], protections: {},
    sources: ['https://www.capitalone.com/bank/checking-accounts/online-checking-account/'],
    terms: 'Debit card linked to your checking account. No rewards. No foreign transaction fees.',
  },
  'fidelity-hsa': {
    name: 'Fidelity HSA debit card', short: 'Fidelity HSA', issuer: 'Fidelity', network: 'Debit', type: 'hsa', art: ['#1F4740', '#2F7A6B'],
    fee: 0, apr: null, fx: 0.01, pv: cash, currency: 'none', base: 0, earn: [], protections: {}, onlyCats: ['medical'],
    notes: ['For qualified medical expenses only. Prescriptions and eligible drugstore items qualify too, but a whole drugstore basket usually does not, so only medical bills are modelled.','  2026 contribution limits are $4,400 self-only and $8,750 family.'],
    sources: ['https://www.fidelity.com/customer-service/atm-debit-hsa-overview', 'https://www.irs.gov/publications/p969'],
    terms: 'Health savings account debit card. Use for qualified medical expenses only. No rewards.',
  },
  'bank-transfer': {
    name: 'Bank transfer', short: 'Bank transfer', issuer: 'Checking account', network: 'ACH', type: 'bank', art: ['#3A4A43', '#56685F'],
    fee: 0, apr: null, fx: 0, pv: cash, currency: 'none', base: 0, earn: [], protections: {}, onlyCats: ['taxes', 'utilities'],
    sources: ['https://www.irs.gov/payments/direct-pay-with-bank-account'],
    terms: 'Pay directly from your checking account. No rewards and no processing fee.',
  },
  // Not in anyone's wallet. Used only by the "next card" and balance transfer checks, which take no referral money.
  'capone-venture': {
    name: 'Capital One Venture Rewards', short: 'Venture', issuer: 'Capital One', network: 'Visa', type: 'credit', art: ['#16324A', '#2E6A96'], market: true,
    fee: 95, apr: [0.1949, 0.2849], fx: 0, pv: { cash: 0.01, travel: 0.013 }, currency: 'miles', base: 2, earn: [], protections: { warrantyMonths: 12, travel: true },
    sources: ['https://www.capitalone.com/credit-cards/venture/'],
    terms: 'Earn 2X miles on every purchase. Annual fee of $95. No foreign transaction fees. Variable APR from 19.49%.',
  },
  'wf-reflect': {
    name: 'Wells Fargo Reflect', short: 'Reflect', issuer: 'Wells Fargo', network: 'Visa', type: 'credit', art: ['#3A2A4A', '#6B4C8A'], market: true,
    fee: 0, apr: [0.1774, 0.2849], fx: 0.03, pv: cash, currency: 'none', base: 0, earn: [], protections: { phone: { max: 600, deductible: 25 } },
    intro: { apr: 0, months: 21, transferFee: 0.05 },
    notes: ['Balance transfers must be made within 120 days of opening to get the intro rate.'],
    sources: ['https://creditcards.wellsfargo.com/reflect-visa-credit-card/', 'https://www.nerdwallet.com/credit-cards/reviews/wells-fargo-reflect-card'],
    terms: '0% intro APR on balance transfers for 21 months, then a variable APR from 17.74%. Balance transfer fee of 5%. No annual fee. No rewards.',
  },
};

export const CATEGORY = {
  dining: 'Dining', groceries: 'Groceries', superstore: 'Superstores', wholesale: 'Wholesale clubs', gas: 'Gas',
  flights: 'Flights', hotels: 'Hotels', rideshare: 'Rideshare', transit: 'Public transit', amazon: 'Amazon', online: 'Online shopping',
  electronics: 'Electronics', home: 'Home improvement', department: 'Department stores', streaming: 'Streaming', phone: 'Phone bill',
  utilities: 'Utilities', drugstore: 'Drugstores', medical: 'Medical', entertainment: 'Entertainment', software: 'Software',
  taxes: 'Tax payment', other: 'Everything else',
};

// Categories where an extended warranty is likely to matter.
export const WARRANTY_CATS = new Set(['electronics', 'home']);
