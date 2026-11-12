// Case checks and decision review. Every check cites the policy it enforces.
// Thresholds marked "internal" are working lines for triage, not Whop policy.

export const EU_EEA_UK = ['Austria','Belgium','Bulgaria','Croatia','Cyprus','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Ireland','Italy','Latvia','Lithuania','Luxembourg','Malta','Netherlands','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden','Iceland','Liechtenstein','Norway','United Kingdom'];
// Demo list only. In production the embargo list comes from compliance, not from code.
export const EMBARGOED_DEMO = ['Cuba','Iran','North Korea'];

const blank = v => v === '' || v === null || v === undefined;
const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
const fmt = n => (Math.round(n * 100) / 100).toLocaleString('en-US');
export const usd = n => '$' + (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });

// ---------- Listing scanner ----------
export const SCAN_RULES = [
  { id: 'lifetime', label: 'Lifetime or indefinite access', sev: 'flag', policy: ['ST-3.1', 'PP-2.4'], re: /\blifetime\b|forever access|access forever|never pay again|one[- ]time payment,? forever/i },
  { id: 'accounts', label: 'Accounts, followers or engagement for sale', sev: 'flag', policy: ['PP-2.1'], re: /accounts? for sale|aged (instagram |tiktok |)accounts?|buy (real )?(followers|likes|views)|followers? packages?|(instagram|tiktok|youtube) accounts\b/i },
  { id: 'crypto', label: 'Crypto sale or investment solicitation', sev: 'flag', policy: ['PP-2.2'], re: /buy (bitcoin|crypto|usdt|our token)|token presale|staking rewards|cloud mining|we trade (it )?for you|managed accounts?|copy our trades with your funds/i },
  { id: 'gambling', label: 'Wagering through the product', sev: 'flag', policy: ['PP-2.3'], re: /place (your )?bets? (with|on) us|deposit (to|and) (bet|wager)|our casino|wager with us/i },
  { id: 'health', label: 'Health or regulated-service claims', sev: 'flag', policy: ['PP-2.5'], re: /\bcures?\b|treats? (anxiety|depression|diabetes|cancer)|therapy sessions|legal advice from/i },
  { id: 'infringing', label: 'Cheats, exploits or pirated content', sev: 'flag', policy: ['PP-2.6'], re: /\baimbot\b|game cheats?|\bexploits?\b|\biptv\b|cracked software|modded apk|unlimited coins/i },
  { id: 'chance', label: 'Payout decided by chance', sev: 'flag', policy: ['ET-B'], re: /random(ly)? (draw|winner|pick|selected)|\braffle\b|\blottery\b|lucky winner/i },
  { id: 'earnings', label: 'Income claim that needs substantiation', sev: 'warn', policy: ['CG-3', 'ToS-5'], re: /\$\s?\d[\d,]*k?\s*(\/|a|per)\s*(day|week|month)|make \$\d|guaranteed (income|profit|returns?|results)|passive income|quit your (9.?5|job)|risk[- ]free/i }
];
export function scanText(text) {
  const t = String(text || '');
  return SCAN_RULES.map(r => { const m = t.match(r.re); return m ? { ...r, hit: m[0] } : null; }).filter(Boolean);
}

// ---------- Case types ----------
export const TYPES = {
  seller_review: {
    label: 'Seller review',
    fields: [
      ['accountAgeDays', 'Days on Whop'], ['kybVerified', 'KYB verified'], ['transactions90', 'Transactions, 90 days'], ['disputes90', 'Disputes, 90 days'],
      ['refundRate30', 'Refund rate, 30 days (%)'], ['microTxShare', 'Transactions under $1 (%)'], ['amexRetriesMax24h', 'Most Amex retries on one card in 24h'],
      ['sales7', 'Sales, last 7 days ($)', 'usd'], ['avgWeek', 'Weekly average, last 30 days ($)', 'usd'], ['balance', 'Balance ($)', 'usd'], ['listingText', 'Listing text', 'text']
    ],
    actions: {
      no_action: { label: 'No action', lenient: true },
      monitor: { label: 'Monitor (no restriction)', lenient: true },
      request_info: { label: 'Request information', info: true },
      reserve: { label: 'Place reserve', params: ['percent', 'days'] },
      suspend_sales: { label: 'Suspend sales', severe: true },
      terminate: { label: 'Terminate account', severe: true }
    }
  },
  refund_request: {
    label: 'Refund request',
    fields: [
      ['complaint', 'What the buyer says'], ['amount', 'Amount ($)', 'usd'], ['buyerCountry', 'Buyer country'], ['daysSincePurchase', 'Days since purchase'],
      ['chargeCount', 'Charges for this item'], ['secondsBetweenCharges', 'Seconds between charges'], ['euWaiverAcknowledged', 'Waiver acknowledged at checkout'],
      ['accessedContent', 'Buyer accessed content'], ['sellerResponse', 'Seller response'], ['chargebackThreatened', 'Chargeback threatened'],
      ['sellerDisputeRate90', 'Seller dispute rate, 90 days (%)'], ['buyerRefunds90', 'Buyer refunds, 90 days']
    ],
    actions: {
      refund: { label: 'Refund (Whop)', params: ['ground'] },
      route_to_seller: { label: 'Route to seller', lenient: true },
      deny: { label: 'Deny', lenient: true },
      request_info: { label: 'Request information', info: true }
    }
  },
  kyb_screening: {
    label: 'KYC/KYB screening',
    fields: [
      ['entityName', 'Name screened'], ['listEntry', 'List entry matched'], ['dobMatch', 'Date of birth vs entry'], ['nationalityMatch', 'Nationality vs entry'],
      ['addressMatch', 'Address vs entry'], ['kycCountry', 'KYC country'], ['ipCountries', 'Login countries'], ['ownersListed', 'Beneficial owners listed'], ['balance', 'Balance ($)', 'usd']
    ],
    actions: {
      clear_fp: { label: 'Clear as false positive', lenient: true },
      request_docs: { label: 'Request documents', info: true },
      escalate_compliance: { label: 'Hold funds, escalate to compliance', severe: true }
    }
  },
  payout_change: {
    label: 'Payout alert',
    fields: [
      ['accountAgeDays', 'Days on Whop'], ['payoutChangedHoursAgo', 'Payout destination changed (hours ago)'], ['emailChangedHoursAgo', 'Email changed (hours ago)'],
      ['twoFactor', 'Two-factor auth'], ['newCountry', 'Login from a new country'], ['newDevice', 'New device'], ['withdrawal', 'Withdrawal requested ($)', 'usd'],
      ['avgWithdrawal', 'Average withdrawal ($)', 'usd'], ['firstLinkedOwnerMatches', 'Payout name matches first linked owner'], ['ip', 'Login IP']
    ],
    actions: {
      release: { label: 'Release withdrawal', lenient: true },
      hold_reverify: { label: 'Hold withdrawal, re-verify owner' },
      lock_account: { label: 'Lock account', severe: true }
    }
  },
  cr_submission: {
    label: 'Content Rewards submission',
    fields: [
      ['platform', 'Platform'], ['handle', 'Account'], ['accountAgeDays', 'Account age (days)'], ['participantAge', 'Participant age'], ['followers', 'Followers'],
      ['views', 'Views'], ['likes', 'Likes'], ['comments', 'Comments'], ['shares', 'Shares'], ['hoursSincePost', 'Hours since posting'],
      ['topCountry', 'Top viewer country'], ['topCountryShare', 'Share of views from top country (%)'], ['offerMarket', 'Offer target market'],
      ['caption', 'Caption', 'text'], ['postedDate', 'Posted'], ['offerEndDate', 'Offer end date'], ['budgetRemaining', 'Offer budget remaining ($)', 'usd'],
      ['ratePer1k', 'Rate per 1,000 views ($)', 'usd'], ['duplicateOf', 'Matches earlier submission'], ['offPlatformMention', 'Off-platform payment mentioned']
    ],
    actions: {
      approve: { label: 'Approve, pay all views', lenient: true },
      approve_partial: { label: 'Approve, pay verified views only', params: ['verifiedViews'] },
      reject: { label: 'Reject', params: ['rejectGround'] },
      ban: { label: 'Reject and ban from offer', severe: true, params: ['rejectGround'] }
    }
  },
  cr_appeal: {
    label: 'Content Rewards appeal',
    fields: [
      ['sellerReason', 'Seller\'s reason for rejecting'], ['offerCriteriaMet', 'Submission meets offer criteria'], ['views', 'Views'], ['budgetRemaining', 'Offer budget remaining ($)', 'usd'],
      ['endDatePassed', 'Offer end date passed'], ['fraudSignals', 'Fraud signals on the submission'], ['sellerFundsCover', 'Seller balance covers max payout + 10% fee'], ['ratePer1k', 'Rate per 1,000 views ($)', 'usd']
    ],
    actions: {
      uphold: { label: 'Uphold seller rejection', lenient: true },
      overturn: { label: 'Overturn, pay participant' },
      request_info: { label: 'Request information', info: true }
    }
  },
  listing_report: {
    label: 'Listing report',
    fields: [['reportedBy', 'Reported by'], ['accessPeriodShown', 'Access period shown at checkout'], ['listingText', 'Listing text', 'text']],
    actions: {
      no_violation: { label: 'No violation', lenient: true },
      require_changes: { label: 'Require listing changes' },
      remove_listing: { label: 'Remove listing', severe: true },
      suspend_withhold: { label: 'Suspend seller, withhold payouts', severe: true }
    }
  },
  bounty_review: {
    label: 'Bounty review',
    fields: [['payoutRule', 'How winners are paid'], ['prizePool', 'Total payout ($)', 'usd'], ['bountyText', 'Bounty text', 'text']],
    actions: {
      approve: { label: 'Approve bounty', lenient: true },
      require_changes: { label: 'Require changes' },
      remove: { label: 'Remove bounty', severe: true }
    }
  }
};

export const REFUND_GROUNDS = {
  i: '(i) Seller instructed the refund',
  ii: '(ii) Payment-layer issue',
  iii: '(iii) Fraud or unlawful activity',
  iv: '(iv) Required by law or network rules',
  v: '(v) Chargeback imminent, refund reduces risk'
};
export const CR_REJECT_GROUNDS = {
  criteria: 'Does not meet the offer criteria',
  terms: 'Breaks the program terms',
  fraud: 'Reasonable suspicion of fraud',
  closed: 'After max payout or end date'
};
export const CR_ALLOWED_SELLER_REASONS = ['criteria_not_met', 'terms_broken', 'fraud_suspected', 'max_payout_or_end_date'];

// ---------- Checks ----------
const C = (id, label, result, detail, policy) => ({ id, label, result, detail, policy });

function checkSeller(f) {
  const out = [];
  if (blank(f.transactions90) || blank(f.disputes90)) out.push(C('dispute_rate', 'Dispute rate, rolling 90 days', 'missing', 'Transactions or disputes for the last 90 days are missing.', ['ST-5.3']));
  else {
    const r = pct(+f.disputes90, +f.transactions90);
    const res = r >= 1 ? 'flag' : r >= 0.75 ? 'warn' : 'pass';
    out.push(C('dispute_rate', 'Dispute rate, rolling 90 days', res, `${f.disputes90} disputes / ${(+f.transactions90).toLocaleString('en-US')} transactions = ${fmt(r)}%. Limit is below 1%${res === 'warn' ? '; within the internal 0.75% watch line' : ''}.`, ['ST-5.3', 'ST-5.4']));
  }
  if (!blank(f.microTxShare)) out.push(C('micro_tx', 'Nominal charges diluting disputes', +f.microTxShare > 10 ? 'flag' : 'pass', `${f.microTxShare}% of transactions are under $1${+f.microTxShare > 10 ? '. Above the internal 10% line; these inflate the denominator of the dispute rate' : ''}.`, ['ST-5.5']));
  if (!blank(f.amexRetriesMax24h)) out.push(C('amex_retries', 'Amex retry limit', +f.amexRetriesMax24h > 3 ? 'flag' : 'pass', `Most retries on one Amex card in 24 hours: ${f.amexRetriesMax24h}. Limit is 3.`, ['ST-5.5']));
  if (!blank(f.sales7) && !blank(f.avgWeek)) { const x = +f.avgWeek > 0 ? +f.sales7 / +f.avgWeek : 0; out.push(C('volume', 'Unusual volume', x > 3 ? 'warn' : 'pass', `Last 7 days ${usd(f.sales7)} vs ${usd(f.avgWeek)} weekly average (${fmt(x)}x). Internal line is 3x.`, ['ST-5.6'])); }
  if (!blank(f.refundRate30)) out.push(C('refund_rate', 'Refund rate', +f.refundRate30 > 10 ? 'warn' : 'pass', `${f.refundRate30}% over 30 days. Internal watch line is 10%.`, ['ST-5.4']));
  out.push(blank(f.kybVerified) ? C('kyb', 'Verification', 'missing', 'KYB status unknown.', ['ToS-3.2']) : C('kyb', 'Verification', f.kybVerified === 'yes' ? 'pass' : 'flag', f.kybVerified === 'yes' ? 'KYB verified.' : 'KYB not complete. Incomplete verification is a reserve basis and blocks payouts.', ['ToS-3.2', 'ST-5.6']));
  if (!blank(f.accountAgeDays) && +f.accountAgeDays < 90) out.push(C('new_account', 'Account history', 'warn', `${f.accountAgeDays} days on Whop. New accounts are a reserve basis.`, ['ST-5.6']));
  out.push(...scanChecks(f.listingText));
  return out;
}
function scanChecks(text) {
  if (blank(text)) return [C('listing', 'Listing review', 'missing', 'No listing text on file.', ['ST-3.1'])];
  const hits = scanText(text);
  if (!hits.length) return [C('listing', 'Listing review', 'pass', 'No prohibited or claim language found by the scanner. Read it yourself too.', ['ST-3.1', 'CG-3'])];
  return hits.map(h => C('scan_' + h.id, h.label, h.sev, `Found "${h.hit}".`, h.policy));
}
function checkRefund(f) {
  const out = [];
  if (+f.chargeCount >= 2 && !blank(f.secondsBetweenCharges) && +f.secondsBetweenCharges <= 600)
    out.push(C('duplicate', 'Duplicate charge', 'flag', `${f.chargeCount} charges ${f.secondsBetweenCharges} seconds apart for one item. A payment-layer issue Whop resolves directly, ground (ii).`, ['ST-5.2', 'BT-9.1']));
  else out.push(C('duplicate', 'Duplicate charge', 'pass', `${f.chargeCount || 1} charge for this item.`, ['BT-9.1']));
  if (f.complaint === 'unrecognised charge') out.push(C('unrecognised', 'Unrecognised charge', 'warn', 'Buyer does not recognise the charge. Check card ownership before treating it as ground (ii) or (iii).', ['ST-5.2', 'BT-9.1', 'BT-12']));
  const eu = EU_EEA_UK.includes(f.buyerCountry);
  if (!eu) out.push(C('eu_right', 'EU/EEA/UK withdrawal right', 'pass', `Buyer in ${f.buyerCountry || 'unknown country'}; the 14-day right does not apply.`, ['BT-9.3']));
  else if (+f.daysSincePurchase > 14) out.push(C('eu_right', 'EU/EEA/UK withdrawal right', 'pass', `Buyer in ${f.buyerCountry}, but ${f.daysSincePurchase} days have passed.`, ['BT-9.3']));
  else if (blank(f.euWaiverAcknowledged)) out.push(C('eu_right', 'EU/EEA/UK withdrawal right', 'missing', `Buyer in ${f.buyerCountry} on day ${f.daysSincePurchase}. Need the checkout record: did they acknowledge losing the right?`, ['BT-9.3']));
  else if (f.euWaiverAcknowledged === 'yes' && f.accessedContent === 'yes') out.push(C('eu_right', 'EU/EEA/UK withdrawal right', 'pass', 'Buyer acknowledged the waiver at checkout and has accessed the content, so the right has ended.', ['BT-9.3']));
  else out.push(C('eu_right', 'EU/EEA/UK withdrawal right', 'flag', `Buyer in ${f.buyerCountry} on day ${f.daysSincePurchase} with no waiver acknowledged at checkout. The statutory right applies, ground (iv).`, ['BT-9.3', 'ST-5.2']));
  if (['not as described', 'no access', 'changed mind'].includes(f.complaint))
    out.push(C('product_issue', 'Product complaint', 'info', `Complaint is "${f.complaint}". Whop does not judge product merit; the seller's policy governs. Seller response: ${f.sellerResponse}.`, ['BT-9.2', 'ST-1']));
  if (f.sellerResponse === 'approved') out.push(C('seller_approved', 'Seller instruction', 'pass', 'Seller approved the refund, ground (i).', ['ST-5.2']));
  if (f.chargebackThreatened === 'yes') out.push(C('chargeback_risk', 'Chargeback risk', +f.sellerDisputeRate90 >= 0.75 ? 'warn' : 'info', `Buyer threatened a chargeback. Seller dispute rate ${f.sellerDisputeRate90}% over 90 days.${+f.sellerDisputeRate90 >= 0.75 ? ' A dispute here pushes the seller toward the 1% limit; ground (v) may apply.' : ''}`, ['ST-5.2', 'ST-5.3']));
  if (+f.buyerRefunds90 >= 3) out.push(C('buyer_history', 'Buyer refund history', 'warn', `${f.buyerRefunds90} refunds in 90 days across sellers. Possible friendly fraud.`, ['CG-1']));
  return out;
}
function groundsSupported(checks, f) {
  const g = new Set();
  const has = (id, r) => checks.some(c => c.id === id && (!r || r.includes(c.result)));
  if (f.sellerResponse === 'approved') g.add('i');
  if (has('duplicate', ['flag'])) g.add('ii');
  if (has('unrecognised')) { g.add('ii'); g.add('iii'); }
  if (has('eu_right', ['flag'])) g.add('iv');
  if (has('chargeback_risk', ['warn'])) g.add('v');
  return g;
}
function checkKyb(f) {
  const out = [];
  const ids = [['dobMatch', 'date of birth'], ['nationalityMatch', 'nationality'], ['addressMatch', 'address']];
  const known = ids.filter(([k]) => !blank(f[k]));
  const matches = known.filter(([k]) => f[k] === 'matches').map(([, l]) => l);
  const differs = known.filter(([k]) => f[k] === 'differs').map(([, l]) => l);
  if (matches.length >= 2) out.push(C('identifiers', 'Identifier comparison', 'flag', `Name plus ${matches.join(' and ')} match the list entry. Treat as a likely true match.`, ['ToS-17', 'PP-1']));
  else if (differs.length >= 2 && !matches.length) out.push(C('identifiers', 'Identifier comparison', 'pass', `Name matches, but ${differs.join(' and ')} differ. Enough to clear as a false positive.`, ['ToS-17']));
  else if (matches.length === 1) out.push(C('identifiers', 'Identifier comparison', 'warn', `Name and ${matches[0]} match; ${differs.length ? differs.join(', ') + ' differ' : 'other identifiers unknown'}. Unresolved.`, ['ToS-17', 'PP-1']));
  else out.push(C('identifiers', 'Identifier comparison', 'missing', `Only ${known.length} identifier${known.length === 1 ? '' : 's'} compared. Need at least two to clear.`, ['ToS-17']));
  const countries = [f.kycCountry, ...String(f.ipCountries || '').split(',').map(s => s.trim())].filter(Boolean);
  const emb = countries.filter(c => EMBARGOED_DEMO.includes(c));
  out.push(C('jurisdiction', 'Embargoed locations', emb.length ? 'flag' : 'pass', emb.length ? `Activity from ${emb.join(', ')}.` : `KYC and login countries: ${countries.join(', ') || 'none on file'}. None on the embargo list.`, ['ToS-2', 'ToS-17']));
  out.push(blank(f.ownersListed) || f.ownersListed === 'no' ? C('owners', 'Beneficial owners', 'missing', 'Beneficial owners are not listed, so they have not been screened.', ['ToS-3.2']) : C('owners', 'Beneficial owners', 'pass', 'Owners listed and screened.', ['ToS-3.2']));
  return out;
}
function checkPayout(f) {
  const out = [];
  const big = +f.avgWithdrawal > 0 && +f.withdrawal >= 3 * +f.avgWithdrawal;
  const recent = !blank(f.payoutChangedHoursAgo) && +f.payoutChangedHoursAgo <= 72;
  out.push(C('change_withdraw', 'Payout change then withdrawal', recent && big ? 'flag' : recent ? 'warn' : 'pass', `${recent ? `Destination changed ${f.payoutChangedHoursAgo}h ago` : 'No recent destination change'}; withdrawal ${usd(f.withdrawal)} vs ${usd(f.avgWithdrawal)} average${big ? ' (3x or more)' : ''}.`, ['ST-7', 'ToS-3.1']));
  if (!blank(f.emailChangedHoursAgo) && +f.emailChangedHoursAgo <= 72) out.push(C('credentials', 'Credential change', 'flag', `Email changed ${f.emailChangedHoursAgo}h ago, before the payout change.`, ['ST-7']));
  out.push(C('two_factor', 'Two-factor auth', f.twoFactor === 'on' ? 'pass' : 'warn', `Two-factor is ${f.twoFactor || 'unknown'}.`, ['ST-7']));
  if (f.newCountry === 'yes' || f.newDevice === 'yes') out.push(C('location', 'New location or device', 'warn', `${f.newCountry === 'yes' ? 'New country' : ''}${f.newCountry === 'yes' && f.newDevice === 'yes' ? ' and ' : ''}${f.newDevice === 'yes' ? 'new device' : ''} at login (${f.ip}).`, ['ST-7']));
  out.push(C('owner', 'Revenue owner', f.firstLinkedOwnerMatches === 'no' ? 'flag' : 'pass', f.firstLinkedOwnerMatches === 'no' ? 'New payout account is not in the name of the first linked owner, who owns the revenue.' : 'Payout account is in the first linked owner\'s name.', ['ToS-3.1']));
  return out;
}
function checkCr(f) {
  const out = [];
  const eng = pct((+f.likes || 0) + (+f.comments || 0) + (+f.shares || 0), +f.views);
  out.push(C('engagement', 'Engagement on views', eng < 0.5 ? 'flag' : eng < 1.5 ? 'warn' : 'pass', `${fmt(eng)}% of viewers liked, commented or shared. Internal lines: under 1.5% look closer, under 0.5% treat as likely inflated.`, ['CR-4']));
  const perFollower = +f.followers > 0 ? +f.views / +f.followers : 0;
  if (+f.hoursSincePost <= 24 && perFollower > 50) out.push(C('velocity', 'View velocity', 'flag', `${(+f.views).toLocaleString('en-US')} views in ${f.hoursSincePost}h on an account with ${(+f.followers).toLocaleString('en-US')} followers (${fmt(perFollower)} views per follower).`, ['CR-4']));
  else out.push(C('velocity', 'View velocity', 'pass', `${fmt(perFollower)} views per follower over ${f.hoursSincePost}h.`, ['CR-4']));
  const geoOff = +f.topCountryShare >= 60 && !String(f.offerMarket || '').includes(f.topCountry);
  out.push(C('geography', 'Viewer geography', geoOff ? 'flag' : 'pass', `${f.topCountryShare}% of views from ${f.topCountry}; offer targets ${f.offerMarket}.`, ['CR-4']));
  if (+f.participantAge < 18) out.push(C('age', 'Participant age', 'flag', `Participant is ${f.participantAge}. Content Rewards requires 18+.`, ['CR-8', 'ET-0']));
  if (+f.accountAgeDays < 30) out.push(C('account_age', 'Account age', 'warn', `Social account is ${f.accountAgeDays} days old.`, ['CR-8']));
  const cap = String(f.caption || '');
  if (/giveaway|comment to win|win (a |\$)|prize|tag \d+ friends/i.test(cap)) out.push(C('inducement', 'Inducements in caption', 'flag', 'Caption offers a prize or giveaway for engagement. Induced views are not paid.', ['CR-4']));
  out.push(C('disclosure', 'Sponsorship disclosure', /#(ad|sponsored|\w+ad)\b/i.test(cap) ? 'pass' : 'flag', /#(ad|sponsored|\w+ad)\b/i.test(cap) ? 'Disclosure present in the caption.' : 'No #ad, #sponsored or #[Seller]Ad in the visible caption.', ['CR-7']));
  if (!blank(f.duplicateOf)) out.push(C('duplicate', 'Duplicate deliverable', 'flag', `Same clip as submission ${f.duplicateOf}.`, ['CR-3']));
  const late = (f.postedDate && f.offerEndDate && f.postedDate > f.offerEndDate) || +f.budgetRemaining <= 0;
  out.push(C('timing', 'Offer still open', late ? 'flag' : 'pass', late ? `Posted ${f.postedDate}; offer ended ${f.offerEndDate} or budget is used up.` : `Posted ${f.postedDate}, before the ${f.offerEndDate} end date. ${usd(f.budgetRemaining)} budget left.`, ['CR-5']));
  if (f.offPlatformMention === 'yes') out.push(C('off_platform', 'Off-platform payment', 'flag', 'Messages mention payment outside Whop.', ['CR-6']));
  return out;
}
function checkAppeal(f) {
  const out = [];
  const allowed = CR_ALLOWED_SELLER_REASONS.includes(f.sellerReason);
  out.push(C('reason', 'Seller\'s stated reason', allowed ? 'info' : 'flag', allowed ? `"${f.sellerReason.replace(/_/g, ' ')}" is an allowed ground. Check it against the facts.` : `"${String(f.sellerReason).replace(/_/g, ' ')}" is not one of the four allowed grounds.`, ['CR-2']));
  out.push(C('criteria', 'Offer criteria', f.offerCriteriaMet === 'yes' ? 'pass' : f.offerCriteriaMet === 'no' ? 'flag' : 'missing', f.offerCriteriaMet === 'yes' ? 'Submission meets the offer criteria.' : f.offerCriteriaMet === 'no' ? 'Submission misses the offer criteria.' : 'Criteria not checked yet.', ['CR-2']));
  const open = +f.budgetRemaining > 0 && f.endDatePassed !== 'yes';
  out.push(C('open', 'Offer still open', open ? 'pass' : 'flag', open ? `${usd(f.budgetRemaining)} left and the end date has not passed.` : 'Max payout reached or end date passed.', ['CR-5']));
  out.push(C('fraud', 'Fraud signals', +f.fraudSignals > 0 ? 'warn' : 'pass', `${f.fraudSignals} fraud signal${+f.fraudSignals === 1 ? '' : 's'} on the submission.`, ['CR-4']));
  out.push(C('funding', 'Seller funding', f.sellerFundsCover === 'yes' ? 'pass' : 'flag', f.sellerFundsCover === 'yes' ? 'Seller balance covers the max payout plus the 10% fee.' : 'Seller balance does not cover the max payout plus the 10% fee.', ['CR-1']));
  return out;
}
function checkListing(f) {
  const out = scanChecks(f.listingText);
  if (f.accessPeriodShown === 'no') out.push(C('access_period', 'Access period disclosed', 'flag', 'Checkout does not show an access period.', ['ST-3.1']));
  return out;
}
function checkBounty(f) {
  const out = [];
  out.push(C('payout_rule', 'Payout tied to the task', f.payoutRule === 'per completed task' ? 'pass' : 'flag', f.payoutRule === 'per completed task' ? 'Each payout is for a completed task.' : `Winners are paid by "${f.payoutRule}", which is chance-based.`, ['ET-B']));
  const scan = scanChecks(f.bountyText).filter(c => c.result !== 'pass' && c.id !== 'scan_chance');
  return out.concat(scan);
}
export function runChecks(c) {
  const f = c.facts;
  switch (c.type) {
    case 'seller_review': return checkSeller(f);
    case 'refund_request': return checkRefund(f);
    case 'kyb_screening': return checkKyb(f);
    case 'payout_change': return checkPayout(f);
    case 'cr_submission': return checkCr(f);
    case 'cr_appeal': return checkAppeal(f);
    case 'listing_report': return checkListing(f);
    case 'bounty_review': return checkBounty(f);
    default: return [];
  }
}
export const summarize = checks => ({
  flag: checks.filter(c => c.result === 'flag'), warn: checks.filter(c => c.result === 'warn'),
  missing: checks.filter(c => c.result === 'missing'), pass: checks.filter(c => c.result === 'pass')
});

// Money estimates shown next to Content Rewards decisions.
export function crPayout(f, views) {
  const gross = (views / 1000) * (+f.ratePer1k || 0);
  const paid = Math.min(gross, Math.max(0, +f.budgetRemaining || 0));
  return { gross, paid, fee: paid * 0.1 };
}

// ---------- Decision review ----------
// Returns findings the analyst should answer before confirming. It never changes the decision.
const F = (sev, text, policy = []) => ({ sev, text, policy });
const POLICY_RE = /\b(ToS|ST|BT|CG|PP|ET|CR)-[\dA-Z.]+/;

export function review(c, checks, d, log = []) {
  const t = TYPES[c.type], a = t.actions[d.action];
  const s = summarize(checks), out = [];
  if (!a) return { verdict: 'incomplete', findings: [F('block', 'Choose a decision first.')] };
  const p = d.params || {};
  const why = String(d.rationale || '').trim();
  const msg = String(d.message || '');

  // Universal checks
  if (why.length < 40) out.push(F('warn', 'The rationale is too short for another analyst to follow. State the rule, the facts, and what would change your mind.'));
  else if (!POLICY_RE.test(why)) out.push(F('note', 'The rationale does not cite a policy section. Add one so the decision can be traced.'));
  if (s.missing.length && !a.info) out.push(F('warn', `Deciding with evidence missing: ${s.missing.map(m => m.label).join('; ')}. Consider requesting it first.`));
  if (a.lenient && s.flag.length) out.push(F('warn', `This decision leaves ${s.flag.length} flagged check${s.flag.length === 1 ? '' : 's'} unaddressed: ${s.flag.map(x => x.label).join('; ')}. Explain why each does not apply.`, [...new Set(s.flag.flatMap(x => x.policy))]));
  if (a.severe && !s.flag.length) out.push(F('warn', 'No flagged check supports a severe action. Name the evidence, or choose a lighter step.'));
  if (/sanction|ofac|sdn|watch ?list|screening hit/i.test(msg)) out.push(F('block', 'The user message mentions sanctions screening. Users should only be told a review is under way.', ['ToS-17']));

  // Type-specific rules
  if (c.type === 'seller_review') {
    if (d.action === 'reserve') {
      const per = +p.percent, days = +p.days;
      if (!(per > 0 && per <= 100)) out.push(F('block', 'A reserve must be between 1% and 100% of funds.', ['ST-5.6']));
      if (!(days > 0)) out.push(F('block', 'Set how long the reserve lasts.', ['ST-5.6']));
      else if (days > 180) out.push(F('block', `${days} days is longer than the 180-day maximum hold.`, ['ST-5.6']));
      const basis = checks.filter(x => ['dispute_rate', 'volume', 'refund_rate', 'kyb', 'new_account', 'micro_tx'].includes(x.id) && ['flag', 'warn'].includes(x.result));
      if (!basis.length) out.push(F('warn', 'None of the reserve bases in ST-5.6 is present in the checks.', ['ST-5.6']));
    }
    const listingFlags = checks.filter(x => x.id.startsWith('scan_') && x.result === 'flag');
    if (listingFlags.length && !['suspend_sales', 'terminate'].includes(d.action)) out.push(F('note', `The listing problems (${listingFlags.map(x => x.label).join('; ')}) need their own fix: require the listing to change, whatever happens to the funds.`, [...new Set(listingFlags.flatMap(x => x.policy))]));
    const dr = checks.find(x => x.id === 'dispute_rate');
    if (dr && dr.result === 'flag' && a.lenient) out.push(F('warn', 'The dispute rate is at or above 1%. Excessive rates normally get a restriction, not monitoring alone.', ['ST-5.3', 'ST-5.4']));
  }
  if (c.type === 'refund_request') {
    const g = groundsSupported(checks, c.facts);
    if (d.action === 'refund') {
      if (!p.ground) out.push(F('block', 'Whop refunds need a ground from the Seller Terms. Pick one.', ['ST-5.2']));
      else if (!g.has(p.ground)) out.push(F('block', `The checks do not support ${REFUND_GROUNDS[p.ground]}. ${g.size ? 'Supported: ' + [...g].map(k => REFUND_GROUNDS[k]).join('; ') + '.' : 'No ground is supported; this looks like a product complaint for the seller.'}`, ['ST-5.2']));
    }
    if (d.action === 'route_to_seller' && (g.has('ii') || g.has('iv'))) out.push(F('warn', `${[...g].filter(k => k === 'ii' || k === 'iv').map(k => REFUND_GROUNDS[k]).join(' and ')} applies. Whop handles this itself rather than sending the buyer to the seller.`, ['ST-5.2', 'BT-9.1', 'BT-9.3']));
    if (d.action === 'deny' && g.has('iv')) out.push(F('block', 'The EU/EEA/UK withdrawal right applies. Denying it breaks the Buyer Terms.', ['BT-9.3']));
    if (d.action === 'deny' && !g.size && checks.some(x => x.id === 'product_issue')) out.push(F('note', 'Product complaints are the seller\'s call. Routing to the seller is usually right; a Whop denial reads as judging the product.', ['BT-9.2', 'ST-1']));
  }
  if (c.type === 'kyb_screening') {
    const idc = checks.find(x => x.id === 'identifiers');
    if (d.action === 'clear_fp' && idc && idc.result !== 'pass') out.push(F('block', 'Clearing needs at least two identifiers that differ from the list entry, and none that match.', ['ToS-17']));
    if (d.action === 'clear_fp' && checks.some(x => x.id === 'jurisdiction' && x.result === 'flag')) out.push(F('block', 'There is activity from an embargoed location. This cannot be cleared at analyst level.', ['ToS-17']));
  }
  if (c.type === 'payout_change') {
    if (d.action === 'release' && checks.some(x => ['change_withdraw', 'credentials', 'owner'].includes(x.id) && x.result === 'flag')) out.push(F('block', 'Releasing funds after a credential or destination change with these flags is the takeover cash-out pattern. Re-verify the owner first.', ['ST-7', 'ToS-3.1']));
  }
  if (c.type === 'cr_submission') {
    const fraudFlags = checks.filter(x => ['engagement', 'velocity', 'geography', 'inducement'].includes(x.id) && x.result === 'flag');
    if (d.action === 'approve' && fraudFlags.length) out.push(F('block', `Paying all views ignores signs of inflated views (${fraudFlags.map(x => x.label).join('; ')}). Only legitimate views are paid.`, ['CR-4']));
    if (['reject', 'ban'].includes(d.action)) {
      if (!p.rejectGround) out.push(F('block', 'Rejections must use one of the four allowed grounds.', ['CR-2']));
      else {
        const supports = { fraud: fraudFlags.length > 0 || checks.some(x => x.id === 'off_platform' && x.result === 'flag'), terms: checks.some(x => ['disclosure', 'duplicate', 'age', 'off_platform', 'inducement'].includes(x.id) && x.result === 'flag'), closed: checks.some(x => x.id === 'timing' && x.result === 'flag'), criteria: true };
        if (!supports[p.rejectGround]) out.push(F('warn', `No check supports "${CR_REJECT_GROUNDS[p.rejectGround]}".`, ['CR-2']));
      }
    }
    if (d.action === 'approve_partial') {
      const v = +p.verifiedViews;
      if (!(v >= 0) || v > +c.facts.views) out.push(F('block', 'Verified views must be between 0 and the total views.', ['CR-4']));
      if (checks.some(x => ['disclosure', 'duplicate', 'age', 'timing'].includes(x.id) && x.result === 'flag')) out.push(F('warn', 'A program-terms flag is open (disclosure, duplicate, age or timing). Paying any views may not be allowed until it is fixed.', ['CR-3', 'CR-5', 'CR-7', 'CR-8']));
    }
  }
  if (c.type === 'cr_appeal') {
    const reason = checks.find(x => x.id === 'reason');
    if (d.action === 'uphold' && reason && reason.result === 'flag' && !checks.some(x => ['criteria', 'open'].includes(x.id) && x.result === 'flag')) out.push(F('block', 'The seller\'s reason is not an allowed ground, and the facts do not support one. Upholding it lets the seller skip paying for valid work.', ['CR-2']));
    if (d.action === 'overturn' && checks.some(x => x.id === 'funding' && x.result === 'flag')) out.push(F('warn', 'The seller balance does not cover the offer. Check how the payout will be funded.', ['CR-1']));
  }
  if (c.type === 'listing_report' || c.type === 'bounty_review') {
    if (['remove_listing', 'suspend_withhold', 'remove'].includes(d.action) && !s.flag.length && s.warn.length) out.push(F('note', 'Only claim-level warnings are open. Requiring changes is usually proportionate before removal.', ['CG-3', 'CG-4']));
  }

  // Consistency with earlier decisions on the same pattern
  const sig = signature(c, checks);
  const prior = log.filter(e => e.type === c.type && e.signature === sig && e.caseId !== c.id && e.action !== d.action);
  if (prior.length) out.push(F('warn', `Earlier you decided "${TYPES[c.type].actions[prior[0].action].label}" on ${prior[0].caseId}, which had the same flags. Same facts should get the same answer, or the note should say what differs.`));

  const verdict = out.some(x => x.sev === 'block') ? 'disagree' : out.some(x => x.sev === 'warn') ? 'questions' : 'agree';
  return { verdict, findings: out };
}
export const signature = (c, checks) => c.type + ':' + checks.filter(x => x.result === 'flag').map(x => x.id).sort().join(',');
export const VERDICT_LABEL = { agree: 'No objections', questions: 'Has questions', disagree: 'Disagrees', incomplete: 'Incomplete' };
