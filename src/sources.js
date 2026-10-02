// Every real-world figure used in CardRight, with where it came from and when it was checked.
// Checked on 1 October 2026. Card terms and their sources live with each card in cards.js.

export const FACTS = {
  cfpb: {
    stat: 'Pay more than they earn',
    text: 'Consumers who carry revolving balances often pay far more in interest and fees than they get back on rewards.',
    quote: true, source: 'Consumer Financial Protection Bureau', date: '9 May 2024',
    url: 'https://www.consumerfinance.gov/archive/newsroom/cfpb-report-highlights-consumer-frustrations-with-credit-card-rewards-programs/',
  },
  revolvers: {
    stat: '47%', text: 'of US credit cardholders carry a balance from month to month.',
    source: 'Bankrate Credit Card Debt Survey of 2,564 adults', date: '12 Jan 2026',
    url: 'https://www.bankrate.com/credit-cards/news/credit-card-debt-report/',
  },
  apr: {
    stat: '22.15%', text: 'average interest rate on card accounts that were charged interest, Q2 2026. Across all accounts it was 20.94%.',
    source: 'Federal Reserve G.19 Consumer Credit', date: '8 Sep 2026',
    url: 'https://www.federalreserve.gov/releases/g19/current/',
  },
  balance: {
    stat: '$6,659', text: 'average credit card balance per consumer, March 2026.',
    source: 'Experian', date: '27 Jul 2026', url: 'https://www.experian.com/blogs/ask-experian/state-of-credit-cards/',
  },
  unused: {
    stat: '71%', text: 'of rewards cardholders are sitting on unused cash back, points or miles.',
    source: 'LendingTree survey of 2,000 consumers', date: 'Sep 2025',
    url: 'https://www.lendingtree.com/credit-cards/study/unused-cash-back-points-miles/',
  },
  spending: {
    stat: '$78,535', text: 'average annual household spending in 2024, including $6,224 on groceries, $3,945 on eating out and $2,411 on gasoline. Used to size the three people\'s budgets.',
    source: 'BLS Consumer Expenditure Survey 2024', date: '19 Dec 2025', url: 'https://www.bls.gov/news.release/pdf/cesan.pdf',
  },
};

export const QUIRKS = [
  { text: 'Costco warehouses and gas stations take only Visa credit cards. Mastercard works on costco.com, and most PIN debit cards work in store.', source: 'CNBC Select', url: 'https://www.cnbc.com/select/what-credit-cards-does-costco-accept/' },
  { text: 'American Express does not count superstores such as Walmart and Target, or warehouse clubs, as US supermarkets. Whole Foods does count. Gas sold by superstores and warehouse clubs does not count as a gas station.', source: 'American Express', url: 'https://www.americanexpress.com/us/rewards-info/retail.html' },
  { text: 'Walmart does not accept Apple Pay in its US stores.', source: 'MacRumors, 19 Jan 2026', url: 'https://www.macrumors.com/2026/01/19/walmart-no-apple-pay/' },
  { text: 'Paying federal taxes by card goes through an IRS-approved processor. Pay1040 charges 1.75% for credit cards and $2.15 for debit cards; ACI Payments charges 1.85% and $2.10.', source: 'IRS', url: 'https://www.irs.gov/payments/pay-your-taxes-by-debit-or-credit-card' },
  { text: 'People who expect to owe $1,000 or more generally have to make estimated tax payments, in four payment periods a year.', source: 'IRS', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes' },
  { text: 'HSA money used for qualified medical expenses is tax free. 2026 contribution limits are $4,400 for self-only cover and $8,750 for family cover.', source: 'IRS Publication 969 and Rev. Proc. 2025-19', url: 'https://www.irs.gov/publications/p969' },
  { text: 'Point values: 1 cent as a baseline. When transferred to travel partners, NerdWallet estimates 1.4 cents for Chase points on the Sapphire Preferred and 1.3 cents for American Express and Capital One.', source: 'NerdWallet, 29 Sep 2026', url: 'https://www.nerdwallet.com/travel/learn/airline-miles-and-hotel-points-valuations' },
  { text: 'American Express Blue Cash Preferred counts taxis, rideshare, parking, tolls, trains and buses as transit.', source: 'American Express', url: 'https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/' },
];

export const DISCLAIMER = 'CardRight is an independent concept project. It is not affiliated with, sponsored by or endorsed by any bank, card issuer or merchant named. Card and merchant names are trademarks of their owners. Card terms are as publicly listed on 1 October 2026 and change often, so check with the issuer before deciding. The three people and their spending are fictional. This is not financial advice.';
