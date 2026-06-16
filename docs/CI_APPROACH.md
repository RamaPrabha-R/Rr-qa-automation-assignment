# CI Integration Approach (Proposal, Not Implemented)

As requested in the assignment, this describes **how** this suite would be integrated into CI
without actually wiring up the pipeline.

## 1. Pipeline Stages

```
checkout → install deps → lint → unit/static checks → run UI+API tests (parallel) → publish reports → notify
```

1. **Checkout** the repo.
2. **Install dependencies** with a cached `node_modules` (keyed on `package-lock.json` hash) to
   keep runs fast.
3. **Lint** (`npm run lint`) as a fast-fail gate before spending time on browser tests.
4. **Run tests**:
   - `npm run test:api` (no browser needed — fast, runs first as a smoke gate).
   - `npm run test:ui` (Selenium/Chrome headless — runs in a containerized browser image such as
     `selenium/standalone-chrome` or via GitHub Actions' `browser-actions/setup-chrome`).
   - These two jobs can run **in parallel** as separate CI jobs since they don't share state,
     cutting wall-clock time roughly in half.
5. **Reporting**: run with the `mochawesome` reporter to produce `reports/test-report.html` plus
   a JUnit XML (`mocha-junit-reporter`) so the CI platform's native test-result UI (e.g. GitHub
   Actions' "Checks" tab, Jenkins' JUnit plugin) can render pass/fail counts and trends.
6. **Publish artifacts**: upload `reports/` (HTML report, screenshots, logs) as a build artifact
   so failures are debuggable without re-running locally.
7. **Notify**: post a summary (pass/fail counts + link to the HTML report artifact) to a Slack/
   Teams channel on failure, or on every run for a nightly schedule.

## 2. Triggering Strategy

- **On every Pull Request** targeting `main`: run the full suite as a required status check.
- **On merge to `main`**: re-run as a confidence check post-merge.
- **Nightly scheduled run**: catches flakiness/regressions introduced by the *target site itself*
  changing, independent of any code change in this repo — relevant here since the AUT is an
  external demo site outside our control.

## 3. Environment & Secrets

- `TMDB_API_KEY` (for the direct API contract tests) would be stored as a CI secret/encrypted
  variable, never committed — `.env.example` documents the required shape without real values.
- `BASE_URL` and `HEADLESS=true` would be set as CI environment variables so the same test code
  runs identically in CI and locally (just toggling headless mode locally for debugging).

## 4. Browser Provisioning in CI

Two viable options, in order of preference for this size of project:

1. **GitHub Actions matrix + `browser-actions/setup-chrome`** (or equivalent for the chosen CI
   platform) — installs a pinned Chrome + matching chromedriver version directly on the runner.
   Simple, no Docker overhead, good for a small suite like this.
2. **Selenium Grid via Docker Compose** (`selenium/standalone-chrome` image) — better choice if
   the suite later grows to need multiple browsers/parallel shards or cross-browser coverage
   (Firefox, Edge). The `driverFactory.js` already abstracts browser creation, so swapping in a
   Grid `Builder().usingServer(gridUrl)` call is a small, contained change.

## 5. Flakiness & Retry Strategy

- Mocha's built-in `retries()` (or `--retries 1`) on UI specs only, since browser tests are
  inherently more flake-prone than API tests (network timing, animation timing). API tests should
  **not** be retried blindly — a flaky API test is more likely a real contract regression.
- Screenshots-on-failure (already implemented in `tests/hooks.js`) become even more valuable in
  CI, since there's no live browser to inspect — the artifact upload step is what makes failures
  debuggable.

## 6. Quality Gates

- Required check: **API suite must pass 100%** before merge (it tests a stable contract).
- Advisory check: **UI suite** results are surfaced but the two documented known-issue tests
  (TC-PAGE-006/007/008) are treated as **non-blocking/informational** in CI status, since they
  intentionally probe pre-existing site defects rather than regressions in this repo's code. They
  should still always run and report, so a *change* in their outcome (e.g., previously-passing
  deep pagination becomes broken in a new and different way) is visible in the report diff over
  time, even though it doesn't fail the build outright.

## 7. Scaling Considerations (Future)

- If the test count grows significantly, split UI specs into sharded CI jobs by file
  (`tests/ui/filtering.test.js` vs `tests/ui/pagination.test.js`) and merge their mochawesome
  JSON outputs with `mochawesome-merge` before generating one combined HTML report.
- Add a visual-regression layer (e.g., Percy/Playwright snapshot diffing) only if the UI is
  expected to change frequently in ways unit/E2E assertions wouldn't catch.
