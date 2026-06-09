const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCase } = require('../services/caseManager');
const { buildModEmbed, sendLog } = require('../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => option
      .setName('user')
      .setDescription('The user to kick')
      .setRequired(true)
    )
    .addStringOption(option => option
      .setName('reason')
      .setDescription('Reason for the kick')
      .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target    = interaction.options.getUser('user');
    const reason    = interaction.options.getString('reason') ?? 'No reason provided';
    const guildId   = interaction.guildId;
    const moderator = interaction.user;

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ That user is not in this server.', ephemeral: true });
    }

    if (target.id === moderator.id) {
      return interaction.reply({ content: '❌ You cannot kick yourself.', ephemeral: true });
    }

    if (target.bot) {
      return interaction.reply({ content: '❌ You cannot kick a bot.', ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: '❌ You cannot kick someone with an equal or higher role than you.', ephemeral: true });
    }

    if (!member.kickable) {
      return interaction.reply({ content: '❌ I do not have permission to kick that user. Check my role position.', ephemeral: true });
    }

    try {
      await target.send(`👢 You have been kicked from **${interaction.guild.name}**.\n**Reason:** ${reason}`);
    } catch {}

    await member.kick(reason);

    const newCase = createCase(guildId, 'kick', target.id, target.username, moderator.id, moderator.username, reason);

    const botAvatar = interaction.client.user.displayAvatarURL();
    const embed = buildModEmbed('kick', target, moderator, reason, newCase.caseId, botAvatar);
    await sendLog(interaction.client, guildId, embed);

    await interaction.reply({
      content: `✅ **${target.username}** has been kicked. Case #${newCase.caseId}`,
      ephemeral: true,
    });
  },
};