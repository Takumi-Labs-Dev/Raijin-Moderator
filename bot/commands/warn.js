const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadWarnings, saveWarnings } = require('../services/storage');
const { createCase } = require('../services/caseManager');
const { buildModEmbed, sendLog } = require('../services/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a user')
    .addUserOption(option => option
      .setName('user')
      .setDescription('The user to warn')
      .setRequired(true)
    )
    .addStringOption(option => option
      .setName('reason')
      .setDescription('Reason for the warning')
      .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const target    = interaction.options.getUser('user');
    const reason    = interaction.options.getString('reason') ?? 'No reason provided';
    const guildId   = interaction.guildId;
    const moderator = interaction.user;

    if (target.bot) {
      return interaction.reply({ content: '❌ You cannot warn a bot.', ephemeral: true });
    }

    if (target.id === moderator.id) {
      return interaction.reply({ content: '❌ You cannot warn yourself.', ephemeral: true });
    }

    const warnings = loadWarnings();

    if (!warnings[guildId])            warnings[guildId] = {};
    if (!warnings[guildId][target.id]) warnings[guildId][target.id] = { warnings: [] };

    const userWarnings = warnings[guildId][target.id].warnings;
    const warningId    = userWarnings.length + 1;

    userWarnings.push({
      warningId,
      reason,
      moderatorId:   moderator.id,
      moderatorName: moderator.username,
      timestamp:     new Date().toISOString(),
    });

    saveWarnings(warnings);

    try {
      await target.send(`⚠️ You have been warned in **${interaction.guild.name}**.\n**Reason:** ${reason}`);
    } catch {}

    const newCase = createCase(guildId, 'warn', target.id, target.username, moderator.id, moderator.username, reason);

    const botAvatar = interaction.client.user.displayAvatarURL();
    const embed = buildModEmbed('warn', target, moderator, reason, newCase.caseId, botAvatar);
    await sendLog(interaction.client, guildId, embed);

    await interaction.reply({
      content: `✅ **${target.username}** has been warned. They now have **${userWarnings.length}** warning(s). Case #${newCase.caseId}`,
      ephemeral: true,
    });
  },
};