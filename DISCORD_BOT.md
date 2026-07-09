# Discord Bot Setup Guide

The Kingshot IGN Tracker includes a **Discord bot** that allows you to trigger scans and add players directly from Discord using slash commands.

## Features

- `/scan` — Manually trigger a player scan
- `/add_player <fid>` — Add a single player for tracking
- `/add_players <fids>` — Add multiple players (comma-separated)

## Prerequisites

1. **A Discord server** where you have admin privileges
2. **Discord application** created on Discord Developer Portal
3. **GitHub Personal Access Token** for GitHub Actions API access
4. **Node.js 18+** installed locally

## Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → enter a name (e.g., "Kingshot Tracker")
3. Go to **Bot** → Click **Add Bot**
4. Under **TOKEN**, click **Copy** (this is your `DISCORD_TOKEN`)
5. Go to **OAuth2 → URL Generator**:
   - **Scopes:** `bot`
   - **Permissions:** `Send Messages`, `Embed Links`, `Use Slash Commands`
   - Copy the generated URL
6. Open the URL in your browser to invite the bot to your Discord server

## Step 2: Create GitHub Personal Access Token

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Click **Generate new token** → **Generate new token (classic)**
3. Set **Expiration:** No expiration (or set as needed)
4. **Scopes:** Check only `repo` and `workflow`
5. Click **Generate token** → Copy the token (this is your `GITHUB_TOKEN`)

## Step 3: Configure Environment Variables

Update your `.env` file:

```env
DISCORD_WEBHOOK="https://discord.com/api/webhooks/..."

# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
GITHUB_TOKEN=your_github_personal_access_token_here
GITHUB_OWNER=eyyeyyron
GITHUB_REPO=Kingshot-IGN-Tracker
```

## Step 4: Install Discord.js

```powershell
npm install
```

This installs `discord.js` (already added to `package.json`).

## Step 5: Run the Bot

**Local development:**
```powershell
npm run bot
```

**With auto-reload on file changes:**
```powershell
npm run bot-dev
```

You should see:
```
[timestamp] [INFO] Initializing Kingshot Discord bot...
[timestamp] [INFO] Starting Discord bot...
[timestamp] [INFO] Discord bot logged in as YourBotName#0000
[timestamp] [INFO] Registering slash commands...
[timestamp] [INFO] Successfully registered 3 slash command(s)
```

## Step 6: Test in Discord

In your Discord server, type `/` to see the available commands:
- `/scan` → Triggers the scan workflow
- `/add_player` → Add a single player
- `/add_players` → Add multiple players

## Usage Examples

### Scan Players

```
/scan
```

Response:
```
📋 Scan Triggered
The scan workflow has been triggered on GitHub Actions.
Repository: eyyeyyron/Kingshot-IGN-Tracker
Workflow: Scan Players
Status: Check the Actions tab for live status
```

### Add Single Player

```
/add_player fid:290874773
```

Response:
```
✅ Player Add Triggered
Player 290874773 is being added to the tracker.
FID: 290874773
Workflow: Add Player
Status: Check the Actions tab for details
```

### Add Multiple Players

```
/add_players fids:290874773,291431438,293249627
```

Response shows FIDs being added. (Currently displays instructions to run locally.)

## Hosting the Bot

The bot needs to run **continuously** to respond to Discord commands. Options:

### Option A: Local Machine (Development)
```powershell
npm run bot
```
Keep your machine on and the terminal running.

### Option B: Cloud Hosting (Production)

**Recommended services:**
- **AWS EC2** (free tier available)
- **Heroku** (free tier removed, but cheap)
- **DigitalOcean** ($5/month)
- **Railway** ($5/month)
- **Replit** (free with limitations)

**For any cloud host:**
1. Deploy code to the service
2. Set environment variables (DISCORD_TOKEN, GITHUB_TOKEN, etc.)
3. Start the bot with `npm run bot`

### Option C: GitHub Codespaces
Run the bot from GitHub Codespaces (always-on, but limited free hours):
```powershell
npm run bot
```

## Troubleshooting

### Bot doesn't respond to commands

**Check:**
- Bot is running (`npm run bot` shows "Discord bot logged in as...")
- Bot has "Send Messages" permission in the channel
- Commands are registered (check logs for "Successfully registered X slash commands")
- Bot is actually in your Discord server

**Fix:**
1. Stop bot (`Ctrl+C`)
2. Delete old commands (go to Discord Developer Portal → Application → Advanced → Delete)
3. Restart bot (`npm run bot`)

### "DISCORD_TOKEN not set" error

**Fix:**
- Ensure `.env` has `DISCORD_TOKEN=your_token`
- Copy the token from [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Token
- Restart the bot

### "GITHUB_TOKEN not set" error

**Fix:**
- Ensure `.env` has `GITHUB_TOKEN=your_token`
- Create a token at [GitHub Settings → Tokens](https://github.com/settings/tokens)
- Ensure token has `repo` and `workflow` scopes
- Restart the bot

### Workflow not triggering

**Check:**
- GITHUB_TOKEN has `workflow` scope
- GITHUB_OWNER and GITHUB_REPO are correct in `.env`
- Repository is public (or token user has access)

**Fix:**
```powershell
# Test token manually
$token = $env:GITHUB_TOKEN
Invoke-WebRequest -Uri "https://api.github.com/user" -Headers @{Authorization="token $token"}
```

## File Structure

```
Kingshot-IGN-Tracker/
├── bot.js                      (bot launcher)
├── src/
│   └── discord/
│       ├── bot.js              (Discord bot code)
│       └── notify.js           (webhook notifications)
└── .env                        (environment variables)
```

## Stopping the Bot

Press `Ctrl+C` in the terminal.

## Notes

- The bot requires **Discord Token** and **GitHub Token** to function
- Keep tokens **private** — never commit `.env` to GitHub
- The bot registers slash commands **globally** (takes 15-60 min to propagate)
- Commands are **ephemeral by default** (only visible to the user who triggered them)

## Next Steps

1. Keep the bot running locally or deploy to a cloud service
2. Use Discord commands to manage your tracker
3. Monitor GitHub Actions for workflow execution details

For support or issues, check the main [README.md](README.md).
