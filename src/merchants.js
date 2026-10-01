// Merchants the demo knows, and a classifier for ones it doesn't.
// Card networks decide a purchase's category from the merchant's own code, not from what you bought,
// which is why a supermarket inside a superstore often does not count as groceries. The catalog
// records those quirks. For unknown merchants, classify() is a transparent stand-in for the model
// that would read the merchant name and history; it returns a confidence and never guesses silently.

export const MERCHANTS = {
  'Bean & Barrow': { cat: 'dining', partner: ['northwind-table'] },
  'Casa do Fado': { cat: 'dining', foreign: 'EUR' },
  'Saffron Table': { cat: 'dining', partner: ['northwind-table'] },
  'Noodle Lab': { cat: 'dining' },
  'Greenleaf Market': { cat: 'groceries' },
  'Hilltop Grocers': { cat: 'groceries' },
  'Targa Superstore': { cat: 'other', note: 'Superstores usually code as general merchandise, not groceries.' },
  'Bulkhaus Club': { cat: 'wholesale', note: 'Wholesale clubs usually do not count as groceries.' },
  'Pacific Fuel': { cat: 'gas' },
  'Bulkhaus Fuel': { cat: 'gas', note: 'Fuel stations at wholesale clubs usually code as gas.' },
  'Skyway Air': { cat: 'travel' },
  'Hotel Miradouro': { cat: 'travel', foreign: 'EUR' },
  'Hop Rides': { cat: 'transit' },
  'Metro Transit': { cat: 'transit' },
  'Shopline': { cat: 'online' },
  'Voltix Electronics': { cat: 'electronics' },
  'StreamBox': { cat: 'streaming' },
  'Northline Mobile': { cat: 'phone' },
  'City Water': { cat: 'utilities' },
  'Brightline Power': { cat: 'utilities' },
  'Lakeside Pharmacy': { cat: 'drugstore' },
  'Osei Family Dental': { cat: 'medical' },
  'Corner Hardware': { cat: 'home' },
  'Kiln Print Co': { cat: 'other' },
  'Figment Cloud': { cat: 'online' },
  'Treasury tax payment': { cat: 'taxes', note: 'Card payments go through a processor that charges about 1.85%. Illustrative.' },
};

const RULES = [
  ['dining', /\b(cafe|café|coffee|restaurant|grill|bistro|pizza|taco|sushi|kitchen|diner|bakery|bar|noodle|burger)\b/],
  ['groceries', /\b(market|grocer|grocery|supermarket|foods|produce)\b/],
  ['gas', /\b(fuel|gas|petrol|station)\b/],
  ['travel', /\b(air|airline|airways|hotel|inn|resort|lodge|motel|travel|rental car)\b/],
  ['transit', /\b(rides?|taxi|cab|transit|metro|train|rail|parking|toll)\b/],
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
  // "gas company" is a utility, not a gas station
  if (hits.includes('utilities') && /gas company/.test(t)) return { cat: 'utilities', confidence: 0.8, source: 'name rules' };
  const conf = hits.length === 1 ? 0.8 : 0.5;
  return { cat: hits[0], confidence: conf, source: 'name rules', alternatives: hits.slice(1), note: hits.length > 1 ? `Could also be ${hits.slice(1).join(' or ')}. The card network decides, so treat this as a best guess.` : undefined };
}
