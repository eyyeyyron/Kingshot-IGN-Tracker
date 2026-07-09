import { addPlayer, savePlayer } from '../storage/storage.js';
import {
  fetchCurrentIgn,
  closeLookupClient
} from '../lookup/fetchCurrentIgn.js';

async function main() {
  const fid = String(process.argv[2] ?? '').trim();

  if (!fid) {
    console.error('Usage: npm run add-player -- <fid>');
    process.exit(1);
  }

  const player = await addPlayer(fid);

  console.log(`Added player ${player.fid}. Running initial lookup…`);

  try {
    const profile = await fetchCurrentIgn(fid);

    if (profile) {
      const now = new Date().toISOString();
      player.ign = profile.ign;
      player.originalIGN = profile.ign;
      player.state = profile.state;
      player.townCenterLevel = profile.townCenterLevel;
      player.lastChecked = now;
      // Replace the empty-string placeholder so history starts with the real IGN
      player.history = [{ updatedAt: now, ign: profile.ign }];

      await savePlayer(player);

      console.log(
        `Player ${player.fid} populated: IGN="${profile.ign}", state=${profile.state}, TC=${profile.townCenterLevel}`
      );
    } else {
      console.warn(
        `Lookup returned no data for ${player.fid}. Fields left blank.`
      );
    }
  } finally {
    await closeLookupClient();
  }
}

main().catch((error) => {
  console.error(`Add player failed: ${error.message}`);
  process.exit(1);
});
