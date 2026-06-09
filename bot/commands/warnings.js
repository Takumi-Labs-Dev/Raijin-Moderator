const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { loadWarnings } = require('../services/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View all warnings for a user')
    .addUserOption(option => option
      .setName('user')
      .setDescription('The user to check warnings for')
      .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const target  = interaction.options.getUser('user');
    const guildId = interaction.guildId;

    const warnings = loadWarnings();

    const userWarnings = warnings[guildId]?.[target.id]?.warnings ?? [];

    if (userWarnings.length === 0) {
      return interaction.reply({
        content: `✅ **${target.username}** has no warnings on this server.`,
        ephemeral: true,
      });
    }

    const fields = userWarnings.map(w => ({
      name:  `Warning #${w.warningId} — ${new Date(w.timestamp).toDateString()}`,
      value: `**Reason:** ${w.reason}\n**Moderator:** ${w.moderatorName}`,
    }));

    const embed = new EmbedBuilder()
      .setColor(0xFFCC00)
      .setTitle(`⚠️ Warnings for ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(fields)
      .setFooter({ text: `${userWarnings.length} total warning(s) • 雷 ¦ Raijin` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};