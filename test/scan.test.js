import test from 'node:test';
import assert from 'node:assert/strict';
import { runScript } from './helpers/runScript.mjs';

const SCRIPT = 'src/index.js';
const WEBHOOK = 'https://discord.com/api/webhooks/123/abc';

function trackingPlayers() {
  return {
    100001: {
      fid: '100001',
      ign: 'Old Name',
      originalIGN: 'Old Name',
      townCenterLevel: 20,
      state: 1,
      status: 'tracking'
    },
    100002: {
      fid: '100002',
      ign: 'Same Name',
      originalIGN: 'Same Name',
      townCenterLevel: 10,
      state: 2,
      status: 'tracking'
    },
    100003: {
      fid: '100003',
      ign: 'Unavailable',
      originalIGN: 'Unavailable',
      townCenterLevel: 5,
      state: 3,
      status: 'tracking'
    },
    100004: {
      fid: '100004',
      ign: 'Paused',
      originalIGN: 'Paused',
      townCenterLevel: 8,
      state: 4,
      status: 'paused'
    }
  };
}

test('scan: updates changed players, counts failures, and skips non-tracking', async () => {
  const { code, stdout, players } = await runScript(SCRIPT, [], {
    env: { DISCORD_WEBHOOK: WEBHOOK },
    initialPlayers: trackingPlayers(),
    mockConfig: {
      players: {
        100001: {
          ok: true,
          player: { nick_name: 'New Name', town_center_level: 21, kid: 1 }
        },
        100002: {
          ok: true,
          player: { nick_name: 'Same Name', town_center_level: 10, kid: 2 }
        }
        // 100003 omitted -> 404 -> lookup_failed; 100004 paused -> never looked up
      }
    }
  });

  assert.equal(code, 0);
  assert.match(stdout, /Scan complete\. checked=3, updated=1, failures=1/);

  assert.equal(players['100001'].ign, 'New Name');
  assert.equal(players['100001'].townCenterLevel, 21);
  assert.ok(players['100001'].lastChecked);

  assert.equal(players['100002'].ign, 'Same Name'); // no change
  assert.equal(players['100003'].ign, 'Unavailable'); // failed lookup leaves prior value
  assert.equal(players['100004'].ign, 'Paused'); // skipped entirely
});

test('scan: persists town center / state changes even when the IGN is unchanged', async () => {
  const { code, players } = await runScript(SCRIPT, [], {
    env: { DISCORD_WEBHOOK: WEBHOOK },
    initialPlayers: {
      200001: {
        fid: '200001',
        ign: 'StableName',
        originalIGN: 'StableName',
        townCenterLevel: 10,
        state: 1,
        status: 'tracking'
      }
    },
    mockConfig: {
      players: {
        200001: {
          ok: true,
          player: { nick_name: 'StableName', town_center_level: 15, kid: 7 }
        }
      }
    }
  });

  assert.equal(code, 0);
  assert.equal(players['200001'].ign, 'StableName');
  assert.equal(players['200001'].townCenterLevel, 15);
  assert.equal(players['200001'].state, 7);
});

test('scan: exits 1 during startup validation when DISCORD_WEBHOOK is missing', async () => {
  const { code, stdout } = await runScript(SCRIPT, [], {
    env: { DISCORD_WEBHOOK: '' },
    initialPlayers: trackingPlayers()
  });

  assert.equal(code, 1);
  assert.match(stdout, /Startup validation failed/);
});
