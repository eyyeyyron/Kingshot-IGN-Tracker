/**
 * Centralized configuration for Kingshot IGN Tracker
 * All hardcoded constants are defined here for easy maintenance
 */

export const LOOKUP_CONFIG = {
  API_URL: 'https://api.mightpulse.com/v1/players',
  REQUEST_TIMEOUT_MS: 100000,
  MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 2000
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
