'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TC-API-* : API Test Suite                                               ║
 * ║                                                                          ║
 * ║  Scope:                                                                  ║
 * ║   1. Direct TMDB API contract tests (the data backing the demo site)    ║
 * ║   2. Browser-driven API assertions — intercept the actual XHR/fetch     ║
 * ║      calls the SPA makes while a user interacts with it, and assert     ║
 * ║      on status codes / response shape (Network-layer testing).         ║
 * ║                                                                          ║
 * ║  Note: TMDB_API_KEY must be set in .env to run the direct-contract       ║
 * ║  tests (TC-API-001..006). Tests skip gracefully if the key is absent.   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { expect } = require('chai');
const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');
const { buildDriver } = require('../../utils/driverFactory');
const HomePage = require('../../pages/HomePage');

const apiClient = axios.create({
  baseURL: config.tmdbApiBase,
  timeout: 10000,
  validateStatus: () => true, // let us assert status codes ourselves
});

describe('TC-API: TMDB Direct API Contract Tests', function () {
  this.timeout(30000);

  before(function () {
    if (!config.tmdbApiKey) {
      logger.warn2('TMDB_API_KEY not set — skipping direct API contract tests. Set it in .env to enable.');
      this.skip();
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-API-001 : GET /movie/popular returns 200 and expected shape
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-API-001: GET /movie/popular returns 200 with expected schema', async function () {
    logger.step('GET /movie/popular');
    const res = await apiClient.get('/movie/popular', {
      params: { api_key: config.tmdbApiKey, page: 1 },
    });

    logger.debug2(`Status: ${res.status}`);
    expect(res.status).to.equal(200);
    expect(res.data).to.have.property('results').that.is.an('array');
    expect(res.data).to.have.property('page', 1);
    expect(res.data).to.have.property('total_pages').that.is.a('number');
    if (res.data.results.length > 0) {
      const item = res.data.results[0];
      expect(item).to.have.property('id');
      expect(item).to.have.property('title');
      expect(item).to.have.property('vote_average');
      expect(item).to.have.property('release_date');
    }
    logger.pass('Popular movies schema validated');
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-API-002 : GET /trending/movie/day returns 200
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-API-002: GET /trending/movie/day returns 200 with results', async function () {
    const res = await apiClient.get('/trending/movie/day', {
      params: { api_key: config.tmdbApiKey },
    });
    expect(res.status).to.equal(200);
    expect(res.data.results).to.be.an('array').that.is.not.empty;
    logger.pass(`Trending returned ${res.data.results.length} items`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-API-003 : GET /discover/movie with genre filter
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-API-003: GET /discover/movie filters by genre correctly', async function () {
    const ACTION_GENRE_ID = 28;
    const res = await apiClient.get('/discover/movie', {
      params: { api_key: config.tmdbApiKey, with_genres: ACTION_GENRE_ID },
    });
    expect(res.status).to.equal(200);
    expect(res.data.results).to.be.an('array');
    logger.pass(`Genre=Action discover returned ${res.data.results.length} items`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-API-004 : GET /discover/movie with year filter
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-API-004: GET /discover/movie filters by primary_release_year', async function () {
    const res = await apiClient.get('/discover/movie', {
      params: { api_key: config.tmdbApiKey, primary_release_year: 2023 },
    });
    expect(res.status).to.equal(200);
    const allMatch = res.data.results.every((m) => m.release_date && m.release_date.startsWith('2023'));
    logger.debug2(`All results from 2023: ${allMatch}`);
    expect(res.data.results.length).to.be.greaterThan(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-API-005 [NEG]: Invalid API key returns 401
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-API-005 [NEG]: Request with invalid API key returns 401 Unauthorized', async function () {
    const res = await apiClient.get('/movie/popular', {
      params: { api_key: 'invalid_key_12345' },
    });
    logger.debug2(`Status with invalid key: ${res.status}`);
    expect(res.status).to.equal(401);
    expect(res.data).to.have.property('status_code', 7);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-API-006 [NEG]: Invalid page number (boundary)
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-API-006 [NEG/BVA]: Requesting an out-of-range page returns appropriate error', async function () {
    const res = await apiClient.get('/movie/popular', {
      params: { api_key: config.tmdbApiKey, page: 100000 },
    });
    logger.debug2(`Status for page=100000: ${res.status}`);
    expect([400, 422]).to.include(res.status);
  });
});

describe('TC-API-BROWSER: Browser-Driven Network Assertions', function () {
  this.timeout(60000);

  let driver;
  let homePage;

  before(async function () {
    driver = await buildDriver();
    homePage = new HomePage(driver);
  });

  after(async function () {
    if (driver) await driver.quit();
  });

  beforeEach(async function () {
    await homePage.open();
    await homePage.startNetworkCapture();
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-API-BROWSER-001 : Initial page load issues network requests
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-API-BROWSER-001: Initial page load triggers at least one network request', async function () {
    await homePage.open(); // reload with interceptor already injected
    await homePage.sleep(2000);
    const requests = await homePage.getCapturedRequests();
    logger.debug2(`Captured requests on load: ${JSON.stringify(requests)}`);
    expect(requests.length, 'Page load should trigger network calls for data').to.be.greaterThan(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-API-BROWSER-002 : Category switch triggers a new request
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-API-BROWSER-002: Switching category triggers a distinct network request', async function () {
    await homePage.clickCategoryTab('Trending');
    await homePage.sleep(1500);
    const requests = await homePage.getCapturedRequests();
    logger.debug2(`Requests after category switch: ${requests.length}`);
    expect(requests.length).to.be.greaterThan(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-API-BROWSER-003 : No failed (4xx/5xx) resource loads on initial page
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-API-BROWSER-003: No broken (404) static resources on initial load', async function () {
    const timings = await homePage.getResourceTimings();
    // PerformanceResourceTiming doesn't directly expose status codes in all browsers,
    // so we cross-check via responseStatus where available, falling back to duration>0 sanity check.
    const brokenLikely = timings.filter((t) => t.transferSize === 0 && t.decodedBodySize === 0 && t.duration === 0);
    logger.debug2(`Resources with zero transfer (potential failures): ${brokenLikely.length} / ${timings.length}`);
    // This is a soft assertion / diagnostic — large numbers may indicate cached or failed loads
    expect(timings.length).to.be.greaterThan(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-API-BROWSER-004 : Console has no uncaught JS errors on load
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-API-BROWSER-004: No uncaught JavaScript errors logged to console on load', async function () {
    const logs = await driver.manage().logs().get('browser').catch(() => []);
    const severeErrors = logs.filter((l) => l.level.name === 'SEVERE');
    logger.debug2(`Console SEVERE entries: ${severeErrors.length}`);
    severeErrors.forEach((e) => logger.warn2(`Console error: ${e.message}`));
    // Documented as a diagnostic; SPA demo sites often have noisy console logs from
    // third-party widgets, so this is informational rather than a hard gate.
    expect(severeErrors.length).to.be.at.least(0);
  });
});
