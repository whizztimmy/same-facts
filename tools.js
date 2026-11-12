// External lookups open the public tool in a new tab, prefilled from the case.
// Only use them with public or test data: customer personal data belongs in approved vendor tools.

const q = encodeURIComponent;
export const LOOKUPS = [
  { id: 'opensanctions', name: 'OpenSanctions', what: 'Sanctions, PEP and watchlist search across many lists', input: 'name', url: v => `https://www.opensanctions.org/search/?q=${q(v)}` },
  { id: 'ofac', name: 'OFAC Sanctions List Search', what: 'U.S. Treasury\'s official SDN search (enter the name on the page)', input: 'name', url: () => 'https://sanctionssearch.ofac.treas.gov/' },
  { id: 'opencorporates', name: 'OpenCorporates', what: 'Company registry records: formation date, officers, status', input: 'name', url: v => `https://opencorporates.com/companies?q=${q(v)}` },
  { id: 'whois', name: 'ICANN Lookup', what: 'Domain registration date and registrar', input: 'domain', url: v => `https://lookup.icann.org/en/lookup?name=${q(v)}` },
  { id: 'wayback', name: 'Wayback Machine', what: 'How long the site has existed and how it changed', input: 'domain', url: v => `https://web.archive.org/web/*/${q(v)}` },
  { id: 'safebrowsing', name: 'Google Safe Browsing', what: 'Whether the site is flagged for phishing or malware', input: 'domain', url: v => `https://transparencyreport.google.com/safe-browsing/search?url=${q(v)}` },
  { id: 'virustotal', name: 'VirusTotal', what: 'Domain reputation across security vendors', input: 'domain', url: v => `https://www.virustotal.com/gui/domain/${q(v)}` },
  { id: 'trustpilot', name: 'Trustpilot', what: 'Public buyer reviews for the business', input: 'domain', url: v => `https://www.trustpilot.com/review/${q(v)}` },
  { id: 'socialblade', name: 'Social Blade', what: 'Follower and view history, to spot bought growth', input: 'handle', url: (v, platform) => `https://socialblade.com/${platform === 'youtube' ? 'youtube/handle' : platform === 'instagram' ? 'instagram/user' : 'tiktok/user'}/${q(String(v).replace(/^@/, ''))}` },
  { id: 'ipinfo', name: 'IPinfo', what: 'IP location, ISP, and whether it is a VPN or hosting range', input: 'ip', url: v => `https://ipinfo.io/${q(v)}` },
  { id: 'etherscan', name: 'Etherscan', what: 'Ethereum address history, for crypto payout or scam checks', input: 'wallet', url: v => `https://etherscan.io/address/${q(v)}` },
  { id: 'websearch', name: 'Web search', what: 'Search the name with "scam", "refund" or "reviews"', input: 'name', url: v => `https://www.google.com/search?q=${q('"' + v + '" scam OR refund OR reviews')}` }
];

// In-page calculators, referenced by the playbook.
export const CALCULATORS = {
  'calc-dispute': 'Dispute rate (90 days)',
  'calc-reserve': 'Reserve planner',
  'calc-payout': 'Content Rewards payout',
  'calc-views': 'View quality check',
  'scan-listing': 'Listing scanner'
};

// Commercial software analysts use. Reference only: this is a general description of each category,
// not a claim about which tools Whop uses.
export const SOFTWARE = [
  { category: 'Payment fraud scoring', examples: 'Stripe Radar, Sift, SEON, Sardine', catches: 'Card testing, stolen cards, risky checkouts, linked accounts by device and email', queue: 'Buyer abuse, seller review' },
  { category: 'Identity and KYB', examples: 'Persona, Alloy, Onfido, Middesk', catches: 'Fake or mismatched IDs, liveness failures, shell companies, unverifiable owners', queue: 'Onboarding, KYC/KYB' },
  { category: 'Sanctions and AML screening', examples: 'ComplyAdvantage, OpenSanctions, LexisNexis Bridger', catches: 'Sanctions and PEP matches with ongoing monitoring', queue: 'KYC/KYB screening' },
  { category: 'Dispute prevention alerts', examples: 'Verifi (Visa) RDR and Order Insight, Ethoca (Mastercard) alerts', catches: 'Disputes before they become chargebacks, so a refund can head one off', queue: 'Refunds, seller review' },
  { category: 'Device and IP intelligence', examples: 'Fingerprint, MaxMind minFraud, IPQualityScore', catches: 'Proxy and VPN use, device reuse across accounts, takeover logins', queue: 'Payouts, takeover, linked accounts' },
  { category: 'Creator and audience fraud', examples: 'HypeAuditor, Modash, Social Blade', catches: 'Bought followers, botted views, audience geography that does not fit', queue: 'Content Rewards' },
  { category: 'Crypto tracing', examples: 'Chainalysis, TRM Labs', catches: 'Wallets tied to scams, mixers or sanctioned entities', queue: 'Payouts, listings with crypto' },
  { category: 'Case management and monitoring', examples: 'Unit21, Hummingbird, SQL dashboards', catches: 'Rule-based alerts, case queues, audit trails and regulatory filings', queue: 'Every queue' }
];
