import { formatStoveLevel } from '../utils/formatStoveLevel.js';

const DISCORD_COLORS = {
  changed: 0xf0a500,
  stable: 0x5865f2,
  error: 0xed4245
};

const LEGEND_FOOTER = 'Legend: ⚠️ Changed | ✅ No change | 🚫 Lookup failed';

function buildRows(playerReports) {
  const truncate = (value, max) => {
    const text = String(value ?? '');
    if (text.length <= max) return text;
    if (max <= 1) return text.slice(0, max);
    return `${text.slice(0, max - 1)}~`;
  };

  return (playerReports ?? [])
    .filter((r) => r && r.fid)
    .map((report) => {
      const statusCode =
        report.status === 'changed'
          ? '⚠️'
          : report.status === 'lookup_failed'
            ? '🚫'
            : '✅';
      const tc =
        report.townCenterLevel != null
          ? (formatStoveLevel(report.townCenterLevel) ??
            String(report.townCenterLevel))
          : '--';
      const prevTc =
        report.prevTownCenterLevel != null
          ? (formatStoveLevel(report.prevTownCenterLevel) ??
            String(report.prevTownCenterLevel))
          : null;
      const state = report.state != null ? String(report.state) : '--';
      const prevState =
        report.prevState != null ? String(report.prevState) : null;
      return {
        statusCode,
        originalIgn: truncate(report.originalIgn || '(none)', 16),
        currentIgn: truncate(report.currentIgn || '(none)', 16),
        prevIgn: report.prevIgn != null ? truncate(report.prevIgn, 16) : null,
        tc,
        prevTc,
        state,
        prevState
      };
    });
}

function assembleLines(lines, maxLength = 1024) {
  if (!lines.length) return 'No tracked players.';
  let output = '';
  let included = 0;
  for (const line of lines) {
    const next = output ? `${output}\n${line}` : line;
    if (next.length > maxLength) break;
    output = next;
    included += 1;
  }
  const remaining = lines.length - included;
  if (remaining > 0) {
    const suffix = `\n...and ${remaining} more`;
    if (output.length + suffix.length <= maxLength) output += suffix;
  }
  return output || 'No tracked players.';
}

// Layout A (current): bold original IGN + subtext details
function formatLayoutA(playerReports) {
  const rows = buildRows(playerReports);
  const lines = rows.map(
    (r) =>
      `**${r.originalIgn}**\n-# ${r.statusCode} ${r.currentIgn} - ${r.tc} · ${r.state}`
  );
  return assembleLines(lines);
}

// Layout B: blockquote — name on first line, details indented
function formatLayoutB(playerReports) {
  const rows = buildRows(playerReports);
  const lines = rows.map(
    (r) =>
      `> **${r.originalIgn}**\n> ${r.statusCode} ${r.currentIgn} · ${r.tc} · ${r.state}`
  );
  return assembleLines(lines);
}

// Layout C: inline code stats below name
function formatLayoutC(playerReports) {
  const rows = buildRows(playerReports);
  const lines = rows.map(
    (r) =>
      `**${r.originalIgn}**\n${r.statusCode} 🔀 ${r.currentIgn}\n\`${r.tc}\` · \`${r.state}\``
  );
  return assembleLines(lines);
}

// Layout D: compact single line with pipes
function formatLayoutD(playerReports) {
  const rows = buildRows(playerReports);
  const lines = rows.map(
    (r) =>
      `${r.statusCode} **${r.originalIgn}** | ${r.currentIgn} | ${r.tc} | ${r.state}`
  );
  return assembleLines(lines);
}

// Layout E: underline TC, italic current IGN, strikethrough failed
function formatLayoutE(playerReports) {
  const rows = buildRows(playerReports);
  const lines = rows.map((r) => {
    const current =
      r.statusCode === '🚫' ? `~~_${r.currentIgn}_~~` : `_${r.currentIgn}_`;
    const tc = `__${r.tc}__`;
    return `**${r.originalIgn}**\n${r.statusCode} 🔀 ${current}\n${tc} · ${r.state}`;
  });
  return assembleLines(lines);
}

// Layout F: sections with separators
function formatLayoutF(playerReports) {
  const rows = buildRows(playerReports);
  const changed = rows.filter((r) => r.statusCode === '⚠️');
  const failed = rows.filter((r) => r.statusCode === '🚫');
  const stable = rows.filter((r) => r.statusCode === '✅');

  const lines = [];
  if (changed.length) {
    lines.push('━━━ ⚠️ **Changed** ━━━');
    lines.push(
      ...changed.map((r) => `**${r.originalIgn}** → ${r.currentIgn} · ${r.tc}`)
    );
  }
  if (stable.length) {
    lines.push('━━━ ✅ **Stable** ━━━');
    lines.push(...stable.map((r) => `**${r.originalIgn}** · ${r.tc}`));
  }
  if (failed.length) {
    lines.push('━━━ 🚫 **Failed** ━━━');
    lines.push(...failed.map((r) => `~~${r.originalIgn}~~`));
  }
  return assembleLines(lines);
}

// Layout G: bullet list with emphasis
function formatLayoutG(playerReports) {
  const rows = buildRows(playerReports);
  const lines = rows.map(
    (r) =>
      `${r.statusCode} - ***${r.originalIgn}*** (${r.currentIgn}) | ${r.tc} | ${r.state}`
  );
  return assembleLines(lines);
}

// Layout H: block quote per player with full details
function formatLayoutH(playerReports) {
  const rows = buildRows(playerReports);
  const lines = rows.map((r) => {
    const title =
      r.statusCode === '🚫' ? `~~${r.originalIgn}~~` : `**${r.originalIgn}**`;
    return `>>> ${title}\n>>> ${r.statusCode} ${r.currentIgn} • Level __${r.tc}__ • State ${r.state}`;
  });
  return lines.join('\n\n');
}

function getWebhookUrl() {
  const url = process.env.DISCORD_WEBHOOK;

  if (!url || !url.startsWith('https://discord.com/api/webhooks/')) {
    return null;
  }

  return url;
}

async function postEmbeds(embeds) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return;

  // Discord allows max 10 embeds per message
  for (let i = 0; i < embeds.length; i += 10) {
    const batch = embeds.slice(i, i + 10);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: batch })
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(
        `Discord webhook failed: ${response.status} ${response.statusText} ${text}`
      );
    }
    if (i + 10 < embeds.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function postEmbed(embed) {
  const webhookUrl = getWebhookUrl();

  if (!webhookUrl) {
    return;
  }

  const body = JSON.stringify({ embeds: [embed] });

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(
      `Discord webhook failed: ${response.status} ${response.statusText} ${text}`
    );
  }
}

export async function notifyScanSummary({
  checked,
  updated,
  failures,
  startedAt,
  playerReports,
  startupMessage,
  isStartupNotification
}) {
  if (!getWebhookUrl()) {
    return;
  }

  const timestamp = new Date().toISOString();

  // Handle startup notifications
  if (isStartupNotification && startupMessage) {
    const color = startupMessage.includes('🔴')
      ? DISCORD_COLORS.error
      : 0xffa500;

    await postEmbed({
      title: '⚠️ Tracker Startup Alert',
      description: startupMessage,
      color,
      footer: {
        text: `${LEGEND_FOOTER} | Started: ${startedAt}`
      },
      timestamp
    });
    return;
  }

  const rows = buildRows(playerReports);
  const changed = rows.filter((r) => r.statusCode === '⚠️');
  const failed = rows.filter((r) => r.statusCode === '🚫');
  const stable = rows.filter((r) => r.statusCode === '✅');

  const color =
    failures > 0
      ? DISCORD_COLORS.error
      : updated > 0
        ? DISCORD_COLORS.changed
        : DISCORD_COLORS.stable;

  const statusText =
    updated > 0
      ? `Changes detected in ${updated} player(s).`
      : failures > 0
        ? `No changes detected. ${failures} lookup(s) failed.`
        : 'No changes detected.';

  // Pre-build changed lines
  const changedLines = changed.map((r) => {
    const ignPart =
      r.prevIgn && r.prevIgn !== r.currentIgn
        ? `(${r.prevIgn} → ${r.currentIgn})`
        : `(${r.currentIgn})`;
    const tcPart =
      r.prevTc && r.prevTc !== r.tc ? `${r.prevTc}→${r.tc}` : r.tc;
    const statePart =
      r.prevState && r.prevState !== r.state
        ? `${r.prevState}→${r.state}`
        : r.state;
    return `⚠️ **${r.originalIgn}** ${ignPart} | ${tcPart} | ${statePart}`;
  });

  // Description: stats + With Changes section
  let description = `${statusText} • Checked: ${checked} | Updated: ${updated} | Failed: ${failures}`;
  if (changed.length > 0) {
    description += `\n\n**With Changes (${changed.length})**\n${changedLines.join('\n')}`;
  }

  const fields = [];

  // Stable players split across multiple fields (950 chars each to stay under 6000 total)
  if (stable.length > 0) {
    const stableLines = stable.map(
      (r) => `✅ **${r.originalIgn}** (${r.currentIgn}) | ${r.tc} | ${r.state}`
    );

    let page = '';
    let pageNum = 1;
    let playerStart = 1;

    for (let i = 0; i < stableLines.length; i++) {
      const line = stableLines[i];
      const next = page ? `${page}\n${line}` : line;
      const isLast = i === stableLines.length - 1;

      if (
        next.length > 950 ||
        (next.length > 0 && isLast && !next.includes(line))
      ) {
        fields.push({
          name: pageNum === 1 ? `No Changes (${stable.length})` : '⠀',
          value: page,
          inline: false
        });
        playerStart += page.split('\n').length;
        page = line;
        pageNum++;
      } else {
        page = next;
      }

      if (isLast && page) {
        fields.push({
          name: pageNum === 1 ? `No Changes (${stable.length})` : '⠀',
          value: page,
          inline: false
        });
      }
    }
  }

  // Failed players field
  if (failed.length > 0) {
    const failedLines = failed.map(
      (r) => `🚫 **${r.originalIgn}** (${r.currentIgn}) | ${r.tc} | ${r.state}`
    );
    fields.push({
      name: `Lookup Failed (${failed.length})`,
      value: assembleLines(failedLines),
      inline: false
    });
  }

  await postEmbed({
    title: '📋 Tracking Report',
    description,
    color,
    fields,
    footer: {
      text: `${LEGEND_FOOTER} | Started: ${startedAt}`
    },
    timestamp
  });
}
