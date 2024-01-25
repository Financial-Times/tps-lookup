const { Logger } = require('@dotcom-reliability-kit/logger');

const logger = new Logger({
  logLevel: process.env.SPLUNK_LOG_LEVEL || 'info',
  withTimestamps: false,
  baseLogData: { systemCode: process.env.SYSTEM_CODE },
});

module.exports = logger;