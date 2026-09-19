# ORIGIN v6.1 - evidence-based progress correction

## Observed in the supplied v6 run

Source: `recovery/supplied-v6.snapshot.json`. Counts were computed from the full JSON, not a sample. Reproduce the summary with `node tools/analyze-save.cjs recovery/supplied-v6.snapshot.json`. The SHA-256 file verifies the unmodified source copy.

- 961 recorded requests, all with HTTP 200 and `status: valid`; returned model `jev-1.13.0`. Zero planner attempts. These are user-supplied local records, not independently authenticated provider receipts.
- 332 initiated activities finished in 796.40 elapsed simulated minutes. Four activities remain underway. The end of this file is not evidence of a provider outage or a final budget stop.
- Ena (S02): 51 completed chat initiations. Aru (S01): only 5 initiated completions despite many participations, since the old initiator counter did not count recipients.
- Koa (S03): 59 storage actions and 56 withdrawals of clay, recorded as non-stagnant, despite repeated round-trips without construction.
- 71 logged interruptions. Aru has interrupted food gathering; Sia has interrupted drinking. Some bodies have depleted reserves while social contact or teaching continues.
- Three learned individual abilities are recorded. No houses, furnishings or works were completed in this run.
- 35 cohort conflicts, including 33 `Counterparty already assigned in this cohort` records. These are not 35 HTTP failures.

The old request selected action and intent in separate independent questions of one response. The resulting new intention was therefore not known to the action question. Category selection could also omit urgent body options. The outcome detector covered too few of the added civilization action kinds and did not track counterpart participation.

## Implemented corrections

### 1. Intention before action

A renewed intention has its own Jev request and receipt. The subsequent domain and action requests receive it. Personality preferences are contextual data, not an obligation to repeat an activity. Renewal is considered after satisfied goals, several personal activities, deteriorating bodily reserves, or measured ineffective results.

These are paid attempts under the same explicit cap. The cohort preflight includes minimum required intention, domain, action and queued learning calls. Actions needing an additional signal or other follow-up remain separately checked before dispatch; an incomplete cohort is not silently committed.

### 2. Feedback for the actual consequences

`source/agency.js` measures reserve deltas, actual recorded bond changes, own material round-trips, repeated demonstrations and observation novelty. Minor coordinate changes are not automatically new discoveries. Initial useful social contact and an ordinary single deposit/withdrawal do not trigger a hold.

Both participants receive feedback. Original `completed` remains an initiator counter; a separate participation counter is derived from recorded events. Existing memories and physical historical effects are not rewritten.

Three measured low-benefit completions within the recent post-review window hold the run. This is a configurable-code spending safeguard, not a local behavior policy. It does not select an alternative, fill a need, add a skill, replenish resources, or claim a more capable mind. Review retains the history and still requires new Jev decisions.

### 3. Interruptions, resumption and concurrency

The receiver sees its current activity, remaining duration, earlier interruptions and its own needs before independently accepting or declining. Acceptance remains permitted; the engine does not forge a refusal for a hungry person.

Civilization extension options are added before resolving resumable work. Resumed gathering/drinking/storage is revalidated and reserves only what is available. A pause or invitation cannot duplicate a material unit. An approach does not prematurely occupy its target: exclusive participation is resolved on arrival and consent, with conflicts logged.

### 4. Recovery and user interface

Life audit is read-only and issues no inference. It distinguishes imported patterns, current low reserves, pending reconsideration and actual spending holds. Historical interruptions are reconstructed only from existing chronicle events; missing durations stay unknown.

The supplied original remains unchanged, while the runtime migrates to v6.1 diagnostic metadata. Positions, times, resources, acquired skills, people, activities and receipts remain intact. Recovery is paused; 961 historical attempts are preserved. No new budget is granted. Save import allowance is 64 MB.

## Not implemented or not established by this patch

This is not a new planet simulator, a replacement graphics engine, a complete Sims feature set, or proof of consciousness. The finite authored process/action catalog remains. No new authenticated Jev, OpenRouter-planner or agy episode was executed here. Evidence that an engine invariant passes does not establish that autonomous inhabitants will discover fire, form a family or reach AI.
