const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCase } = require('../services/caseManager');
const { buildModEmbed, sendLog } = require('../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a user for a specified duration')
    .addUserOption(option => option
      .setName('user')
      .setDescription('The user to mute')
      .setRequired(true)
    )
    .addStringOption(option => option
      .setName('duration')
      .setDescription('Duration e.g. 10m, 1h, 1d (max 28d)')
      .setRequired(true)
    )
    .addStringOption(option => option
      .setName('reason')
      .setDescription('Reason for the mute')
      .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target    = interaction.options.getUser('user');
    const duration  = interaction.options.getString('duration');
    const reason    = interaction.options.getString('reason') ?? 'No reason provided';
    const guildId   = interaction.guildId;
    const moderator = interaction.user;

    const match = duration.trim().toLowerCase().match(/^(\d+)(m|h|d)$/);

    if (!match) {
      return interaction.reply({ content: '❌ Invalid duration. Use formats like `10m`, `1h`, `1d`. Maximum is `28d`.', ephemeral: true });
    }

    const value = parseInt(match[1], 10);
    const unit  = match[2];
    const map   = { m: 60000, h: 3600000, d: 86400000 };
    const ms    = value * map[unit];

    if (!ms || ms > 2419200000) {
      return interaction.reply({ content: '❌ Invalid duration. Use formats like `10m`, `1h`, `1d`. Maximum is `28d`.', ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ That user is not in this server.', ephemeral: true });
    }

    if (target.id === moderator.id) {
      return interaction.reply({ content: '❌ You cannot mute yourself.', ephemeral: true });
    }

    if (target.bot) {
      return interaction.reply({ content: '❌ You cannot mute a bot.', ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: '❌ You cannot mute someone with an equal or higher role than you.', ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: '❌ I do not have permission to mute that user. Check my role position.', ephemeral: true });
    }

    if (member.isCommunicationDisabled()) {
      return interaction.reply({ content: '❌ That user is already muted.', ephemeral: true });
    }

    try {
      await target.send(`🔇 You have been muted in **${interaction.guild.name}** for **${duration}**.\n**Reason:** ${reason}`);
    } catch {}

    await member.edit({ communicationDisabledUntil: new Date(Date.now() + ms).toISOString() });

    const newCase = createCase(guildId, 'mute', target.id, target.username, moderator.id, moderator.username, reason);

    const botAvatar = interaction.client.user.displayAvatarURL();
    const embed = buildModEmbed('mute', target, moderator, reason, newCase.caseId, botAvatar)
      .addFields({ name: '⏱️  Duration', value: `\`${duration}\``, inline: true });
    await sendLog(interaction.client, guildId, embed);

    await interaction.reply({
      content: `✅ **${target.username}** has been muted for **${duration}**. Case #${newCase.caseId}`,
      ephemeral: true,
    });
  },
};