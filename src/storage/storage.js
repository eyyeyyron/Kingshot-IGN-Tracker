import jsonStorage from './jsonStorage.js';
import { STORAGE_CONFIG, VALIDATION_CONFIG } from '../config/config.js';
import { logger } from '../utils/logger.js';

const PLAYERS_FILE = STORAGE_CONFIG.PLAYERS_FILE;

export function validateFid(fid) {
  if (typeof fid !== 'string') {
    throw new Error('FID must be a string.');
  }

  if (!VALIDATION_CONFIG.FID_PATTERN.test(fid)) {
    throw new Error('FID must contain only digits.');
  }

  if (fid.length < VALIDATION_CONFIG.MIN_FID_LENGTH) {
    throw new Error('Invalid FID.');
  }
}

export async function getPlayers() {
  return await jsonStorage.readJson(PLAYERS_FILE);
}

export async function getPlayer(fid) {
  validateFid(fid);

  const players = await getPlayers();
  return players[fid] ?? null;
}

export async function savePlayer(player) {
  validateFid(player.fid);

  const players = await getPlayers();
  const existingPlayer = players[player.fid] ?? null;
  const latestIgn = player.ign ?? '';
  const now = new Date().toISOString();

  let history = [];

  if (Array.isArray(player.history) && player.history.length) {
    history = [...player.history];
  } else if (Array.isArray(existingPlayer?.history)) {
    history = [...existingPlayer.history];
  } else if (existingPlayer) {
    const existingIgn = existingPlayer.ign ?? '';
    const existingUpdatedAt =
      existingPlayer.updatedAt ?? existingPlayer.createdAt ?? now;
    history = [{ updatedAt: existingUpdatedAt, ign: existingIgn }];
  }

  history = history
    .filter((entry) => entry && typeof entry.ign === 'string')
    .map((entry) => ({
      updatedAt: entry.updatedAt ?? now,
      ign: entry.ign
    }));

  if (!history.length || history[0]?.ign !== latestIgn) {
    history.unshift({ updatedAt: now, ign: latestIgn });
  }

  if (!Object.hasOwn(player, 'townCenterLevel')) {
    player.townCenterLevel = existingPlayer?.townCenterLevel ?? null;
  }

  if (!Object.hasOwn(player, 'state')) {
    player.state = existingPlayer?.state ?? null;
  }

  player.updatedAt = now;
  player.history = history;

  players[player.fid] = player;

  await jsonStorage.writeJson(PLAYERS_FILE, players);

  return player;
}

export async function addPlayer(fid) {
  validateFid(fid);

  const players = await getPlayers();

  if (players[fid]) {
    throw new Error(`Player ${fid} already exists.`);
  }

  const now = new Date().toISOString();

  const player = {
    fid,
    ign: '',
    originalIGN: '',
    status: 'tracking',
    lastChecked: null,
    townCenterLevel: null,
    state: null,
    createdAt: now,
    updatedAt: now,
    history: [{ updatedAt: now, ign: '' }]
  };

  players[fid] = player;

  await jsonStorage.writeJson(PLAYERS_FILE, players);

  return player;
}

export async function deletePlayer(fid) {
  validateFid(fid);

  const players = await getPlayers();

  delete players[fid];

  await jsonStorage.writeJson(PLAYERS_FILE, players);
}

export async function updatePlayer(fid, latestIGN, profile = {}) {
  validateFid(fid);

  const player = await getPlayer(fid);

  if (!player) {
    throw new Error(`Player ${fid} was not found.`);
  }

  player.ign = latestIGN;

  if (Object.hasOwn(profile, 'townCenterLevel')) {
    player.townCenterLevel = profile.townCenterLevel;
  }

  if (Object.hasOwn(profile, 'state')) {
    player.state = profile.state;
  }

  player.lastChecked = new Date().toISOString();

  return await savePlayer(player);
}
