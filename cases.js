// Sample cases. All sellers, buyers, people, accounts, domains and IPs are invented.
// Domains use the reserved .example suffix and IPs come from the documentation range.

export const CASES = [
  {
    id: 'RD-1041', type: 'seller_review', subject: 'Apex FX Academy', opened: '2026-11-12 00:14',
    alert: 'Dispute rate crossed 1% on a rolling 90 days, and weekly sales are up 3.7x.',
    facts: { accountAgeDays: 64, kybVerified: 'yes', transactions90: 3000, disputes90: 42, refundRate30: 7, microTxShare: 18, amexRetriesMax24h: 2, sales7: 26400, avgWeek: 7100, balance: 31200,
      listingText: 'Forex mentorship and signals room. Members make $10k/month on autopilot. Lifetime access for one payment. Includes a $0.50 trial day.' },
    lookups: { name: 'Apex FX Academy', domain: 'apexfx-academy.example' }
  },
  {
    id: 'RD-1042', type: 'refund_request', subject: 'Notion Systems Co', opened: '2026-11-12 00:31',
    alert: 'Buyer reports being charged twice for one template bundle.',
    facts: { complaint: 'duplicate charge', amount: 79, buyerCountry: 'United States', daysSincePurchase: 1, chargeCount: 2, secondsBetweenCharges: 38, euWaiverAcknowledged: '', accessedContent: 'yes', sellerResponse: 'none', chargebackThreatened: 'no', sellerDisputeRate90: 0.3, buyerRefunds90: 0 },
    lookups: { name: 'Notion Systems Co' }
  },
  {
    id: 'RD-1043', type: 'refund_request', subject: 'Copywriting Lab', opened: '2026-11-12 01:05',
    alert: 'Buyer in Germany wants a refund six days after buying. Seller refused.',
    facts: { complaint: 'changed mind', amount: 149, buyerCountry: 'Germany', daysSincePurchase: 6, chargeCount: 1, secondsBetweenCharges: '', euWaiverAcknowledged: 'no', accessedContent: 'yes', sellerResponse: 'refused', chargebackThreatened: 'no', sellerDisputeRate90: 0.4, buyerRefunds90: 0 },
    lookups: { name: 'Copywriting Lab' }
  },
  {
    id: 'RD-1044', type: 'refund_request', subject: 'Drop Hustle Pro', opened: '2026-11-12 01:22',
    alert: 'Buyer says the course is not as described and threatens a chargeback. Seller refused.',
    facts: { complaint: 'not as described', amount: 297, buyerCountry: 'United States', daysSincePurchase: 20, chargeCount: 1, secondsBetweenCharges: '', euWaiverAcknowledged: '', accessedContent: 'yes', sellerResponse: 'refused', chargebackThreatened: 'yes', sellerDisputeRate90: 0.9, buyerRefunds90: 4 },
    lookups: { name: 'Drop Hustle Pro' }
  },
  {
    id: 'RD-1045', type: 'kyb_screening', subject: 'Harbor Lane Studio', opened: '2026-11-12 01:40',
    alert: 'Screening hit: a beneficial owner\'s name matches an entry on the simulated list.',
    facts: { entityName: 'Daniel Reyes (owner, Harbor Lane Studio)', listEntry: 'REYES, Daniel (simulated entry SIM-4471)', dobMatch: 'differs', nationalityMatch: 'differs', addressMatch: '', kycCountry: 'Spain', ipCountries: 'Spain, Portugal', ownersListed: 'yes', balance: 3200 },
    lookups: { name: 'Daniel Reyes', domain: 'harborlane.example' }
  },
  {
    id: 'RD-1046', type: 'payout_change', subject: 'Copper Desk', opened: '2026-11-12 02:03',
    alert: 'Payout destination changed 5 hours ago; $12,500 withdrawal requested.',
    facts: { accountAgeDays: 410, payoutChangedHoursAgo: 5, emailChangedHoursAgo: 9, twoFactor: 'off', newCountry: 'yes', newDevice: 'yes', withdrawal: 12500, avgWithdrawal: 2100, firstLinkedOwnerMatches: 'no', ip: '203.0.113.48' },
    lookups: { name: 'Copper Desk', ip: '203.0.113.48' }
  },
  {
    id: 'RD-1047', type: 'cr_submission', subject: '@clipvault.daily for StudyFlow AI', opened: '2026-11-12 02:20',
    alert: 'Content Rewards clip passed 1.2M views in 6 hours. Payout would use most of the remaining budget.',
    facts: { platform: 'TikTok', handle: '@clipvault.daily', accountAgeDays: 9, participantAge: 22, followers: 1800, views: 1240000, likes: 2100, comments: 140, shares: 90, hoursSincePost: 6,
      topCountry: 'Bangladesh', topCountryShare: 74, offerMarket: 'United States, Canada', caption: 'This app changed how I study. Link in bio.', postedDate: '2026-11-10', offerEndDate: '2026-11-30',
      budgetRemaining: 4200, ratePer1k: 1.5, duplicateOf: '', offPlatformMention: 'no' },
    lookups: { handle: 'clipvault.daily', platform: 'tiktok' }
  },
  {
    id: 'RD-1048', type: 'cr_appeal', subject: '@mira.makes vs Loop Fitness', opened: '2026-11-12 02:46',
    alert: 'Participant appeals a rejection made after the clip reached 214k views.',
    facts: { sellerReason: 'budget_reallocated', offerCriteriaMet: 'yes', views: 214000, budgetRemaining: 2600, endDatePassed: 'no', fraudSignals: 0, sellerFundsCover: 'yes', ratePer1k: 1 },
    lookups: { handle: 'mira.makes', platform: 'tiktok' }
  },
  {
    id: 'RD-1049', type: 'listing_report', subject: 'IG Growth Vault', opened: '2026-11-12 03:10',
    alert: 'A buyer reported this listing.',
    facts: { reportedBy: 'Buyer', accessPeriodShown: 'no', listingText: 'Aged Instagram accounts for sale, 10k+ followers each. Lifetime access to our supplier list. Guaranteed results or your money back.' },
    lookups: { name: 'IG Growth Vault', domain: 'iggrowthvault.example' }
  },
  {
    id: 'RD-1050', type: 'bounty_review', subject: 'Hoop Picks Daily', opened: '2026-11-12 03:32',
    alert: 'New bounty flagged by the bounty classifier.',
    facts: { payoutRule: 'random draw among entries', prizePool: 500, bountyText: 'Post a clip of tonight\'s picks with #hooppicks. Every entry goes into a raffle and one lucky winner gets $500.' },
    lookups: { name: 'Hoop Picks Daily' }
  }
];
