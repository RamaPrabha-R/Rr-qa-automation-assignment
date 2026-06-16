'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../reports/logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${stack || message}${metaStr}`;
});

const logger = createLogger({
  level: config.test.logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console output – colored
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
    // Full log file
    new transports.File({
      filename: path.join(logsDir, 'test-run.log'),
      options: { flags: 'a' },
    }),
    // Error-only log file
    new transports.File({
      level: 'error',
      filename: path.join(logsDir, 'errors.log'),
      options: { flags: 'a' },
    }),
  ],
});

/**
 * Convenience wrappers so tests can call logger.step(), logger.pass(), logger.fail()
 */
logger.step = (msg, meta) => logger.info(`🔷 STEP: ${msg}`, meta);
logger.pass = (msg, meta) => logger.info(`✅ PASS: ${msg}`, meta);
logger.fail = (msg, meta) => logger.error(`❌ FAIL: ${msg}`, meta);
logger.warn2 = (msg, meta) => logger.warn(`⚠️  WARN: ${msg}`, meta);
logger.debug2 = (msg, meta) => logger.debug(`🔍 DEBUG: ${msg}`, meta);

module.exports = logger;
