/**
 * Discord bot launcher
 * Run with: npm run bot
 */

import { startDiscordBot } from './src/discord/bot.js';
import { logger } from './src/utils/logger.js';

async function main() {
  try {
    logger.info('Initializing Kingshot Discord bot...');
    await startDiscordBot();
  } catch (error) {
    logger.error('Failed to start bot:', error.message);
    process.exit(1);
  }
}

main();
