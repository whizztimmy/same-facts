import { CASES } from './cases.js';
import { TYPES, runChecks, review, summarize, signature, REFUND_GROUNDS, CR_REJECT_GROUNDS, VERDICT_LABEL, usd, scanText, crPayout } from './rules.js';
import { POLICIES, SOURCES } from './policies.js';
import { WORKFLOW, PLAYBOOK, WRITING } from './playbook.js';
import { LOOKUPS, CALCULATORS, SOFTWARE } from './tools.js';
import { aiEnabled, setKey, aiReview, aiAsk, searchKnowledge } from './assistant.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const RESULT = { flag: 'Flag', warn: 'Look closer', pass: 'Pass', missing: 'Missing', info: 'Note' };
const SEV = { block: ['flag', 'Conflict'], warn: ['warn', 'Question'], note: ['info', 'Note'] };
const VERDICT_CHIP = { agree: 'pass', questions: 'warn', disagree: 'flag', incomplete: '' };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const pol = id => `<button class="pol" type="button" data-pol="${esc(id)}">${esc(id)}</button>`;
const chip = (cls, text) => `<span class="chip ${cls}">${esc(text)}</span>`;
const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

let log = store.get('riskdesk.log', []);
let current = CASES[0].id, typeFilter = 'all', pendingPolicy = null, pendingTool = null, clearArmed = false;
const drafts = {};
const draft = id => (drafts[id] ||= { action: '', params: {}, rationale: '', message: '', review: null, ai: null, aiError: '', aiBusy: false, override: '', chat: [], chatBusy: false, reopened: false });
const latest = id => [...log].reverse().find(e => e.caseId === id);
const isDecided = id => !!latest(id) && !draft(id).reopened;

// ---------- Message templates ----------
function template(c, action, p) {
  const f = c.facts;
  const T = {
    reserve: `We've placed a ${p.percent || '[percent]'}% reserve on payouts for up to ${p.days || '[days]'} days while we review recent activity on your account. You can reply with any information that helps, and you can ask support to review this decision.`,
    suspend_sales: 'Sales on your store are paused while we review recent activity. Your balance is held, not removed. We will contact you with next steps.',
    terminate: 'Your account has been closed for breaking our Terms. Any remaining balance will be handled as described in the Terms of Service. You can ask support to review this decision.',
    request_info: 'To finish our review, please send: [what you need]. Reply here and we will pick it straight back up.',
    request_docs: 'To finish verifying your account, please upload: [documents]. Payouts resume once verification is complete.',
    refund: `Your refund of ${usd(f.amount)} has been processed to your original payment method. It usually arrives within 3 to 5 business days.`,
    route_to_seller: `Refunds for the product itself are handled by ${c.subject} under their refund policy. Please contact them using the details on your receipt. If you cannot reach them, reply here and we will route your request.`,
    deny: 'We reviewed your request and cannot approve a refund from Whop. [Reason]. You can contact the seller about their own refund policy.',
    escalate_compliance: 'Payouts on your account are paused while we complete a routine review. Your balance is held, not removed. We will contact you when the review is finished.',
    hold_reverify: `We've held your withdrawal of ${usd(f.withdrawal)} because your payout details changed recently. Please verify your identity in Settings and the withdrawal will be released once that's done.`,
    lock_account: 'We locked your account to protect it after unusual activity. Please verify your identity to regain access.',
    approve: 'Your submission is approved and views will be paid at the offer rate.',
    approve_partial: `Your submission is approved. Payment covers ${p.verifiedViews ? (+p.verifiedViews).toLocaleString('en-US') : '[number]'} views that passed our quality checks.`,
    reject: `Your submission was not approved: ${CR_REJECT_GROUNDS[p.rejectGround] || '[reason]'}.`,
    ban: `Your submission was not approved (${CR_REJECT_GROUNDS[p.rejectGround] || '[reason]'}), and you can no longer join this offer.`,
    overturn: 'We reviewed the rejection and found the submission met the offer. It is approved and will be paid at the offer rate.',
    uphold: 'We reviewed the rejection and it stands: [reason].',
    require_changes: 'Your listing needs changes before it can stay live: [changes]. Please update it within [days] days.',
    remove_listing: 'We removed your listing because it breaks our Prohibited Products & Services policy: [reason].',
    suspend_withhold: 'Your account is suspended and payouts are on hold while we investigate listings that break our policies. You can ask support to review this decision.',
    remove: 'We removed your bounty because payouts must be for a completed task, not decided by chance.'
  };
  return T[action] || '';
}

// ---------- Router ----------
const VIEWS = { cases: renderCases, log: renderLog, playbook: renderPlaybook, policies: renderPolicies, tools: renderTools };
function route() {
  const name = (location.hash || '#cases').slice(1);
  const view = VIEWS[name] ? name : 'cases';
  document.querySelectorAll('.nav a').forEach(a => { if (a.getAttribute('href') === '#' + view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const el = $('#view');
  el.onclick = el.oninput = el.onchange = null;
  el.innerHTML = VIEWS[view]() + footer();
  after[view]?.();
}
const after = {};
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

function footer() {
  return `<footer class="foot"><p>Unofficial project by Timothy Adetunji. Not affiliated with or endorsed by Whop. Policy summaries are paraphrased from Whop's public legal pages, read on 12 Nov 2026; those pages are the source of truth. All cases, people and accounts are invented.</p>
  <p><a href="https://github.com/whizztimmy/same-facts" target="_blank" rel="noopener">Source</a> · <a href="https://linkedin.com/in/timztech" target="_blank" rel="noopener">LinkedIn</a></p></footer>`;
}

// ---------- Cases ----------
function renderCases() {
  const types = [...new Set(CASES.map(c => c.type))];
  const list = CASES.filter(c => typeFilter === 'all' || c.type === typeFilter);
  const open = CASES.filter(c => !isDecided(c.id)).length;
  return `<div class="page-head"><div><h1>Cases</h1><p class="lead">${open} open of ${CASES.length}. Checks run on every case; you make the decision.</p></div></div>
  <div class="work">
    <aside class="list" aria-label="Case list">
      <div class="list-head"><label for="typeFilter"><span>Type</span><select id="typeFilter"><option value="all">All types</option>${types.map(t => `<option value="${t}" ${t === typeFilter ? 'selected' : ''}>${esc(TYPES[t].label)}</option>`).join('')}</select></label></div>
      <div class="list-items">${list.map(c => {
        const s = summarize(runChecks(c)), done = isDecided(c.id);
        return `<button class="item" type="button" data-case="${c.id}" aria-current="${c.id === current}">
          <span class="t"><b>${esc(c.subject)}</b><span class="mono mute">${c.id}</span></span>
          <span class="meta">${esc(TYPES[c.type].label)} ${done ? chip('pass', 'Decided') : s.flag.length ? chip('flag', s.flag.length + ' flag' + (s.flag.length > 1 ? 's' : '')) : s.warn.length ? chip('warn', s.warn.length + ' to check') : chip('', 'Open')}</span>
        </button>`;
      }).join('')}</div>
    </aside>
    <section id="caseView">${renderCase(CASES.find(c => c.id === current))}</section>
  </div>`;
}

function factValue(c, key, kind) {
  const v = c.facts[key];
  if (v === '' || v == null) return null;
  if (kind === 'usd') return usd(v);
  if (typeof v === 'number') return v.toLocaleString('en-US');
  return String(v).replace(/_/g, ' ');
}

function lookupLinks(c) {
  const L = c.lookups || {};
  const links = LOOKUPS.filter(l => L[l.input]).map(l => `<a href="${esc(l.url(L[l.input], L.platform))}" target="_blank" rel="noopener" title="${esc(l.what)}">${esc(l.name)}</a>`);
  return links.length ? links.join('') : '<span class="mute small">No lookups for this case.</span>';
}

function renderCase(c) {
  const t = TYPES[c.type], checks = runChecks(c), s = summarize(checks);
  const pols = [...new Set(checks.flatMap(x => x.policy))];
  const e = latest(c.id), d = draft(c.id);
  return `<div class="case-head">
    <div class="meta"><span class="mono">${c.id}</span><span>·</span><span>${esc(t.label)}</span><span>·</span><span>Opened ${esc(c.opened)}</span>${isDecided(c.id) ? chip('pass', 'Decided') : ''}</div>
    <h2 style="font-size:20px">${esc(c.subject)}</h2>
    <p class="alert">${esc(c.alert)}</p>
  </div>
  <div class="cols">
    <div>
      <div class="section"><h3>Evidence</h3><div class="facts">${t.fields.map(([k, label, kind]) => {
        const v = factValue(c, k, kind);
        return `<div class="fact ${kind === 'text' ? 'wide' : ''} ${v === null ? 'blank' : ''}"><span>${esc(label)}</span><span>${v === null ? 'Not on file' : esc(v)}</span></div>`;
      }).join('')}</div></div>
      <div class="section"><h3>Lookups</h3><div class="lookups">${lookupLinks(c)}</div><p class="small mute">Opens public tools in a new tab. Sample data uses reserved .example domains, so some return nothing.</p></div>
      <div class="section"><h3>Policy that applies</h3><div>${pols.map(id => { const p = POLICIES.find(x => x.id === id); return `<div class="rule"><span>${pol(id)}</span><div><b>${esc(p.title)}</b><p class="mute small">${esc(p.text)}</p></div></div>`; }).join('')}</div></div>
    </div>
    <div>
      <div class="section"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Checks</h3><div class="tally">${s.flag.length ? chip('flag', s.flag.length + ' flag') : ''}${s.warn.length ? chip('warn', s.warn.length + ' look closer') : ''}${s.missing.length ? chip('', s.missing.length + ' missing') : ''}${chip('pass', s.pass.length + ' pass')}</div></div>
        <div class="checks">${checks.map(x => `<div class="check"><div>${chip(x.result, RESULT[x.result])}</div><div><div class="lbl">${esc(x.label)}</div><div class="det">${esc(x.detail)}</div><div class="pols">${x.policy.map(pol).join('')}</div></div></div>`).join('')}</div>
      </div>
      <div class="section"><h3>Decision</h3><div id="decision">${isDecided(c.id) ? decidedView(c, e) : decisionForm(c, d)}</div></div>
      <div class="section"><h3>Ask about this case</h3><div id="chat">${chatView(c, d)}</div></div>
    </div>
  </div>`;
}

function decidedView(c, e) {
  const t = TYPES[c.type];
  return `<div class="panel"><p class="done">${esc(t.actions[e.action].label)}${e.paramsText ? ' · ' + esc(e.paramsText) : ''}</p>
    <div class="kv"><dt>Decided</dt><dd>${esc(e.at)}</dd><dt>Review</dt><dd>${chip(VERDICT_CHIP[e.verdict], VERDICT_LABEL[e.verdict])}${e.aiVerdict ? ' ' + chip(VERDICT_CHIP[e.aiVerdict], 'Claude: ' + VERDICT_LABEL[e.aiVerdict]) : ''}</dd>
    <dt>Rationale</dt><dd>${esc(e.rationale)}</dd>${e.override ? `<dt>Override</dt><dd>${esc(e.override)}</dd>` : ''}${e.message ? `<dt>Message</dt><dd>${esc(e.message)}</dd>` : ''}</div>
    <div class="row"><button class="btn sm" type="button" data-act="reopen">Reopen case</button></div></div>`;
}

function paramInputs(c, d) {
  const a = TYPES[c.type].actions[d.action];
  if (!a || !a.params) return '';
  const p = d.params, f = c.facts;
  const parts = a.params.map(k => {
    if (k === 'percent') return `<label for="p_percent"><span>Reserve (% of funds)</span><input id="p_percent" data-param="percent" type="number" min="1" max="100" value="${esc(p.percent ?? '')}"></label>`;
    if (k === 'days') return `<label for="p_days"><span>Hold for (days, 180 max)</span><input id="p_days" data-param="days" type="number" min="1" max="180" value="${esc(p.days ?? '')}"></label>`;
    if (k === 'ground') return `<label for="p_ground"><span>Refund ground (Seller Terms 5)</span><select id="p_ground" data-param="ground"><option value="">Choose a ground</option>${Object.entries(REFUND_GROUNDS).map(([g, l]) => `<option value="${g}" ${p.ground === g ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    if (k === 'rejectGround') return `<label for="p_rg"><span>Ground (CR-2)</span><select id="p_rg" data-param="rejectGround"><option value="">Choose a ground</option>${Object.entries(CR_REJECT_GROUNDS).map(([g, l]) => `<option value="${g}" ${p.rejectGround === g ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    if (k === 'verifiedViews') return `<label for="p_vv"><span>Verified views to pay</span><input id="p_vv" data-param="verifiedViews" type="number" min="0" max="${f.views}" value="${esc(p.verifiedViews ?? '')}"></label>`;
    return '';
  }).join('');
  let extra = '';
  if (c.type === 'seller_review' && d.action === 'reserve' && p.percent) extra = `<p class="small mute" id="paramNote">Holds ${usd((+f.balance || 0) * (+p.percent) / 100)} of the ${usd(f.balance)} balance${p.days ? `, until ${new Date(Date.now() + (+p.days) * 864e5).toISOString().slice(0, 10)}` : ''}.</p>`;
  if (c.type === 'cr_submission' && d.action === 'approve_partial' && p.verifiedViews !== undefined && p.verifiedViews !== '') { const m = crPayout(f, +p.verifiedViews); extra = `<p class="small mute" id="paramNote">Pays ${usd(m.paid)} to the participant plus ${usd(m.fee)} Whop fee.</p>`; }
  return `<div class="grid2">${parts}</div>${extra}`;
}

function decisionForm(c, d) {
  const t = TYPES[c.type];
  return `<div class="panel">
    <div class="actions-pick" role="radiogroup" aria-label="Decision">${Object.entries(t.actions).map(([k, a]) => `<label><input type="radio" name="action" value="${k}" ${d.action === k ? 'checked' : ''}><span>${esc(a.label)}</span></label>`).join('')}</div>
    <div id="params">${paramInputs(c, d)}</div>
    <label for="rationale"><span>Rationale</span><textarea id="rationale" rows="4" placeholder="The decision, the policy behind it, the facts that support it, and what would change it.">${esc(d.rationale)}</textarea></label>
    <label for="message"><span>Message to the user (optional)</span><textarea id="message" rows="3" placeholder="Choose a decision to start from a draft.">${esc(d.message)}</textarea></label>
    <div class="row"><button class="btn primary" type="button" data-act="review" ${d.action ? '' : 'disabled'}>Review my decision</button><span class="small mute" id="stale">${d.review && d.stale ? 'Changed since the review. Run it again before confirming.' : ''}</span></div>
    <div id="reviewOut">${reviewView(c, d)}</div>
  </div>`;
}

function reviewView(c, d) {
  if (!d.review) return '';
  const r = d.review;
  const aiPart = !aiEnabled() ? `<p class="small mute">Rule-based review only. Add an Anthropic API key in AI review settings for a second opinion from Claude.</p>`
    : d.aiBusy ? `<div class="ai-box"><p class="mute">Claude is reviewing the decision…</p></div>`
    : d.aiError ? `<div class="ai-box"><p><b>Claude review unavailable.</b> ${esc(d.aiError)}</p></div>`
    : d.ai ? `<div class="ai-box"><div class="verdict"><b>Claude's second opinion</b>${chip(VERDICT_CHIP[d.ai.verdict], VERDICT_LABEL[d.ai.verdict])}</div><p>${esc(d.ai.summary)}</p>
        ${d.ai.concerns.length ? `<ul>${d.ai.concerns.map(x => `<li>${esc(x.point)} ${x.policy.map(pol).join(' ')}</li>`).join('')}</ul>` : ''}
        ${d.ai.questions.length ? `<p class="small mute">Questions</p><ul>${d.ai.questions.map(q => `<li>${esc(q)}</li>`).join('')}</ul>` : ''}</div>` : '';
  const needsOverride = r.verdict !== 'agree' || (d.ai && d.ai.verdict !== 'agree');
  return `<div style="display:grid;gap:12px;border-top:1px solid var(--line);padding-top:14px">
    <div class="verdict"><b>Rule-based review</b>${chip(VERDICT_CHIP[r.verdict], VERDICT_LABEL[r.verdict])}</div>
    ${r.findings.length ? `<div>${r.findings.map(x => `<div class="finding"><div>${chip(SEV[x.sev][0], SEV[x.sev][1])}</div><div>${esc(x.text)} ${x.policy.map(pol).join(' ')}</div></div>`).join('')}</div>` : '<p class="mute">No conflicts with the checks or policy limits.</p>'}
    ${aiPart}
    ${needsOverride ? `<label for="override"><span>You own this decision. To go ahead anyway, say why the review does not change it.</span><textarea id="override" rows="2">${esc(d.override)}</textarea></label>` : ''}
    <div class="row"><button class="btn primary" type="button" data-act="confirm" ${d.stale || d.aiBusy || (r.findings.some(x => x.sev === 'block') && !d.override.trim()) ? 'disabled' : ''} id="confirmBtn">Confirm decision</button><span class="small mute">Money and messages move only after you confirm.</span></div>
  </div>`;
}

function chatView(c, d) {
  const msgs = d.chat.map(m => `<div class="q">${esc(m.q)}</div><div class="a">${m.html || esc(m.a)}</div>`).join('');
  return `<div class="chat">
    <p class="small mute">${aiEnabled() ? 'Claude answers using this case, its checks and the policy list.' : 'AI is off, so this searches the policies and playbook.'}</p>
    ${msgs ? `<div class="chat-log">${msgs}</div>` : ''}
    <form class="row" id="askForm" style="flex-wrap:nowrap"><input id="askInput" placeholder="e.g. Can Whop refund a product complaint?" autocomplete="off"><button class="btn" type="submit" ${d.chatBusy ? 'disabled' : ''}>${d.chatBusy ? 'Asking…' : 'Ask'}</button></form>
  </div>`;
}

function paramsText(c, d) {
  const p = d.params;
  if (d.action === 'reserve') return `${p.percent}% for ${p.days} days`;
  if (d.action === 'refund') return REFUND_GROUNDS[p.ground] || '';
  if (['reject', 'ban'].includes(d.action)) return CR_REJECT_GROUNDS[p.rejectGround] || '';
  if (d.action === 'approve_partial') return `${(+p.verifiedViews).toLocaleString('en-US')} verified views`;
  return '';
}

function refreshDecision(c) { $('#decision').innerHTML = isDecided(c.id) ? decidedView(c, latest(c.id)) : decisionForm(c, draft(c.id)); }
function refreshChat(c) { $('#chat').innerHTML = chatView(c, draft(c.id)); const l = $('.chat-log'); if (l) l.scrollTop = l.scrollHeight; }
function markStale(d) { if (d.review) { d.stale = true; const s = $('#stale'); if (s) s.textContent = 'Changed since the review. Run it again before confirming.'; const b = $('#confirmBtn'); if (b) b.disabled = true; } }

after.cases = () => {
  const c = CASES.find(x => x.id === current), d = draft(c.id), view = $('#view');
  $('#typeFilter').onchange = e => { typeFilter = e.target.value; const vis = CASES.filter(x => typeFilter === 'all' || x.type === typeFilter); if (!vis.some(x => x.id === current)) current = vis[0].id; route(); };
  view.onchange = e => {
    if (e.target.name === 'action') {
      const prevTpl = template(c, d.action, d.params);
      d.action = e.target.value;
      if (!d.message || d.message === prevTpl) d.message = template(c, d.action, d.params);
      markStale(d); refreshDecision(c);
    }
  };
  view.oninput = e => {
    const id = e.target.id;
    if (id === 'rationale') { d.rationale = e.target.value; markStale(d); }
    if (id === 'message') { d.message = e.target.value; markStale(d); }
    if (id === 'override') { d.override = e.target.value; const b = $('#confirmBtn'); if (b && !d.stale) b.disabled = d.aiBusy || (d.review.findings.some(x => x.sev === 'block') && !d.override.trim()); }
    if (e.target.dataset.param) { syncParam(c, d, e.target); const n = $('#paramNote'); const fresh = document.createElement('div'); fresh.innerHTML = paramInputs(c, d); const nn = fresh.querySelector('#paramNote'); if (n && nn) n.replaceWith(nn); else if (!n && nn) $('#params').appendChild(nn); }
  };
  view.onclick = async e => {
    const caseBtn = e.target.closest('[data-case]');
    if (caseBtn) { current = caseBtn.dataset.case; route(); if (innerWidth < 860) $('#caseView').scrollIntoView({ block: 'start' }); return; }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'review') runReview(c, d);
    if (act === 'confirm') confirmDecision(c, d);
    if (act === 'reopen') { d.reopened = true; d.review = null; d.ai = null; d.override = ''; route(); }
  };
  $('#askForm').onsubmit = e => askQuestion(e, c, d);
};
function syncParam(c, d, el) {
  const prevTpl = template(c, d.action, d.params);
  d.params[el.dataset.param] = el.value;
  if (d.message === prevTpl) { d.message = template(c, d.action, d.params); const m = $('#message'); if (m) m.value = d.message; }
  markStale(d);
}

async function runReview(c, d) {
  const checks = runChecks(c);
  const decision = { action: d.action, params: d.params, rationale: d.rationale, message: d.message };
  d.review = review(c, checks, decision, log.map(x => ({ ...x })));
  d.stale = false; d.ai = null; d.aiError = '';
  if (aiEnabled()) {
    d.aiBusy = true; refreshDecision(c);
    try { d.ai = await aiReview(c, checks, TYPES[c.type].label, { ...decision, action: TYPES[c.type].actions[d.action].label }, d.review); }
    catch (err) { d.aiError = err.message || String(err); }
    d.aiBusy = false;
  }
  if (current === c.id && location.hash.replace('#', '') in { '': 1, cases: 1 }) refreshDecision(c);
}

function confirmDecision(c, d) {
  if (!d.review || d.stale) return;
  const checks = runChecks(c);
  log.push({ caseId: c.id, subject: c.subject, type: c.type, action: d.action, paramsText: paramsText(c, d), rationale: d.rationale.trim(), message: d.message.trim(),
    verdict: d.review.verdict, aiVerdict: d.ai?.verdict || '', override: d.override.trim(), signature: signature(c, checks), at: now() });
  store.set('riskdesk.log', log);
  drafts[c.id] = undefined; delete drafts[c.id];
  route();
}

async function askQuestion(e, c, d) {
  e.preventDefault();
  const q = $('#askInput').value.trim();
  if (!q || d.chatBusy) return;
  if (!aiEnabled()) {
    const hits = searchKnowledge(q);
    const html = hits.length ? `<div class="src">${hits.map(h => `<div>${h.kind === 'policy' ? pol(h.ref) : `<span class="chip accent">Playbook</span>`} <b>${esc(h.title)}</b><br><span class="small">${esc(h.text)}</span>${h.policy ? ' ' + h.policy.map(pol).join(' ') : ''}</div>`).join('')}</div>` : 'No matching policy or playbook entry. Try other words, or turn on AI review.';
    d.chat.push({ q, a: '', html }); refreshChat(c); return;
  }
  d.chatBusy = true; d.chat.push({ q, a: '…' }); refreshChat(c);
  const entry = d.chat[d.chat.length - 1];
  try { entry.a = await aiAsk(c, runChecks(c), TYPES[c.type].label, d.chat.slice(0, -1).filter(m => !m.html), q); }
  catch (err) { entry.a = 'Could not get an answer: ' + (err.message || err); }
  d.chatBusy = false;
  if (current === c.id) refreshChat(c);
}

// ---------- Decision log ----------
function renderLog() {
  const rows = [...log].reverse();
  return `<div class="page-head"><div><h1>Decision log</h1><p class="lead">Every confirmed decision with its review result. Stored only in this browser.</p></div>
    <div class="row"><button class="btn" type="button" data-act="csv" ${rows.length ? '' : 'disabled'}>Copy as CSV</button><button class="btn quiet" type="button" data-act="clear" ${rows.length ? '' : 'disabled'}>${clearArmed ? 'Click again to clear' : 'Clear log'}</button></div></div>
  ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Decided</th><th>Case</th><th>Decision</th><th>Review</th><th>Rationale</th><th>Override</th></tr></thead><tbody>${rows.map(e => `<tr>
    <td class="mono">${esc(e.at)}</td><td><a href="#cases" data-open="${e.caseId}">${esc(e.caseId)}</a><br><span class="small mute">${esc(e.subject)}</span></td>
    <td>${esc(TYPES[e.type].actions[e.action].label)}${e.paramsText ? `<br><span class="small mute">${esc(e.paramsText)}</span>` : ''}</td>
    <td>${chip(VERDICT_CHIP[e.verdict], VERDICT_LABEL[e.verdict])}${e.aiVerdict ? `<br>${chip(VERDICT_CHIP[e.aiVerdict], 'Claude: ' + VERDICT_LABEL[e.aiVerdict])}` : ''}</td>
    <td class="small">${esc(e.rationale)}</td><td class="small">${esc(e.override || '')}</td></tr>`).join('')}</tbody></table></div>`
    : '<div class="panel"><p class="mute">No decisions yet. Open a case, choose a decision, run the review and confirm it.</p></div>'}`;
}
after.log = () => {
  $('#view').onclick = async e => {
    const open = e.target.closest('[data-open]');
    if (open) { current = open.dataset.open; typeFilter = 'all'; return; }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'clear') { if (clearArmed) { log = []; store.set('riskdesk.log', log); clearArmed = false; } else clearArmed = true; route(); }
    if (act === 'csv') {
      const head = ['decided', 'case', 'subject', 'type', 'decision', 'detail', 'review', 'claude_review', 'rationale', 'override'];
      const cell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const csv = [head.join(','), ...log.map(x => [x.at, x.caseId, x.subject, TYPES[x.type].label, TYPES[x.type].actions[x.action].label, x.paramsText, x.verdict, x.aiVerdict, x.rationale, x.override].map(cell).join(','))].join('\n');
      const b = e.target.closest('button');
      try { await navigator.clipboard.writeText(csv); b.textContent = 'Copied'; } catch { b.textContent = 'Copy blocked by this browser'; }
    }
  };
};

// ---------- Playbook ----------
function renderPlaybook() {
  return `<div class="page-head"><div><h1>Analyst playbook</h1><p class="lead">What to look for in each queue, how to check it, and the rule it ties to. Tools and policy IDs link to the other pages.</p></div></div>
  <div class="doc"><nav class="toc" aria-label="Playbook sections"><a href="#playbook" data-jump="pb-workflow">How to work a case</a>${PLAYBOOK.map(s => `<a href="#playbook" data-jump="pb-${s.id}">${esc(s.title)}</a>`).join('')}<a href="#playbook" data-jump="pb-writing">Writing the decision</a></nav>
  <div class="doc-body">
    <section id="pb-workflow"><h2>How to work a case</h2><ol class="steps" style="margin-top:14px">${WORKFLOW.map(w => `<li><div><b>${esc(w.step)}.</b> <span class="mute">${esc(w.text)}</span></div></li>`).join('')}</ol></section>
    ${PLAYBOOK.map(s => `<section id="pb-${s.id}"><h2>${esc(s.title)}</h2><p class="lead" style="margin-bottom:8px">${esc(s.intro)}</p>${s.items.map(i => `<div class="signal"><b>${esc(i.signal)}</b>
      <dl class="kv"><dt>Why</dt><dd>${esc(i.why)}</dd><dt>Check</dt><dd>${esc(i.check)}</dd>${i.tools.length ? `<dt>Tools</dt><dd class="row" style="gap:6px">${i.tools.map(toolChip).join('')}</dd>` : ''}<dt>Policy</dt><dd class="row" style="gap:4px">${i.policy.map(pol).join('')}</dd></dl></div>`).join('')}</section>`).join('')}
    <section id="pb-writing"><h2>Writing the decision</h2><ol class="steps" style="margin-top:14px">${WRITING.map(w => `<li><div>${esc(w)}</div></li>`).join('')}</ol></section>
  </div></div>`;
}
function toolChip(id) {
  const name = CALCULATORS[id] || LOOKUPS.find(l => l.id === id)?.name || id;
  return `<button class="chip accent" type="button" style="border:0;cursor:pointer" data-tool="${id}">${esc(name)}</button>`;
}
after.playbook = () => {
  $('#view').onclick = e => {
    const j = e.target.closest('[data-jump]');
    if (j) { e.preventDefault(); document.getElementById(j.dataset.jump)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  };
};

// ---------- Policies ----------
function renderPolicies() {
  return `<div class="page-head"><div><h1>Policies</h1><p class="lead">${POLICIES.length} rules from ${Object.keys(SOURCES).length} Whop documents, paraphrased with an ID that checks and decisions cite. The linked page is always the source of truth.</p></div>
    <label for="polSearch" style="min-width:260px"><span>Filter</span><input id="polSearch" placeholder="e.g. reserve, refund, views"></label></div>
  <div class="doc"><nav class="toc" aria-label="Documents">${Object.entries(SOURCES).map(([k, s]) => `<a href="#policies" data-jump="src-${k}">${esc(s.name)}</a>`).join('')}</nav>
  <div class="doc-body" id="polBody">${Object.entries(SOURCES).map(([k, s]) => `<section id="src-${k}" data-src="${k}"><div class="row" style="justify-content:space-between;align-items:baseline"><h2>${esc(s.name)}</h2><span class="small mute">${esc(s.updated.startsWith('Read') ? s.updated : 'Updated ' + s.updated)} · <a href="${s.url}" target="_blank" rel="noopener">Read the source</a></span></div>
    ${POLICIES.filter(p => p.src === k).map(p => `<div class="rule" id="rule-${p.id.replace(/\./g, '_')}" data-text="${esc((p.id + ' ' + p.title + ' ' + p.text + ' ' + p.area).toLowerCase())}"><span class="mono" style="color:var(--accent-ink)">${p.id}</span><div><b>${esc(p.title)}</b> <span class="chip">${esc(p.area)}</span><p class="mute" style="margin-top:3px">${esc(p.text)}</p></div></div>`).join('')}</section>`).join('')}</div></div>`;
}
after.policies = () => {
  $('#polSearch').oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('#polBody .rule').forEach(r => { r.hidden = q && !r.dataset.text.includes(q); });
    document.querySelectorAll('#polBody section').forEach(s => { s.hidden = !!q && !s.querySelector('.rule:not([hidden])'); });
  };
  $('#view').onclick = e => { const j = e.target.closest('[data-jump]'); if (j) { e.preventDefault(); document.getElementById(j.dataset.jump)?.scrollIntoView(); } };
  if (pendingPolicy) {
    const el = document.getElementById('rule-' + pendingPolicy.replace(/\./g, '_'));
    pendingPolicy = null;
    if (el) { el.classList.add('hl'); setTimeout(() => el.scrollIntoView({ block: 'center' }), 0); }
  }
};

// ---------- Tools ----------
function renderTools() {
  return `<div class="page-head"><div><h1>Tools</h1><p class="lead">Calculators that apply Whop's numbers, lookups that open public tools prefilled, and the commercial software analysts use for each queue.</p></div></div>
  <section class="section"><h2>Calculators</h2><div class="tools-grid">
    <div class="panel" id="tool-calc-dispute"><b>Dispute rate (90 days)</b><p class="small mute">Seller Terms limit: below 1% of transactions over a rolling 90 days ${pol('ST-5.3')}</p>
      <div class="grid2"><label for="cd_d"><span>Disputes</span><input id="cd_d" type="number" min="0" value="42"></label><label for="cd_t"><span>Transactions</span><input id="cd_t" type="number" min="0" value="3000"></label>
      <label for="cd_m"><span>Of which under $1</span><input id="cd_m" type="number" min="0" value="540"></label></div><div class="out" id="cd_out"></div></div>
    <div class="panel" id="tool-calc-reserve"><b>Reserve planner</b><p class="small mute">Up to 100% of funds, held no longer than 180 days ${pol('ST-5.6')}</p>
      <div class="grid2"><label for="cr_b"><span>Balance ($)</span><input id="cr_b" type="number" min="0" value="31200"></label><label for="cr_p"><span>Reserve (%)</span><input id="cr_p" type="number" min="0" max="100" value="50"></label>
      <label for="cr_days"><span>Days</span><input id="cr_days" type="number" min="0" value="90"></label><label for="cr_exp"><span>Expected disputes ($)</span><input id="cr_exp" type="number" min="0" value="9800"></label></div><div class="out" id="cr_out"></div></div>
    <div class="panel" id="tool-calc-payout"><b>Content Rewards payout</b><p class="small mute">Legitimate views only, capped by the budget, plus a 10% fee ${pol('CR-1')} ${pol('CR-4')}</p>
      <div class="grid2"><label for="cp_v"><span>Views</span><input id="cp_v" type="number" min="0" value="1240000"></label><label for="cp_r"><span>Rate per 1,000 ($)</span><input id="cp_r" type="number" min="0" step="0.01" value="1.5"></label>
      <label for="cp_s"><span>Verified share (%)</span><input id="cp_s" type="number" min="0" max="100" value="20"></label><label for="cp_b"><span>Budget remaining ($)</span><input id="cp_b" type="number" min="0" value="4200"></label></div><div class="out" id="cp_out"></div></div>
    <div class="panel" id="tool-calc-views"><b>View quality check</b><p class="small mute">Signals of bought or botted views ${pol('CR-4')} ${pol('CR-8')}</p>
      <div class="grid2"><label for="cv_v"><span>Views</span><input id="cv_v" type="number" min="0" value="1240000"></label><label for="cv_e"><span>Likes + comments + shares</span><input id="cv_e" type="number" min="0" value="2330"></label>
      <label for="cv_f"><span>Followers</span><input id="cv_f" type="number" min="0" value="1800"></label><label for="cv_h"><span>Hours since posting</span><input id="cv_h" type="number" min="0" value="6"></label>
      <label for="cv_g"><span>Top country share (%)</span><input id="cv_g" type="number" min="0" max="100" value="74"></label><label for="cv_in"><span>Top country in target market?</span><select id="cv_in"><option value="no">No</option><option value="yes">Yes</option></select></label></div><div class="out" id="cv_out"></div></div>
    <div class="panel" id="tool-scan-listing" style="grid-column:1/-1"><b>Listing scanner</b><p class="small mute">Finds wording tied to prohibited products, claims and chance-based payouts. It catches phrasing, not intent, so read the listing too.</p>
      <label for="sl_t"><span>Listing, bounty or caption text</span><textarea id="sl_t" rows="3">Forex mentorship and signals room. Members make $10k/month on autopilot. Lifetime access for one payment.</textarea></label><div class="out" id="sl_out"></div></div>
  </div></section>
  <section class="section"><h2>Lookups</h2><p class="lead">Each opens the public tool in a new tab. Use public or test data only: customer personal data belongs in approved vendor tools, not public search sites.</p>
    <div class="panel" id="tool-lookups"><div class="grid2">
      <label for="lk_name"><span>Name or business</span><input id="lk_name" value="Apex FX Academy"></label><label for="lk_domain"><span>Domain</span><input id="lk_domain" placeholder="example.com"></label>
      <label for="lk_handle"><span>Social handle</span><input id="lk_handle" placeholder="@handle"></label><label for="lk_platform"><span>Platform</span><select id="lk_platform"><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="instagram">Instagram</option></select></label>
      <label for="lk_ip"><span>IP address</span><input id="lk_ip" placeholder="203.0.113.48"></label><label for="lk_wallet"><span>Wallet address</span><input id="lk_wallet" placeholder="0x..."></label></div>
      <div class="table-wrap"><table style="min-width:560px"><thead><tr><th>Tool</th><th>Use it for</th><th>Uses</th><th></th></tr></thead><tbody>${LOOKUPS.map(l => `<tr id="tool-${l.id}"><td><b>${esc(l.name)}</b></td><td class="mute">${esc(l.what)}</td><td class="small mute">${l.input}</td><td><a class="btn sm" data-lookup="${l.id}" href="#tools" target="_blank" rel="noopener">Open</a></td></tr>`).join('')}</tbody></table></div></div></section>
  <section class="section"><h2>Software used in Risk Operations</h2><p class="lead">The commercial tools each queue usually relies on. This describes the categories in general; it is not a statement about what Whop uses.</p>
    <div class="table-wrap"><table><thead><tr><th>Category</th><th>Examples</th><th>What it catches</th><th>Queue</th></tr></thead><tbody>${SOFTWARE.map(s => `<tr><td><b>${esc(s.category)}</b></td><td>${esc(s.examples)}</td><td class="mute">${esc(s.catches)}</td><td class="small">${esc(s.queue)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
after.tools = () => {
  const v = id => +($('#' + id).value || 0);
  const calc = () => {
    const d = v('cd_d'), t = v('cd_t'), m = v('cd_m');
    const r = t ? d / t * 100 : 0, rx = t - m > 0 ? d / (t - m) * 100 : 0, room = Math.max(0, Math.ceil(t * 0.01) - 1 - d);
    $('#cd_out').innerHTML = `<span>Dispute rate <b>${r.toFixed(2)}%</b> ${chip(r >= 1 ? 'flag' : r >= 0.75 ? 'warn' : 'pass', r >= 1 ? 'At or over limit' : r >= 0.75 ? 'Near limit' : 'Under limit')}</span><span>Without sub-$1 charges: <b>${rx.toFixed(2)}%</b>${m ? ' (nominal charges can dilute the rate; see ST-5.5)' : ''}</span><span>${r >= 1 ? 'Already over the limit.' : `${room} more dispute${room === 1 ? '' : 's'} before reaching 1% at this volume.`}</span>`;
    const b = v('cr_b'), p = v('cr_p'), days = v('cr_days'), ex = v('cr_exp'), held = b * p / 100;
    const probs = [p > 100 && 'Reserve cannot exceed 100%.', days > 180 && 'Holds cannot exceed 180 days.'].filter(Boolean);
    $('#cr_out').innerHTML = `<span>Holds <b>${usd(held)}</b>, releases <b>${days ? new Date(Date.now() + days * 864e5).toISOString().slice(0, 10) : '-'}</b></span><span>Covers ${ex ? Math.round(held / ex * 100) + '% of expected disputes' : 'no exposure estimate entered'}${ex && held > ex * 1.5 ? '. More than the exposure; consider a smaller reserve.' : ex && held < ex ? '. Less than the exposure.' : ''}</span>${probs.map(x => `<span>${chip('flag', 'Not allowed')} ${x}</span>`).join('')}`;
    const views = v('cp_v'), rate = v('cp_r'), share = v('cp_s'), bud = v('cp_b');
    const all = crPayout({ ratePer1k: rate, budgetRemaining: bud }, views), ver = crPayout({ ratePer1k: rate, budgetRemaining: bud }, views * share / 100);
    $('#cp_out').innerHTML = `<span>All views: ${usd(all.gross)} earned, <b>${usd(all.paid)}</b> payable after the budget cap</span><span>Verified views only (${Math.round(views * share / 100).toLocaleString('en-US')}): <b>${usd(ver.paid)}</b> + ${usd(ver.fee)} fee</span><span>Difference: ${usd(all.paid - ver.paid)} the seller would pay for views that may not be legitimate.</span>`;
    const vv = v('cv_v'), en = v('cv_e'), fo = v('cv_f'), h = v('cv_h'), g = v('cv_g'), inm = $('#cv_in').value === 'yes';
    const er = vv ? en / vv * 100 : 0, pf = fo ? vv / fo : 0;
    const sig = [er < 0.5 && 'Engagement under 0.5%', pf > 50 && h <= 24 && `${Math.round(pf)} views per follower in ${h}h`, g >= 60 && !inm && `${g}% of views from outside the target market`].filter(Boolean);
    $('#cv_out').innerHTML = `<span>Engagement <b>${er.toFixed(2)}%</b> · views per follower <b>${pf.toFixed(1)}</b></span><span>${sig.length ? sig.map(s => chip('flag', s)).join(' ') : chip('pass', 'No inflation signals')}</span><span class="small mute">Lines are internal triage thresholds, not Whop policy. Confirm with the account's history.</span>`;
    const hits = scanText($('#sl_t').value);
    $('#sl_out').innerHTML = hits.length ? hits.map(x => `<span>${chip(x.sev, x.sev === 'flag' ? 'Prohibited' : 'Needs proof')} <b>${esc(x.label)}</b>: "${esc(x.hit)}" ${x.policy.map(pol).join(' ')}</span>`).join('') : `<span>${chip('pass', 'Nothing found')} No prohibited or claim wording matched.</span>`;
  };
  $('#view').oninput = calc; $('#view').onchange = calc; calc();
  $('#view').onclick = e => {
    const a = e.target.closest('[data-lookup]');
    if (!a) return;
    const l = LOOKUPS.find(x => x.id === a.dataset.lookup), val = $('#lk_' + l.input).value.trim();
    if (!val && l.input !== 'name') { e.preventDefault(); $('#lk_' + l.input).focus(); return; }
    a.href = l.url(val || 'example', $('#lk_platform').value);
  };
  if (pendingTool) { const el = document.getElementById('tool-' + pendingTool); pendingTool = null; if (el) { el.style.boxShadow = '0 0 0 3px var(--accent-line)'; setTimeout(() => el.scrollIntoView({ block: 'center' }), 0); } }
};

// ---------- Global: policy and tool links, AI settings ----------
document.addEventListener('click', e => {
  const p = e.target.closest('[data-pol]');
  if (p) { pendingPolicy = p.dataset.pol; if (location.hash === '#policies') route(); else location.hash = 'policies'; return; }
  const t = e.target.closest('[data-tool]');
  if (t) { pendingTool = t.dataset.tool; if (location.hash === '#tools') route(); else location.hash = 'tools'; }
});
function aiLabel() { $('#aiBtn').textContent = 'AI review: ' + (aiEnabled() ? 'on' : 'off'); }
$('#aiBtn').onclick = () => { $('#aiSheet').hidden = false; $('#aiKey').value = ''; $('#aiKey').focus(); };
$('#aiClose').onclick = () => { $('#aiSheet').hidden = true; };
$('#aiClear').onclick = () => { setKey(''); aiLabel(); $('#aiSheet').hidden = true; route(); };
$('#aiForm').onsubmit = e => { e.preventDefault(); const k = $('#aiKey').value.trim(); if (k) setKey(k); aiLabel(); $('#aiSheet').hidden = true; route(); };
$('#aiSheet').onclick = e => { if (e.target.id === 'aiSheet') $('#aiSheet').hidden = true; };
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#aiSheet').hidden = true; });

aiLabel();
route();
