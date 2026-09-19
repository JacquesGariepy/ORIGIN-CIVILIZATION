# v6.1 validation

## Source audit and recovery

The full supplied v6 save was parsed. Its 961 request entries have recorded `httpStatus: 200` and `status: valid`. Counts and person summaries are in `validation/v6.1/save-audit.json`. These are historical user-provided logs, not new live provider calls or signed attestations.

The copied recovery file is byte-identical to the upload; `recovery/SUPPLIED-V6-SHA256.txt` records its hash. Regression tests verify unchanged bodies, inventories, skills, trials, memories, age, bonds, unfinished activities, reservation state and time after migration, apart from explicitly added diagnostic metadata and version.

## Executed regression tests

**192 Node tests passed, zero failed, zero skipped.** Command: `node --test tests/*.test.cjs`. Transcript: `validation/v6.1/node-tests.txt`. The total includes historical API/core regressions; it is not 192 new game features.

The 18 additional agency tests exercise the supplied run, read-only diagnostics, repeated clay round-trips with conservation, useful and saturated social interactions, recipient outcomes, unchanged observations, interrupted localized gathering/drinking, staged intention receipts, retained urgent body choices, parallel approach scheduling, independent accept/decline, request-budget preflight, progress holds and explicit review without fabricated behavior.

**38 browser checks passed** against the shipped HTML and actual authoritative Node server. Results: `validation/v6.1/browser-results.json`. Desktop 1440x960 and mobile 390x844 use the actual bundled isometric renderer. The tests include existing building, people, Earth and family workspaces, concurrent activities, shared world state, actual-save restoration, Life audit and overflow/error checks.

Only upstream model responses are deliberate test fixtures. A Python HTTP relay bypasses the test environment's Chromium networking restriction while still sending requests to the real local server. No view or scene class is substituted. The screenshot watermark identifies the fixture context. The restored civilization visible in recovery screenshots is from the uploaded save, not new fixture-generated civilization progress.

## Reproduce browser checks

Start a fresh dedicated test-only fixture process, then run the new browser test. It requires Python Playwright and Chromium; the normal application does not.

```sh
node tests/civil-fixture-server.cjs
# In another terminal:
python tests/agency-browser.py
```

Port 4320 is the test default. Set `ORIGIN_TEST_PORT` to the same alternate port in both processes when needed. The validation here used 4327 after a stale test process temporarily occupied 4320. Restart/terminate the fixture server between fresh tests; never use it as a real model connection.

## Boundaries

No authenticated TypeSafe, OpenRouter planner or agy request was executed during this build. The optional Three.js/WebGL renderer was not visually validated. The isometric renderer was.

The earlier full 200-cycle, three-scenario mechanical stress harness was attempted but did not finish within this build's execution window; no new long-run stress success is claimed. Earlier v6 stress artifacts are retained as historical evidence only. The v6.1 regression and browser totals above completed independently.

Tests establish specified mechanics and failure handling. They do not guarantee a diverse autonomous trajectory, scientific realism, love or subjective awareness, the discovery of a particular technology, or end-to-end emergence of a civilization.
