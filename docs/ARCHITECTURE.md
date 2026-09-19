# Architecture - v6

## Authority and time

`server.cjs` hosts one `WorldService` on loopback. `RemoteSession` is a browser mirror, not a second simulator. The authoritative `LivingSession` issues bounded decision requests, validates receipts, starts activities, advances a shared clock, handles arrivals and requests independent counterparty responses. `Civilization` extends the physical `Life` engine through explicit hooks. The renderer reads state; it never picks an action.

```
individual perception + personal/witness memory
    -> optional isolated planner proposal
    -> Jev domain selection when an action menu is large
    -> Jev concrete action and any required parameters
    -> physical precondition and reservation check
    -> concurrent activity / travel / arrival
    -> independent recipient Jev response where needed
    -> physical effect and provenance
    -> separate evidence-backed inference, if applicable
```

Decisions are calculated in bounded cohorts; activities overlap. Body decay is time-based, not request-based. Cohorts are ordered fairly for resource acquisition; fastest HTTP response is not the arbitrary resource winner. New actions need valid receipts. Existing authorized movements/physics require no per-animation-frame model call. A failed later learning request does not undo a material effect that already occurred.

## World extensions

- `source/civil/terrain.js`: bounded generated region, bilinear height fields, optional measured grid, A* navigation and room openings.
- `source/civil/catalog.js`: object definitions, item mass, process families, activity domains and personal projects.
- `source/civilization.js`: local ecology, stock reservations, finite carry capacity, homes/rooms, exchange/escrow, cultural works, tutoring, infrastructure, scenario seeds and migrations.
- `source/life.js`: core person/household/activity mechanics, physiological clock, consent, birth/aging, basic learning and safe arithmetic VM.
- `source/living-session.js`: actual typed Jev orchestration and transaction receipts.
- `source/world-service.cjs`: server authority, private credentials, checkpoint queue, detached authorization, run-time cap.
- `source/remote-session.js`: state synchronization and explicit commands from browser to server.
- `source/civic-view.js`: bundled isometric production renderer; optional `civic-three.js` and `living-view.js` adapt the Three.js renderer.
- `source/civic-panels.js`, `living-ui.js`, `living-shell.html`: application workspaces and controls.
- `source/terrain-loader.cjs`: fixed-source public Terrarium tile download and bounded PNG decoding. No arbitrary remote URL is accepted.
- `source/earth-data.js`: embedded Natural Earth land geometry; source copy/metadata in `assets/`.

## Quantities, contention and construction

Resource nodes are finite. Starting a collection reserves units; completing it transfers those units to inventory; cancellation releases the reservation. Reservation and stock counts are checkpointed. Carry mass is checked, and failed preconditions are not turned into free goods. An aggregate count is maintained for compatibility, not used as unlimited teleporting stock.

Room rectangles are plans with four material-paid phases. A phase reserves its job/site; walls and doors enter navigation at the appropriate physical stage. Objects have slots/ownership and finite construction costs. Household exchange is a transfer, not duplication. A delivery job escrows its posted funds; one worker reserves it, fulfilment transfers goods and pay, cancellation returns the unspent funds.

Water/power uses inspect local capacity. Renewable plants can regrow within bounded capacities; ores do not. Food can spoil into waste/compost. These are deliberately simplified mechanics, not scientifically calibrated ecological laws.

## Knowledge and private state

The planner and Jev receive only the acting individual's perception, private episodes, bounded witness records, inventory, recorded skills and feasible options. A receiver is queried independently. Actual outcomes, beliefs and spoken messages are separate records. Lessons supply a lead and practice, not telepathic copying of a teacher's skills. A newborn does not receive parent memory/knowledge.

A LLM output is an unverified proposal. The text adapter returns schema-constrained actions/expected observation/evidence and may supply a grounded utterance only under the language/context rules. It cannot change world code or declare that a material experiment succeeded. Harness file/web/command access is neither needed nor authorized by this simulation.

## Persistence and security

Atomic write-then-rename checkpoint: `data/world-v6.json`. Credentials are held in server memory or the operator's private `.env`; exports scrub known keys. The server always restores paused and disconnected. A previous detached approval never restarts billable work after process restart. Historical request counters survive migrations/scenario selection.

Loopback host/origin checks, request-size limits and a local CSRF token protect the bridge from ordinary cross-origin drive-by calls. This is not a hardened public service, multi-user authentication platform or operating-system sandbox. Do not expose it to the internet. Child-process isolation/permissions for agy remain the operator's responsibility.

A run requires a finite simulated-time window and Jev/planner request allowances. Time is checked before every physical clock advance, not merely on a timer. No viewer for 30 seconds pauses operation unless detached operation was explicitly approved. Save/restore does not choose behavior and no HTTP retry auto-increases budgets.

## Limits

One active local region; no inter-region population migration or globe-wide simulation. Bounded population and coordinated cognition cohorts. Geometry is coarse and ground-floor. The finite action/process vocabulary must be expanded in code, not by accepting arbitrary LLM scripts. These limits are implementation boundaries, not claims about scientific impossibility.
