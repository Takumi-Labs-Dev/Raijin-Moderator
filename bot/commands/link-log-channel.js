const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { loadConfig, saveConfig } = require('../services/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link-log-channel')
    .setDescription('Set the channel where moderation logs will be sent')
    .addChannelOption(option => option
      .setName('channel')
      .setDescription('The channel to send logs to')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    const config = loadConfig();

    if (!config[guildId]) {
      config[guildId] = {};
    }

    config[guildId].logChannelId = channel.id;
    saveConfig(config);

    await interaction.reply({
      content: `✅ Log channel set to ${channel}. All moderation actions will be logged there.`,
      ephemeral: true,
    });
  },
};