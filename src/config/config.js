/**
 * Centralized configuration for Kingshot IGN Tracker
 * All hardcoded constants are defined here for easy maintenance
 */

export const LOOKUP_CONFIG = {
  URL: 'https://ks-giftcode.centurygame.com/',
  REQUEST_TIMEOUT_MS: 15000,
  MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 500
};

export const BROWSER_CONFIG = {
  CANDIDATES: [
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/microsoft-edge',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ]
};

export const VALIDATION_CONFIG = {
  MIN_FID_LENGTH: 6,
  FID_PATTERN: /^\d+$/
};

export const SCAN_CONFIG = {
  STARTUP_CHECK_ENABLED: true,
  SEND_STARTUP_NOTIFICATION: true
};

export const STORAGE_CONFIG = {
  PLAYERS_FILE: 'players.json',
  DATA_DIR: 'data'
};

export const DISCORD_CONFIG = {
  EMBED_FIELD_CHAR_LIMIT: 1024,
  EMBED_DESCRIPTION_CHAR_LIMIT: 4096
};
