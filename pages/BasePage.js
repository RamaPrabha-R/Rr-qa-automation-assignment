'use strict';

const { By, until } = require('selenium-webdriver');
const { takeScreenshot, waitForElement, waitForElements, scrollAndClick, safeGetText } = require('../utils/driverFactory');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * BasePage – all Page Objects extend this.
 * Provides shared helpers: navigate, waitFor, find, findAll, click, type, etc.
 */
class BasePage {
  constructor(driver) {
    this.driver = driver;
    this.baseUrl = config.baseUrl;
    this.By = By;
    this.until = until;
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async navigate(path = '/') {
    const url = `${this.baseUrl}${path}`;
    logger.step(`Navigating to ${url}`);
    await this.driver.get(url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(timeout = config.browser.pageLoadTimeout) {
    await this.driver.wait(
      () => this.driver.executeScript('return document.readyState === "complete"'),
      timeout,
      'Page did not finish loading'
    );
  }

  // ─── Element helpers ───────────────────────────────────────────────────────

  async find(cssOrLocator, timeout = 15000) {
    const locator = typeof cssOrLocator === 'string'
      ? By.css(cssOrLocator)
      : cssOrLocator;
    return waitForElement(this.driver, locator, timeout);
  }

  async findAll(cssOrLocator, timeout = 15000) {
    return waitForElements(this.driver, typeof cssOrLocator === 'string' ? By.css(cssOrLocator) : cssOrLocator, timeout);
  }

  async findOptional(css, timeout = 5000) {
    try {
      return await this.find(css, timeout);
    } catch {
      return null;
    }
  }

  async findAllOptional(css, timeout = 5000) {
    try {
      return await this.findAll(css, timeout);
    } catch {
      return [];
    }
  }

  async click(cssOrElement) {
    const el = typeof cssOrElement === 'string' ? await this.find(cssOrElement) : cssOrElement;
    await scrollAndClick(this.driver, el);
  }

  async type(css, text) {
    const el = await this.find(css);
    await el.clear();
    await el.sendKeys(text);
  }

  async getText(css) {
    const el = await this.find(css);
    return safeGetText(el);
  }

  async getAttribute(css, attr) {
    const el = await this.find(css);
    return el.getAttribute(attr);
  }

  async isVisible(css, timeout = 5000) {
    try {
      const el = await this.find(css, timeout);
      return el.isDisplayed();
    } catch {
      return false;
    }
  }

  async isPresent(css) {
    const els = await this.driver.findElements(By.css(css));
    return els.length > 0;
  }

  async waitForVisible(css, timeout = 15000) {
    const el = await this.find(css, timeout);
    await this.driver.wait(until.elementIsVisible(el), timeout);
    return el;
  }

  async waitForNotPresent(css, timeout = 15000) {
    await this.driver.wait(async () => {
      const els = await this.driver.findElements(By.css(css));
      return els.length === 0;
    }, timeout, `Element still present: ${css}`);
  }

  async sleep(ms) {
    await this.driver.sleep(ms);
  }

  async scrollToBottom() {
    await this.driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
  }

  async getTitle() {
    return this.driver.getTitle();
  }

  async getCurrentUrl() {
    return this.driver.getCurrentUrl();
  }

  async executeScript(script, ...args) {
    return this.driver.executeScript(script, ...args);
  }

  // ─── Network / Performance helpers ─────────────────────────────────────────

  /**
   * Enable performance logging and return captured entries later via getPerfEntries().
   * Call BEFORE navigating to capture all requests.
   */
  async getResourceTimings() {
    const timings = await this.driver.executeScript(
      'return JSON.stringify(window.performance.getEntriesByType("resource"))'
    );
    return JSON.parse(timings);
  }

  /**
   * Returns entries from the browser's PerformanceNavigationTiming.
   */
  async getNavigationTiming() {
    const timing = await this.driver.executeScript(
      'const [e] = performance.getEntriesByType("navigation"); return JSON.stringify(e);'
    );
    return JSON.parse(timing || '{}');
  }

  /**
   * Capture XHR / fetch calls made while the page is active.
   * Injects a tiny interceptor script before page actions.
   */
  async injectNetworkInterceptor() {
    await this.driver.executeScript(`
      window.__capturedRequests = [];
      const origFetch = window.fetch;
      window.fetch = function(url, opts) {
        window.__capturedRequests.push({ url: url.toString(), method: (opts && opts.method) || 'GET', type: 'fetch' });
        return origFetch.apply(this, arguments);
      };
      const origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        window.__capturedRequests.push({ url, method, type: 'xhr' });
        return origOpen.apply(this, arguments);
      };
    `);
  }

  async getCapturedRequests() {
    return this.driver.executeScript('return window.__capturedRequests || []');
  }

  // ─── Screenshot ────────────────────────────────────────────────────────────

  async screenshot(name) {
    return takeScreenshot(this.driver, name);
  }
}

module.exports = BasePage;
