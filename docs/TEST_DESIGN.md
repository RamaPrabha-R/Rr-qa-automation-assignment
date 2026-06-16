# Test Design Document — TMDB Discover

**Application Under Test:** https://tmdb-discover.surge.sh/
**Author:** QA Automation Engineer
**Last Updated:** 2026-06-16

---

## 1. Testing Strategy

The application is a single-page app (SPA) that lists movies/TV shows pulled from a TMDB-backed
API, with client-side filtering, search, and pagination. The strategy is layered:

| Layer | Goal | Tooling |
|---|---|---|
| **UI / E2E** | Validate user-facing filter, search, and pagination behavior exactly as a real user would experience it | Selenium WebDriver (JavaScript) + Mocha + Chai |
| **Browser-API / Network** | Validate that user interactions trigger the correct underlying network calls, and inspect the browser's own Performance/Console APIs | Selenium `executeScript` interceptors + Chrome DevTools logging |
| **Direct API contract** | Validate the TMDB API itself, independent of the UI, to isolate UI bugs from data/API bugs | Axios + Mocha + Chai |

This three-layer approach lets us answer "is it the UI or the data?" when a test fails — a key
maintainability concern for a small SPA with several documented known issues.

Risk-based prioritization: pagination and category filters are the application's core value
proposition, so they receive the deepest coverage (including the two documented known issues).
Search and combinatorial filters are next, with boundary/negative cases layered on top.

## 2. Test Design Techniques Used

- **Equivalence Partitioning** — categories (Popular/Trending/Newest/Top Rated), types (Movie/TV),
  valid vs invalid search terms are each treated as partitions; one representative case per
  partition is automated rather than exhaustively testing every value.
- **Boundary Value Analysis (BVA)** — year filter at earliest/latest available year; rating filter
  at 0 (min) and 10 (max); pagination at page 1 (first) and the last reachable page (documented
  defect zone); API page parameter at an out-of-range value.
- **Negative Testing** — empty/nonsensical search keywords, XSS payload injection, invalid API
  key, direct slug navigation, page refresh on a deep link — all areas explicitly flagged as
  "known issues" in the assignment brief.
- **Exploratory Testing** — an unscripted exploration pass was used up front to map the real DOM
  structure, discover the filter control types (dropdown vs slider vs toggle), and locate the
  specific pagination breakpoint, which then informed the scripted defect-confirmation tests
  (TC-PAGE-006/007/008).
- **State Transition Testing** — pagination Next → Prev → Next is modeled as a state machine to
  confirm round-trips return to identical state.
- **Combinatorial / Pairwise Testing (lightweight)** — rather than testing all filter
  combinations (combinatorial explosion), 2–3 representative combined-filter scenarios are
  automated (Category+Type, Category+Year+Rating) as a pragmatic pairwise sample.

## 3. Step-by-Step Test Case Descriptions

> Full executable versions of these live in `tests/ui/filtering.test.js`,
> `tests/ui/pagination.test.js`, and `tests/api/tmdb-api.test.js`. Case IDs match 1:1.

### 3.1 Filtering Suite (`TC-FILTER-*`)

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| TC-FILTER-001 | Default load shows cards | 1. Open home page. 2. Wait for content to render. | At least one media card is visible. |
| TC-FILTER-002 | Popular tab | 1. Open home. 2. Click "Popular" tab. | Cards reload; count > 0. |
| TC-FILTER-003 | Trending tab | 1. Open home. 2. Click "Trending" tab. | Cards reload; count > 0. |
| TC-FILTER-004 | Newest tab | 1. Open home. 2. Click "Newest" tab. | Cards reload; count > 0. |
| TC-FILTER-005 | Top Rated tab | 1. Open home. 2. Click "Top Rated" tab. | Cards reload; count > 0. |
| TC-FILTER-006 | Category switch changes content | 1. Capture titles under Popular. 2. Switch to Top Rated. 3. Capture titles again. | Title lists differ; both non-empty. |
| TC-FILTER-007 | Search valid keyword | 1. Type "Batman" into search. 2. Wait for debounce/reload. | Results contain "Batman" or a no-results state is shown. |
| TC-FILTER-008 | Search partial match | 1. Type "Aveng" (partial of "Avengers"). | No crash; 0+ relevant results. |
| TC-FILTER-009 [NEG] | Search nonsense keyword | 1. Type "zzzzzzzxxx999qqq". | Empty-state UI or 0 cards — no crash. |
| TC-FILTER-010 [NEG] | XSS in search | 1. Type `<script>alert("xss")</script>` into search. | No script executes; page remains on-domain and functional. |
| TC-FILTER-011 | Type=Movies | 1. Click "Movies" type toggle. | Movie results shown, count > 0. |
| TC-FILTER-012 | Type=TV Shows | 1. Click "TV Shows" type toggle. | TV results shown, count > 0. |
| TC-FILTER-013 | Movies vs TV distinct | 1. Capture Movies titles. 2. Reload, capture TV titles. | The two lists differ. |
| TC-FILTER-014 | Year filter valid | 1. Select year 2023. | Results reload without error. |
| TC-FILTER-015 [BVA] | Year — earliest | 1. Read available years from dropdown. 2. Select the earliest. | No crash; valid result count. |
| TC-FILTER-016 [BVA] | Year — latest | 1. Select the most recent available year. | No crash; valid result count. |
| TC-FILTER-017 | Rating filter | 1. Set rating ≥ 7. | Result set updates without error. |
| TC-FILTER-018 [BVA] | Rating = 0 (min) | 1. Set rating to 0. | All results returned (count > 0). |
| TC-FILTER-019 [BVA] | Rating = 10 (max) | 1. Set rating to 10. | Few or zero results; no crash. |
| TC-FILTER-020 | Genre filter | 1. Select genre "Action". | Results update; no error. |
| TC-FILTER-021 | Combined: Category+Type | 1. Click Popular. 2. Select Movies. | Valid combined result set. |
| TC-FILTER-022 | Combined: Category+Year+Rating | 1. Top Rated. 2. Year=2022. 3. Rating≥5. | Stable result; no error banner. |
| TC-FILTER-023 | Clear search restores results | 1. Search "Inception". 2. Clear input. | Result count returns to ≥ filtered count. |
| TC-FILTER-024 | Category switch fires network calls | 1. Inject fetch/XHR interceptor. 2. Switch category. | ≥1 network request captured; Performance API shows resource entries. |
| TC-FILTER-025 | Page title sanity | 1. Read `document.title`. | Title is non-empty and meaningful. |

### 3.2 Pagination Suite (`TC-PAGE-*`)

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| TC-PAGE-001 | Pagination visible | 1. Open home. | Pagination control rendered. |
| TC-PAGE-002 | Next: page 1→2 | 1. Capture page-1 titles. 2. Click Next. 3. Capture page-2 titles. | Titles differ; page 2 non-empty. |
| TC-PAGE-003 | Sequential 1→2→3 | 1. Capture titles at each of 3 pages, clicking Next between. | All 3 sets are unique. |
| TC-PAGE-004 | Previous round-trip | 1. From page 1, click Next then Prev. | Returned page matches original page-1 content exactly. |
| TC-PAGE-005 | Direct page-number click | 1. Click page number "3" if a numbered control exists. | Page 3 content loads. (Skips gracefully if no numbered control exists.) |
| TC-PAGE-006 [NEG/DEFECT] | Known issue: deep pagination | 1. Click Next repeatedly (up to 15×) tracking content/errors each step. | Documents whether/where content freezes, errors, or throws — confirms the assignment's documented "last pages" defect. |
| TC-PAGE-007 [NEG] | Refresh mid-pagination | 1. Go to page 2. 2. Refresh the browser. | Documents whether refreshed state still renders content (known issue area). |
| TC-PAGE-008 [NEG/DEFECT] | Direct slug `/popular` | 1. Navigate directly to `/popular` via URL bar (not in-app click). | Documents whether direct slug access renders content (known issue per brief). |
| TC-PAGE-009 | Page-size consistency | 1. Compare card count on page 1 vs page 2. | Counts match within ±2 tolerance. |
| TC-PAGE-010 | No duplicate items per page | 1. Collect all titles on one page. | All titles unique. |

### 3.3 API Suite (`TC-API-*`, `TC-API-BROWSER-*`)

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| TC-API-001 | `/movie/popular` schema | 1. GET with valid key, page=1. | 200; `results[]`, `page`, `total_pages` present; item shape valid. |
| TC-API-002 | `/trending/movie/day` | 1. GET trending endpoint. | 200; non-empty results array. |
| TC-API-003 | `/discover/movie` genre filter | 1. GET with `with_genres=28` (Action). | 200; array returned. |
| TC-API-004 | `/discover/movie` year filter | 1. GET with `primary_release_year=2023`. | 200; results present. |
| TC-API-005 [NEG] | Invalid API key | 1. GET `/movie/popular` with a bad key. | 401 with TMDB's standard auth-failure status code (7). |
| TC-API-006 [NEG/BVA] | Out-of-range page | 1. GET `/movie/popular?page=100000`. | 400/422 returned (boundary rejected). |
| TC-API-BROWSER-001 | Load triggers network calls | 1. Inject interceptor before navigation. 2. Reload home. | ≥1 captured fetch/XHR call. |
| TC-API-BROWSER-002 | Category switch → new request | 1. Inject interceptor. 2. Click "Trending". | ≥1 new captured request. |
| TC-API-BROWSER-003 | No broken static resources | 1. Read `performance.getEntriesByType('resource')`. | Resource entries exist; flags zero-transfer entries for review. |
| TC-API-BROWSER-004 | No uncaught console errors | 1. Read browser console log after load. | Reports SEVERE-level entries (diagnostic, non-blocking on this demo site). |

## 4. Why These Cases Were Chosen

1. **Coverage of every filter listed in the brief** (Category, Title, Type, Year, Rating, Genre)
   plus Pagination — one happy-path case per control, matching the assignment's explicit scope.
2. **Boundary cases on numeric/range filters** (Year, Rating) because these are the most likely
   places for off-by-one or inclusive/exclusive range bugs.
3. **Negative cases targeting the two explicitly documented known issues** (page-refresh on a
   slug, and pagination breaking on later pages) — these are highest-value defects to *prove and
   document*, not just guess at.
4. **A lightweight security smoke check (XSS in search)** since any text input reflected into the
   DOM is a common real-world defect class, even in demo apps.
5. **A network/API layer** to separate "is the bug in the UI" from "is the bug in the data," and
   to satisfy the brief's explicit ask for browser API usage and assertions.
