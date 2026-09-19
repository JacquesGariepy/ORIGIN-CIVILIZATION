# Optional LLM API planner

The direct text-model adapter uses OpenRouter, independently from native TypeSafe Jev. A TypeSafe key cannot authenticate this endpoint, and a Gemini-native key is not an OpenRouter key.

Copy `.env.example` to `.env` without overwriting an existing configuration. Preserve your TypeSafe setup and add:

```dotenv
TYPESAFE_API_KEY=YOUR_NATIVE_TYPESAFE_KEY
PLANNER_API_KEY=YOUR_OPENROUTER_KEY
PLANNER_MODEL=YOUR_JSON_SCHEMA_CAPABLE_OPENROUTER_MODEL_ID
```

Use an explicit currently available provider/model ID that supports strict JSON Schema. ORIGIN does not guess a model or auto-switch providers. If `PLANNER_API_KEY` is blank, the adapter can use `OPENROUTER_API_KEY`. This does not change the selected Jev provider.

Restart the local server. In **Connect TypeSafe** choose **Local server bridge** and **LLM cloud proposals + Jev**. Set **Cloud planner model ID** and a small planner-request allowance. Keep Jev on TypeSafe / `jev-latest`.

The planner receives a single person's local perception, own evidence and currently feasible actions. Its structured output contains an objective, hypothesis, up to three available action IDs, an expected observation and source event IDs. It is an unverified suggestion. Jev still selects the next action and other people still choose their responses independently.

Planner calls occur when no reusable recent proposal exists (approximately after three personal completed actions), not at each animation frame. Both planner and Jev calls share bounded local concurrency, but use separate request allowances. Check **Full ledger** for `planner` entries followed by Jev decisions. JSON-schema/provider errors stop rather than silently creating a plan.

The current adapter calls `https://openrouter.ai/api/v1/chat/completions` with `response_format: json_schema`, strict schema and provider parameter requirements. It is not a generic arbitrary-base-URL adapter. For any other OpenAI-compatible endpoint, including local LLMs, use the `openai` planner described in `docs/LLM-PLANNERS.md`. No authenticated planner call was performed during this build.

Primary contract: https://openrouter.ai/docs/guides/features/structured-outputs

In v6, a proposal may include an optional schema-validated utterance grounded in the same individual context, only once language is learned and a target/action permits it. It is not a free global transcript. The server owns both the simulation and its request counters; reopening the browser does not create a separate population or reset spending.
