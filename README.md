# Risk Desk

A Risk Operations workbench built on Whop's public policies. Live at https://whizztimmy.github.io/same-facts/

The analyst makes every decision. The tool makes sure that decision has been tested against the evidence and the rules first.

## What it does

- **Cases.** Ten sample cases across the queues a Risk Ops analyst works: seller reviews, refund requests, KYC/KYB sanctions hits, payout alerts, Content Rewards submissions and appeals, listing reports and bounties.
- **Checks.** Each case runs the full set of checks for its type. Every check cites the policy section it enforces, for example the 1% dispute rate over a rolling 90 days (Seller Terms 5) or "only legitimate views are paid" (Content Rewards Terms).
- **Review before confirming.** The analyst picks a decision and writes a rationale. A rule-based review then lists conflicts with the evidence, missing evidence, hard policy limits (a reserve over 180 days, a Whop refund with no Seller Terms ground, a user message that mentions sanctions screening) and inconsistencies with earlier decisions on the same pattern. Going ahead against the review requires a written override. Confirmed decisions go to a decision log.
- **Optional AI second opinion.** With an Anthropic API key, Claude (`claude-opus-5-5`) reviews the same case, checks and policies, returns a structured verdict with concerns and questions, and answers questions about the case. It never makes or changes the decision. Without a key, the question box searches the policies and playbook instead.
- **Playbook.** What to look for in each queue, why it matters, how to check it, which tool helps, and which rule it ties to.
- **Policies.** 47 rules from seven Whop documents (Terms of Service, Seller Terms, Buyer Terms, Community Guidelines, Prohibited Products & Services, Earnings Terms, Content Rewards Terms), paraphrased with IDs and linked to the source.
- **Tools.** Calculators for dispute rate, reserves, Content Rewards payouts and view quality; a listing scanner; prefilled lookups in public tools (OpenSanctions, OFAC, OpenCorporates, ICANN, Wayback Machine, Safe Browsing, VirusTotal, Trustpilot, Social Blade, IPinfo, Etherscan); and a reference table of the commercial software used for each queue.

## How it is built

Static site, no build step. ES modules:

| File | Contents |
| --- | --- |
| `policies.js` | Policy rules with IDs, sources and dates |
| `rules.js` | Case types, checks, listing scanner, decision review |
| `cases.js` | Sample cases |
| `playbook.js` | Analyst playbook |
| `tools.js` | Lookups and software reference |
| `assistant.js` | Claude review and Q&A (Anthropic TypeScript SDK in the browser), and the no-key policy search |
| `app.js` | Interface |

Run the tests with `npm test` (Node 20+). Serve locally with any static server, for example `python -m http.server`, then open `http://localhost:8000`.

## Notes

- Thresholds marked "internal" (for example the 0.75% dispute watch line or engagement under 0.5%) are triage lines I chose, not Whop policy.
- The API key is kept in the browser tab's session storage and sent only to `api.anthropic.com`. Lookups send whatever is typed to the public site; use public or test data only.
- The embargo list in the code is a short demo list. A real one comes from compliance.

Unofficial project by Timothy Adetunji, made for a job application. Not affiliated with or endorsed by Whop. Policy summaries are paraphrased from Whop's public legal pages, read on 12 Nov 2026; those pages are the source of truth. All cases, people, accounts, domains and IPs are invented.
