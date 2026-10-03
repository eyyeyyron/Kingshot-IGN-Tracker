import { LOOKUP_CONFIG } from '../config/config.js';
import { logger } from '../utils/logger.js';

function toNullableNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();

    if (/^\d+$/.test(normalizedValue)) {
      const parsed = Number.parseInt(normalizedValue, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }

  return null;
}

function parseProfilePayload(payload) {
  if (!payload?.ok || !payload.player) {
    return null;
  }

  const ign = typeof payload.player.nick_name === 'string' ? payload.player.nick_name : '';
  const townCenterLevel = toNullableNumber(payload.player.town_center_level);
  const state = toNullableNumber(payload.player.kid);

  return {
    ign,
    townCenterLevel,
    state
  };
}

async function wait(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRetryDelayMs(attempt) {
  return LOOKUP_CONFIG.RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1);
}

export async function fetchCurrentIgn(fid) {
  const normalizedFid = String(fid ?? '').trim();

  if (!normalizedFid) {
    return null;
  }

  const apiKey = process.env.MIGHTPULSE_API_KEY || process.env.discordToken;

  if (!apiKey) {
    logger.error('MightPulse API key is missing. Set MIGHTPULSE_API_KEY in .env.');
    return null;
  }

  for (let attempt = 1; attempt <= LOOKUP_CONFIG.MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${LOOKUP_CONFIG.API_URL}/${encodeURIComponent(normalizedFid)}?include=base`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(LOOKUP_CONFIG.REQUEST_TIMEOUT_MS)
      });

      if (response.status === 401) {
        logger.error('MightPulse rejected the API key (401). Check MIGHTPULSE_API_KEY.');
        return null;
      }

      if (response.status === 404) {
        logger.warn(`MightPulse has no player for FID ${normalizedFid}.`);
        return null;
      }

      if (!response.ok) {
        if (response.status !== 429 && response.status < 500) {
          logger.warn(`MightPulse lookup failed for ${normalizedFid} (${response.status}).`);
          return null;
        }

        throw new Error(`MightPulse returned HTTP ${response.status}.`);
      }

      const profile = parseProfilePayload(await response.json());

      if (profile && typeof profile.ign === 'string' && profile.ign.trim()) {
        return profile;
      }

      throw new Error('MightPulse returned an empty or invalid player profile.');
    } catch (error) {
      const isLastAttempt = attempt === LOOKUP_CONFIG.MAX_ATTEMPTS;
      logger.warn(
        `MightPulse lookup attempt ${attempt}/${LOOKUP_CONFIG.MAX_ATTEMPTS} failed for ${normalizedFid}: ${error.message}`
      );

      if (!isLastAttempt) {
        await wait(getRetryDelayMs(attempt));
      }
    }
  }

  return null;
}
