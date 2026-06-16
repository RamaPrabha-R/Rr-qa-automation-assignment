# Defect Report — TMDB Discover

**Application Under Test:** https://tmdb-discover.surge.sh/
**Reporting Date:** 2026-06-16
**Reported By:** QA Automation Engineer

---

## DEFECT-001: Direct URL/slug navigation does not reliably render content

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Priority** | P2 |
| **Status** | Confirmed (pre-documented in assignment brief) |
| **Test Case** | TC-PAGE-008 |
| **Environment** | Chrome (headless), desktop viewport |

**Steps to Reproduce**
1. Open a new browser tab/session (no prior in-app navigation).
2. Navigate directly to `https://tmdb-discover.surge.sh/popular`.
3. Observe the page.

**Expected Result**
The Popular category listing renders exactly as it would if reached by clicking the "Popular" tab
from the home page.

**Actual Result**
Direct slug access can fail to render the expected listing/content (page may show an empty,
errored, or default state instead of the Popular category). This matches the known issue called
out in the assignment brief.

**Likely Root Cause**
The SPA's client-side router does not appear to hydrate route-based state on a hard navigation —
this is typical of front-end-only routing (e.g., a router that updates the URL on tab clicks via
`pushState` but does not read the URL on initial mount to set the active category).

**Suggested Fix**
On app bootstrap, parse `window.location.pathname` and initialize the "active category" state
from it, rather than only updating the URL reactively from in-app clicks.

**Evidence**
Captured automatically by the suite at `reports/screenshots/defect_direct_slug_popular-*.png`
when reproduced in a given run.

---

## DEFECT-002: Pagination becomes unreliable on later/last pages

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Priority** | P2 |
| **Status** | Confirmed (pre-documented in assignment brief) |
| **Test Case** | TC-PAGE-006 |
| **Environment** | Chrome (headless), desktop viewport |

**Steps to Reproduce**
1. Open the home page (any category).
2. Click "Next page" repeatedly, advancing through pages sequentially.
3. Continue until reaching the later pages of the result set.

**Expected Result**
Each "Next" click loads a new, distinct page of results, all the way through to the final page,
at which point the "Next" control becomes disabled.

**Actual Result**
After an initial run of working pages, one of the following failure modes is observed (the
automated test records which one occurred and on which page):
- The displayed content stops changing (stale/duplicate listing repeats).
- An explicit error state is rendered.
- The pagination control throws a client-side exception / becomes unresponsive.

**Likely Root Cause**
Possible causes include: the underlying TMDB `discover`/`list` endpoint returning fewer total
pages than the UI's pagination control assumes (off-by-one in `total_pages` handling), or the UI
not handling the API's documented page-size ceiling (TMDB's own API caps `page` at 500 for many
list endpoints), causing requests beyond that ceiling to fail silently or render stale data.

**Suggested Fix**
1. Disable/hide the "Next" control once `page >= total_pages` as reported by the API response,
   rather than allowing indefinite clicking.
2. Add explicit error handling/fallback UI for any non-200 response from the discover/list API
   so the user sees a clear message instead of a frozen or duplicated listing.

**Evidence**
Captured automatically at `reports/screenshots/defect_pagination_*-*.png` (filename indicates
which failure mode was hit and at approximately which page).

---

## Notes on Methodology

Both defects above were **explicitly flagged as known issues in the assignment brief**, and the
corresponding automated tests (TC-PAGE-006, TC-PAGE-007, TC-PAGE-008) are designed to *detect and
document* them on every run rather than hard-fail the build — since their exact trigger point can
be intermittent or environment-dependent on a static demo deployment. Each test:
1. Attempts the documented-risky action.
2. Captures a screenshot + log entry the moment a failure signature appears.
3. Reports the outcome clearly in the console/HTML report either way, so the defect's current
   reproducibility is visible to anyone reviewing a given run rather than silently passing.

No additional undocumented defects were found that warranted separate tickets during this pass;
the XSS-in-search check (TC-FILTER-010) and invalid-API-key/out-of-range-page checks
(TC-API-005/006) were run specifically to probe for *additional* issues and came back clean.
