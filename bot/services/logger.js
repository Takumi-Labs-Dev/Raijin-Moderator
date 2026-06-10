const { EmbedBuilder } = require('discord.js');
const { loadConfig } = require('./storage');
const fs   = require('fs');
const path = require('path');

const COLORS = {
  ban:            0xED4245,
  kick:           0xED4245,
  mute:           0xE67E22,
  unmute:         0x57F287,
  warn:           0xFEE75C,
  clearwarnings:  0x57F287,
  messageDelete:  0x5865F2,
  messageUpdate:  0x5865F2,
  guildMemberAdd: 0x5865F2,
  automod:        0xEF4444,
  antiRaid:       0xDC2626,
  warningEscalation: 0xF97316,
};

const LABELS = {
  ban:            'BAN',
  kick:           'KICK',
  mute:           'MUTE',
  unmute:         'UNMUTE',
  warn:           'WARNING',
  clearwarnings:  'WARNINGS CLEARED',
  messageDelete:  'MESSAGE DELETED',
  messageUpdate:  'MESSAGE EDITED',
  guildMemberAdd: 'MEMBER JOINED',
  automod:        'AUTO MOD',
  antiRaid:       'ANTI-RAID',
  warningEscalation: 'WARNING ESCALATION',
};

const EMOJIS = {
  ban:            '🔨',
  kick:           '👢',
  mute:           '🔇',
  unmute:         '🔊',
  warn:           '⚠️',
  clearwarnings:  '🧹',
  messageDelete:  '🗑️',
  messageUpdate:  '✏️',
  guildMemberAdd: '👋',
  automod:        '🛡️',
  antiRaid:       '🚨',
  warningEscalation: '📈',
};

// ── LOG FILE WRITER ──────────────────────────────────────────
const LOG_PATH = (() => {
  if (process.env.RAIJIN_DATA_DIR) {
    return path.join(process.env.RAIJIN_DATA_DIR, 'logs.json');
  }
  const dockerPath = path.join('/app', 'data', 'logs.json');
  const localPath  = path.join(__dirname, '..', '..', 'data', 'logs.json');
  return fs.existsSync(path.join('/app', 'data')) ? dockerPath : localPath;
})();

function writeLog(guildId, type, data) {
  try {
    // Load existing logs or start fresh
    let logs = {};
    if (fs.existsSync(LOG_PATH)) {
      const raw = fs.readFileSync(LOG_PATH, 'utf8');
      logs = JSON.parse(raw);
    }

    // Initialize guild array if needed
    if (!logs[guildId]) logs[guildId] = [];

    // Build the log entry with clean field names (strip emojis from keys)
    const cleanData = {};
    for (const [key, value] of Object.entries(data)) {
      // Strip leading emoji + spaces from keys for cleaner dashboard display
      const cleanKey = key.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}️\s]+/gu, '').trim();
      cleanData[cleanKey || key] = String(value);
    }

    logs[guildId].unshift({
      type,
      timestamp: new Date().toISOString(),
      data: cleanData,
    });

    // Keep only the last 500 entries per guild to prevent file bloat
    if (logs[guildId].length > 500) {
      logs[guildId] = logs[guildId].slice(0, 500);
    }

    fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error('[logger] Failed to write log file:', err);
  }
}

// ── EMBED BUILDERS ───────────────────────────────────────────
function buildModEmbed(type, user, moderator, reason, caseId, botAvatarURL) {
  const color  = COLORS[type]  ?? 0x95A5A6;
  const label  = LABELS[type]  ?? type.toUpperCase();
  const emoji  = EMOJIS[type]  ?? '📋';

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name:    `${emoji}  ${label}`,
      iconURL: botAvatarURL ?? undefined,
    })
    .setThumbnail(botAvatarURL ?? null)
    .addFields(
      {
        name:   '👤  User',
        value:  `<@${user.id}>\n\`${user.username}\`\n\`ID: ${user.id}\``,
        inline: true,
      },
      {
        name:   '🛡️  Moderator',
        value:  `<@${moderator.id}>\n\`${moderator.username}\``,
        inline: true,
      },
      {
        name:   '\u200B',
        value:  '\u200B',
        inline: true,
      },
      {
        name:   '📋  Reason',
        value:  `\`\`\`${reason}\`\`\``,
        inline: false,
      },
    )
    .setFooter({
      text:    `雷 ¦ Raijin  •  Case #${caseId}`,
      iconURL: botAvatarURL ?? undefined,
    })
    .setTimestamp();
}

function buildEventEmbed(type, data, botAvatarURL, guildId) {
  const color = COLORS[type]  ?? 0x5865F2;
  const label = LABELS[type]  ?? type.toUpperCase();
  const emoji = EMOJIS[type]  ?? '📋';

  // Write to log file if guildId provided
  if (guildId) writeLog(guildId, type, data);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name:    `${emoji}  ${label}`,
      iconURL: botAvatarURL ?? undefined,
    })
    .setThumbnail(botAvatarURL ?? null)
    .setFooter({
      text:    '雷 ¦ Raijin',
      iconURL: botAvatarURL ?? undefined,
    })
    .setTimestamp();

  for (const [key, value] of Object.entries(data)) {
    embed.addFields({
      name:  key,
      value: String(value),
    });
  }

  return embed;
}

async function sendLog(client, guildId, embed) {
  try {
    const config = loadConfig();

    if (!config[guildId]?.logChannelId) return;

    const channel = await client.channels.fetch(config[guildId].logChannelId);

    if (!channel) return;

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[logger] Failed to send log:', error);
  }
}

module.exports = { buildModEmbed, buildEventEmbed, sendLog };