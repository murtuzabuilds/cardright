// Real merchants, how card networks usually categorise them, and the quirks that change the answer.
// A purchase's category comes from the merchant's own code, not from what you bought, so these are
// "typically" true and can vary by location. Sources for the quirks are in sources.js.
//
// accepts   credit card networks the merchant takes, when it is not all of them
// applePay  true where Apple Pay is commonly accepted, false where it is known not to be. Unmarked means unknown,
//           and the Apple Card is then assumed to earn its 1% physical card rate.
// foreign   the purchase is charged in another currency

export const MERCHANTS = {
  // dining
  'Chipotle': { applePay: true, cat: 'dining' }, 'Starbucks': { applePay: true, cat: 'dining' }, 'Sweetgreen': { applePay: true, cat: 'dining' },
  "Dunkin'": { applePay: true, cat: 'dining' }, 'Five Guys': { applePay: true, cat: 'dining' }, 'The Cheesecake Factory': { cat: 'dining' },
  'DoorDash': { applePay: true, cat: 'dining', note: 'Restaurant delivery usually counts as dining. Grocery orders in the same app may not.' },
  'Uber Eats': { applePay: true, cat: 'dining', note: 'Restaurant delivery usually counts as dining.' },
  'Neighborhood restaurant': { cat: 'dining' },
  'Restaurant in Lisbon': { cat: 'dining', foreign: 'EUR' },
  // groceries and the stores that look like groceries but are not
  'Whole Foods Market': { applePay: true, cat: 'groceries' }, "Trader Joe's": { applePay: true, cat: 'groceries' }, 'Kroger': { cat: 'groceries' },
  'Walmart': { cat: 'superstore', applePay: false, note: 'Counts as a superstore, not a grocery store, so grocery bonuses do not apply. Walmart does not take Apple Pay.' },
  'Target': { applePay: true, cat: 'superstore', note: 'Counts as a superstore, not a grocery store, so grocery bonuses do not apply.' },
  'Costco': { cat: 'wholesale', accepts: ['Visa'], note: 'Costco warehouses only take Visa credit cards. Debit cards work too. It counts as a wholesale club, not a grocery store.' },
  'Costco Gas': { cat: 'gas', accepts: ['Visa'], warehouseGas: true, note: 'Visa credit only. Usually counts as gas on Visa cards.' },
  // gas
  'Shell': { applePay: true, cat: 'gas' }, 'Exxon': { applePay: true, cat: 'gas' },
  // travel
  'Delta Air Lines': { cat: 'flights' }, 'Marriott': { cat: 'hotels' },
  'Hotel in Lisbon': { cat: 'hotels', foreign: 'EUR' },
  'Uber': { applePay: true, cat: 'rideshare' }, 'Lyft': { applePay: true, cat: 'rideshare' }, 'City transit': { applePay: true, cat: 'transit' },
  // shopping
  'Amazon': { cat: 'amazon' }, 'Best Buy': { applePay: true, cat: 'electronics' }, 'Apple Store': { applePay: true, cat: 'electronics' },
  "Lowe's": { applePay: true, cat: 'home' }, "Macy's": { applePay: true, cat: 'department' },
  // bills
  'Netflix': { cat: 'streaming' }, 'Spotify': { cat: 'streaming' },
  'Verizon': { cat: 'phone' }, 'Electric utility': { cat: 'utilities' },
  // health
  'CVS': { applePay: true, cat: 'drugstore' }, 'Walgreens': { applePay: true, cat: 'drugstore' }, 'Dentist': { cat: 'medical' }, 'Urgent care': { cat: 'medical' },
  // entertainment
  'Ticketmaster': { cat: 'entertainment' }, 'AMC Theatres': { cat: 'entertainment' },
  // work
  'Adobe': { cat: 'software' }, 'Figma': { cat: 'software' }, 'Print shop': { cat: 'other' },
  // tax
  'IRS (Pay1040)': { cat: 'taxes', note: 'The IRS-approved processor Pay1040 charges 1.75% for credit cards and $2.15 for debit cards. IRS Direct Pay from a bank account is free.' },
};

const RULES = [
  ['dining', /\b(cafe|café|coffee|restaurant|grill|bistro|pizza|taco|sushi|kitchen|diner|bakery|bar|noodle|burger)\b/],
  ['groceries', /\b(market|grocer|grocery|supermarket|foods|produce)\b/],
  ['gas', /\b(fuel|gas|petrol|station)\b/],
  ['flights', /\b(air|airline|airlines|airways)\b/],
  ['hotels', /\b(hotel|inn|resort|lodge|motel)\b/],
  ['rideshare', /\b(rides?|taxi|cab)\b/],
  ['transit', /\b(transit|metro|train|rail|parking|toll)\b/],
  ['streaming', /\b(stream|music|video|tv\+?|plus)\b/],
  ['phone', /\b(mobile|wireless|cellular|telecom)\b/],
  ['drugstore', /\b(pharmacy|drug|chemist)\b/],
  ['medical', /\b(dental|clinic|medical|doctor|hospital|health|vision|optometr)\b/],
  ['utilities', /\b(water|power|electric|energy|utility|gas company)\b/],
  ['home', /\b(hardware|home|garden|furniture)\b/],
  ['electronics', /\b(electronics|computer|tech|apple|camera)\b/],
  ['wholesale', /\b(club|wholesale|warehouse)\b/],
  ['online', /(\.com\b|\bonline\b|\bshop\b|\bstore online\b|\bmarketplace\b)/],
];

export function classify(name) {
  if (MERCHANTS[name]) return { cat: MERCHANTS[name].cat, confidence: 0.99, source: 'known merchant', note: MERCHANTS[name].note };
  const t = name.toLowerCase();
  const hits = RULES.filter(([, re]) => re.test(t)).map(([c]) => c);
  if (!hits.length) return { cat: 'other', confidence: 0.3, source: 'no match', note: 'Not sure, so it is treated as everyday spending. You can correct it.' };
  if (hits.includes('utilities') && /gas company/.test(t)) return { cat: 'utilities', confidence: 0.8, source: 'name rules' };
  const conf = hits.length === 1 ? 0.8 : 0.5;
  return { cat: hits[0], confidence: conf, source: 'name rules', alternatives: hits.slice(1), note: hits.length > 1 ? `Could also be ${hits.slice(1).join(' or ')}. The card network decides, so treat this as a best guess.` : undefined };
}
