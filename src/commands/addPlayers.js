import 'dotenv/config';
import { addPlayer, getPlayer } from '../storage/storage.js';
import { fetchCurrentIgn } from '../lookup/fetchCurrentIgn.js';
import { logger } from '../utils/logger.js';

async function addMultiplePlayers(fidList) {
  if (!fidList || fidList.length === 0) {
    logger.error(
      'No FIDs provided. Usage: npm run add-players -- <fid1>,<fid2>,<fid3>'
    );
    process.exit(1);
  }

  const fids = fidList
    .split(',')
    .map((fid) => fid.trim())
    .filter((fid) => fid.length > 0);

  if (fids.length === 0) {
    logger.error('No valid FIDs found in input.');
    process.exit(1);
  }

  logger.info(`Adding ${fids.length} player(s)...`);

  const results = {
    added: [],
    skipped: [],
    failed: []
  };

  for (const fid of fids) {
    try {
      // Check if player already exists
      const existing = await getPlayer(fid);
      if (existing) {
        logger.warn(`Player ${fid} already tracked, skipping.`);
        results.skipped.push(fid);
        continue;
      }

      // Create new player
      const player = await addPlayer(fid);
      logger.info(`Created player entry for FID ${fid}.`);

      // Perform immediate lookup
      const profile = await fetchCurrentIgn(fid);
      if (profile) {
        const now = new Date().toISOString();
        player.ign = profile.ign;
        player.originalIGN = profile.ign;
        player.state = profile.state;
        player.townCenterLevel = profile.townCenterLevel;
        player.lastChecked = now;
        player.history = [{ updatedAt: now, ign: profile.ign }];

        await import('../storage/storage.js').then((m) => m.savePlayer(player));

        logger.info(
          `Looked up FID ${fid}: ${profile.ign} (TC: ${profile.townCenterLevel}, State: ${profile.state})`
        );
        results.added.push(fid);
      } else {
        logger.warn(`Lookup failed for FID ${fid}, created with empty values.`);
        results.added.push(fid);
      }
    } catch (err) {
      logger.error(`Failed to add FID ${fid}:`, err.message);
      results.failed.push({ fid, error: err.message });
    }
  }

  // Summary
  logger.info(`\n=== Bulk Add Summary ===`);
  logger.info(`Added: ${results.added.length}`);
  logger.info(`Skipped: ${results.skipped.length}`);
  logger.info(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    logger.error(`Failed FIDs:`, results.failed);
    process.exit(1);
  }

  process.exit(0);
}

const fidInput = process.argv[2];
addMultiplePlayers(fidInput);
