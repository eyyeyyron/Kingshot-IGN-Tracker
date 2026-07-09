/**
 * Simple logging utility with timestamps
 */

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

function getTimestamp() {
  return new Date().toISOString();
}

function log(level, message, data = null) {
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${level}]`;

  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  debug: (message, data) => log(LOG_LEVELS.DEBUG, message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, message, data),
  warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
  error: (message, data) => log(LOG_LEVELS.ERROR, message, data)
};
