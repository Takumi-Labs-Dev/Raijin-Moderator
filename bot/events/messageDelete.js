const { buildEventEmbed, sendLog } = require('../services/logger');

module.exports = {
  name: 'messageDelete',
  once: false,

  async execute(message, client) {
    if (!message.guild) return;
    if (message.author?.bot) return;

    const content = message.content || '*No text content*';

    const embed = buildEventEmbed('messageDelete', {
      'Author':  `${message.author?.username ?? 'Unknown'} (<@${message.author?.id ?? '0'}>)`,
      'Channel': `<#${message.channelId}>`,
      'Content': content.length > 1024 ? content.slice(0, 1021) + '...' : content,
    }, undefined, message.guild.id);

    await sendLog(client, message.guild.id, embed);
  },
};