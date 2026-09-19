# v4.1 - supplied-run diagnosis and patch scope

## Recorded facts (not a forecast of future model behavior)

The supplied `ORIGIN-decision-ledger (1).jsonl` has 180 records: one genesis, one renderer-ready record, one connection, 100 validated request records, 74 commits and three rejected-turn records after the cap was reached.

The request phases are 26 Choose intention and 74 Choose action. The action choices are gather_food 17, eat 40 and drink 17. Every intention is nourish. No planner or learning inference is present. All 100 requests have HTTP 200. The final three rejection records have empty receipt lists: no 101st upstream request was sent.

Of the 57 meals/drinks, 39 began with the corresponding reserve at least 90/100. This is a descriptive threshold, not a medical assessment. At turn 25, S01 ate while satiety was 96.04; the actual increase was only 3.96, not the nominal food effect. At turn 74 all six individuals still have empty learned-ability maps. Food and water reserves are high while energy has fallen.

## Code findings

The former look-to-camp bug is absent in v4. This new run has a different failure mode. The v4 low-information check covered observation, full rest and repeated reflection, but did not count low-benefit meals/drinks or alternating maintenance actions. The intention lasted three personal actions regardless of whether its need was already met. The request supplied raw body values without an explicit statement that a high value means the need is satisfied. These are concrete design deficiencies; the journal does not reveal Jev's private reason for choosing nourish.

The v4 `eat` branch changed satiety and inventory but never enqueued a learning candidate. Therefore 40 ordinary meals could not produce a food-recognition inference through that code path. `try_foraging` could, but the model never selected it in this run.

## Changed behavior and boundaries

Body semantics, current deficits, actual gains and goal-completion reports are now explicit. Nourish is considered satisfied at satiety >=80 and hydration >=75. These transparent simulation thresholds trigger a new Jev goal question; they do not pick a different goal or forbid eating/drinking. All physically feasible original action choices remain available.

A meal that produces a positive satiety increase records a direct personal event. After two qualifying observations, Jev receives a new inference question. Only a supported result plus the recorded evidence can adopt food recognition for that individual. Uncertain answers preserve evidence but add no ability. If a required inference fails or runs out of request budget, the transaction remains uncommitted. Fullness gains are measured before the separate world-turn body costs.

The low-benefit guard includes meals with less than six gained satiety units, drinks with less than ten gained hydration units, and collecting more fruit while satiated with at least three already held. These thresholds flag diminishing benefit; they do not say the physical action is impossible. Three consecutive flagged outcomes or four in six personal actions without new learning pauses automatic spending. Successful new learning interrupts the cycle. Repeated necessary meals with meaningful gains do not hit a diversity quota.

Budget exhaustion has dedicated limited/planner_limited states, not a generic network error. A minimum phase budget is checked before a new intention request. An unforeseen extra required phase can still exhaust the budget mid-transaction; earlier valid receipts stay visible but do not cause a partial world update. Explicit limit approval retains credentials in memory, counters and state, and starts no request.

The recovered 74-turn state contains no retroactively granted skills or new food observations. It exactly matches the old engine replay. New measurements start with newly executed actions in 4.1. Restoring never increases the configured cap.

## Reproduce

Run `npm test`. The exact old engine is isolated in `tests/fixtures/v4-core.cjs` and is not loaded by ORIGIN.html or the runtime server. The v41 suite replays the supplied journal and compares all 74 state-change lists, then checks the recovered snapshot. Other tests inject explicit fixture responses to exercise the new transaction paths, rollback, budget guards, evidence and restoration.

Future choices may still repeat. No new live-model episode was run during this patch, and no scientific consciousness or realism claim follows from these tests.
