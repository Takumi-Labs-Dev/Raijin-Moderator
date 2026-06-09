const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCase } = require('../services/caseManager');
const { buildModEmbed, sendLog } = require('../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => option
      .setName('user')
      .setDescription('The user to ban')
      .setRequired(true)
    )
    .addStringOption(option => option
      .setName('reason')
      .setDescription('Reason for the ban')
      .setRequired(false)
    )
    .addIntegerOption(option => option
      .setName('delete_messages')
      .setDescription('Delete message history (in days)')
      .setMinValue(0)
      .setMaxValue(7)
      .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target     = interaction.options.getUser('user');
    const reason     = interaction.options.getString('reason') ?? 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_messages') ?? 0;
    const guildId    = interaction.guildId;
    const moderator  = interaction.user;

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (target.id === moderator.id) {
      return interaction.reply({ content: '❌ You cannot ban yourself.', ephemeral: true });
    }

    if (target.bot) {
      return interaction.reply({ content: '❌ You cannot ban a bot.', ephemeral: true });
    }

    if (member) {
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ content: '❌ You cannot ban someone with an equal or higher role than you.', ephemeral: true });
      }
      if (!member.bannable) {
        return interaction.reply({ content: '❌ I do not have permission to ban that user. Check my role position.', ephemeral: true });
      }
    }

    try {
      await target.send(`🔨 You have been banned from **${interaction.guild.name}**.\n**Reason:** ${reason}`);
    } catch {}

    await interaction.guild.members.ban(target.id, {
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
      reason,
    });

    const newCase = createCase(guildId, 'ban', target.id, target.username, moderator.id, moderator.username, reason);

    const botAvatar = interaction.client.user.displayAvatarURL();
    const embed = buildModEmbed('ban', target, moderator, reason, newCase.caseId, botAvatar);
    await sendLog(interaction.client, guildId, embed);

    await interaction.reply({
      content: `✅ **${target.username}** has been banned. Case #${newCase.caseId}`,
      ephemeral: true,
    });
  },
};