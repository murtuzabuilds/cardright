// Wallet settings a person can flip while using the app. Changing one must not undo the purchases
// already made with "Pay with": the live session keeps its caps, credits, balances and bonus progress,
// and only the changed setting is copied across. Cached replays and plans are rebuilt by the caller.

/** Turn "I carry a balance on this card" on or off, in the wallet and in every live session state. */
export function toggleCarry(person, sessions, id) {
  const w = person.wallet.find(x => x.id === id);
  w.carry = !w.carry;
  if (w.carry && !w.carryMonths) w.carryMonths = 3;
  for (const st of sessions) if (st && st[id]) { st[id].carry = w.carry; st[id].carryMonths = w.carryMonths || 0; }
  return w.carry;
}

/** Turn a quarter's rotating categories on or off, in the wallet and in every live session state. */
export function toggleActivate(person, sessions, id, quarter) {
  const w = person.wallet.find(x => x.id === id);
  w.activated = w.activated || [];
  const i = w.activated.indexOf(quarter);
  if (i > -1) w.activated.splice(i, 1); else w.activated.push(quarter);
  for (const st of sessions) if (st && st[id]) st[id].activated = new Set(w.activated);
  return i === -1;
}
