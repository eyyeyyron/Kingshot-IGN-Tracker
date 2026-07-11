import 'dotenv/config';
import { getPlayers, updatePlayer } from './storage/storage.js';
import {
  closeLookupClient,
  fetchCurrentIgn
} from './lookup/fetchCurrentIgn.js';
import { notifyScanSummary } from './discord/notify.js';
import { logger } from './utils/logger.js';
import { SCAN_CONFIG } from './config/config.js';

let isScanRunning = false;

function getOriginalIgn(player) {
  if (typeof player.originalIGN === 'string' && player.originalIGN.trim()) {
    return player.originalIGN.trim();
  }

  if (Array.isArray(player.history) && player.history.length > 0) {
    const oldest = player.history[player.history.length - 1]?.ign;
    if (typeof oldest === 'string' && oldest.trim()) {
      return oldest.trim();
    }
  }

  return '(none)';
}

async function scanTrackedPlayers() {
  if (isScanRunning) {
    logger.warn('Previous scan still running, skipping this tick.');
    return;
  }

  isScanRunning = true;
  const startedAt = new Date().toISOString();

  try {
    const playersByFid = await getPlayers();
    const players = Object.values(playersByFid);

    let checked = 0;
    let updated = 0;
    let failures = 0;
    const playerReports = [];

    for (const player of players) {
      if (player.status && player.status !== 'tracking') {
        continue;
      }

      checked += 1;

      const latestProfile = await fetchCurrentIgn(player.fid);
      const originalIgn = getOriginalIgn(player);

      if (!latestProfile || typeof latestProfile.ign !== 'string') {
        logger.warn(`Skipping ${player.fid}: lookup returned empty IGN.`);
        failures += 1;
        playerReports.push({
          fid: player.fid,
          originalIgn,
          currentIgn: (player.ign ?? '').trim() || '(unknown)',
          townCenterLevel: player.townCenterLevel ?? null,
          state: player.state ?? null,
          status: 'lookup_failed'
        });
        continue;
      }

      const normalizedIgn = latestProfile.ign.trim();

      if (!normalizedIgn) {
        logger.warn(`Skipping ${player.fid}: lookup returned empty IGN.`);
        failures += 1;
        playerReports.push({
          fid: player.fid,
          originalIgn,
          currentIgn: (player.ign ?? '').trim() || '(unknown)',
          townCenterLevel: player.townCenterLevel ?? null,
          state: player.state ?? null,
          status: 'lookup_failed'
        });
        continue;
      }

      const normalizedTownLevel = Number.isFinite(latestProfile.townCenterLevel)
        ? latestProfile.townCenterLevel
        : null;
      const normalizedState = Number.isFinite(latestProfile.state)
        ? latestProfile.state
        : null;

      const ignChanged = normalizedIgn !== (player.ign ?? '');
      const townLevelChanged =
        normalizedTownLevel !== (player.townCenterLevel ?? null);
      const stateChanged = normalizedState !== (player.state ?? null);

      if (!ignChanged && !townLevelChanged && !stateChanged) {
        playerReports.push({
          fid: player.fid,
          originalIgn,
          currentIgn: normalizedIgn,
          townCenterLevel: normalizedTownLevel,
          state: normalizedState,
          status: 'no_change'
        });
        continue;
      }

      await updatePlayer(player.fid, normalizedIgn, {
        townCenterLevel: normalizedTownLevel,
        state: normalizedState
      });

      updated += 1;
      playerReports.push({
        fid: player.fid,
        originalIgn,
        currentIgn: normalizedIgn,
        prevIgn: player.ign ?? null,
        townCenterLevel: normalizedTownLevel,
        prevTownCenterLevel: player.townCenterLevel ?? null,
        state: normalizedState,
        prevState: player.state ?? null,
        status: 'changed'
      });

      if (ignChanged) {
        logger.info(
          `IGN changed for ${player.fid}: "${player.ign}" -> "${normalizedIgn}"`
        );
      } else {
        logger.info(
          `Profile updated for ${player.fid}: Town Center=${normalizedTownLevel}, State=${normalizedState}`
        );
      }
    }

    logger.info(
      `Scan complete. checked=${checked}, updated=${updated}, failures=${failures}`
    );

    await notifyScanSummary({
      checked,
      updated,
      failures,
      startedAt,
      playerReports
    });
  } catch (error) {
    logger.error('Scan failed:', error.message);
  } finally {
    isScanRunning = false;
  }
}

async function validateStartup() {
  const errors = [];
  const warnings = [];

  // Check for Discord webhook
  if (!process.env.DISCORD_WEBHOOK) {
    errors.push('DISCORD_WEBHOOK environment variable is not set');
  }

  // Check for players data file
  try {
    const players = await getPlayers();
    const playerCount = Object.keys(players).length;
    logger.info(`Loaded ${playerCount} tracked player(s)`);

    if (playerCount === 0) {
      warnings.push('No players are currently tracked');
    }
  } catch (err) {
    errors.push(`Failed to load players data: ${err.message}`);
  }

  // Log validation results
  if (errors.length > 0) {
    logger.error('Startup validation failed:');
    errors.forEach((err) => logger.error(`  - ${err}`));
    return { valid: false, errors, warnings };
  }

  if (warnings.length > 0) {
    logger.warn('Startup warnings:');
    warnings.forEach((warn) => logger.warn(`  - ${warn}`));
  }

  return { valid: true, errors, warnings };
}

async function sendStartupNotification(validationResult) {
  if (!SCAN_CONFIG.SEND_STARTUP_NOTIFICATION) {
    return;
  }

  if (!validationResult.valid || validationResult.warnings.length > 0) {
    try {
      const startedAt = new Date().toISOString();
      const message = validationResult.valid
        ? `⚠️ Startup warnings detected:\n${validationResult.warnings.map((w) => `- ${w}`).join('\n')}`
        : `🔴 Startup validation failed:\n${validationResult.errors.map((e) => `- ${e}`).join('\n')}`;

      await notifyScanSummary({
        checked: 0,
        updated: 0,
        failures: 0,
        startedAt,
        playerReports: [],
        startupMessage: message,
        isStartupNotification: true
      });
    } catch (err) {
      logger.error('Failed to send startup notification:', err.message);
    }
  }
}

async function main() {
  logger.info('Kingshot tracker one-time scan job started.');

  try {
    // Run startup validation
    if (SCAN_CONFIG.STARTUP_CHECK_ENABLED) {
      logger.info('Running startup validation checks...');
      const validationResult = await validateStartup();

      if (!validationResult.valid) {
        await sendStartupNotification(validationResult);
        logger.error('Startup validation failed. Exiting.');
        process.exit(1);
      }

      if (validationResult.warnings.length > 0) {
        await sendStartupNotification(validationResult);
      }
    }

    await scanTrackedPlayers();
  } finally {
    await closeLookupClient();
  }

  logger.info('Kingshot tracker one-time scan job completed.');
}

main().catch((error) => {
  logger.error('Job startup failed:', error.message);
  process.exit(1);
});
