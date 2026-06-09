const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getCase } = require('../services/caseManager');

const COLORS = {
  ban:           0xED4245,
  kick:          0xED4245,
  mute:          0xE67E22,
  unmute:        0x57F287,
  warn:          0xFEE75C,
  clearwarnings: 0x57F287,
};

const LABELS = {
  ban:           'BAN',
  kick:          'KICK',
  mute:          'MUTE',
  unmute:        'UNMUTE',
  warn:          'WARNING',
  clearwarnings: 'WARNINGS CLEARED',
};

const EMOJIS = {
  ban:           '🔨',
  kick:          '👢',
  mute:          '🔇',
  unmute:        '🔊',
  warn:          '⚠️',
  clearwarnings: '🧹',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('Look up a moderation case by number')
    .addIntegerOption(option => option
      .setName('number')
      .setDescription('The case number to look up')
      .setMinValue(1)
      .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const caseNumber = interaction.options.getInteger('number');
    const guildId    = interaction.guildId;

    const foundCase = getCase(guildId, caseNumber);

    if (!foundCase) {
      return interaction.reply({
        content: `❌ Case #${caseNumber} does not exist on this server.`,
        ephemeral: true,
      });
    }

    const color    = COLORS[foundCase.type] ?? 0x95A5A6;
    const label    = LABELS[foundCase.type] ?? foundCase.type.toUpperCase();
    const emoji    = EMOJIS[foundCase.type] ?? '📋';
    const botAvatar = interaction.client.user.displayAvatarURL();

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name:    `${emoji}  ${label}`,
        iconURL: botAvatar,
      })
      .setThumbnail(botAvatar)
      .addFields(
        {
          name:   '👤  User',
          value:  `<@${foundCase.userId}>\n\`${foundCase.username}\`\n\`ID: ${foundCase.userId}\``,
          inline: true,
        },
        {
          name:   '🛡️  Moderator',
          value:  `<@${foundCase.moderatorId}>\n\`${foundCase.moderatorName}\``,
          inline: true,
        },
        {
          name:   '\u200B',
          value:  '\u200B',
          inline: true,
        },
        {
          name:   '📋  Reason',
          value:  `\`\`\`${foundCase.reason}\`\`\``,
          inline: false,
        },
        {
          name:   '🕐  Date',
          value:  `\`${new Date(foundCase.timestamp).toUTCString()}\``,
          inline: false,
        },
      )
      .setFooter({
        text:    `雷 ¦ Raijin  •  Case #${foundCase.caseId}`,
        iconURL: botAvatar,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};