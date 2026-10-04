import test from 'node:test';
import assert from 'node:assert/strict';
import { runScript } from './helpers/runScript.mjs';

const SCRIPT = 'src/commands/addPlayer.js';

test('addPlayer: populates profile and seeds history on successful lookup', async () => {
  const { code, stdout, players } = await runScript(SCRIPT, ['123456'], {
    mockConfig: {
      players: {
        123456: {
          ok: true,
          player: { nick_name: 'HeroOne', town_center_level: 25, kid: 42 }
        }
      }
    }
  });

  assert.equal(code, 0);
  assert.match(stdout, /populated/);
  const player = players['123456'];
  assert.equal(player.ign, 'HeroOne');
  assert.equal(player.originalIGN, 'HeroOne');
  assert.equal(player.townCenterLevel, 25);
  assert.equal(player.state, 42);
  assert.equal(player.history[0].ign, 'HeroOne');
});

test('addPlayer: creates entry but leaves fields blank when lookup returns no data', async () => {
  const { code, stderr, players } = await runScript(SCRIPT, ['123456'], {
    mockConfig: { players: {} } // unknown fid -> 404 -> null profile
  });

  assert.equal(code, 0);
  assert.match(stderr, /left blank/);
  assert.equal(players['123456'].ign, '');
});

test('addPlayer: exits 1 with usage when no fid is provided', async () => {
  const { code, stderr, players } = await runScript(SCRIPT, []);

  assert.equal(code, 1);
  assert.match(stderr, /Usage:/);
  assert.equal(players, null);
});

test('addPlayer: exits 1 for a non-numeric fid', async () => {
  const { code, stderr } = await runScript(SCRIPT, ['abc']);

  assert.equal(code, 1);
  assert.match(stderr, /Add player failed/);
});

test('addPlayer: exits 1 when the player already exists', async () => {
  const { code, stderr } = await runScript(SCRIPT, ['123456'], {
    initialPlayers: {
      123456: { fid: '123456', ign: 'Existing', status: 'tracking' }
    },
    mockConfig: {
      players: {
        123456: {
          ok: true,
          player: { nick_name: 'HeroOne', town_center_level: 25, kid: 42 }
        }
      }
    }
  });

  assert.equal(code, 1);
  assert.match(stderr, /already exists/);
});
