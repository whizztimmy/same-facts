// What a Risk Operations analyst looks for, by area. Each signal names the check to run,
// the tool that helps, and the policy it ties back to.

export const WORKFLOW = [
  { step: 'Read the facts', text: 'Start from the evidence in front of you: account history, transactions, listing text, messages. Note what is missing before forming a view.' },
  { step: 'Find the policy', text: 'Identify which rule governs the case. If no rule covers it, that is a policy gap to flag, not a reason to improvise.' },
  { step: 'Run the checks', text: 'Run every check for the case type, not only the one that triggered the alert. One bad refund means looking at the seller; one flagged seller means looking at linked accounts.' },
  { step: 'Ask before guessing', text: 'If a required fact is missing, request it. A paused case is better than a confident wrong call.' },
  { step: 'Decide and write it down', text: 'State the decision, the rule behind it, the facts that support it, and what would change it. Another analyst should reach the same answer from your note.' },
  { step: 'Move money last', text: 'Holds, releases, refunds and clawbacks happen only after the note is written and checked. Recheck amounts and accounts before submitting.' }
];

export const PLAYBOOK = [
  {
    id: 'onboarding', title: 'Seller onboarding and KYB',
    intro: 'New sellers carry the most risk because there is no history to judge. Most bad actors show themselves in how the account is set up.',
    items: [
      { signal: 'Identity does not match the payout account', why: 'Revenue belongs to the first linked payment account owner, so a mismatch can mean a nominee or a stolen identity.', check: 'Compare the verified name with the bank or card account holder name.', tools: ['opencorporates', 'opensanctions'], policy: ['ToS-3.1', 'ToS-3.2'] },
      { signal: 'Business documents that do not resolve', why: 'Shell or recently formed companies are common in payment fraud.', check: 'Look the company up in its registry. Check formation date, directors and registered address.', tools: ['opencorporates'], policy: ['ToS-3.2'] },
      { signal: 'Website or socials created days ago', why: 'Real businesses usually have a footprint older than their first payout request.', check: 'Check domain registration date and archive history.', tools: ['whois', 'wayback'], policy: ['ST-5.6'] },
      { signal: 'Linked to a restricted or banned account', why: 'Terminated users may not open new accounts.', check: 'Match payout account, device, IP, email and phone against restricted accounts.', tools: [], policy: ['ToS-10'] }
    ]
  },
  {
    id: 'sanctions', title: 'Sanctions screening',
    intro: 'A name match is a lead, not a finding. The job is to confirm or rule it out on identifiers, and to keep the reason confidential.',
    items: [
      { signal: 'Name-only hit', why: 'Common names match list entries all the time.', check: 'Compare date of birth, nationality, address and ID numbers. Two differing identifiers is a reasonable basis to clear; write down which.', tools: ['opensanctions', 'ofac'], policy: ['ToS-17', 'PP-1'] },
      { signal: 'Match on two or more identifiers', why: 'This is a likely true match.', check: 'Hold funds and escalate to compliance. Do not tell the user the reason.', tools: ['opensanctions', 'ofac'], policy: ['ToS-17', 'PP-1'] },
      { signal: 'Activity from an embargoed country', why: 'Users may not use Whop from embargoed locations.', check: 'Check KYC country, IP history and payout bank country.', tools: ['ipinfo'], policy: ['ToS-2', 'ToS-17'] }
    ]
  },
  {
    id: 'disputes', title: 'Disputes, chargebacks and reserves',
    intro: 'Whop\'s line is a dispute rate below 1% over a rolling 90 days. Reserves can go up to 100% of funds and last no more than 180 days.',
    items: [
      { signal: 'Dispute rate at or above 1% (90 days)', why: 'Above the Seller Terms threshold. Excessive rates can bring suspended sales or termination.', check: 'Recompute disputes divided by transactions over 90 days. Read the dispute reasons: fraud codes and "not as described" codes need different responses.', tools: ['calc-dispute'], policy: ['ST-5.3', 'ST-5.4'] },
      { signal: 'Many tiny charges', why: 'Nominal charges inflate the transaction count and dilute the dispute rate. This is a prohibited billing practice.', check: 'Look at the share of transactions under $1 and whether they deliver anything.', tools: ['calc-dispute'], policy: ['ST-5.5'] },
      { signal: 'Repeated card retries', why: 'More than 3 American Express retries in 24 hours is prohibited, and retry storms also signal card testing.', check: 'Count retries per card per 24 hours.', tools: [], policy: ['ST-5.5'] },
      { signal: 'Sudden volume spike', why: 'Unusual volume is a listed reason for a reserve, and bust-out fraud looks like rapid growth before a cash-out.', check: 'Compare the last 7 days with the 30-day weekly average. Check the payout schedule.', tools: ['calc-reserve'], policy: ['ST-5.6'] },
      { signal: 'Reserve that cannot be justified', why: 'A reserve needs a listed basis and an end date within 180 days.', check: 'Name the basis, size the reserve to the realistic exposure, and set a review date.', tools: ['calc-reserve'], policy: ['ST-5.6', 'ST-5.8'] }
    ]
  },
  {
    id: 'refunds', title: 'Refund requests',
    intro: 'The seller owns product refunds. Whop refunds directly only on the five grounds in the Seller Terms, so the first question is always which ground applies.',
    items: [
      { signal: 'Duplicate or unrecognised charge', why: 'A payment-layer issue that Whop resolves directly.', check: 'Match amount, card and timestamps. Check whether the buyer received one product or two.', tools: [], policy: ['ST-5.2', 'BT-9.1'] },
      { signal: 'Product complaint ("not as described", no access)', why: 'Whop does not judge product merit. The seller\'s refund policy governs.', check: 'Route to the seller, and log the complaint against the seller\'s file. Repeated complaints are a seller-review signal.', tools: [], policy: ['ST-5.2', 'BT-9.2'] },
      { signal: 'EU, EEA or UK buyer within 14 days', why: 'A statutory right that can require a refund regardless of seller policy.', check: 'Check purchase date, buyer country, and whether the buyer acknowledged losing the right at checkout.', tools: [], policy: ['BT-9.3', 'ST-5.2'] },
      { signal: 'Buyer threatens a chargeback', why: 'Ground (v): a refund can be right when a chargeback looks imminent and refunding reduces the risk.', check: 'Weigh the seller\'s dispute rate and the strength of the buyer\'s claim.', tools: ['calc-dispute'], policy: ['ST-5.2'] },
      { signal: 'Serial refund requester', why: 'Friendly fraud: buyers who consume the product and then claim a refund.', check: 'Count the buyer\'s refunds and disputes across sellers.', tools: [], policy: ['CG-1'] }
    ]
  },
  {
    id: 'payouts', title: 'Payouts and account takeover',
    intro: 'Most takeover losses happen in the hour between a credentials change and a withdrawal.',
    items: [
      { signal: 'Payout destination changed, then a large withdrawal', why: 'The classic takeover cash-out pattern.', check: 'Hold the withdrawal and re-verify the owner through a channel the attacker does not control.', tools: ['ipinfo'], policy: ['ToS-3.1', 'ST-7'] },
      { signal: 'New device or country at login', why: 'A session from somewhere the owner has never been.', check: 'Compare with login history, and check whether email, password or 2FA changed recently.', tools: ['ipinfo'], policy: ['ST-7'] },
      { signal: 'Ownership dispute between partners', why: 'Whop does not mediate revenue ownership. The first linked account owner owns revenue.', check: 'Identify the first linked payment account and apply the rule. Do not take sides on the business dispute.', tools: [], policy: ['ToS-3.1'] }
    ]
  },
  {
    id: 'listings', title: 'Prohibited products and listing claims',
    intro: 'Read the listing the way a buyer would. The prohibited list covers how a product is sold as well as what it is.',
    items: [
      { signal: '"Lifetime access" or no access period', why: 'Prohibited. Listings must disclose the access period.', check: 'Search the listing, checkout and FAQ for lifetime, forever or one-time-forever language.', tools: ['scan-listing'], policy: ['ST-3.1', 'PP-2.4'] },
      { signal: 'Income promises', why: 'Earnings claims must be substantiated, typical, and net of expenses.', check: 'Ask for substantiation. Check testimonials for typical-results disclosure.', tools: ['scan-listing'], policy: ['CG-3', 'ToS-5'] },
      { signal: 'Accounts, followers or engagement for sale', why: 'Prohibited, and it also feeds fraud in Content Rewards.', check: 'Look for aged accounts, followers, views, likes or "growth services" that deliver bots.', tools: ['scan-listing'], policy: ['PP-2.1'] },
      { signal: 'Crypto sales, investment returns or managed accounts', why: 'Selling digital assets and unregistered investment products is prohibited. Education can be allowed.', check: 'Separate teaching about a topic from selling, exchanging or soliciting investment.', tools: ['scan-listing'], policy: ['PP-2.2'] },
      { signal: 'Betting platform versus betting picks', why: 'Running wagering is prohibited. Picks and analysis are allowed.', check: 'Does money get wagered through the product, or does the buyer only receive information?', tools: ['scan-listing'], policy: ['PP-2.3'] },
      { signal: 'Health claims, therapy or legal advice', why: 'Regulated services and unsubstantiated health claims are prohibited.', check: 'Look for cure, treatment or diagnosis language, and for licensed-service offers.', tools: ['scan-listing'], policy: ['PP-2.5'] }
    ]
  },
  {
    id: 'content-rewards', title: 'Content Rewards',
    intro: 'Sellers pay per view, so the fraud is about views that are not real and payouts that break the offer rules. Both sides can abuse it.',
    items: [
      { signal: 'Views without engagement', why: 'Botted views show a very low ratio of likes, comments and shares to views. Only legitimate views are paid.', check: 'Compute engagement rate and compare with the creator\'s other posts and the platform norm.', tools: ['calc-views', 'socialblade'], policy: ['CR-4'] },
      { signal: 'View spike in the first hours', why: 'Organic reach builds. Purchased views tend to arrive in a block.', check: 'Look at views per hour and follower growth on the same day.', tools: ['calc-views', 'socialblade'], policy: ['CR-4'] },
      { signal: 'Audience geography does not fit', why: 'Bought views often come from one unrelated country.', check: 'Compare viewer geography with the creator\'s usual audience and the offer\'s target market.', tools: ['calc-views'], policy: ['CR-4'] },
      { signal: '"Comment to win" or giveaways tied to views', why: 'Inducements make views ineligible.', check: 'Read the caption, pinned comment and linked posts.', tools: [], policy: ['CR-4'] },
      { signal: 'New or bot-like account', why: 'Participants must be real people aged 18+, not bots.', check: 'Account age, follower to following ratio, posting history, profile completeness.', tools: ['socialblade'], policy: ['CR-8'] },
      { signal: 'Same clip submitted twice', why: 'Duplicate deliverables are prohibited.', check: 'Compare video hash, caption and URL against earlier submissions.', tools: [], policy: ['CR-3'] },
      { signal: 'Posted after the end date or max payout', why: 'Late submissions are rejected and late views are not paid.', check: 'Compare post time with the offer end date and the remaining budget.', tools: ['calc-payout'], policy: ['CR-5'] },
      { signal: 'No sponsorship disclosure', why: 'Disclosure must be clear and visible before "more".', check: 'Look for #ad, #sponsored or #[Seller] Ad in the visible caption.', tools: [], policy: ['CR-7'] },
      { signal: 'Seller rejects after views come in', why: 'Sellers may reject only on four grounds. Rejecting to avoid paying is not one.', check: 'Match the stated reason to the allowed grounds in CR-2.', tools: [], policy: ['CR-2'] },
      { signal: 'Off-platform payment', why: 'All Content Rewards compensation must go through Whop.', check: 'Look for payment handles, side deals or "DM for rate" in messages.', tools: [], policy: ['CR-6'] }
    ]
  },
  {
    id: 'programs', title: 'Affiliates and bounties',
    intro: 'Earnings programs pay for promotion, so they attract the same metric gaming as ads.',
    items: [
      { signal: 'Chance-based bounty', why: 'Bounties must pay for a specific task. Raffles, lotteries and random draws are prohibited.', check: 'Does every payout depend on completing the task, or on luck?', tools: ['scan-listing'], policy: ['ET-B'] },
      { signal: 'Self-referral or refund churn', why: 'Commissions can be withheld for fraud, refunds and chargebacks.', check: 'Match affiliate and buyer identity, device and payment data. Check refund rate on referred sales.', tools: [], policy: ['ET-A'] },
      { signal: 'Paid ads on "Whop" keywords', why: 'Not allowed without written approval.', check: 'Search ad libraries for the affiliate link on brand terms.', tools: [], policy: ['ET-A'] },
      { signal: 'Participant under 18', why: 'Earnings programs require 18+.', check: 'Check verified age.', tools: [], policy: ['ET-0', 'CR-8'] }
    ]
  },
  {
    id: 'buyers', title: 'Buyer-side abuse',
    intro: 'Not every bad actor is a seller.',
    items: [
      { signal: 'Card testing', why: 'Many small authorizations across cards from one device or IP.', check: 'Group attempts by device, IP and BIN.', tools: ['ipinfo'], policy: ['BT-12', 'CG-1'] },
      { signal: 'Free-trial cycling', why: 'Trials can be limited to one per person or payment method.', check: 'Match trials across emails by card fingerprint and device.', tools: [], policy: ['BT-6'] },
      { signal: 'Account sharing or resale', why: 'Purchases cannot be transferred between accounts.', check: 'Concurrent sessions across locations on one purchase.', tools: ['ipinfo'], policy: ['BT-7'] }
    ]
  }
];

export const WRITING = [
  'Lead with the decision and the rule behind it, for example "Reserve 25% for 90 days under ST-5.6, unusual volume".',
  'List the facts that support it, with numbers and dates.',
  'Say what would change the decision, so the next analyst knows what to look for.',
  'Merchant messages state what happened and what they can do. They never name sanctions screening or internal thresholds.',
  'Tell users about the appeal route: seller reviews through support (ST-5.8), and Community Guidelines appeals within 7 days (CG-4).'
];
