import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES } from '../cases.js';
import { runChecks, review, summarize, scanText } from '../rules.js';
import { POLICIES } from '../policies.js';

const get = id => CASES.find(c => c.id === id);
const flags = c => summarize(runChecks(c)).flag.map(x => x.id).sort();
const dec = (action, rationale = 'Decision under ST-5.6 based on the flagged checks and the facts in the case file.', params = {}, message = '') => ({ action, rationale, params, message });

test('every check cites a policy that exists', () => {
  const ids = new Set(POLICIES.map(p => p.id));
  for (const c of CASES) for (const ch of runChecks(c)) for (const p of ch.policy) assert.ok(ids.has(p), `${c.id} ${ch.id} cites unknown ${p}`);
});

test('seller review: disputes at 1.4%, dilution, lifetime access', () => {
  const f = flags(get('RD-1041'));
  assert.deepEqual(f, ['dispute_rate', 'micro_tx', 'scan_lifetime']);
  const r = review(get('RD-1041'), runChecks(get('RD-1041')), dec('reserve', 'Reserve under ST-5.6: disputes 1.4% over 90 days, volume 3.7x.', { percent: 50, days: 200 }));
  assert.ok(r.findings.some(x => x.sev === 'block' && /180-day/.test(x.text)));
  const ok = review(get('RD-1041'), runChecks(get('RD-1041')), dec('reserve', 'Reserve under ST-5.6 and ST-5.5: disputes 1.4% over 90 days, $0.50 trial charges dilute the rate.', { percent: 50, days: 90 }));
  assert.equal(ok.verdict, 'agree');
  assert.ok(ok.findings.some(x => x.sev === 'note' && /listing/.test(x.text)));
  const mon = review(get('RD-1041'), runChecks(get('RD-1041')), dec('monitor', 'ST-5.3: keep an eye on it for another week before acting on anything.'));
  assert.equal(mon.verdict, 'questions');
});

test('duplicate charge supports ground (ii) only', () => {
  const c = get('RD-1042'), ch = runChecks(c);
  assert.equal(review(c, ch, dec('refund', 'Refund under ST-5.2 ground (ii): two charges 38 seconds apart.', { ground: 'ii' })).verdict, 'agree');
  assert.equal(review(c, ch, dec('refund', 'Refund under ST-5.2 because the buyer is unhappy with the product.', { ground: 'iv' })).verdict, 'disagree');
  assert.ok(review(c, ch, dec('route_to_seller', 'Routing to the seller per BT-9.2 as with any refund question.')).findings.some(x => /handles this itself/.test(x.text)));
});

test('EU buyer without waiver: denial is blocked', () => {
  const c = get('RD-1043'), ch = runChecks(c);
  assert.ok(flags(c).includes('eu_right'));
  assert.equal(review(c, ch, dec('deny', 'Seller refused and the buyer accessed the course, so deny under ST-1.')).verdict, 'disagree');
  assert.equal(review(c, ch, dec('refund', 'BT-9.3: German buyer on day 6, no waiver acknowledged at checkout, ground (iv).', { ground: 'iv' })).verdict, 'agree');
});

test('product complaint: no refund ground except possible (v)', () => {
  const c = get('RD-1044'), ch = runChecks(c);
  assert.equal(review(c, ch, dec('refund', 'Refund under ST-5.2 because the course is clearly poor quality.', { ground: 'i' })).verdict, 'disagree');
  const v = review(c, ch, dec('refund', 'ST-5.2 ground (v): chargeback threatened and seller at 0.9% disputes.', { ground: 'v' }));
  assert.ok(!v.findings.some(x => x.sev === 'block'));
});

test('sanctions: clear is fine on two differing identifiers, message must not name screening', () => {
  const c = get('RD-1045'), ch = runChecks(c);
  assert.equal(review(c, ch, dec('clear_fp', 'ToS-17: name-only hit, date of birth and nationality both differ from the entry.')).verdict, 'agree');
  assert.equal(review(c, ch, dec('clear_fp', 'ToS-17: name-only hit, date of birth and nationality differ.', {}, 'Your account was flagged by sanctions screening.')).verdict, 'disagree');
  const strong = { ...c, facts: { ...c.facts, dobMatch: 'matches', nationalityMatch: 'matches' } };
  assert.equal(review(strong, runChecks(strong), dec('clear_fp', 'ToS-17: looks like a different person to me based on the photo.')).verdict, 'disagree');
});

test('takeover pattern: release is blocked', () => {
  const c = get('RD-1046'), ch = runChecks(c);
  assert.deepEqual(flags(c), ['change_withdraw', 'credentials', 'owner']);
  assert.equal(review(c, ch, dec('release', 'ToS-3.1: account is 410 days old with a clean history, release it.')).verdict, 'disagree');
});

test('Content Rewards: inflated views cannot be paid in full', () => {
  const c = get('RD-1047'), ch = runChecks(c);
  assert.deepEqual(flags(c), ['disclosure', 'engagement', 'geography', 'velocity']);
  assert.equal(review(c, ch, dec('approve', 'CR-4: big clip, pay it all, the creator did the work.')).verdict, 'disagree');
  const rej = review(c, ch, dec('reject', 'CR-2 fraud ground and CR-4: 0.19% engagement, 74% views from outside the target market.', { rejectGround: 'fraud' }));
  assert.ok(!rej.findings.some(x => x.sev === 'block'));
});

test('Content Rewards appeal: budget is not an allowed rejection reason', () => {
  const c = get('RD-1048'), ch = runChecks(c);
  assert.equal(review(c, ch, dec('uphold', 'CR-2: seller decided to move the budget to another campaign.')).verdict, 'disagree');
  assert.equal(review(c, ch, dec('overturn', 'CR-2: budget reallocation is not an allowed ground; criteria met, offer open, funds cover it.')).verdict, 'agree');
});

test('listing and bounty scanners', () => {
  assert.deepEqual(flags(get('RD-1049')), ['access_period', 'scan_accounts', 'scan_lifetime']);
  assert.deepEqual(flags(get('RD-1050')), ['payout_rule']);
  assert.ok(scanText('Members make $10k/month').some(h => h.id === 'earnings'));
  assert.ok(!scanText('Daily NBA picks and analysis').length);
});

test('consistency: same flags, different action is questioned', () => {
  const c = get('RD-1047'), ch = runChecks(c);
  const log = [{ type: c.type, caseId: 'RD-0999', action: 'approve_partial', signature: 'cr_submission:' + flags(c).join(',') }];
  const r = review(c, ch, dec('reject', 'CR-2 fraud ground and CR-4: engagement 0.19%, views from outside market.', { rejectGround: 'fraud' }), log);
  assert.ok(r.findings.some(x => /same flags/.test(x.text)));
});
