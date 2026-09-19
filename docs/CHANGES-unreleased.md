# Unreleased: LLM planners, live AI transparency and TypeSafe + LLM documentation

Package version stays 6.1.0 until a release is cut.

## Added

- Three proposal-only planner modes in `source/planner.cjs`, alongside the existing `cloud` (OpenRouter) and `agy` planners:
  - `openai`: any OpenAI-compatible Chat Completions endpoint set by `LLM_BASE_URL` (OpenAI, OpenRouter, Mistral, Groq, or a local Ollama, LM Studio, llama.cpp or vLLM server), with optional `LLM_API_KEY`, `LLM_MODEL` and `LLM_MAX_TOKENS`.
  - `claude`: Claude Code CLI in print mode with all tools disabled, no MCP, safe mode, no session persistence and permission prompts denied (`CLAUDE_ENABLED=1`).
  - `codex`: Codex CLI `exec` with a read-only sandbox, ephemeral session, output schema file and JSONL event checks (`CODEX_ENABLED=1`).
- UI: three new **Cognitive mode** options, planner status in the connection dialog, updated help text.
- Bootstrap flags `llmEnabled`, `llmStatus` (local/remote, never the URL), `llmModel`, `claudeEnabled`, `claudeModel`, `codexEnabled`, `codexModel`.
- `tests/llm-planners.test.cjs`: 15 tests, plus one agy compatibility test and one request-budget test (209 total).
- `docs/LLM-PLANNERS.md`; the English README now opens with TypeSafe Jev decisions and AI planners ("Why TypeSafe + AI").
- **AI live** drawer (header button): every Jev and planner call, live and newest first, with status, engine, model, latency, tokens, chosen option and confidence or proposal; filters by engine, status and person; counters for outcomes, tokens, latency and both budgets. A readable detail view (per-question probability bars, chosen option, confidence, perception, exact request, raw response, validation, application; planner verdict, proposal, exact prompt, CLI arguments or HTTP request, events, stderr, raw output) with **Copy JSON**, also used by **Full ledger**.
- Token-protected `GET /api/world/ai?since=&limit=` (compact summaries after a revision cursor, counters, budget stop) and `GET /api/world/ai/row?id=` (one full redacted row).
- Ledger rows now record `outcome`, `validation`, `verdict`, planner `latencyMs`, `jevChoices` / `plannerProposal` (whether Jev followed a proposal), `notApplied` reasons and `truncated` sizes.
- `tests/ai-transparency.test.cjs`: 8 tests (217 total).

## Changed

- `cleanEnv(env, cli)` now gives each CLI only its own sign-in variables (agy: Google/Gemini; Claude Code: `CLAUDE_CONFIG_DIR`, `ANTHROPIC_API_KEY`; Codex: `CODEX_HOME`, `OPENAI_API_KEY`). The agy default is unchanged.
- The OpenRouter cloud planner now uses `redirect: "error"` and reports non-JSON responses explicitly.
- `LLM_API_KEY`, `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are redacted from responses, audits and checkpoints.
- Server banner shows the package version instead of "v6.0"; `.env.example` header says 6.1.

## Fixed

- A restored world keeps its historical Jev attempts in the total request budget, so a world with about 1,900 attempts could never run long under the old 2,000-call ceiling ("Request budget reached."). The explicit budget ceilings are now 100000 Jev calls and 10000 planner calls in the connection and budget dialogs and in `LivingSession`, and `SERVER_JEV_CAP` / `SERVER_PLANNER_CAP` accept up to 100000 / 10000. The default Jev limit is unchanged (100); nothing is raised automatically, and TypeSafe charges still apply to every attempt.
- agy 1.2.7 (auto-updated CLI) returns `--json-schema` output through its built-in terminal `finish` tool before the `SUCCESS` result. ORIGIN rejected every tool event, so every agy proposal was refused and the planner looked unresponsive. Exactly that `finish` step (tool name and tool info both `finish`, no subagent) is now accepted; any other tool or subagent event is still rejected and the child is stopped. Verified with the real agy 1.2.7 on Windows.

- `tests/v41.test.cjs` started a server without a temporary `dataDir`, so running the suite inside the project wrote a fresh world into the real `data/` checkpoint (and could replace a live world). It now uses a temporary directory that is removed afterwards; no test writes to `data/`.

- A planner failure on the authoritative server kept only the error message. The prompt, CLI events, stderr and raw output are now kept in the ledger row, redacted, with an explicit verdict.
- A run that stopped on the planner budget showed the generic title "Request budget reached." while Jev still had budget. The stop now names the budget, the usage of both budgets and what the next cohort needs (for example "Planner budget reached: 12 / 12 planner calls used; the next cohort needs 6 planner proposals. Jev: 1869 / 2000 decision calls used."), in the status line, the Budget dialog and the AI live counters. Both budgets are checked before a cohort starts, so a cohort that would fail on the planner budget no longer spends Jev calls first. The Budget dialog shows usage beside each limit, prefills usage + 500 (Jev) or usage + 100 (planner) only when a limit is used up, and offers **Continue with Jev only**, which turns the planner off for this run only when clicked. The default planner limit is now 100 (was 12).

## Unchanged

- TypeSafe Jev is still the only source of executable decisions. Planners still require the local server bridge, share `SERVER_PLANNER_CAP` and the planner request allowance, and are grounded before Jev sees them.

## Not validated

- On 2026-09-19 the Claude Code (2.1.278), Codex (0.154.0) and agy (1.2.7) planners were each run live on Windows with a fictional subject and returned proposals that passed grounding; the OpenAI-compatible planner has not been run against a real server or local LLM. No full browser session of the new drawer was run. Browser checks were not rerun for this update. The AI live drawer and the Budget dialog were checked through the shared view builders in Node and by parsing every script block of the built `ORIGIN.html`; no browser session was run.
