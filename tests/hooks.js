'use strict';

/**
 * Mocha root hooks & global setup.
 * Applied to ALL test files via --require.
 */
const logger = require('../utils/logger');
const { buildDriver, takeScreenshot } = require('../utils/driverFactory');
const path = require('path');
const fs = require('fs');

// Ensure output directories exist
['reports/screenshots', 'reports/logs', 'reports/junit'].forEach((dir) => {
  const full = path.join(__dirname, '..', dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// ─── Shared driver instance ──────────────────────────────────────────────────
let sharedDriver = null;

exports.mochaHooks = {
  async beforeAll() {
    logger.info('═══════════════════════════════════════════════');
    logger.info('  RR QA Automation Suite – Test Run Starting  ');
    logger.info('═══════════════════════════════════════════════');
    sharedDriver = await buildDriver();
    // Make driver available on the suite (mocha context)
    this.driver = sharedDriver;
  },

  async afterAll() {
    if (sharedDriver) {
      await sharedDriver.quit();
      logger.info('Driver closed. Test run complete.');
    }
  },

  async afterEach() {
    const ctx = this.currentTest;
    if (ctx && ctx.state === 'failed' && sharedDriver) {
      const safeTitle = ctx.fullTitle().replace(/[^a-z0-9]/gi, '_').substring(0, 80);
      const filepath = await takeScreenshot(sharedDriver, `FAIL_${safeTitle}`);
      if (filepath) {
        logger.fail(`Screenshot on failure: ${filepath}`);
        // Attach to mochawesome if available
        if (typeof addContext !== 'undefined') {
          addContext(this, { title: 'Failure Screenshot', value: filepath });
        }
      }
    }
  },
};
