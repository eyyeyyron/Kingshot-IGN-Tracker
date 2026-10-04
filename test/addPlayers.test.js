import test from 'node:test';
import assert from 'node:assert/strict';
import { runScript } from './helpers/runScript.mjs';

const SCRIPT = 'src/commands/addPlayers.js';

test('addPlayers: adds new, skips existing, and keeps failed-lookup entries', async () => {
  const { code, stdout, players } = await runScript(
    SCRIPT,
    ['111111,222222,333333'],
    {
      initialPlayers: {
        222222: { fid: '222222', ign: 'AlreadyHere', status: 'tracking' }
      },
      mockConfig: {
        players: {
          111111: {
            ok: true,
            player: { nick_name: 'Alpha', town_center_level: 10, kid: 1 }
          }
          // 333333 omitted -> 404 -> lookup fails but entry still created
        }
      }
    }
  );

  assert.equal(code, 0);
  assert.equal(players['111111'].ign, 'Alpha');
  assert.equal(players['222222'].ign, 'AlreadyHere'); // untouched
  assert.ok(players['333333']); // created even though lookup failed
  assert.equal(players['333333'].ign, '');
  assert.match(stdout, /Added: 2/);
  assert.match(stdout, /Skipped: 1/);
  assert.match(stdout, /Failed: 0/);
});

test('addPlayers: continues past an invalid fid and exits 1 due to the failure', async () => {
  const { code, stdout, players } = await runScript(SCRIPT, ['abc,111111'], {
    mockConfig: {
      players: {
        111111: {
          ok: true,
          player: { nick_name: 'Alpha', town_center_level: 10, kid: 1 }
        }
      }
    }
  });

  assert.equal(code, 1);
  assert.ok(players['111111']); // valid fid still processed
  assert.match(stdout, /Failed: 1/);
});

test('addPlayers: trims whitespace and ignores empty segments', async () => {
  const { code, players } = await runScript(SCRIPT, [' 111111 , , 222222 '], {
    mockConfig: {
      players: {
        111111: {
          ok: true,
          player: { nick_name: 'Alpha', town_center_level: 10, kid: 1 }
        },
        222222: {
          ok: true,
          player: { nick_name: 'Beta', town_center_level: 12, kid: 2 }
        }
      }
    }
  });

  assert.equal(code, 0);
  assert.equal(players['111111'].ign, 'Alpha');
  assert.equal(players['222222'].ign, 'Beta');
  assert.equal(Object.keys(players).length, 2);
});

test('addPlayers: exits 1 when no fids are provided', async () => {
  const { code, stdout } = await runScript(SCRIPT, []);

  assert.equal(code, 1);
  assert.match(stdout, /No FIDs provided/);
});
