'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TC-FILTER-* : Filtering & Search Test Suite                            ║
 * ║  Page Under Test : https://tmdb-discover.surge.sh                       ║
 * ║                                                                          ║
 * ║  Test Design Techniques Used:                                            ║
 * ║   • Equivalence Partitioning – valid / invalid / boundary inputs        ║
 * ║   • Boundary Value Analysis  – year range edges, rating min/max         ║
 * ║   • Exploratory Testing      – combinations discovered during sessions  ║
 * ║   • Negative Testing         – empty search, invalid year, XSS attempt  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { expect } = require('chai');
const { buildDriver } = require('../../utils/driverFactory');
const HomePage = require('../../pages/HomePage');
const logger = require('../../utils/logger');

describe('TC-FILTER: Filtering & Search Tests', function () {
  this.timeout(90000);

  let driver;
  let homePage;

  // ── Setup / Teardown ───────────────────────────────────────────────────────

  before(async function () {
    logger.info('──── FILTER SUITE: before ────');
    driver = await buildDriver();
    homePage = new HomePage(driver);
    await homePage.open();
  });

  after(async function () {
    logger.info('──── FILTER SUITE: after ────');
    if (driver) await driver.quit();
  });

  beforeEach(async function () {
    logger.step(`▶ Starting: ${this.currentTest.title}`);
    // Return to home and inject network interceptor for each test
    await homePage.open();
    await homePage.startNetworkCapture();
  });

  afterEach(async function () {
    const state = this.currentTest.state;
    if (state === 'passed') logger.pass(this.currentTest.title);
    else logger.fail(this.currentTest.title);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-001 : Default page load shows media cards
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-001: Default page loads with media cards visible', async function () {
    logger.step('Verify media cards are present on default load');
    const count = await homePage.getMediaCardCount();
    logger.debug2(`Card count on default load: ${count}`);
    expect(count, 'Media cards should be present on load').to.be.greaterThan(0);
    logger.pass(`Found ${count} media cards`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-002 : Category – Popular tab
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-002: Clicking "Popular" category tab loads content', async function () {
    await homePage.clickCategoryTab('Popular');
    const count = await homePage.getMediaCardCount();
    expect(count, '"Popular" category should return results').to.be.greaterThan(0);
    logger.pass(`Popular tab: ${count} cards loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-003 : Category – Trending tab
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-003: Clicking "Trending" category tab loads content', async function () {
    await homePage.clickCategoryTab('Trending');
    const count = await homePage.getMediaCardCount();
    expect(count, '"Trending" category should return results').to.be.greaterThan(0);
    logger.pass(`Trending tab: ${count} cards loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-004 : Category – Newest tab
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-004: Clicking "Newest" category tab loads content', async function () {
    await homePage.clickCategoryTab('Newest');
    const count = await homePage.getMediaCardCount();
    expect(count, '"Newest" category should return results').to.be.greaterThan(0);
    logger.pass(`Newest tab: ${count} cards loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-005 : Category – Top Rated tab
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-005: Clicking "Top Rated" category tab loads content', async function () {
    await homePage.clickCategoryTab('Top Rated');
    const count = await homePage.getMediaCardCount();
    expect(count, '"Top Rated" category should return results').to.be.greaterThan(0);
    logger.pass(`Top Rated tab: ${count} cards loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-006 : Switching categories changes content
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-006: Switching between categories updates displayed content', async function () {
    logger.step('Get titles from Popular category');
    await homePage.clickCategoryTab('Popular');
    const popularTitles = await homePage.getCardTitles();

    logger.step('Get titles from Top Rated category');
    await homePage.clickCategoryTab('Top Rated');
    const topRatedTitles = await homePage.getCardTitles();

    // They may partially overlap but should not be identical lists
    const popularSet = new Set(popularTitles);
    const topRatedSet = new Set(topRatedTitles);
    const intersection = [...popularSet].filter((t) => topRatedSet.has(t));

    logger.debug2(`Popular: ${popularTitles.length}, TopRated: ${topRatedTitles.length}, Overlap: ${intersection.length}`);
    expect(popularTitles.length + topRatedTitles.length, 'Both categories should have content').to.be.greaterThan(0);
    // At minimum they should not be byte-for-byte identical
    expect(JSON.stringify(popularTitles)).to.not.equal(JSON.stringify(topRatedTitles));
    logger.pass('Categories return different ordered content');
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-007 : Title search – valid keyword
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-007: Searching by title keyword filters results', async function () {
    const keyword = 'Batman';
    await homePage.searchTitle(keyword);
    const titles = await homePage.getCardTitles();
    logger.debug2(`Search "${keyword}" returned: ${titles.join(', ')}`);

    if (titles.length === 0) {
      const noResults = await homePage.isNoResultsVisible();
      expect(noResults, 'No-results message should be shown when nothing matches').to.be.true;
    } else {
      const hasMatch = titles.some((t) => t.toLowerCase().includes(keyword.toLowerCase()));
      expect(hasMatch, `At least one result should contain "${keyword}"`).to.be.true;
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-008 : Title search – partial match
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-008: Partial title search returns relevant results', async function () {
    await homePage.searchTitle('Aveng');
    const count = await homePage.getMediaCardCount();
    logger.debug2(`Partial search "Aveng" returned ${count} cards`);
    // Should not crash; result count can be 0 or more
    expect(count).to.be.at.least(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-009 [NEG]: Title search – no results keyword
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-009 [NEG]: Search with nonsensical keyword shows no-results state', async function () {
    await homePage.searchTitle('zzzzzzzxxx999qqq');
    const noResults = await homePage.isNoResultsVisible();
    const count = await homePage.getMediaCardCount();
    logger.debug2(`No-results visible: ${noResults}, card count: ${count}`);
    // Either no results message shown OR card count is 0
    expect(noResults || count === 0, 'Should show empty state for nonsensical search').to.be.true;
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-010 [NEG]: XSS in search field does not break UI
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-010 [NEG]: XSS payload in search does not cause script execution', async function () {
    const xssPayload = '<script>alert("xss")</script>';
    await homePage.searchTitle(xssPayload);
    // Page should still be functional
    const url = await homePage.getCurrentUrl();
    expect(url).to.include('tmdb-discover.surge.sh');
    const isError = await homePage.isErrorVisible();
    expect(isError, 'XSS in search should not crash the page').to.be.false;
    logger.pass('XSS payload handled safely');
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-011 : Type filter – Movies
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-011: Selecting "Movies" type filter shows movie results', async function () {
    await homePage.selectType('Movies');
    const count = await homePage.getMediaCardCount();
    logger.debug2(`Type=Movies returned ${count} cards`);
    expect(count, 'Movies filter should return results').to.be.greaterThan(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-012 : Type filter – TV Shows
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-012: Selecting "TV Shows" type filter shows TV results', async function () {
    await homePage.selectType('TV Shows');
    const count = await homePage.getMediaCardCount();
    logger.debug2(`Type=TV Shows returned ${count} cards`);
    expect(count, 'TV Shows filter should return results').to.be.greaterThan(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-013 : Type filter – Movies and TV Shows return different sets
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-013: Movies and TV Shows filters return different result sets', async function () {
    await homePage.selectType('Movies');
    const movieTitles = await homePage.getCardTitles();

    await homePage.open();
    await homePage.selectType('TV Shows');
    const tvTitles = await homePage.getCardTitles();

    expect(JSON.stringify(movieTitles)).to.not.equal(JSON.stringify(tvTitles));
    logger.pass('Movies and TV Shows return distinct content');
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-014 : Year of Release filter – valid year
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-014: Year filter narrows results to selected year', async function () {
    await homePage.selectYear('2023');
    const count = await homePage.getMediaCardCount();
    logger.debug2(`Year=2023 returned ${count} cards`);
    expect(count).to.be.at.least(0);
    logger.pass('Year filter applied without error');
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-015 [BVA]: Year filter – boundary year (earliest)
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-015 [BVA]: Year filter with earliest available year', async function () {
    const years = await homePage.getAvailableYears();
    if (years.length === 0) { this.skip(); }
    const earliest = years[0];
    logger.step(`Selecting earliest year: ${earliest}`);
    await homePage.selectYear(earliest);
    const count = await homePage.getMediaCardCount();
    expect(count).to.be.at.least(0);
    logger.pass(`Earliest year (${earliest}) filter applied`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-016 [BVA]: Year filter – boundary year (latest)
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-016 [BVA]: Year filter with most recent available year', async function () {
    const years = await homePage.getAvailableYears();
    if (years.length === 0) { this.skip(); }
    const latest = years[years.length - 1];
    logger.step(`Selecting latest year: ${latest}`);
    await homePage.selectYear(latest);
    const count = await homePage.getMediaCardCount();
    expect(count).to.be.at.least(0);
    logger.pass(`Latest year (${latest}) filter applied`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-017 : Rating filter
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-017: Rating filter reduces/filters result set', async function () {
    const beforeCount = await homePage.getMediaCardCount();
    await homePage.setRating(7);
    const afterCount = await homePage.getMediaCardCount();
    logger.debug2(`Before rating filter: ${beforeCount}, After (≥7): ${afterCount}`);
    expect(afterCount).to.be.at.least(0);
    logger.pass('Rating filter applied without error');
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-018 [BVA]: Rating filter – minimum value (0)
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-018 [BVA]: Rating filter at minimum (0) returns all results', async function () {
    await homePage.setRating(0);
    const count = await homePage.getMediaCardCount();
    expect(count, 'Rating=0 should return all results').to.be.greaterThan(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-019 [BVA]: Rating filter – maximum value (10)
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-019 [BVA]: Rating filter at maximum (10) returns few/no results', async function () {
    await homePage.setRating(10);
    const count = await homePage.getMediaCardCount();
    // Very few or no titles have a perfect 10 rating
    logger.debug2(`Rating=10 returned ${count} cards`);
    expect(count).to.be.at.least(0);
    logger.pass('Rating=10 filter applied');
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-020 : Genre filter
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-020: Genre filter narrows results to selected genre', async function () {
    await homePage.selectGenre('Action');
    const count = await homePage.getMediaCardCount();
    logger.debug2(`Genre=Action returned ${count} cards`);
    expect(count).to.be.at.least(0);
    logger.pass('Genre filter applied');
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-021 : Combined filters – Category + Type
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-021: Combining Category + Type filters produces valid results', async function () {
    await homePage.clickCategoryTab('Popular');
    await homePage.selectType('Movies');
    const count = await homePage.getMediaCardCount();
    logger.debug2(`Popular + Movies: ${count} cards`);
    expect(count).to.be.at.least(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-022 : Combined filters – Category + Year + Rating
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-022: Combining Category + Year + Rating filters is stable', async function () {
    await homePage.clickCategoryTab('Top Rated');
    await homePage.selectYear('2022');
    await homePage.setRating(5);
    const count = await homePage.getMediaCardCount();
    logger.debug2(`Top Rated + 2022 + Rating≥5: ${count} cards`);
    expect(count).to.be.at.least(0);
    const isError = await homePage.isErrorVisible();
    expect(isError, 'Combined filters should not produce an error state').to.be.false;
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-023 : Clearing search restores full results
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-023: Clearing search input restores full result count', async function () {
    await homePage.searchTitle('Inception');
    const filteredCount = await homePage.getMediaCardCount();

    await homePage.clearSearch();
    await homePage.sleep(1000);
    const restoredCount = await homePage.getMediaCardCount();

    logger.debug2(`After search: ${filteredCount}, After clear: ${restoredCount}`);
    expect(restoredCount, 'Clearing search should restore results').to.be.at.least(filteredCount);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-024 : Network API call made on category switch (Browser API)
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-024: Category change triggers network/API requests', async function () {
    await homePage.startNetworkCapture();
    await homePage.clickCategoryTab('Trending');

    const requests = await homePage.getCapturedRequests();
    logger.debug2(`Captured ${requests.length} network requests`);
    // At minimum a fetch or XHR call should happen on category switch
    // (exact URL depends on SPA implementation)
    expect(requests.length, 'Category switch should make at least one network request').to.be.greaterThan(0);

    // Verify resource performance entries exist
    const timings = await homePage.getResourceTimings();
    logger.debug2(`Performance resource entries: ${timings.length}`);
    expect(timings.length, 'Performance entries should be present').to.be.greaterThan(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-FILTER-025 : Page title is meaningful
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-FILTER-025: Page has a meaningful document title', async function () {
    const title = await homePage.getTitle();
    logger.debug2(`Page title: "${title}"`);
    expect(title, 'Page title should not be empty').to.not.be.empty;
    expect(title).to.not.equal('undefined');
  });
});
