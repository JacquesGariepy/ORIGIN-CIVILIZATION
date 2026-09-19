# ORIGIN 4.2 validation

## Executed for this package

- 22 legacy core/session checks passed.
- 77 Node test cases passed (including 23 native TypeSafe-specific cases).
- 22 existing DOM regression checks passed.
- 29 native TypeSafe DOM checks passed, including desktop/mobile settings, account check, server-held key, pinned model, explicit errors, no OpenRouter requests, and credential removal from checkpoints.
- JavaScript syntax and single-page build checked.

Totals: **99 engine/transport checks**, **51 DOM checks**. Test fixtures are isolated under tests/ and are not part of the production runtime.

## What the tests establish

TypeSafe is the actual default in session, UI and proxy. The proxy sends POST /v1/systemone with native model IDs and Bearer authentication. It cannot use an OpenRouter server key as a native key. Direct browser transport and the local bridge are tested with fixture responses. GET /v1/models checks do not advance world time or consume decision allowance. Native responses, errors, request IDs and Retry-After are retained; no automatic fallback or retry is executed. Secrets do not enter the tested checkpoint/audit exports.

The 23 native tests are in tests/typesafe.test.cjs. The original regression tests remain included. The generic credential fixture in v4 tests now declares hasTypeSafeKey explicitly; the version assertion in v4.1 tests references the current engine version. Original OpenRouter proxy tests explicitly select OpenRouter instead of relying on the former default.

## Not established

- No authenticated call to the real TypeSafe API was made. The user supplies their own key locally.
- No authenticated agy or optional cloud-planner call was made.
- No real WebGL rendering validation: DOM tests explicitly replace the renderer, and runtime HTTP responses are test fixtures. Screenshot filenames under validation/ refer to these tests, not live runs.
- A pinned Three.js CDN download was attempted but failed because name resolution was unavailable in this container. Three.js still loads from the existing pinned mirrors on a network-enabled user machine. node install-assets.cjs can cache it there.
- Behavioural progress, consciousness, concurrent lives, or Earth-scale simulation were not added or validated by this API update.

## Reports

- node-v42-tests.txt: 22 legacy checks plus the 77 Node test cases.
- browser-test-v42.txt / browser-ui-results.json: original DOM regression run.
- native-browser-output.txt / native-browser-results.json: native account and connection UI checks.
- native-desktop-access-check.png / native-mobile-connection.png: settings screenshots using fixtures.
- history-v4.1/: inherited reports from the prior archive, not new validation claims.

Official contract consulted on 2026-09-19: https://docs.typesafe.ai/api and https://docs.typesafe.ai/models.
