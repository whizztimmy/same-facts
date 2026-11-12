# Same Facts

A playable overnight Risk Operations shift for a creator commerce platform. One static page, no dependencies, no build step.

It is built from the Fraud Analyst, Risk Operations job post at Whop: audit merchants, decide who earns elevated privileges, assess KYC/KYB flags against sanctions lists, and adjudicate refunds, with every call made the same way for the same facts.

- **Run on autopilot** plays a 14-case shift in about 35 seconds.
- **Take the seat** gives you the same shift on a real clock. You apply each decision, or flag the rule behind it.
- **Run the rules on a store you make up** to see any listing and set of numbers decided live.
- **Run test set** checks ten fixed cases against answers written before the rules ran, including twins that differ by one fact.

How decisions are made:

1. Hard stops first: a sanctions match on several identifiers, or a payout account shared with a restricted merchant.
2. Missing inputs pause the case and name the question. There is no default decision.
3. All eight merchant triggers are checked, and every one that fires is listed.
4. The decision cites its rule IDs, and money moves only after the note is written.

Rules make every decision. The claim finder is a keyword matcher standing in for an LLM step, whose output would be one input to the rules, never the decision. Tiers, thresholds and weights are starting values to calibrate, not Whop's terms.

Everything runs in the browser. Nothing you type is sent or stored anywhere.

To run it locally, open `index.html`.

Unofficial project by Timothy Adetunji, made for a job application. Not affiliated with or endorsed by Whop. All merchants, buyers, IDs and sanctions list entries are invented.
