const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCase } = require('../services/caseManager');
const { buildModEmbed, sendLog } = require('../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a timeout from a user early')
    .addUserOption(option => option
      .setName('user')
      .setDescription('The user to unmute')
      .setRequired(true)
    )
    .addStringOption(option => option
      .setName('reason')
      .setDescription('Reason for removing the mute')
      .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target    = interaction.options.getUser('user');
    const reason    = interaction.options.getString('reason') ?? 'No reason provided';
    const guildId   = interaction.guildId;
    const moderator = interaction.user;

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ That user is not in this server.', ephemeral: true });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ content: '❌ That user is not currently muted.', ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: '❌ I do not have permission to unmute that user. Check my role position.', ephemeral: true });
    }

    await member.edit({ communicationDisabledUntil: null });

    try {
      await target.send(`🔊 Your mute in **${interaction.guild.name}** has been removed.\n**Reason:** ${reason}`);
    } catch {}

    const newCase = createCase(guildId, 'unmute', target.id, target.username, moderator.id, moderator.username, reason);

    const botAvatar = interaction.client.user.displayAvatarURL();
    const embed = buildModEmbed('unmute', target, moderator, reason, newCase.caseId, botAvatar);
    await sendLog(interaction.client, guildId, embed);

    await interaction.reply({
      content: `✅ **${target.username}** has been unmuted. Case #${newCase.caseId}`,
      ephemeral: true,
    });
  },
};