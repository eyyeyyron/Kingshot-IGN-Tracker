import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { LOOKUP_CONFIG, BROWSER_CONFIG } from '../config/config.js';
import { logger } from '../utils/logger.js';

let browser;
let context;
let page;

function getBrowserCandidates() {
  return [process.env.LOOKUP_BROWSER_PATH, ...BROWSER_CONFIG.CANDIDATES].filter(
    Boolean
  );
}

function resolveBrowserExecutablePath() {
  for (const candidate of getBrowserCandidates()) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'No compatible browser executable found. Set LOOKUP_BROWSER_PATH in .env.'
  );
}

async function getLookupPage() {
  if (page && !page.isClosed()) {
    return page;
  }

  if (!browser) {
    browser = await chromium.launch({
      executablePath: resolveBrowserExecutablePath(),
      headless: true
    });
  }

  if (!context) {
    context = await browser.newContext();
  }

  page = await context.newPage();
  await page.goto(LOOKUP_CONFIG.URL, { waitUntil: 'domcontentloaded' });

  return page;
}

async function resetLookupSession() {
  if (page && !page.isClosed()) {
    await page.close();
  }

  page = undefined;

  if (context) {
    await context.close();
    context = undefined;
  }
}

export async function closeLookupClient() {
  await resetLookupSession();

  if (browser) {
    await browser.close();
    browser = undefined;
  }
}

function toNullableNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const match = value.match(/\d+/);

    if (match) {
      const parsed = Number.parseInt(match[0], 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }

  return null;
}

function parseProfilePayload(payload) {
  if (!payload || payload.code !== 0 || !payload.data) {
    return null;
  }

  const ign =
    typeof payload.data.nickname === 'string' ? payload.data.nickname : '';
  const townCenterLevel =
    toNullableNumber(payload.data.stove_lv) ??
    toNullableNumber(payload.data.stove_lv_content);
  const state = toNullableNumber(payload.data.kid);

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

async function clickLogin(lookupPage, input) {
  const exactLoginText = lookupPage.getByText('Login', { exact: true });

  if ((await exactLoginText.count()) > 0) {
    await exactLoginText.first().click();
    return;
  }

  const loginButton = lookupPage.getByRole('button', { name: /login/i });

  if ((await loginButton.count()) > 0) {
    await loginButton.first().click();
    return;
  }

  const firstButton = lookupPage.locator('button').first();

  if ((await firstButton.count()) > 0) {
    await firstButton.click();
    return;
  }

  await input.press('Enter');
}

async function triggerLookupRequest(lookupPage, fid) {
  const retreatButton = lookupPage.getByText('Retreat', { exact: true });

  if ((await retreatButton.count()) > 0) {
    await retreatButton.first().click();
  }

  const responsePromise = lookupPage.waitForResponse(
    (response) =>
      response.url().includes('/api/player') &&
      response.request().method() === 'POST',
    { timeout: LOOKUP_CONFIG.REQUEST_TIMEOUT_MS }
  );

  const input = lookupPage.getByRole('textbox').first();
  await input.waitFor({
    state: 'visible',
    timeout: LOOKUP_CONFIG.REQUEST_TIMEOUT_MS
  });
  await input.fill(String(fid));
  await clickLogin(lookupPage, input);

  const response = await responsePromise;
  return response.json();
}

export async function fetchCurrentIgn(fid) {
  const normalizedFid = String(fid ?? '').trim();

  if (!normalizedFid) {
    return null;
  }

  for (let attempt = 1; attempt <= LOOKUP_CONFIG.MAX_ATTEMPTS; attempt += 1) {
    try {
      const lookupPage = await getLookupPage();
      await lookupPage.goto(LOOKUP_CONFIG.URL, {
        waitUntil: 'domcontentloaded'
      });

      const payload = await triggerLookupRequest(lookupPage, normalizedFid);
      const profile = parseProfilePayload(payload);

      if (profile && typeof profile.ign === 'string' && profile.ign.trim()) {
        return profile;
      }

      throw new Error('Lookup returned an empty or invalid profile payload.');
    } catch (error) {
      const isLastAttempt = attempt === LOOKUP_CONFIG.MAX_ATTEMPTS;
      logger.warn(
        `Lookup attempt ${attempt}/${LOOKUP_CONFIG.MAX_ATTEMPTS} failed for ${normalizedFid}: ${error.message}`
      );

      await resetLookupSession();

      if (!isLastAttempt) {
        await wait(getRetryDelayMs(attempt));
      }
    }
  }

  return null;
}
