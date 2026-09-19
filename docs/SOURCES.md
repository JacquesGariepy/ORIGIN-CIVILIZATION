# Implementation references

These primary sources were checked for this update. Application behavior and test claims are established by the included source/tests, not by these external documents.

- TypeSafe introduction and typed decision interface: https://docs.typesafe.ai/introduction
- Choice primitive (selected option, probabilities and confidence): https://docs.typesafe.ai/primitives/choice
- Jev alias on OpenRouter: https://openrouter.ai/~typesafe/jev-latest
- agy headless CLI, streaming stdin/stdout and JSON-schema envelope: https://antigravity.google/docs/cli/headless/
- agy permissions and platform differences: https://antigravity.google/docs/permissions
- OpenRouter structured output and provider capability requirements: https://openrouter.ai/docs/guides/features/structured-outputs
- Node child-process argument/stdin handling and Windows executable constraints: https://nodejs.org/api/child_process.html
- Pinned Three.js mirror used by the optional installer: https://raw.githubusercontent.com/mrdoob/three.js/r160/build/three.min.js
- Three.js project and license: https://github.com/mrdoob/three.js

The original page and user-supplied decision ledger were the basis for the regression correction. The earlier diagnostic alone was not a runnable application; this package supplies the corrected source, prebuilt page, local bridge, launchers and tests.


## v4.2 native TypeSafe contract, checked 2026-09-19

- System One overview: https://docs.typesafe.ai/concepts/system-one
- Native API, Bearer authentication, request/response schema and errors: https://docs.typesafe.ai/api
- Native model IDs and GET /v1/models: https://docs.typesafe.ai/models

The HTTP API is called with fetch; no TypeSafe SDK dependency is required in this package. API documentation describes the external contract, not evidence that a live call was run in the build environment.

## v6 geographic data

See DATA-SOURCES.md for the actual bundled Natural Earth outline, the allowlisted optional Terrarium elevation source and the explicit distinction between observed and generated layers. Application output and model cognition are not validated by map attribution.

## Unreleased planner update, checked 2026-09-19

- TypeSafe wording quoted in README.md: https://docs.typesafe.ai/introduction , https://docs.typesafe.ai/concepts/system-one , https://docs.typesafe.ai/primitives/choice
- Claude Code CLI flags: `claude --help` of the locally installed Claude Code 2.1.278.
- Codex CLI flags: `codex exec --help` of the locally installed Codex CLI 0.154.0.
- The OpenAI-compatible adapter uses the Chat Completions `response_format: json_schema` shape already used by the OpenRouter planner. Support by a given server or model is not established by this repository.
