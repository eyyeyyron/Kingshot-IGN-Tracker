import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  InteractionResponseType
} from 'discord.js';
import { logger } from '../utils/logger.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const GITHUB_OWNER = process.env.GITHUB_OWNER || 'eyyeyyron';
const GITHUB_REPO = process.env.GITHUB_REPO || 'Kingshot-IGN-Tracker';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('scan')
    .setDescription('Manually trigger a player scan'),

  new SlashCommandBuilder()
    .setName('add_player')
    .setDescription('Add a single player for tracking')
    .addStringOption((option) =>
      option
        .setName('fid')
        .setDescription('Player FID (6+ digits)')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('add_players')
    .setDescription('Add multiple players for tracking (comma-separated)')
    .addStringOption((option) =>
      option
        .setName('fids')
        .setDescription('Player FIDs (e.g., 290874773,291431438,293249627)')
        .setRequired(true)
    )
].map((command) => command.toJSON());

async function registerCommands() {
  try {
    const rest = new REST().setToken(DISCORD_TOKEN);

    logger.info('Registering slash commands...');

    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands
    });

    logger.info(`Successfully registered ${commands.length} slash command(s)`);
  } catch (error) {
    logger.error('Failed to register commands:', error.message);
  }
}

async function triggerGitHubWorkflow(workflowName, inputs = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not set');
  }

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowName}/dispatches`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      ref: 'main',
      inputs
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${text}`);
  }

  return true;
}

client.once('ready', () => {
  logger.info(`Discord bot logged in as ${client.user.tag}`);
  registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'scan') {
      await interaction.deferReply();

      logger.info('Triggering scan workflow...');
      await triggerGitHubWorkflow('scan.yml');

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📋 Scan Triggered')
        .setDescription(
          'The scan workflow has been triggered on GitHub Actions.'
        )
        .addFields(
          {
            name: 'Repository',
            value: `${GITHUB_OWNER}/${GITHUB_REPO}`,
            inline: true
          },
          { name: 'Workflow', value: 'Scan Players', inline: true },
          {
            name: 'Status',
            value:
              'Check the [Actions tab](https://github.com/' +
              `${GITHUB_OWNER}/${GITHUB_REPO}/actions) for live status`,
            inline: false
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else if (commandName === 'add_player') {
      await interaction.deferReply();

      const fid = interaction.options.getString('fid');

      // Validate FID
      if (!/^\d+$/.test(fid) || fid.length < 6) {
        throw new Error('Invalid FID. Must be 6+ digits.');
      }

      logger.info(`Triggering add-players workflow for FID: ${fid}`);
      await triggerGitHubWorkflow('add-player.yml', { fids: fid });

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Player Add Triggered')
        .setDescription(`Player **${fid}** is being added to the tracker.`)
        .addFields(
          { name: 'FID', value: fid, inline: true },
          { name: 'Workflow', value: 'Add Player(s)', inline: true },
          {
            name: 'Status',
            value:
              'Check the [Actions tab](https://github.com/' +
              `${GITHUB_OWNER}/${GITHUB_REPO}/actions) for details`,
            inline: false
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else if (commandName === 'add_players') {
      await interaction.deferReply();

      const fidsInput = interaction.options.getString('fids');
      const fids = fidsInput
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      if (fids.length === 0) {
        throw new Error('No valid FIDs provided.');
      }

      // Validate all FIDs
      for (const fid of fids) {
        if (!/^\d+$/.test(fid) || fid.length < 6) {
          throw new Error(`Invalid FID: ${fid}. Must be 6+ digits.`);
        }
      }

      logger.info(`Bulk adding ${fids.length} player(s): ${fids.join(', ')}`);

      const fidsStr = fids.join(',');
      await triggerGitHubWorkflow('add-player.yml', { fids: fidsStr });

      const embed = new EmbedBuilder()
        .setColor(0xfaa61a)
        .setTitle('📝 Bulk Add Players Triggered')
        .setDescription(`Adding **${fids.length}** player(s) to the tracker.`)
        .addFields(
          { name: 'FIDs', value: fids.join(', '), inline: false },
          {
            name: 'Status',
            value:
              'Check the [Actions tab](https://github.com/' +
              `${GITHUB_OWNER}/${GITHUB_REPO}/actions) for live status`,
            inline: false
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    logger.error(`Command failed: ${error.message}`);

    const errorEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('❌ Command Failed')
      .setDescription(error.message)
      .setTimestamp();

    if (interaction.replied) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
});

export async function startDiscordBot() {
  if (!DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN environment variable not set');
  }

  logger.info('Starting Discord bot...');

  await client.login(DISCORD_TOKEN);
}

export function getDiscordClient() {
  return client;
}
