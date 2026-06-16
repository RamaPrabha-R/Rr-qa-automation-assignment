# RR QA Automation Assignment — TMDB Discover

Automated UI + API test suite for [tmdb-discover.surge.sh](https://tmdb-discover.surge.sh/),
built with **Selenium WebDriver (JavaScript)**, **Mocha**, and **Chai**, with HTML + console
reporting via **Mochawesome**.

> Prepared for the Rapyuta Robotics QA Automation Assignment.

## Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Running the Tests](#running-the-tests)
- [Reports & Logging](#reports--logging)
- [Test Design Techniques](#test-design-techniques)
- [Coding Patterns Used](#coding-patterns-used)
- [Documentation Index](#documentation-index)

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Browser automation | `selenium-webdriver` (JS) | Explicitly requested for this assignment; vendor-neutral, W3C WebDriver standard. |
| Test runner / assertions | Mocha + Chai | Lightweight, flexible hooks (`before`/`after`/`beforeEach`), BDD-style assertions. |
| HTTP/API testing | Axios | Simple, promise-based, good error/status handling for contract tests. |
| Reporting | Mochawesome (HTML) + Mocha spec reporter (console) + `mocha-junit-reporter` (CI) | Satisfies the "console and HTML reports" requirement; JUnit XML for CI tool integration. |
| Logging | Winston | Structured, leveled logging to console + file, with custom `step/pass/fail` helpers used throughout the suite. |
| Config | `dotenv` + `config/index.js` | Centralizes URLs, timeouts, and selector strategies in one place. |

## Project Structure

```
rr-qa-automation-assignment/
├── config/
│   └── index.js              # Base URLs, timeouts, selector definitions
├── pages/
│   ├── BasePage.js            # Shared WebDriver helpers (Page Object base class)
│   └── HomePage.js            # Page Object for the Discover listing page
├── utils/
│   ├── driverFactory.js       # Browser/driver creation, screenshots, wait helpers
│   └── logger.js              # Winston logger with step/pass/fail/debug helpers
├── tests/
│   ├── hooks.js               # Global Mocha root hooks (driver lifecycle, failure screenshots)
│   ├── ui/
│   │   ├── filtering.test.js  # TC-FILTER-001..025
│   │   └── pagination.test.js # TC-PAGE-001..010
│   └── api/
│       └── tmdb-api.test.js   # TC-API-001..006, TC-API-BROWSER-001..004
├── docs/
│   ├── TEST_DESIGN.md          # Strategy, techniques, full case-by-case descriptions
│   ├── DEFECT_REPORT.md        # Defects found, with repro steps & evidence
│   └── CI_APPROACH.md          # How this suite would be wired into CI (not implemented)
├── reports/                    # Generated at runtime: HTML report, screenshots, logs
├── .env.example
├── .mocharc.js
├── package.json
└── README.md
```

## Setup

**Prerequisites:** Node.js ≥ 18, Google Chrome installed locally (the suite launches Chrome
headless by default; Firefox is also supported via config).

```bash
git clone https://github.com/<your-username>/rr-qa-automation-assignment.git
cd rr-qa-automation-assignment
npm install
cp .env.example .env
```

Edit `.env` if you want to:
- Run with a visible browser window: set `HEADLESS=false`.
- Run the **direct TMDB API contract tests**: add a real `TMDB_API_KEY` (free to obtain at
  [themoviedb.org](https://www.themoviedb.org/settings/api)). Without a key, those specific specs
  skip gracefully — every other test (UI suite, browser-driven API assertions) runs regardless.

## Running the Tests

```bash
npm test              # Full suite, console (spec) reporter
npm run test:ui        # UI-only specs (filtering + pagination)
npm run test:api       # API-only specs (direct TMDB contract + browser network assertions)
npm run test:report    # Full suite + generates reports/test-report.html (Mochawesome)
npm run test:ci        # Full suite + JUnit XML output for CI tool integration
```

Open `reports/test-report.html` in a browser after running `test:report` for the rich HTML
report (pass/fail breakdown, durations, failure stack traces, and screenshot attachments on
failures).

Console output uses the Mocha `spec` reporter plus structured Winston log lines
(`reports/logs/test-run.log`) showing every `STEP`, `PASS`, `FAIL`, and `DEBUG` entry generated
during execution — see [Reports & Logging](#reports--logging) below.

## Reports & Logging

- **Console report**: Mocha `spec` reporter — nested describe/it output with pass/fail/timing.
- **HTML report**: Mochawesome — `npm run test:report` → `reports/test-report.html`.
- **CI report**: JUnit XML — `npm run test:ci` → `reports/junit/results.xml`.
- **Screenshots on failure**: automatically captured by the global `afterEach` hook in
  `tests/hooks.js` and saved to `reports/screenshots/`, named with the failing test's title and a
  timestamp.
- **Logging strategy**: every Page Object action logs a `STEP` before acting and a `PASS`/`FAIL`
  in the test's `afterEach`. `DEBUG`-level logs record intermediate values (card counts, resolved
  selectors, captured network requests) to make failures diagnosable from logs alone, without
  needing to re-run locally. Logs go to both the console (colorized) and
  `reports/logs/test-run.log` / `errors.log` (plain, for CI artifact upload).

## Test Design Techniques

Full detail in [`docs/TEST_DESIGN.md`](docs/TEST_DESIGN.md). Summary:

- **Equivalence Partitioning** for categories, type toggle, and search validity.
- **Boundary Value Analysis** for year (earliest/latest) and rating (0/10) filters, and API page
  numbers.
- **Negative Testing** for empty/invalid search, XSS injection, invalid API key, and the two
  documented known issues (slug navigation, late-page pagination).
- **State Transition Testing** for pagination Next/Prev round-trips.
- **Exploratory Testing** during initial DOM/control discovery, which directly shaped the
  selector strategy in `config/index.js` and `pages/HomePage.js`.

## Coding Patterns Used

- **Page Object Model (POM)** — `BasePage` encapsulates generic WebDriver waits/clicks/typing;
  `HomePage` encapsulates AUT-specific selectors and actions. Tests never call `driver.findElement`
  directly, keeping selector churn isolated to one file if the site's markup changes.
- **Resilient/fallback selector arrays** — each control (search box, type filter, year filter,
  etc.) is defined as an *ordered list* of candidate CSS selectors tried in priority order
  (`data-testid` → ARIA → semantic class → generic tag), since the AUT's markup couldn't be
  inspected ahead of time with full certainty. This is the single biggest maintainability lever
  in the suite — if the site changes one class name, most tests keep passing.
- **Root hooks / centralized lifecycle** (`tests/hooks.js`) — one shared place manages driver
  startup/teardown and automatic failure screenshots, instead of duplicating `before`/`after`
  boilerplate per file.
- **Network interception via injected `fetch`/`XHR` wrappers** — rather than relying on a heavier
  proxy tool, a small JS snippet is injected via `executeScript` to record outbound calls,
  satisfying the "usage of browser APIs and how you are asserting them" requirement without
  extra infrastructure.
- **Defect-confirmation tests, not silent skips** — the two known-issue areas from the brief
  (TC-PAGE-006/007/008) are written to *actively probe and document* the defect (with screenshot
  evidence) on every run, rather than being omitted or just marked `pending`.

## Documentation Index

| Document | Purpose |
|---|---|
| [`docs/TEST_DESIGN.md`](docs/TEST_DESIGN.md) | Testing strategy, design techniques, full step-by-step case descriptions, rationale for case selection |
| [`docs/DEFECT_REPORT.md`](docs/DEFECT_REPORT.md) | Confirmed defects with repro steps, root-cause hypothesis, and suggested fixes |
| [`docs/CI_APPROACH.md`](docs/CI_APPROACH.md) | Proposed CI pipeline design (stages, triggers, secrets, flake handling) — not implemented per assignment instructions |
