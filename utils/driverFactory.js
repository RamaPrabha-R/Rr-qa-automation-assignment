'use strict';

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('./logger');

const screenshotsDir = path.join(__dirname, '../reports/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Build and return a configured WebDriver instance.
 * Reads browser type and headless flag from config.
 */
async function buildDriver() {
  const { type, headless, windowSize, pageLoadTimeout } = config.browser;
  let driver;

  if (type === 'firefox') {
    const opts = new firefox.Options();
    if (headless) opts.addArguments('-headless');
    driver = await new Builder().forBrowser('firefox').setFirefoxOptions(opts).build();
  } else {
    // Default: Chrome
    const opts = new chrome.Options();
    if (headless) {
      opts.addArguments('--headless=new');
    }
    opts.addArguments(
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--window-size=${windowSize.width},${windowSize.height}`,
      '--disable-extensions',
      '--disable-popup-blocking',
      '--disable-infobars',
      '--ignore-certificate-errors',
      '--allow-insecure-localhost'
    );
    driver = await new Builder().forBrowser('chrome').setChromeOptions(opts).build();
  }

  await driver.manage().setTimeouts({
    implicit: config.browser.implicitWait,
    pageLoad: pageLoadTimeout,
  });

  await driver.manage().window().setRect(windowSize);

  logger.debug2(`Driver started: ${type}, headless=${headless}`);
  return driver;
}

/**
 * Take a screenshot and save to reports/screenshots/<name>-<timestamp>.png
 * Returns the saved file path.
 */
async function takeScreenshot(driver, name = 'screenshot') {
  try {
    const image = await driver.takeScreenshot();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filepath, image, 'base64');
    logger.debug2(`Screenshot saved: ${filepath}`);
    return filepath;
  } catch (err) {
    logger.error('Failed to take screenshot', { error: err.message });
    return null;
  }
}

/**
 * Wait for an element to be visible and return it.
 */
async function waitForElement(driver, locator, timeout = 15000) {
  return driver.wait(until.elementLocated(locator), timeout);
}

/**
 * Wait for all elements matching locator and return them.
 */
async function waitForElements(driver, locator, timeout = 15000) {
  await driver.wait(until.elementLocated(locator), timeout);
  return driver.findElements(locator);
}

/**
 * Scroll element into view and click it.
 */
async function scrollAndClick(driver, element) {
  await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', element);
  await driver.sleep(200);
  await element.click();
}

/**
 * Safely get text, returning '' on stale element.
 */
async function safeGetText(element) {
  try {
    return await element.getText();
  } catch {
    return '';
  }
}

/**
 * Intercept browser network requests using CDP (Chrome only).
 * Returns an array that gets populated as requests are made.
 */
async function captureNetworkRequests(driver) {
  const requests = [];
  try {
    await driver.sendDevToolsCommand('Network.enable', {});
    await driver.sendDevToolsCommand('Network.setRequestInterception', {
      patterns: [{ urlPattern: '*' }],
    });
    // Note: full CDP event subscription requires chrome-remote-interface or
    // selenium-webdriver >= 4.x BiDi support. We collect via performance logs.
  } catch (err) {
    logger.debug2('CDP not available, falling back to performance logs');
  }
  return requests;
}

/**
 * Retrieve browser performance/network log entries (Chrome).
 */
async function getNetworkLogs(driver) {
  try {
    const logs = await driver.manage().logs().get('performance');
    return logs
      .map((entry) => {
        try { return JSON.parse(entry.message).message; } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

module.exports = {
  buildDriver,
  takeScreenshot,
  waitForElement,
  waitForElements,
  scrollAndClick,
  safeGetText,
  captureNetworkRequests,
  getNetworkLogs,
  By,
  until,
};
