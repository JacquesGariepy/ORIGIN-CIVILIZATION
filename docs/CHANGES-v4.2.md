# v4.2 / native TypeSafe integration

## Changed

- TypeSafe is now the default provider in the browser session, UI and local bridge.
- Shared fixed provider contracts in source/providers.js prevent native/OpenRouter endpoint and model confusion.
- Native model menu: jev-latest, jev-1.13.0, jev-preview. Pinned selection is preserved.
- The UI and session validate the matching provider's server key instead of accepting a generic hasJevKey flag.
- Switching providers clears an unsubmitted tab key. An obvious OpenRouter key is rejected by native TypeSafe mode.
- Optional account test calls GET /v1/models with no decision or world change. It has a separate audit record.
- Native HTTP errors, including validation detail arrays and Retry-After, are retained and explained. No automatic retry/provider fallback.
- Native log entries include the external upstream endpoint even when using the local server bridge.
- Pasted transient credentials are also redacted from upstream-error text; redirects are not followed.
- Native-first .env.example, setup guide and default UI. Optional agy can run alongside native TypeSafe without OpenRouter.

## Preserved

v4.1 learning/evidence rules, state transactions, finite resources, stagnation/spending guards, full ledger, recovery, local saves, optional agy adapter, optional OpenRouter planner, procedural Three.js renderer.

## Explicitly not added

Concurrent lives, Earth-scale geography, children/generations, an open-ended industrial technology system, subjective consciousness, or a guarantee of agent progress. This is a transport/configuration update, not a simulation architecture rewrite.

## Validation

See validation/VALIDATION.md. Tests use fixture responses, not an authenticated TypeSafe account. The browser fixture renderer is not shipped as a production runtime path.
