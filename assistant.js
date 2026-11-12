// Review assistant. The rule-based review in rules.js always runs. When the viewer adds an
// Anthropic API key, Claude reads the same case, checks and policies and gives a second opinion.
// The analyst makes the final decision either way.
import { POLICIES, SOURCES } from './policies.js';
import { PLAYBOOK } from './playbook.js';

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.3.0/+esm';
const MODEL = 'claude-opus-5-5';
const KEY_STORE = 'riskdesk.apiKey';

let sdk = null, client = null;

export function getKey() { try { return sessionStorage.getItem(KEY_STORE) || ''; } catch { return ''; } }
export function setKey(k) { try { k ? sessionStorage.setItem(KEY_STORE, k) : sessionStorage.removeItem(KEY_STORE); } catch {} client = null; }
export const aiEnabled = () => !!getKey();

async function getClient() {
  if (client) return client;
  if (!sdk) sdk = (await import(SDK_URL)).default;
  // The key stays in this browser tab and is sent only to the Anthropic API.
  client = new sdk({ apiKey: getKey(), dangerouslyAllowBrowser: true });
  return client;
}

const POLICY_TEXT = POLICIES.map(p => `${p.id} (${SOURCES[p.src].name}) ${p.title}: ${p.text}`).join('\n');
const SYSTEM = `You are a second reviewer on a Risk Operations team at a creator commerce platform. A human analyst owns every decision. Your job is to test the analyst's decision, not to make it.

How to review:
- Compare the decision and rationale against the case facts, the automated checks, and the policy rules below.
- Point out conflicts with evidence, missing evidence that could change the outcome, policy limits the decision breaks, and wording in the user message that should not go out (for example, never tell a user they matched a sanctions list).
- Cite policy IDs only from the list below. Do not invent facts, thresholds or policies. If something is unclear, ask.
- If the decision is sound, say so plainly. Do not invent concerns.
- Be brief: a summary of at most two sentences, at most five concerns, at most three questions.

Policy rules (paraphrased from the platform's public legal pages):
${POLICY_TEXT}`;

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['agree', 'questions', 'disagree'] },
    summary: { type: 'string' },
    concerns: { type: 'array', items: { type: 'object', properties: { point: { type: 'string' }, policy: { type: 'array', items: { type: 'string' } } }, required: ['point', 'policy'], additionalProperties: false } },
    questions: { type: 'array', items: { type: 'string' } }
  },
  required: ['verdict', 'summary', 'concerns', 'questions'],
  additionalProperties: false
};

function caseContext(c, checks, typeLabel) {
  return JSON.stringify({
    case: { id: c.id, type: typeLabel, subject: c.subject, alert: c.alert, facts: c.facts },
    checks: checks.map(x => ({ check: x.label, result: x.result, detail: x.detail, policy: x.policy }))
  }, null, 1);
}

async function call(params, plain = false) {
  const cl = await getClient();
  // Refusal fallback and prompt caching are optional extras; if the API rejects them, retry once without.
  const extras = plain ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default', cache_control: { type: 'ephemeral' } };
  try {
    const res = await cl.beta.messages.create({ model: MODEL, max_tokens: 8000, system: SYSTEM, ...extras, ...params });
    if (res.stop_reason === 'refusal') throw new Error('The model declined to answer this request.');
    return res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  } catch (e) {
    if (!plain && sdk && e instanceof sdk.BadRequestError) return call(params, true);
    if (sdk && e instanceof sdk.AuthenticationError) throw new Error('The API key was rejected. Check it in AI settings.');
    if (sdk && e instanceof sdk.RateLimitError) throw new Error('Rate limited by the API. Try again in a moment.');
    if (sdk && e instanceof sdk.APIError) throw new Error(`API error${e.status ? ' ' + e.status : ''}: ${e.message}`);
    if (e instanceof TypeError) throw new Error('Could not reach the Anthropic API from this page. Some hosts block outside requests.');
    throw e;
  }
}

export async function aiReview(c, checks, typeLabel, decision, ruleReview) {
  const text = await call({
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: REVIEW_SCHEMA } },
    messages: [{ role: 'user', content:
      `Case and checks:\n${caseContext(c, checks, typeLabel)}\n\nAnalyst decision:\n${JSON.stringify(decision, null, 1)}\n\nRule-based review already found:\n${JSON.stringify(ruleReview.findings, null, 1)}\n\nGive your second opinion. Do not repeat the rule-based findings unless you disagree with them; add what they missed.` }]
  });
  return JSON.parse(text);
}

export async function aiAsk(c, checks, typeLabel, history, question) {
  const messages = [
    { role: 'user', content: `Context for this conversation. Case and checks:\n${caseContext(c, checks, typeLabel)}\n\nAnswer the analyst's questions about this case in under 150 words, citing policy IDs. Say when the policies do not cover something.` },
    { role: 'assistant', content: 'Understood. Ask about the case.' },
    ...history.flatMap(h => [{ role: 'user', content: h.q }, { role: 'assistant', content: h.a }]),
    { role: 'user', content: question }
  ];
  return call({ output_config: { effort: 'low' }, messages });
}

// Without a key: keyword search over the policies and playbook. Labelled as search, not AI.
const WORDS = s => String(s).toLowerCase().match(/[a-z0-9$%.]+/g) || [];
const STOP = new Set('a an the is are was were be to of and or in on for with what when how does do can i we it this that my our if not no should which who why'.split(' '));
export function searchKnowledge(question, limit = 4) {
  const qs = WORDS(question).filter(w => !STOP.has(w) && w.length > 2);
  if (!qs.length) return [];
  const docs = [
    ...POLICIES.map(p => ({ kind: 'policy', ref: p.id, title: p.title, text: p.text, src: SOURCES[p.src].name })),
    ...PLAYBOOK.flatMap(s => s.items.map(i => ({ kind: 'playbook', ref: s.title, title: i.signal, text: `${i.why} Check: ${i.check}`, policy: i.policy })))
  ];
  return docs.map(d => {
    const hay = WORDS(d.title + ' ' + d.text);
    const score = qs.reduce((n, w) => n + hay.filter(h => h.startsWith(w.slice(0, Math.max(4, w.length - 2)))).length + (WORDS(d.title).some(h => h.startsWith(w.slice(0, 4))) ? 2 : 0), 0);
    return { ...d, score };
  }).filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}
