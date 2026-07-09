# Kingshot IGN Tracker

Tracks Kingshot player IGN changes using FID (player ID). Runs as a one-time scan job, looks up live profiles from the Kingshot Gift Code site, persists changes to local JSON storage, and sends a single Discord tracking report per run.

## Features

- One-time scan job execution with optional scheduling via GitHub Actions
- Live player profile lookup via headless browser automation (Playwright)
- Auto-detected browser (Edge or Chrome), or custom via `LOOKUP_BROWSER_PATH`
- Immediate lookup on player creation (populates IGN, TC level, state)
- Bulk add players with comma-separated FIDs
- Closes Playwright browser resources after each run for clean process exit
- Retry with exponential backoff on lookup failures (up to 3 attempts)
- Per-player IGN change history (newest-first)
- Tracks Town Center Level and State per player
- **Smart stove level display:**
  - Levels 1-30: Shows as-is (e.g., "30")
  - Levels 31-34: Shows as "TC30.1" through "TC30.4"
  - Levels 35+: Shows as "TG1" through "TG∞" with sub-tiers (e.g., "TG2.3" = level 43)
- One Discord tracking report per run with detailed player rows
- Startup validation checks with Discord notifications for errors/warnings
- FID validation on all storage operations
- Centralized configuration for easy customization
- Structured logging with timestamps

## Project Structure

```
Kingshot-IGN-Tracker/
├── data/
│   └── players.json          (auto-created)
├── src/
│   ├── commands/
│   │   ├── addPlayer.js      (add single player with immediate lookup)
│   │   ├── addPlayers.js     (add multiple players, comma-separated)
│   │   └── testLayouts.js    (preview all Discord layouts)
│   ├── config/
│   │   └── config.js         (centralized configuration)
│   ├── discord/
│   │   └── notify.js         (Discord webhook integration)
│   ├── lookup/
│   │   └── fetchCurrentIgn.js (browser-based player lookup)
│   ├── storage/
│   │   ├── jsonStorage.js    (JSON file operations)
│   │   └── storage.js        (player data management)
│   ├── utils/
│   │   ├── formatStoveLevel.js (TC level display formatting)
│   │   └── logger.js          (structured logging)
│   └── index.js              (main scan job)
├── .env.example              (environment template)
├── .github/
│   └── workflows/
│       ├── add-player.yml    (manual workflow to add single player)
│       └── scan.yml          (scheduled scans at 0 & 12 UTC daily)
├── package.json
└── README.md
```

## Requirements

- Node.js 18+
- A Chromium-based browser installed:
  - Microsoft Edge (default)
  - Google Chrome
  - Or set custom path via `LOOKUP_BROWSER_PATH`

## Setup

### 1. Clone and Install

```bash
git clone <repo>
cd Kingshot-IGN-Tracker
npm install
```

### 2. Configure Environment

Copy the template and fill in your Discord webhook:

```bash
cp .env.example .env
```

Edit `.env`:

```
DISCORD_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
LOOKUP_BROWSER_PATH=          # (optional, auto-detected if not set)
```

### 3. Set Up GitHub Actions (Optional)

To enable automatic scheduled scans:

1. Go to **GitHub → Settings → Secrets and variables → Actions**
2. Add new repository secret:
   - **Name:** `DISCORD_WEBHOOK`
   - **Value:** Your Discord webhook URL
3. Workflows will run automatically at:
   - **00:00 UTC** (midnight)
   - **12:00 UTC** (noon)

Or trigger manually via **Actions → Scan Players → Run workflow**

## Commands

### Local Usage

#### Add Single Player

Adds a new player and performs immediate lookup to populate data:

```bash
npm run add-player -- <fid>
```

Example:

```bash
npm run add-player -- 290874773
```

#### Add Multiple Players

Bulk add players using comma-separated FIDs:

```bash
npm run add-players -- <fid1>,<fid2>,<fid3>
```

Example:

```bash
npm run add-players -- 290874773,291431438,293249627
```

**Output:**

- ✅ Players with successful lookup show their IGN, TC level, and state
- ⚠️ Players that fail lookup are created with empty values (can retry later with `npm start`)

#### Run One-Time Scan

Scans all tracked players and sends Discord report:

```bash
npm start
```

**Features:**

- Checks for validation errors at startup
- Sends Discord notification if any errors/warnings detected
- Compares current data against stored history
- Reports changes (IGN, TC level, state)
- Auto-commits to git if running in GitHub Actions

#### Watch Mode (Development)

Auto-restart on file changes:

```bash
npm run dev
```

#### Test Layouts

Preview all Discord embed layouts locally:

```bash
npm run test-layouts
```

Sends 8 different embed formats to Discord. Layout **G** is currently the default.

#### Lint Code

```bash
npm run lint
```

## Environment Variables

| Variable              | Required | Description                                         |
| --------------------- | -------- | --------------------------------------------------- |
| `DISCORD_WEBHOOK`     | Yes      | Discord incoming webhook URL for notifications      |
| `LOOKUP_BROWSER_PATH` | No       | Absolute path to browser executable (auto-detected) |

### Examples

**Windows:**

```
LOOKUP_BROWSER_PATH=C:/Program Files/Microsoft/Edge/Application/msedge.exe
```

**macOS:**

```
LOOKUP_BROWSER_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

**Linux:**

```
LOOKUP_BROWSER_PATH=/usr/bin/microsoft-edge
```

## GitHub Actions Workflows

### 1. Scan Players (Scheduled)

**File:** `.github/workflows/scan.yml`

**Schedule:** Daily at 00:00 UTC and 12:00 UTC

**What it does:**

- Checks out the repository
- Installs dependencies
- Runs `npm start` scan
- Auto-commits updated `data/players.json` if changes detected
- Sends Discord report

**Manual trigger:** Go to **Actions → Scan Players → Run workflow**

### 2. Add Player (Manual)

**File:** `.github/workflows/add-player.yml`

**Trigger:** Manual via GitHub Actions UI

**Steps:**

1. Go to **Actions → Add Player → Run workflow**
2. Enter a FID (player ID)
3. Workflow adds player and commits to `data/players.json`

**Setup:**

- No secrets needed (webhook is hardcoded in repo) — **IMPORTANT:** Change this before deploying
- Or set `DISCORD_WEBHOOK` as a GitHub secret (recommended)

## Data Format

### Player Object

```json
{
  "fid": "290874773",
  "ign": "Lotso",
  "originalIGN": "Lotso",
  "status": "tracking",
  "townCenterLevel": 40,
  "state": 1892,
  "lastChecked": "2025-07-09T18:45:23.456Z",
  "createdAt": "2025-07-08T10:00:00.000Z",
  "updatedAt": "2025-07-09T18:45:23.456Z",
  "history": [
    { "updatedAt": "2025-07-09T18:45:23.456Z", "ign": "Lotso" },
    { "updatedAt": "2025-07-08T12:30:00.000Z", "ign": "OldName" }
  ]
}
```

### Town Center Level Display

- **1-30:** `30`
- **31-34:** `TC30.1` to `TC30.4`
- **35-39:** `TG1` to `TG1.4`
- **40-44:** `TG2` to `TG2.4`
- **45-49:** `TG3` to `TG3.4`
- etc.

Formula for 35+:

```
tier = floor((level - 35) / 5) + 1
sub = (level - 35) % 5
display = sub > 0 ? `TG${tier}.${sub}` : `TG${tier}`
```

## Discord Report Format

### Layout G (Default)

```
✅ - ***Lotso*** (Lotso) | TG2 | 1892
⚠️ - ***OldName*** (NewName) | TC30.2 | 1850
🚫 - ***Unknown*** (---) | -- | --
```

**Status Codes:**

- `✅` No change
- `⚠️` Changed (IGN/TC/state modified)
- `🚫` Lookup failed

**Description:** `Changes detected. • Checked: 50 | Updated: 3 | Failed: 2`

**Legend:** `Legend: ⚠️ Changed | ✅ No change | 🚫 Lookup failed | Started: [timestamp]`

## Configuration

All hardcoded constants are centralized in `src/config/config.js`:

```javascript
export const LOOKUP_CONFIG = {
  URL: 'https://ks-giftcode.centurygame.com/',
  REQUEST_TIMEOUT_MS: 15000,
  MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 500
};

export const VALIDATION_CONFIG = {
  MIN_FID_LENGTH: 6,
  FID_PATTERN: /^\d+$/
};

export const SCAN_CONFIG = {
  STARTUP_CHECK_ENABLED: true,
  SEND_STARTUP_NOTIFICATION: true
};
```

Modify these values to customize behavior.

## Startup Validation

On each run, the tracker performs these checks:

✓ `DISCORD_WEBHOOK` environment variable is set  
✓ Player data file is readable and valid JSON  
✓ At least one player is being tracked

**If checks fail:**

- Logs detailed error messages
- Sends Discord notification with errors
- Exits with code 1

**If warnings detected:**

- Logs warnings
- Sends Discord notification (if enabled)
- Continues with scan

## Logging

Logs are structured with timestamps:

```
[2025-07-09T18:45:23.456Z] [INFO] Loaded 50 tracked player(s)
[2025-07-09T18:45:30.789Z] [WARN] Lookup attempt 1/3 failed for 290874773: Timeout
[2025-07-09T18:45:35.012Z] [ERROR] Scan failed: Network error
```

Log levels: `DEBUG`, `INFO`, `WARN`, `ERROR`

## Troubleshooting

### ❌ "No compatible browser executable found"

**Causes:**

- Edge/Chrome not installed
- Custom browser path is wrong

**Fix:**

```bash
# Install Edge or Chrome, or set custom path:
LOOKUP_BROWSER_PATH=/path/to/browser npm start
```

### ❌ "Invalid FID"

**Causes:**

- FID has less than 6 digits
- FID contains non-digit characters

**Fix:**

```bash
npm run add-player -- 290874773
```

### ❌ "DISCORD_WEBHOOK not set"

**Causes:**

- Missing `.env` file
- `DISCORD_WEBHOOK` is blank

**Fix:**

```bash
cp .env.example .env
# Edit .env and add your webhook URL
```

### ❌ "Lookup failed for FID"

**Causes:**

- Browser automation timeout
- Website returned invalid response
- Network error

**Fix:**

- Tracker retries 3 times with backoff
- Check if Kingshot website is accessible
- Run again later

## Development

### Modify Discord Layout

Edit `src/discord/notify.js` and change:

```javascript
function formatPlayerReports(playerReports) {
  return formatLayoutG(playerReports); // Change to A-H
}
```

Then test with:

```bash
npm run test-layouts
```

### Add New Config Values

Add to `src/config/config.js`:

```javascript
export const MY_CONFIG = {
  KEY: 'value'
};
```

Then import in your code:

```javascript
import { MY_CONFIG } from './config/config.js';
```

## License

ISC

## Support

For issues or feature requests, open an issue on GitHub.

This workflow is intended for repository-managed player lists where GitHub Actions is allowed to push changes back to the same branch.

## Discord Notifications

One message type is sent to the configured webhook after every run:

### Tracking Report

The report includes:

- Run summary: players checked, updated, lookup failures
- Detailed per-player rows with: FID, Original IGN, Current IGN, Town Center level, and State
- Fixed-width table layout for stable desktop and mobile alignment
- Status codes per row:
  - `CHG` changed profile
  - `STB` no change
  - `ERR` lookup failed

The embed color still changes by run outcome:

- `🟠` tone when any profile changes are detected
- `🔵` tone when no changes and no failures
- `🔴` tone when one or more lookups fail

`Original IGN` uses the player's dedicated `originalIGN` field (set when adding a new player). For legacy records without `originalIGN`, the scanner falls back to the oldest entry in `history`.

If `DISCORD_WEBHOOK` is not set or is invalid, notifications are silently skipped and the scanner continues normally.

## Lookup Flow

The lookup uses Playwright to automate the Kingshot Gift Code site:

1. Opens https://ks-giftcode.centurygame.com in a headless browser
2. Enters the player FID and clicks Login
3. Intercepts the `POST /api/player` API response
4. Parses `nickname` (IGN), `stove_lv_content`/`stove_lv` (Town Center Level), and `kid` (State)

If a lookup fails, it retries up to 3 times with exponential backoff, resetting the browser session between attempts.

## Data Model

`data/players.json` stores all tracked players keyed by FID.

```json
{
  "291431438": {
    "fid": "291431438",
    "ign": "Eyy",
    "originalIGN": "Eyy",
    "status": "tracking",
    "lastChecked": "2026-07-08T08:24:22.930Z",
    "createdAt": "2026-07-08T07:34:12.229Z",
    "updatedAt": "2026-07-08T08:24:22.931Z",
    "townCenterLevel": 30,
    "state": 1892,
    "history": [
      {
        "updatedAt": "2026-07-08T07:34:12.243Z",
        "ign": "Eyy"
      }
    ]
  }
}
```

- `status`: `"tracking"` (active) or `"paused"` (skipped during scan)
- `originalIGN`: immutable original tracked name for that player
- `history`: IGN change log, newest entry first
- `townCenterLevel`: numeric level or `null` if not yet fetched
- `state`: numeric game state/server ID or `null` if not yet fetched

## FID Validation Rules

- Must be a string
- Digits only
- Minimum length of 6
