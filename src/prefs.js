// Liminal learns from two signals only, both explicit: what you pin and what you correct.
// It never learns from where you hesitate or what you look at.
import { COMPONENTS } from './components.js';

export const fresh = () => ({ pins: [], hides: [], corrections: {} });

export function pin(prefs, id) { return prefs.pins.includes(id) ? prefs : { ...prefs, pins: [...prefs.pins, id], hides: prefs.hides.filter(x => x !== id) }; }
export function unpin(prefs, id) { return { ...prefs, pins: prefs.pins.filter(x => x !== id) }; }
export function hide(prefs, id) {
  if (COMPONENTS[id]?.anchor) return prefs; // anchors cannot be hidden
  return prefs.hides.includes(id) ? prefs : { ...prefs, hides: [...prefs.hides, id], pins: prefs.pins.filter(x => x !== id) };
}
// "No, I meant X": remembered for this phrasing, so the same words land right next time.
export function correct(prefs, text, intent) { return { ...prefs, corrections: { ...prefs.corrections, [norm(text)]: intent } }; }
export const norm = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
