# Unreleased: LLM planners and TypeSafe + LLM documentation

Package version stays 6.1.0 until a release is cut.

## Added

- Three proposal-only planner modes in `source/planner.cjs`, alongside the existing `cloud` (OpenRouter) and `agy` planners:
  - `openai`: any OpenAI-compatible Chat Completions endpoint set by `LLM_BASE_URL` (OpenAI, OpenRouter, Mistral, Groq, or a local Ollama, LM Studio, llama.cpp or vLLM server), with optional `LLM_API_KEY`, `LLM_MODEL` and `LLM_MAX_TOKENS`.
  - `claude`: Claude Code CLI in print mode with all tools disabled, no MCP, safe mode, no session persistence and permission prompts denied (`CLAUDE_ENABLED=1`).
  - `codex`: Codex CLI `exec` with a read-only sandbox, ephemeral session, output schema file and JSONL event checks (`CODEX_ENABLED=1`).
- UI: three new **Cognitive mode** options, planner status in the connection dialog, updated help text.
- Bootstrap flags `llmEnabled`, `llmStatus` (local/remote, never the URL), `llmModel`, `claudeEnabled`, `claudeModel`, `codexEnabled`, `codexModel`.
- `tests/llm-planners.test.cjs`: 15 tests (207 total).
- `docs/LLM-PLANNERS.md`; README section "Why TypeSafe + LLMs" and "En bref (FR)".

## Changed

- `cleanEnv(env, cli)` now gives each CLI only its own sign-in variables (agy: Google/Gemini; Claude Code: `CLAUDE_CONFIG_DIR`, `ANTHROPIC_API_KEY`; Codex: `CODEX_HOME`, `OPENAI_API_KEY`). The agy default is unchanged.
- The OpenRouter cloud planner now uses `redirect: "error"` and reports non-JSON responses explicitly.
- `LLM_API_KEY`, `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are redacted from responses, audits and checkpoints.
- Server banner shows the package version instead of "v6.0"; `.env.example` header says 6.1.

## Unchanged

- TypeSafe Jev is still the only source of executable decisions. Planners still require the local server bridge, share `SERVER_PLANNER_CAP` and the planner request allowance, and are grounded before Jev sees them.

## Not validated

- No authenticated call to an OpenAI-compatible provider, a local LLM, Claude Code or Codex was made. Browser checks were not rerun for this update.
