// CardRight's one use of a model: naming the spending category of a merchant it does not know.
// The model only reads the name. CardRight's own engine still values every card and picks the one to tap,
// so the money maths never depends on a model. The call goes to the same small server as Umbra's
// drafter, which holds the key; if it is slow or down, CardRight uses its own name rules and says so.
import { CATEGORY } from './cards.js';

export const MODEL_URL = 'https://umbra-drafter.murtuzabuilds.workers.dev';

/** { cat, sure, why, model } from the model, checked against CardRight's categories, or null. */
export async function modelCategory(merchant, { url = MODEL_URL, fetchImpl = globalThis.fetch, timeoutMs = 6000 } = {}) {
  const name = String(merchant || '').trim().slice(0, 80);
  if (!name || !url || !fetchImpl) return null;
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetchImpl(url.replace(/\/$/, '') + '/category', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ merchant: name }), signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || !Object.prototype.hasOwnProperty.call(CATEGORY, j.cat)) return null;
    return { cat: j.cat, sure: j.sure === true, why: typeof j.why === 'string' ? j.why.slice(0, 120) : '', model: String(j.model || 'model').slice(0, 60) };
  } catch { return null; }
}

/** The category CardRight acts on: a person's choice, then a known merchant, then the model, then name rules. */
export function pickCategory({ chosen, known, model, rules }) {
  if (chosen) return { cat: chosen, confidence: 1, source: 'you chose' };
  if (known) return rules;
  if (model) {
    /* a second opinion: when CardRight's own name rules are confident and disagree, the person decides */
    const clash = rules && rules.source === 'name rules' && rules.confidence >= 0.7 && rules.cat !== model.cat;
    const why = model.why ? model.why.replace(/\.?$/, '. ') : '';
    if (clash) return { cat: model.cat, confidence: 0.5, source: `read by a model (${model.model}) · rules disagree`, alternatives: [rules.cat], note: `The model and CardRight's name rules disagree (${model.cat} or ${rules.cat}), so pick the right one. The engine still picks the card.` };
    return { cat: model.cat, confidence: model.sure ? 0.85 : 0.5, source: `read by a model (${model.model})`, note: `${why}The model only names the category. CardRight's engine still picks the card.` };
  }
  return rules;
}
