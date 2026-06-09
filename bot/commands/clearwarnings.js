const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadWarnings, saveWarnings } = require('../services/storage');
const { createCase } = require('../services/caseManager');
const { buildModEmbed, sendLog } = require('../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Clear all warnings for a user')
    .addUserOption(option => option
      .setName('user')
      .setDescription('The user to clear warnings for')
      .setRequired(true)
    )
    .addStringOption(option => option
      .setName('reason')
      .setDescription('Reason for clearing warnings')
      .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const target    = interaction.options.getUser('user');
    const reason    = interaction.options.getString('reason') ?? 'No reason provided';
    const guildId   = interaction.guildId;
    const moderator = interaction.user;

    const warnings = loadWarnings();

    const previousCount = warnings[guildId]?.[target.id]?.warnings?.length ?? 0;

    if (previousCount === 0) {
      return interaction.reply({ content: `✅ **${target.username}** has no warnings to clear.`, ephemeral: true });
    }

    warnings[guildId][target.id].warnings = [];
    saveWarnings(warnings);

    const newCase = createCase(guildId, 'clearwarnings', target.id, target.username, moderator.id, moderator.username, reason);

    const botAvatar = interaction.client.user.displayAvatarURL();
    const embed = buildModEmbed('clearwarnings', target, moderator, reason, newCase.caseId, botAvatar);
    await sendLog(interaction.client, guildId, embed);

    await interaction.reply({
      content: `✅ Cleared **${previousCount}** warning(s) from **${target.username}**. Case #${newCase.caseId}`,
      ephemeral: true,
    });
  },
};