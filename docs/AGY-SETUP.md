> **Other planners:** OpenAI-compatible APIs, local LLMs, Claude Code and Codex use the same proposal-only contract. See `docs/LLM-PLANNERS.md`.

> **v6 native TypeSafe note:** the Jev connection defaults to TypeSafe. Set TYPESAFE_API_KEY or paste your TypeSafe key and select TypeSafe native. agy keeps its own authentication and does not need OpenRouter for Jev. Native-only mode requires no harness. The optional cloud-text adapter mentioned below still uses OpenRouter separately.

# Optional agy harness

This adapter is implemented, but was not tested against an authenticated agy installation in the build environment. The child-process transport was tested with a deliberately synthetic executable. Check your installed CLI against its official headless documentation [1].

## What the adapter does

ORIGIN launches the locally installed `agy` executable. agy uses the cloud model/provider and credentials you configured for it; ORIGIN does not guess or silently choose a different provider. Jev remains a separate Decisions connection.

Each planner invocation starts a **fresh, stateless conversation** in a new empty temporary directory. The selected subject's own episodes, local observations, goal, feasible actions and limited witness records are provided explicitly. No global `--continue` conversation is shared across people. Individual simulated memory persists in ORIGIN checkpoints, not in a hidden cross-subject CLI conversation.

The adapter uses `--input-format stream-json`, `--output-format stream-json`, `--json-schema`, and a finite print timeout. It sends one `user` event on stdin and closes stdin. The result must report `SUCCESS` and match the proposal schema. Arguments are passed as an array with `shell: false`; prompts never become a shell command. Standard output events and stderr are recorded in the planner audit.

## Prepare your installation

Install and authenticate Antigravity CLI through its official instructions. Confirm independently:

```sh
agy --version
agy models
agy -p "Reply with exactly: connection-ok" --output-format json
```

That last command may incur model usage. It is an explicit connectivity test, not part of ORIGIN startup. A failed sign-in must be resolved in agy first. Your installed version needs the documented streaming and JSON-schema flags; unsupported flags fail visibly rather than falling back to a fabricated response.

## Configure a restricted planning environment

A coding harness may have powerful file, command, browser, plugin and MCP access. Those capabilities are unnecessary here. Use a **dedicated OS account or isolated container/VM** for strong separation, particularly when the host contains sensitive repositories or credentials.

In that dedicated agy profile, disable unnecessary plugins/MCP and configure tool-deny rules through its settings/permissions UI. The documented permission syntax includes:

```json
{
  "permissions": {
    "deny": [
      "read_file(*)",
      "write_file(*)",
      "command(*)",
      "read_url(*)",
      "execute_url(*)",
      "mcp(*)"
    ]
  }
}
```

Check these rules against your installed platform/version. The official documentation distinguishes Windows behavior from newer macOS/Linux permissions [2]. Do not overwrite unrelated settings blindly. ORIGIN does **not** rewrite your global profile or assume that a prompt is a security boundary.

The adapter enables `--sandbox` by default, starts in an empty temporary working directory, strips unrelated provider secrets from the child environment, never uses `--dangerously-skip-permissions`, and rejects tool/subagent events. The only exception is agy's built-in terminal `finish` tool, which agy 1.2.7 and later use to deliver the `--json-schema` result; it performs no action. **Observing a tool event is not the same as preventing that tool's first side effect.** The adapter is not a substitute for OS isolation or correctly configured permissions. Existing global instructions/plugins may also affect the CLI, which is why a clean profile is recommended.

## Enable ORIGIN

Copy `.env.example` to `.env`. Set:

```dotenv
AGY_ENABLED=1
AGY_COMMAND=agy
AGY_MODEL=
AGY_SANDBOX=1
```

Leave AGY_MODEL empty to use agy's existing configured model, or copy a valid model slug from `agy models`. Do not paste a cloud API key into AGY_MODEL. Use an absolute AGY_COMMAND path when necessary. On Windows, point to the real `agy.exe` executable, not a `.cmd` or `.bat` shell wrapper.

Restart the local server. In **Connect TypeSafe**, select **Local server bridge** and **agy proposals + Jev**. Enter your Jev key separately, set a small planner cap, and connect. Inspect the first planner receipt before running continuously.

If `--sandbox` is unavailable on your platform, do not silently remove it while using a privileged account. First establish suitable isolation and permissions; only then explicitly set AGY_SANDBOX=0 in that isolated environment. No code path auto-disables it on failure.

## What remains bounded

The planner cannot alter world code or define new executable recipes. It proposes only currently available action IDs. Future actions that are not yet feasible cannot be queued and executed automatically. Replanning happens later from the new state. An unsupported hypothesis stays unverified; only actual outcomes and Jev learning decisions modify individual skills.

Adding a pretrained LLM is not training an initially blank brain, and a self-description is not evidence of subjective awareness. This prototype supports inspecting grounded behavior, memory and interactions, not certifying consciousness.

## References

[1] Official headless CLI documentation: https://antigravity.google/docs/cli/headless/

[2] Official permission model and platform notes: https://antigravity.google/docs/permissions
