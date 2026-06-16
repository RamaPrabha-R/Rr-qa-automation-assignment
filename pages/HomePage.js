'use strict';

const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');
const logger = require('../utils/logger');

/**
 * HomePage – represents the main TMDB Discover landing page.
 *
 * Selector strategy:
 *  Priority 1 – data-testid attributes (most stable)
 *  Priority 2 – ARIA roles / labels
 *  Priority 3 – semantic class names
 *  Priority 4 – element type + text content (via XPath)
 *
 * All selectors are defined as small arrays tried in order, making the suite
 * resilient to minor markup changes (Resilient Selector Pattern).
 */
class HomePage extends BasePage {
  constructor(driver) {
    super(driver);

    // ── Category navigation tabs ────────────────────────────────────────────
    this.SEL = {
      // Category tabs – try multiple selectors in priority order
      categoryTabs: [
        '[data-testid="category-tab"]',
        '[role="tab"]',
        '.category-tab',
        'nav a',
        '.tabs a',
        '.tab',
      ],

      // Search / title filter
      searchInput: [
        '[data-testid="search-input"]',
        'input[type="search"]',
        'input[placeholder*="Search" i]',
        'input[placeholder*="title" i]',
        'input[placeholder*="filter" i]',
        '.search-input',
        '#search',
      ],

      // Type toggle (Movies | TV Shows)
      typeButtons: [
        '[data-testid*="type"]',
        'button[value="movie"]',
        'button[value="tv"]',
        '.type-filter button',
        '[aria-label*="Movies"]',
        '[aria-label*="TV"]',
      ],
      typeSelect: ['select[name="type"]', '[data-testid="type-select"]'],

      // Year filter
      yearFilter: [
        'select[name="year"]',
        '[data-testid="year-filter"]',
        'input[placeholder*="year" i]',
        '.year-filter',
      ],

      // Rating filter
      ratingFilter: [
        'select[name="rating"]',
        '[data-testid="rating-filter"]',
        'input[type="range"]',
        '.rating-filter',
      ],

      // Genre filter
      genreFilter: [
        'select[name="genre"]',
        '[data-testid="genre-filter"]',
        '.genre-select',
        '.genre-filter',
      ],

      // Media cards
      mediaCards: [
        '[data-testid="media-card"]',
        '.card',
        '.movie-card',
        '.media-card',
        '.content-card',
        'article',
      ],

      cardTitle: ['.card-title', '.title', 'h3', 'h2', '.name'],
      cardRating: ['.rating', '.score', '[data-testid="rating"]', '.vote-average'],
      cardYear: ['.year', '.release-year', '[data-testid="year"]'],

      // Pagination
      paginationContainer: ['.pagination', '[aria-label="Pagination"]', 'nav.pages'],
      nextPageBtn: [
        '[aria-label="Next page"]',
        '.pagination-next',
        'button.next',
        'a[rel="next"]',
        '.next-page',
      ],
      prevPageBtn: [
        '[aria-label="Previous page"]',
        '.pagination-prev',
        'button.prev',
        'a[rel="prev"]',
        '.prev-page',
      ],
      pageNumbers: ['.pagination a', '.page-link', '[data-testid="page-btn"]'],
      activePage: ['.pagination .active', '.current-page', '[aria-current="page"]'],

      // States
      loadingSpinner: ['.loading', '.spinner', '[data-testid="loading"]', '[role="progressbar"]'],
      errorMessage: ['.error', '.error-message', '[data-testid="error"]', '[role="alert"]'],
      noResults: ['.no-results', '.empty-state', '[data-testid="no-results"]'],
    };
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async open() {
    await this.navigate('/');
    logger.step('HomePage opened');
  }

  // ─── Selector resolution ───────────────────────────────────────────────────

  /**
   * Try each CSS selector in the array; return the first matching element.
   * Logs which selector succeeded for debugging.
   */
  async resolveElement(selectors, timeout = 10000) {
    for (const css of selectors) {
      try {
        const el = await this.find(css, timeout);
        logger.debug2(`Resolved selector: "${css}"`);
        return el;
      } catch {
        // try next
      }
    }
    throw new Error(`None of these selectors matched: ${selectors.join(' | ')}`);
  }

  async resolveElements(selectors, timeout = 10000) {
    for (const css of selectors) {
      try {
        const els = await this.findAll(css, timeout);
        if (els.length > 0) {
          logger.debug2(`Resolved multi-selector: "${css}" → ${els.length} elements`);
          return els;
        }
      } catch {
        // try next
      }
    }
    return [];
  }

  // ─── Category tabs ─────────────────────────────────────────────────────────

  async getCategoryTabs() {
    return this.resolveElements(this.SEL.categoryTabs);
  }

  async clickCategoryTab(labelText) {
    logger.step(`Clicking category tab: "${labelText}"`);
    // Try XPath for exact text match first (most reliable for tab labels)
    const xpathSelectors = [
      `//*[@role="tab" and normalize-space()="${labelText}"]`,
      `//a[normalize-space()="${labelText}"]`,
      `//button[normalize-space()="${labelText}"]`,
      `//*[contains(@class,"tab") and normalize-space()="${labelText}"]`,
    ];

    for (const xpath of xpathSelectors) {
      try {
        const el = await this.find(By.xpath(xpath), 5000);
        await this.click(el);
        await this.waitForContentLoad();
        logger.pass(`Clicked tab: "${labelText}"`);
        return;
      } catch {
        // try next
      }
    }
    throw new Error(`Could not find category tab: "${labelText}"`);
  }

  async getActiveCategoryLabel() {
    for (const css of this.SEL.categoryTabs) {
      try {
        // Look for active/selected variant
        const active = await this.findOptional(
          `${css}.active, ${css}[aria-selected="true"], ${css}.selected, ${css}[class*="active"]`,
          3000
        );
        if (active) return active.getText();
      } catch {
        // continue
      }
    }
    return null;
  }

  // ─── Search / Title filter ─────────────────────────────────────────────────

  async searchTitle(text) {
    logger.step(`Searching for title: "${text}"`);
    const input = await this.resolveElement(this.SEL.searchInput);
    await input.clear();
    await input.sendKeys(text);
    await this.sleep(1000); // debounce
    await this.waitForContentLoad();
  }

  async clearSearch() {
    const input = await this.resolveElement(this.SEL.searchInput);
    await input.clear();
    await this.sleep(500);
  }

  async getSearchValue() {
    const input = await this.resolveElement(this.SEL.searchInput);
    return input.getAttribute('value');
  }

  // ─── Type filter ───────────────────────────────────────────────────────────

  async selectType(type) {
    logger.step(`Selecting type: "${type}"`);
    // type = 'Movies' | 'TV Shows' | 'movie' | 'tv'
    const label = type.toLowerCase().includes('tv') ? 'TV Shows' : 'Movies';
    const xpaths = [
      `//button[normalize-space()="${label}"]`,
      `//*[@role="button" and normalize-space()="${label}"]`,
      `//label[normalize-space()="${label}"]`,
    ];
    for (const xpath of xpaths) {
      try {
        const el = await this.find(By.xpath(xpath), 5000);
        await this.click(el);
        await this.waitForContentLoad();
        logger.pass(`Type selected: "${label}"`);
        return;
      } catch {
        // next
      }
    }
    // Fallback: select element
    try {
      const sel = await this.resolveElement(this.SEL.typeSelect, 5000);
      const value = type.toLowerCase().includes('tv') ? 'tv' : 'movie';
      await sel.findElement(By.css(`option[value="${value}"]`)).click();
      await this.waitForContentLoad();
    } catch {
      throw new Error(`Could not find type filter for: "${type}"`);
    }
  }

  // ─── Year filter ───────────────────────────────────────────────────────────

  async selectYear(year) {
    logger.step(`Selecting year: "${year}"`);
    const el = await this.resolveElement(this.SEL.yearFilter);
    const tagName = await el.getTagName();
    if (tagName === 'select') {
      await el.findElement(By.xpath(`./option[text()="${year}"]`)).click();
    } else {
      await el.clear();
      await el.sendKeys(String(year));
    }
    await this.waitForContentLoad();
  }

  async getAvailableYears() {
    const sel = await this.resolveElement(this.SEL.yearFilter);
    const options = await sel.findElements(By.css('option'));
    const years = [];
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val) years.push(val);
    }
    return years;
  }

  // ─── Rating filter ─────────────────────────────────────────────────────────

  async setRating(value) {
    logger.step(`Setting rating filter to: ${value}`);
    const el = await this.resolveElement(this.SEL.ratingFilter);
    const tagName = await el.getTagName();
    if (tagName === 'input') {
      // Range slider – set via JS for reliability
      await this.executeScript(
        `arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('input')); arguments[0].dispatchEvent(new Event('change'));`,
        el, String(value)
      );
    } else {
      await el.findElement(By.xpath(`./option[text()="${value}"]`)).click();
    }
    await this.waitForContentLoad();
  }

  // ─── Genre filter ──────────────────────────────────────────────────────────

  async selectGenre(genre) {
    logger.step(`Selecting genre: "${genre}"`);
    const el = await this.resolveElement(this.SEL.genreFilter);
    const tagName = await el.getTagName();
    if (tagName === 'select') {
      await el.findElement(By.xpath(`./option[normalize-space()="${genre}"]`)).click();
    } else {
      await this.click(el);
      const optXpath = `//*[contains(@class,"option") and normalize-space()="${genre}"]`;
      const opt = await this.find(By.xpath(optXpath), 5000);
      await this.click(opt);
    }
    await this.waitForContentLoad();
  }

  // ─── Media cards ───────────────────────────────────────────────────────────

  async getMediaCards() {
    await this.waitForContentLoad();
    return this.resolveElements(this.SEL.mediaCards);
  }

  async getMediaCardCount() {
    const cards = await this.getMediaCards();
    return cards.length;
  }

  async getCardTitles() {
    const cards = await this.getMediaCards();
    const titles = [];
    for (const card of cards) {
      for (const css of this.SEL.cardTitle) {
        try {
          const el = await card.findElement(By.css(css));
          const text = await el.getText();
          if (text) { titles.push(text); break; }
        } catch { /* next */ }
      }
    }
    return titles;
  }

  async getCardRatings() {
    const cards = await this.getMediaCards();
    const ratings = [];
    for (const card of cards) {
      for (const css of this.SEL.cardRating) {
        try {
          const el = await card.findElement(By.css(css));
          const text = await el.getText();
          if (text) { ratings.push(parseFloat(text)); break; }
        } catch { /* next */ }
      }
    }
    return ratings;
  }

  // ─── Pagination ────────────────────────────────────────────────────────────

  async isPaginationVisible() {
    for (const css of this.SEL.paginationContainer) {
      if (await this.isVisible(css)) return true;
    }
    return false;
  }

  async clickNextPage() {
    logger.step('Clicking Next Page');
    const btn = await this.resolveElement(this.SEL.nextPageBtn);
    await this.click(btn);
    await this.waitForContentLoad();
  }

  async clickPrevPage() {
    logger.step('Clicking Previous Page');
    const btn = await this.resolveElement(this.SEL.prevPageBtn);
    await this.click(btn);
    await this.waitForContentLoad();
  }

  async clickPageNumber(num) {
    logger.step(`Clicking page number: ${num}`);
    const xpath = `//*[contains(@class,"page") and normalize-space()="${num}"]`;
    const el = await this.find(By.xpath(xpath), 5000);
    await this.click(el);
    await this.waitForContentLoad();
  }

  async getCurrentPage() {
    for (const css of this.SEL.activePage) {
      const el = await this.findOptional(css, 3000);
      if (el) {
        const text = await el.getText();
        return parseInt(text, 10) || null;
      }
    }
    return null;
  }

  async isNextPageDisabled() {
    for (const css of this.SEL.nextPageBtn) {
      const el = await this.findOptional(css, 3000);
      if (el) {
        const disabled = await el.getAttribute('disabled');
        const cls = await el.getAttribute('class') || '';
        return disabled === 'true' || cls.includes('disabled');
      }
    }
    return false;
  }

  // ─── State helpers ─────────────────────────────────────────────────────────

  async waitForContentLoad(timeout = 15000) {
    // Wait for spinner to disappear (if present)
    for (const css of this.SEL.loadingSpinner) {
      try {
        const spinner = await this.findOptional(css, 1000);
        if (spinner && await spinner.isDisplayed()) {
          await this.waitForNotPresent(css, timeout);
        }
      } catch { /* not present */ }
    }
    await this.sleep(500); // allow DOM to settle
  }

  async isNoResultsVisible() {
    for (const css of this.SEL.noResults) {
      if (await this.isVisible(css, 3000)) return true;
    }
    return false;
  }

  async isErrorVisible() {
    for (const css of this.SEL.errorMessage) {
      if (await this.isVisible(css, 3000)) return true;
    }
    return false;
  }

  // ─── Network interception ──────────────────────────────────────────────────

  async startNetworkCapture() {
    await this.injectNetworkInterceptor();
    logger.debug2('Network interceptor injected');
  }

  async getApiRequests() {
    const all = await this.getCapturedRequests();
    return all.filter((r) => r.url.includes('api.themoviedb.org') || r.url.includes('/api/'));
  }
}

module.exports = HomePage;
