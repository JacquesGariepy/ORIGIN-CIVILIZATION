# ORIGIN / CIVILIZATION - v6.1

An original, inspectable life-and-civilization simulation. English interface. HTML, JavaScript and an authoritative Node.js server. A bundled isometric renderer works without a CDN; optional Three.js shows the same world. This is not an EA product or a reproduction of proprietary Sims assets.

**New voluntary actions require valid Jev decisions.** Rendering, navigation, physical consequences and an already authorized activity are executed by the simulation. There is no production local-policy fallback, synthetic model response, or invented conversation. Tests have explicitly labeled fixtures in `tests/` only.

## Start

1. Install Node.js 22 or newer. Extract this folder before launching.
2. Close any older ORIGIN server, then run `START-WINDOWS.cmd`, or `sh START-MAC-LINUX.sh`. Alternatively: `node server.cjs --open`.
3. Open **Connect TypeSafe**. Native TypeSafe / `jev-latest` / local server bridge / Jev only are the starting settings. Supply a personal TypeSafe key, or set `TYPESAFE_API_KEY` in a private `.env` copied from `.env.example`.
4. Review the request limits, run-time window and optional detached-operation authorization. Connect, then **Run lives**. Starting the server and choosing a scenario never call a model.

The default address is `http://127.0.0.1:4317`. No `npm install` or application build is required. The shipped HTML is already built. Keep the terminal/server running while the simulation runs.

## v6.1: progress, interruptions and the supplied run

This release addresses the **actual uploaded v6 save**, rather than adding another declared technology. The original has 961 successful recorded Jev requests, zero planner requests, 332 completed initiated activities, three acquired individual abilities, and four unfinished activities covering all six people. It also contains repeated chats and a clay storage/withdrawal loop. Valid API replies did not guarantee useful behavior.

- Jev now selects a provisional intention **before** the action request that uses it. A domain choice no longer hides the available actions addressing an urgent bodily deficit.
- Completed outcomes measure actual needs, relationship effects, resource round-trips and new observations. Both initiators and participants receive feedback. Three measured low-benefit completions in the recent review window pause the shared run for explicit review; no substitute behavior is selected locally.
- Receiver decisions see ongoing work, time remaining, interruptions and unfinished needs. Localized gathering/drinking/storage can be resumed through a new Jev decision without duplicating resources.
- An approach does not reserve the recipient before consent. Independent activities can start in parallel; the arrival/consent check still resolves exclusive participation.
- **Life audit** shows depleted reserves, current intentions, repeated patterns, event references and interruptions without making a model call.

### Restore the supplied civilization

Extract this release into a new folder and stop the old server first. Do not overwrite your only existing checkpoint or private `.env`. Launch normally, then **Help -> Restore supplied v6 / 332 completions**. The copied source is byte-identical at `recovery/supplied-v6.snapshot.json`; its SHA-256 is recorded beside it. Restoration migrates diagnostic metadata only, remains paused, and retains physical state, unfinished work, skills, memories, original receipts and all **961** historical request attempts. It does not replay or fabricate missing decisions.

Inspect **Life audit**, then configure your own TypeSafe access. Approve a total request limit above 961 to continue: **1200 authorizes at most 239 additional attempts**, not 1200 free new calls. It is an example, never automatically applied. The provider and server limits still apply. After a progress hold, use **Review**, inspect the reasons, and explicitly start another run. Review retains evidence and requests reconsideration; it does not force a different model answer.

See `docs/CHANGES-v6.1.md` and `docs/VALIDATION.md`. Historical `validation/v6` files describe the earlier release, not new live-model evidence.

## Retained civilization systems (introduced in v6)

- **Authoritative, persistent server:** one shared world for multiple browser views; atomic checkpoints of activities, reservations, memories and histories. Restart is always paused. Explicitly authorized runs can continue after the browser closes, until the approved simulated-time or request limit.
- **Playable life layer:** individual appearance/name/traits, directional relations, households, genealogy, children, care, private memories, habits, projects and contextual emotion variables. Existing birth and maturation mechanics are retained, with declared accelerated biological time scales.
- **Habitable construction:** proposed room rectangles, four material-paid construction phases, wall/door navigation, furnishings, occupancy and object-use reservations. A player blueprint is not a free finished house.
- **42 buildable object definitions:** sleeping, seating, hygiene, cooking, storage, crafts, nursery, leisure, education, water and electrical objects. Objects have bounded functional/support roles; these are not 42 full commercial-game animation systems.
- **Localized ecology:** 25 finite resource sites, reservations, carry limits, plant moisture/fertility, renewable growth, spoilage, compost, modeled seasonal weather and local water/power budgets. Nonrenewable ores do not regenerate.
- **Economy:** household inventories, bilateral barter with independent consent, funded delivery contracts, escrow, reservation and cancellation. Currency is a declared scenario resource, not real money.
- **Culture and learning:** tutoring followed by the learner's own practice, external written records, art/music artifacts, individual projects, constrained LLM utterances, source-referenced conversations.
- **38 process families:** an authored progression including primitive crafts, cultivation, metalworking, writing, electricity, circuits and bounded numerical computing. Computer actions run a small safe arithmetic machine; data-analysis actions fit an actual small predictor to recorded observations, not a pretend general intelligence.
- **Earth workspace:** real Natural Earth land outlines, selection of a geographic anchor, optional real public elevation-tile loading and validated height-grid import. The active local region and its resources remain generated/modeled unless a real height grid has been loaded. This is not a whole-Earth physical simulation.

## Choose an honest starting point

| Scenario | Purpose |
|---|---|
| First Minds | Six adult founders, no acquired techniques, empty carried inventories and no prebuilt rooms. |
| Homestead | Two families and usable domestic objects to exercise care, relationships and parallel everyday life. |
| Workshop | A declared craft settlement with additional workstations and techniques. |
| Modern | A declared advanced household/laboratory with power, plumbing and computing objects. |

Choose through **Help**. Advanced scenario buildings, techniques and family links are explicitly seeded, logged starting conditions. They are not discoveries attributed to Jev. Scenario changes never reset paid-request accounting.

## Navigation

**Life audit** reads individual progress and interruptions without inference. **Live** follows actual ongoing activities. **People** and **Families** show individual stories and genealogy. **Build** proposes rooms/furniture, including a two-click ground drawing tool. **World** holds the Earth map, local layers and terrain imports. **Economy** shows stores, funded work and exchanges. **Civilization** shows works, techniques and infrastructure. **Conversations** contains only completed signals/messages; **Chronicle** records causal events. The person editor changes appearance and declared traits with a visible observer-intervention record.

All model requests and responses, confidence/probabilities, planner proposals, reservations, executed effects and errors remain available in **Full ledger**. Its raw form is an audit tool, not a substitute for the scene. Keys are excluded from exports. Do not enter private real-person information.

## Optional planner and 3D

- A native TypeSafe key alone is sufficient for Jev decisions.
- `docs/CLOUD-SETUP.md` configures a separate OpenRouter text-model planner.
- `docs/AGY-SETUP.md` configures an isolated local agy CLI. It is optional and cannot create a successful physical outcome by assertion.
- The complete production isometric renderer is bundled. **3D** attempts to load pinned Three.js. `node install-assets.cjs` downloads and embeds that optional library from a connected machine. Failure to load it does not invent decisions or remove the working isometric scene.

## Persistence and spending

The server writes `data/world-v6.json` automatically and on explicit saves. Export remains available as an additional portable checkpoint. A recovered server world is always paused and requires reconnection and a new explicit run authorization. Existing request counters persist. The UI does not auto-increase budgets.

Without **Allow server to continue when this browser closes**, the server pauses after 30 seconds without a viewer. With approval, it continues only while the Node process remains running and both the approved time window and request limits allow it. A computer that is asleep/off cannot run the simulation. Time does not fast-forward to compensate after restart.

## Verification and boundaries

`node --test tests/*.test.cjs` runs the shipped regression suite. The v6.1 delivery was checked with **192 passing Node tests and 38 browser checks**. Browser checks use the exact production isometric renderer and actual Node world service, with explicitly synthetic upstream model responses. See `docs/VALIDATION.md`.

No authenticated TypeSafe, OpenRouter planner or agy run was executed during this build; the optional Three.js/WebGL path was not visually validated here. Local isometric desktop/mobile scenes were visually inspected.

This is a substantially expanded, bounded prototype, not all of The Sims, not photoreal people, not every Earth's resource, and not a proof of subjective awareness. It has one active bounded region, simplified physiology/economy/material processes, a bounded population, and a programmed action/process vocabulary. Pretrained models do not become blank brains because simulated memories start empty. See the explicit matrix in `docs/IMPLEMENTATION-STATUS.md`.
