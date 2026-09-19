# LLM planners: OpenAI-compatible APIs, local LLMs, Claude Code and Codex

A planner **proposes**; TypeSafe Jev **decides**. Every planner below returns the same schema-constrained proposal as the existing OpenRouter and agy planners: an objective, a hypothesis, up to three currently available action IDs, an expected observation, the person's own evidence event IDs, and an optional utterance. ORIGIN rejects any proposal that names an unavailable action, cites an event outside that person's supplied memory, or includes an utterance before the person has learned language. The proposal is then shown to Jev as unverified data. It never executes anything.

Planners are optional. A TypeSafe key alone runs the whole simulation. See `README.md` ("Why TypeSafe + LLMs") for how the roles combine.

All planner configuration is server-side in your private `.env`. Restart the server after editing it. The page never sends a planner URL, key or command. In **Connect TypeSafe**, keep **Local server bridge**, choose the **Cognitive mode**, and set a small **Planner limit**. `SERVER_PLANNER_CAP` in `.env` caps planner calls of every kind.

## OpenAI-compatible API or local LLM (`openai` mode)

One adapter covers any server that implements the OpenAI Chat Completions API with JSON-schema structured output.

```dotenv
# Local examples: no key needed
LLM_BASE_URL=http://127.0.0.1:11434/v1   # Ollama
# LLM_BASE_URL=http://127.0.0.1:1234/v1  # LM Studio local server
# LLM_BASE_URL=http://127.0.0.1:8080/v1  # llama.cpp llama-server
# LLM_BASE_URL=http://127.0.0.1:8000/v1  # vLLM
LLM_MODEL=the-model-id-your-server-lists

# Hosted examples: key required
# LLM_BASE_URL=https://api.openai.com/v1
# LLM_BASE_URL=https://api.mistral.ai/v1
# LLM_BASE_URL=https://api.groq.com/openai/v1
# LLM_BASE_URL=https://openrouter.ai/api/v1
# LLM_API_KEY=your-provider-key
# LLM_MAX_TOKENS=850
```

- ORIGIN posts to `LLM_BASE_URL` + `/chat/completions` with the fixed planner system prompt, `response_format: {type: "json_schema", strict: true}`, no tools and `redirect: "error"`.
- `LLM_BASE_URL` must use `https`. Plain `http` is accepted only for `127.0.0.1`, `localhost` or `[::1]`. Credentials, query strings and fragments in the URL are refused; put a key in `LLM_API_KEY`.
- Without `LLM_API_KEY`, no `Authorization` header is sent (typical for local servers).
- `LLM_MODEL` takes precedence over the page's planner model field, so an OpenRouter `PLANNER_MODEL` is never sent to your local server. The page field is used only when `LLM_MODEL` is empty.
- The server and model must support JSON-schema structured output. If they do not, or they return tool calls, the planner call fails visibly and nothing is invented.
- The adapter sends `max_tokens` (default 850, or `LLM_MAX_TOKENS` from 256 to 32000). Endpoints or models that reject `max_tokens` are not supported by this adapter.
- A local LLM keeps the planner prompt on your machine and has no per-call API cost. Jev decisions still go to TypeSafe.

## Claude Code CLI (`claude` mode)

Install Claude Code and sign in once interactively (`claude`), then:

```dotenv
CLAUDE_ENABLED=1
# CLAUDE_COMMAND=C:\Users\you\.local\bin\claude.exe   # only if claude is not on PATH
# CLAUDE_MODEL=sonnet                                 # optional alias or full model name
# CLAUDE_MAX_BUDGET_USD=0.50                          # optional per-call spending ceiling
```

Each proposal starts a fresh process in a new empty temporary directory, deleted afterwards:

```
claude -p --output-format json --json-schema <proposal schema> --tools "" --strict-mcp-config --safe-mode
       --no-session-persistence --permission-prompts none --system-prompt <fixed ORIGIN planner prompt>
       [--model CLAUDE_MODEL] [--max-budget-usd CLAUDE_MAX_BUDGET_USD]
```

- `--tools ""` disables all built-in tools. `--strict-mcp-config` without `--mcp-config` loads no MCP servers. `--safe-mode` disables customizations such as hooks, plugins, skills and CLAUDE.md. `--permission-prompts none` denies anything that would ask for permission. `--no-session-persistence` keeps nothing to resume.
- The person's state is written to **stdin**, never to the command line. Only the fixed planner system prompt and the schema are arguments.
- The child receives only system variables plus `CLAUDE_CONFIG_DIR` and `ANTHROPIC_API_KEY` if you set them. TypeSafe, OpenRouter and other keys are not passed.
- ORIGIN reads `structured_output` (or the JSON `result`) from the single JSON result. A reported tool use, a permission denial, or a non-success result rejects the proposal.
- Calls count against your Claude plan or API billing.
- These flags were checked against `claude --help` for Claude Code 2.1.278. If a later CLI renames a flag, the call fails visibly.

## Codex CLI (`codex` mode)

Install the Codex CLI and sign in (`codex login`), then:

```dotenv
CODEX_ENABLED=1
# CODEX_COMMAND=C:\path\to\codex.exe   # only if codex is not on PATH
# CODEX_MODEL=your-model               # optional
# CODEX_USER_CONFIG=1                  # load ~/.codex/config.toml (e.g. a custom provider); off by default
```

Each proposal starts a fresh process in a new empty temporary directory that also holds the schema and output files, deleted afterwards:

```
codex exec --sandbox read-only --skip-git-repo-check --ephemeral --ignore-rules --color never --json
           --output-schema <tmp>/proposal.schema.json -o <tmp>/proposal.json -C <tmp>
           [--ignore-user-config] [-m CODEX_MODEL] -
```

- The prompt, including the person's state, is written to **stdin** (`-`).
- `--ignore-user-config` is passed unless `CODEX_USER_CONFIG=1`, so MCP servers and other settings from your `config.toml` are not loaded by default. Authentication still comes from `CODEX_HOME`.
- ORIGIN reads the JSONL event stream. Any command execution, file change, MCP tool call, web search or other non-message item stops the process and rejects the proposal.
- The child receives only system variables plus `CODEX_HOME` and `OPENAI_API_KEY` if you set them.
- These flags were checked against `codex exec --help` for Codex CLI 0.154.0. `--dangerously-bypass-approvals-and-sandbox` is never used.

## Windows note

`CLAUDE_COMMAND` and `CODEX_COMMAND` must point to an executable. `.cmd`/`.bat` wrappers, such as those created by some npm global installs, are refused because they would require a shell. Point the variable to the native executable instead.

## Security model

- Planners run on the server only. Keys and URLs come from `.env`; the bootstrap reports only whether each planner is enabled (and whether the OpenAI-compatible endpoint is local or remote), never the URL or key.
- `LLM_API_KEY`, `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are added to the redaction lists used for API responses, audits and checkpoints.
- CLI planners use `shell: false`, an isolated temporary working directory, an environment allowlist, 2 MB output and 125-second limits, and are killed on timeout or cancellation.
- Seeing a tool or command event in the output is not the same as preventing its first side effect. The CLI flags above are the primary control; the event check is a second one. As for agy, run CLI planners under an account you are comfortable granting that CLI's normal access.

## What is sent to a planner

The fixed planner system prompt, then one person's perception (body, surroundings, own recent episodes and witnessed events, relationships, learned abilities), the currently feasible actions, and a short observer note. Other people's private memories and intentions are not included. The same content is recorded in the planner ledger entry.

**What the CLIs add on their own.** This comes from the CLI, not from ORIGIN, and cannot be switched off with a subscription sign-in (Claude Code's `--bare` mode removes it but requires `ANTHROPIC_API_KEY`). It goes only to the provider you are signed in to. Observed on 2026-09-19: **Claude Code** (even with `--safe-mode`) adds the signed-in account's email address, the operating system, the date and the temporary working directory path, which contains your Windows user name. **Codex** adds the temporary working directory path, the shell, the date and the time zone, but no account or email address. agy adds its own session context. None of it can authorize an action: proposals are still grounded and Jev still decides.

## Verification

`tests/llm-planners.test.cjs` covers URL rules, headers, strict schema, tool-call and grounding rejections, opt-in, redaction, bootstrap disclosure, and real child processes that stand in for the CLIs (arguments, stdin, isolated directory, environment allowlist, tool-event rejection). No authenticated call to an OpenAI-compatible provider, a local LLM, Claude Code or Codex was made for this update.
