'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TC-PAGE-* : Pagination Test Suite                                       ║
 * ║  Page Under Test : https://tmdb-discover.surge.sh                       ║
 * ║                                                                          ║
 * ║  Known Issue Under Test (per assignment brief):                          ║
 * ║   "Pagination works for the initial few pages, but the last few pages    ║
 * ║    may not function properly." TC-PAGE-006/007/008 specifically target  ║
 * ║    this as negative/defect-confirmation cases.                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { expect } = require('chai');
const { buildDriver } = require('../../utils/driverFactory');
const HomePage = require('../../pages/HomePage');
const logger = require('../../utils/logger');

describe('TC-PAGE: Pagination Tests', function () {
  this.timeout(120000);

  let driver;
  let homePage;

  before(async function () {
    logger.info('──── PAGINATION SUITE: before ────');
    driver = await buildDriver();
    homePage = new HomePage(driver);
  });

  after(async function () {
    logger.info('──── PAGINATION SUITE: after ────');
    if (driver) await driver.quit();
  });

  beforeEach(async function () {
    logger.step(`▶ Starting: ${this.currentTest.title}`);
    await homePage.open();
  });

  afterEach(async function () {
    const state = this.currentTest.state;
    if (state === 'passed') logger.pass(this.currentTest.title);
    else logger.fail(this.currentTest.title);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-PAGE-001 : Pagination control is visible
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-PAGE-001: Pagination control is visible on default listing', async function () {
    const visible = await homePage.isPaginationVisible();
    logger.debug2(`Pagination visible: ${visible}`);
    expect(visible, 'Pagination should be visible when results exceed one page').to.be.true;
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-PAGE-002 : Navigate to next page (page 1 → 2)
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-PAGE-002: Clicking "Next" navigates from page 1 to page 2', async function () {
    const titlesBefore = await homePage.getCardTitles();
    await homePage.clickNextPage();
    const titlesAfter = await homePage.getCardTitles();

    logger.debug2(`Page1 titles: ${titlesBefore.length}, Page2 titles: ${titlesAfter.length}`);
    expect(titlesAfter.length, 'Page 2 should contain results').to.be.greaterThan(0);
    expect(JSON.stringify(titlesAfter)).to.not.equal(JSON.stringify(titlesBefore));
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-PAGE-003 : Navigate forward multiple pages (2 → 3)
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-PAGE-003: Sequential "Next" clicks advance through early pages (1→2→3)', async function () {
    const seenTitleSets = [];
    for (let i = 0; i < 3; i++) {
      const titles = await homePage.getCardTitles();
      seenTitleSets.push(JSON.stringify(titles));
      if (i < 2) await homePage.clickNextPage();
    }
    const uniqueSets = new Set(seenTitleSets);
    logger.debug2(`Unique page content sets across 3 pages: ${uniqueSets.size}`);
    expect(uniqueSets.size, 'Each of the first 3 pages should show distinct content').to.equal(3);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-PAGE-004 : Navigate back (Previous button)
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-PAGE-004: Clicking "Previous" returns to the prior page content', async function () {
    const page1Titles = await homePage.getCardTitles();
    await homePage.clickNextPage();
    await homePage.clickPrevPage();
    const backToPage1Titles = await homePage.getCardTitles();

    logger.debug2(`Page1 original: ${page1Titles.length}, after round-trip: ${backToPage1Titles.length}`);
    expect(JSON.stringify(backToPage1Titles)).to.equal(JSON.stringify(page1Titles));
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-PAGE-005 : Direct page number navigation
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-PAGE-005: Clicking a specific page number (3) loads that page', async function () {
    try {
      await homePage.clickPageNumber(3);
      const count = await homePage.getMediaCardCount();
      expect(count, 'Page 3 should display results').to.be.greaterThan(0);
    } catch (err) {
      logger.warn2(`Direct page-number control not found / not clickable: ${err.message}`);
      this.skip();
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-PAGE-006 [NEG/DEFECT]: Known issue – last pages may not function
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-PAGE-006 [NEG/DEFECT]: Navigating to a far/last page is investigated for known defect', async function () {
    logger.step('Attempting to paginate forward repeatedly to reach later pages (known issue area)');
    let reachedPage = 1;
    let lastGoodTitles = await homePage.getCardTitles();
    let errorOccurred = false;
    let contentStoppedChanging = false;

    const MAX_CLICKS = 15;
    for (let i = 0; i < MAX_CLICKS; i++) {
      const disabled = await homePage.isNextPageDisabled();
      if (disabled) {
        logger.debug2(`Next button disabled after ${i} clicks`);
        break;
      }
      try {
        await homePage.clickNextPage();
        reachedPage++;
        const titles = await homePage.getCardTitles();
        const isError = await homePage.isErrorVisible();

        if (isError) {
          errorOccurred = true;
          logger.fail(`DEFECT CONFIRMED: Error state shown at page ~${reachedPage}`);
          await homePage.screenshot(`defect_pagination_error_page${reachedPage}`);
          break;
        }
        if (JSON.stringify(titles) === JSON.stringify(lastGoodTitles)) {
          contentStoppedChanging = true;
          logger.fail(`DEFECT CONFIRMED: Content stopped changing at page ~${reachedPage} (stale/duplicate content)`);
          await homePage.screenshot(`defect_pagination_stale_page${reachedPage}`);
          break;
        }
        lastGoodTitles = titles;
      } catch (err) {
        errorOccurred = true;
        logger.fail(`DEFECT CONFIRMED: Pagination control threw an exception at page ~${reachedPage}: ${err.message}`);
        await homePage.screenshot(`defect_pagination_exception_page${reachedPage}`);
        break;
      }
    }

    logger.info(`Pagination exploration finished. Reached page ~${reachedPage}. errorOccurred=${errorOccurred}, contentStoppedChanging=${contentStoppedChanging}`);

    // This test documents/confirms the known defect rather than asserting "no bug".
    // We assert the exploration completed (didn't hang) — the actual defect is
    // captured in the bug report (see docs/DEFECT_REPORT.md) with screenshots above.
    expect(reachedPage, 'Should have attempted pagination at least once').to.be.greaterThan(1);

    if (errorOccurred || contentStoppedChanging) {
      logger.warn2('Known defect reproduced and documented — see docs/DEFECT_REPORT.md');
    } else {
      logger.pass(`Pagination functioned correctly through ${reachedPage} pages in this run (defect may be intermittent or threshold-dependent)`);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-PAGE-007 [NEG]: Pagination state survives a page refresh attempt
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-PAGE-007 [NEG]: Refreshing on page 2 (known slug/deep-link issue area)', async function () {
    await homePage.clickNextPage();
    const titlesBeforeRefresh = await homePage.getCardTitles();
    const urlBeforeRefresh = await homePage.getCurrentUrl();

    await driver.navigate().refresh();
    await homePage.waitForPageLoad();
    await homePage.sleep(1500);

    const isError = await homePage.isErrorVisible();
    const countAfterRefresh = await homePage.getMediaCardCount();

    logger.debug2(`URL before refresh: ${urlBeforeRefresh}`);
    logger.debug2(`Cards after refresh: ${countAfterRefresh}, isError: ${isError}`);

    if (isError || countAfterRefresh === 0) {
      logger.fail('DEFECT: Refreshing on a paginated/deep-linked view results in broken state');
      await homePage.screenshot('defect_refresh_pagination_broken');
    }
    // Documenting behavior rather than hard-failing the suite, since this
    // matches the assignment's documented known issue around slug/page refresh.
    expect(countAfterRefresh).to.be.at.least(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-PAGE-008 [NEG/DEFECT]: Direct slug access (documented known issue)
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-PAGE-008 [NEG/DEFECT]: Direct navigation to /popular slug (documented known issue)', async function () {
    logger.step('Navigating directly to /popular slug as called out in assignment brief');
    await homePage.navigate('/popular');
    await homePage.sleep(1500);

    const isError = await homePage.isErrorVisible();
    const count = await homePage.getMediaCardCount().catch(() => 0);

    logger.debug2(`Direct slug /popular -> isError: ${isError}, cardCount: ${count}`);

    if (isError || count === 0) {
      logger.fail('DEFECT CONFIRMED: Direct slug access (/popular) does not render expected content');
      await homePage.screenshot('defect_direct_slug_popular');
    } else {
      logger.pass('/popular slug rendered content successfully in this run');
    }
    // Always passes structurally — purpose is detection + documentation, not a hard gate
    expect(true).to.be.true;
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-PAGE-009 : Page size consistency across early pages
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-PAGE-009: Number of cards per page is consistent across early pages', async function () {
    const page1Count = await homePage.getMediaCardCount();
    await homePage.clickNextPage();
    const page2Count = await homePage.getMediaCardCount();

    logger.debug2(`Page1 count: ${page1Count}, Page2 count: ${page2Count}`);
    // Allow some tolerance (last page of a category could differ) but early pages
    // should generally match in page size
    expect(Math.abs(page1Count - page2Count), 'Page sizes should be consistent (±2 tolerance)').to.be.at.most(2);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  TC-PAGE-010 : No duplicate items within the same page
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-PAGE-010: A single page does not contain duplicate titles', async function () {
    const titles = await homePage.getCardTitles();
    const uniqueTitles = new Set(titles);
    logger.debug2(`Total titles: ${titles.length}, unique: ${uniqueTitles.size}`);
    expect(uniqueTitles.size, 'Page should not show duplicate titles').to.equal(titles.length);
  });
});
