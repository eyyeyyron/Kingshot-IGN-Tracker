import fs from 'fs/promises';
import path from 'path';
import { STORAGE_CONFIG } from '../config/config.js';

const DATA_DIR = path.resolve(STORAGE_CONFIG.DATA_DIR);

// Ensure data directory exists on startup
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
}

// Initialize on module load
await ensureDataDir();

async function readJson(file) {
  try {
    const content = await fs.readFile(path.join(DATA_DIR, file), 'utf8');

    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {};
    }

    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${file}: ${err.message}`);
    }

    throw err;
  }
}

async function writeJson(file, data) {
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

export default {
  readJson,
  writeJson
};
