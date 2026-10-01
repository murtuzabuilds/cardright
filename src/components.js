// The parts a banking app is made of. A static app shows most of these on fixed screens.
// Liminal treats them as a kit and assembles only what a moment needs.
// risk: how much harm a wrong action here could do. 'high' actions always need an explicit confirm.
export const COMPONENTS = {
  balance:        { title: 'Balance',               risk: 'low',  anchor: true },
  alerts:         { title: 'Alerts',                risk: 'low' },
  txnList:        { title: 'Recent activity',       risk: 'low' },
  duplicatePair:  { title: 'Possible double charge', risk: 'low' },
  merchantCard:   { title: 'Merchant details',      risk: 'low' },
  disputeForm:    { title: 'Dispute a charge',      risk: 'high' },
  cardStatus:     { title: 'Card status',           risk: 'low' },
  freezeCard:     { title: 'Lock card',           risk: 'high' },
  replaceCard:    { title: 'Order a replacement',   risk: 'med' },
  payeePicker:    { title: 'Choose who to pay',     risk: 'low' },
  sendForm:       { title: 'Send money',            risk: 'high' },
  billList:       { title: 'Upcoming bills',        risk: 'low' },
  payBill:        { title: 'Pay a bill',            risk: 'high' },
  spendBreakdown: { title: 'Where your money went', risk: 'low' },
  budgetHint:     { title: 'A suggestion',          risk: 'low' },
  feeExplainer:   { title: 'About this fee',        risk: 'low' },
  travelNotice:   { title: 'Travel notice',         risk: 'low' },
  goalProgress:   { title: 'Savings goal',          risk: 'low' },
  moveMoney:      { title: 'Move between accounts', risk: 'med' },
  limitChange:    { title: 'Card limit',            risk: 'high' },
  clarify:        { title: 'Did you mean',          risk: 'low' },
  confirmStep:    { title: 'Check and confirm',     risk: 'low' },
  talkToPerson:   { title: 'Talk to a person',      risk: 'low' },
  fullApp:        { title: 'Show the full app',     risk: 'low', anchor: true },
};

// What a conventional banking app shows on its home screen, and how many taps each job takes there.
// Used only as the comparison baseline. Paths are counted from a typical tab-and-menu banking app.
export const STATIC_HOME = ['balance', 'alerts', 'txnList', 'cardStatus', 'billList', 'goalProgress', 'payeePicker', 'spendBreakdown', 'moveMoney', 'travelNotice', 'talkToPerson'];
export const STATIC_PATHS = {
  dispute: ['Home', 'Accounts', 'Everyday', 'Scroll to the charge', 'Charge details', 'Report a problem', 'Choose a reason', 'Fill the form', 'Submit'],
  freeze: ['Home', 'Cards', 'Choose card', 'Card settings', 'Freeze', 'Confirm'],
  send: ['Home', 'Pay and transfer', 'Send money', 'Choose payee', 'Enter amount', 'Review', 'Confirm'],
  payBill: ['Home', 'Pay and transfer', 'Bills', 'Choose bill', 'Review', 'Confirm'],
  spending: ['Home', 'Insights', 'Spending', 'Change period', 'Open category'],
  fee: ['Home', 'Accounts', 'Everyday', 'Scroll to the fee', 'Charge details', 'Help', 'Search help articles'],
  travel: ['Home', 'Cards', 'Choose card', 'Card settings', 'Travel', 'Add dates', 'Save'],
  goal: ['Home', 'Savings', 'Goals', 'Choose goal'],
  limit: ['Home', 'Cards', 'Choose card', 'Card settings', 'Limits', 'Edit', 'Confirm'],
  balance: ['Home'],
  lost: ['Home', 'Cards', 'Choose card', 'Card settings', 'Report lost or stolen', 'Confirm', 'Order replacement'],
  human: ['Home', 'Help', 'Contact us', 'Choose topic', 'Call or chat'],
};
