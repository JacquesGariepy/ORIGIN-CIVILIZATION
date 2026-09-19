# Native TypeSafe / v6

The default is native TypeSafe, not an OpenRouter alias.

```http
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer YOUR_TYPESAFE_KEY
Content-Type: application/json
```

The body uses `model: "jev-latest"`, a structured `state` and typed `questions`. The provider returns selections, probability distributions and confidence. These are model outputs, not proof of truth or inner experience. Independent questions in the same call cannot see each other's answer; immediate action, outward expression and provisional future goal are therefore not treated as an ordered chain.

1. Start the included local server.
2. Set `TYPESAFE_API_KEY` in `.env` and restart, or paste it in the page.
3. Choose TypeSafe native, native model `jev-latest`, local bridge, Jev only.
4. The optional access test checks `GET https://api.typesafe.ai/v1/models`, not an agent decision. It makes no world change.
5. Connect and run, then inspect exact requests/answers in Full ledger.

`SERVER_CONCURRENCY=8` sets the maximum simultaneous inference operations allowed for the authoritative world. The page defaults to four parallel model calls. Lower this to respect your account limits. Request failures are logged; there is no silent fallback to OpenRouter or local policy.

The native pinned model option is `jev-1.13.0`; the optional OpenRouter models use their own IDs. Do not combine their prefixes or keys. Provider/model availability may change; an invalid choice fails visibly.

Application configuration and fixture tests verify this routing. They do not establish successful authenticated use of your account.

Official documentation: https://docs.typesafe.ai/introduction , https://docs.typesafe.ai/api , https://docs.typesafe.ai/models , https://docs.typesafe.ai/primitives/choice
