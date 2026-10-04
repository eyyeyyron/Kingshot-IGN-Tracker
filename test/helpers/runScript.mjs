// Spawns a real CLI workflow script in an isolated temp cwd with a mocked network,
// then returns its exit code, output, and the resulting players.json contents.
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..', '..');
const netMockUrl = pathToFileURL(path.join(here, 'netMock.mjs')).href;

export async function runScript(relScript, args = [], options = {}) {
  const { mockConfig = {}, initialPlayers = null, env = {} } = options;

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kit-test-'));
  const dataDir = path.join(workDir, 'data');
  await fs.mkdir(dataDir, { recursive: true });

  if (initialPlayers) {
    await fs.writeFile(
      path.join(dataDir, 'players.json'),
      JSON.stringify(initialPlayers, null, 2)
    );
  }

  const scriptPath = path.join(projectRoot, relScript);

  const child = spawn(
    process.execPath,
    ['--import', netMockUrl, scriptPath, ...args],
    {
      cwd: workDir,
      env: {
        ...process.env,
        MOCK_CONFIG: JSON.stringify(mockConfig),
        MIGHTPULSE_API_KEY: 'test-key',
        ...env
      }
    }
  );

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });

  let players = null;
  try {
    players = JSON.parse(
      await fs.readFile(path.join(dataDir, 'players.json'), 'utf8')
    );
  } catch {
    players = null;
  }

  await fs.rm(workDir, { recursive: true, force: true });

  return { code, stdout, stderr, players };
}
