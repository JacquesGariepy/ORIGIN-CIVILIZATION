# Tests are not production behavior

`node --test tests/*.test.cjs` runs all Node regression and v6.1 tests using the built-in Node test runner. No package installation is required. Test replies, fake executable processes and fixture keys are explicitly synthetic and do not contact real providers.

`node tests/civil-stress.cjs` is a mechanical, seeded random-action stress test, not a production decision policy. Its results cannot establish model intelligence or end-to-end civilizational emergence.

`node tests/civil-fixture-server.cjs` starts a TEST-ONLY server on 4320 with a temporary data directory. It uses real production physics, server and UI, but deliberately synthetic model replies. Do not use that launcher for a real session. `python tests/agency-browser.py` runs the v6.1 desktop/mobile and actual-save recovery suite (Python Playwright and Chromium required). Restart the fixture server before a second run.

The browser harness uses the exact built HTML and actual production isometric renderer. Because this environment blocks Chromium networking, HTTP is relayed to the real local server by Python. Screenshot watermarks identify synthetic upstream responses. No scene/view class is replaced.

Legacy tests and older screenshots remain regression/history evidence; they do not prove live authentication or the correctness of optional 3D graphics. `docs/VALIDATION.md` describes the current verified boundary.

The fixture server and agency-browser support `ORIGIN_TEST_PORT` for an alternate test port. Set the same value for both. Tests do not use personal API credentials. The historical full stress harness is not a new v6.1 validation success; see docs/VALIDATION.md.
