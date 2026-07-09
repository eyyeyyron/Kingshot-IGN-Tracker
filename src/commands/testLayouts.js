import 'dotenv/config';
import { getPlayers } from '../storage/storage.js';
import { notifyTestLayouts } from '../discord/notify.js';

async function main() {
  const playersByFid = await getPlayers();
  const players = Object.values(playersByFid);

  // Build a sample report from current stored data
  const playerReports = players.map((player) => ({
    fid: player.fid,
    originalIgn: player.originalIGN || player.ign || '(none)',
    currentIgn: player.ign || '(none)',
    townCenterLevel: player.townCenterLevel ?? null,
    state: player.state ?? null,
    status: 'no_change'
  }));

  // Mark the first player as "changed" and second as "lookup_failed" for variety
  if (playerReports[0]) playerReports[0].status = 'changed';
  if (playerReports[1]) playerReports[1].status = 'lookup_failed';

  console.log(
    `Sending 8 layout test embeds for ${playerReports.length} player(s)…`
  );
  await notifyTestLayouts(playerReports);
  console.log('Done.');
}

main().catch((error) => {
  console.error(`Test layouts failed: ${error.message}`);
  process.exit(1);
});
