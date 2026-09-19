# Implementation status - ORIGIN v6.1

This table distinguishes operating mechanisms from bounded representations and missing commercial-game breadth. It is authoritative over promotional language in historical notes.

| Domain | Implemented | Important limit |
|---|---|---|
| Parallel life | Independent activity durations, shared simulated time, bounded concurrent decision cohorts, local arrival/consent, interruption and reservation. | Cognition uses small coordinated cohorts; this is not an unlimited distributed population. The simulation holds at necessary decision boundaries. |
| Real decisions | TypeSafe native, optional OpenRouter Jev, raw receipts, validation, confidence gate and explicit errors. | No authenticated live validation in this build. Confidence is not correctness. |
| LLM planners | Proposal-only planners: OpenRouter cloud, OpenAI-compatible API or local LLM (Ollama, LM Studio, llama.cpp, vLLM), Claude Code CLI, Codex CLI, agy. Strict schema, grounding to current actions and own evidence, redaction, caps. | Fixture and stand-in process tests; Claude Code, Codex and agy also verified live on 2026-09-19 (OpenAI-compatible not yet run against a real server). Proposals never authorize actions; Jev decides. |
| Server persistence | One authoritative world, multiple viewers, atomic checkpoints, in-progress activity restore, bounded detached runs. | Node must remain active; restart is paused. No public multi-tenant hosting or server-cluster migration. |
| Population | Adults and children, life stages, abstract pregnancies, parent/child records, consent, care, aging. | Simplified biology; declared accelerated time. Default 24-person population cap, bounded implementation. No medical/genetic realism. |
| Relationships | Directional bonds, consent, affection between adults, separation, conflict/apology, witness memory, family tree. | Bounded state variables, not subjective emotions or a validated psychological model. |
| Personality | Name/colors/traits editor, personal projects, habits, practice and contextual moodlets. | Not a morphable photoreal Create-a-Sim system; no professional facial/voice performance assets. |
| Homes | Proposed rooms, four paid construction phases, walls, doors, shelter, household stores, 42 object definitions. | Ground-floor rectangles and coarse geometry; no arbitrary multistory roofs, detailed plumbing layout or full interior-design catalog. |
| Objects | Slots, occupancy, finite materials, contextual use, maintenance, storage, crafting and utility roles. | Some objects are passive/supporting workstations; no bespoke high-fidelity animation set for each object. |
| Ecology | Local resource nodes, finite stocks/reservations, carry mass, crop moisture, spoilage/compost, seasonal model and pollution. | Biome and resource quantities are generated estimates. Not a calibrated Earth climate/ecological simulation. |
| Earth | Public-domain land outline, geographic anchor, optional measured elevation tile, validated DEM import with provenance. | One active 96-unit region, not the entire Earth. No complete surveyed minerals, actual weather or prehistoric reconstruction. Tile scaling is explicit. |
| Economy | Inventories, consenting barter, funded delivery contracts, escrow/fulfilment/refund, stored goods. | No full price-discovery, banking, law or national economy. Starting coins are declared scenario units. |
| Learning | Personal evidence, experiments, Jev inferences, practice, lessons, written works. | Finite authored action/process vocabulary; no autonomous extension of the simulation's executable laws. |
| Technology | 38 process families, material prerequisites and workstations, iron/electricity/circuits/computing paths. | Simplified programmed recipes, not thermochemistry or semiconductor fabrication. Reaching a later stage is not guaranteed. |
| Computation | Jev-selected bounded arithmetic instructions; real small numerical predictor over recorded data with held-out error. | Not self-invented general AI, internet access, arbitrary coding or an unbounded self-improvement system. |
| Communication | Independently interpreted signals, grounded optional LLM utterances, chronological conversation view, optional local speech synthesis. | No fluent generative speech without a configured planner and learned language; not a validated model of language evolution. |
| Rendering | Shipped isometric human/animal/object/terrain scene; optional procedural Three.js view of same state. | Stylized, not photoreal or motion capture. WebGL path syntax-checked but not visually tested here. |
| Player | Select/follow, activities/needs/families, room/furniture plans, trait editor, Earth/economy/chronicle panels, saves. | Player changes are logged interventions. Blueprints do not instantly construct objects or override Jev consent. |
| History | Raw model request/response ledger, causal effects, local checkpoints and recovery of older runs. | Local files are editable, not cryptographic provider attestations; old source logs remain unverified historical records. |

## v6.1 correction scope

The civilization feature catalog above is retained, not newly proven by this patch. The patch adds staged Jev intentions, objective activity feedback, participant history, explicit interruption context, extension-action resumption, independent approach scheduling, spending-aware progress holds, and a read-only Life audit. Imported patterns are historical diagnostics, not reconstructed thoughts or fresh provider attestations.

The supplied run contains **three** acquired individual abilities, not zero: Self / other distinction for S04 and S05, and Stone tools for S05. It contains no completed rooms, objects or written/art artifacts. That is the state of this run, not a claim that those features do not exist in the code.

A corrected request structure and a regression test cannot guarantee that Jev will choose a diverse or useful next action. Model-selected inefficient behavior remains possible and is surfaced rather than silently replaced. No new end-to-end civilization-to-iron or civilization-to-AI episode was run with an authenticated provider in this release.

## Not claimed

This release is not all expansion packs or feature parity with The Sims, not an EA-branded product, not a complete planet, not a scientifically validated human mind, and not a proof of consciousness. Models remain pretrained; memory acquisition here changes persistent context, not model weights. The code can be extended, but a new behavior or material law needs an implementation and tests before an agent can actually execute it.

## Starting conditions are not discoveries

First Minds has no learned techniques. Homestead, Workshop and Modern are labeled scenario seeds for exercising the relevant systems immediately. Modern's existing electronics are not evidence that the founders autonomously developed electronics. Observer changes and seeds appear in the chronicle/audit.
