const { buildEventEmbed, sendLog } = require('../services/logger');

module.exports = {
  name: 'messageUpdate',
  once: false,

  async execute(oldMessage, newMessage, client) {
    // Ignore bots and DMs
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;

    // Ignore if content didn't actually change (embed loads trigger this event too)
    if (oldMessage.content === newMessage.content) return;

    const oldContent = oldMessage.content || '*No text content*';
    const newContent = newMessage.content || '*No text content*';

    const embed = buildEventEmbed('messageUpdate', {
    'Author':  `${newMessage.author?.username ?? 'Unknown'} (<@${newMessage.author?.id ?? '0'}>)`,
    'Channel': `<#${newMessage.channelId}>`,
    'Before':  oldContent.length > 1024 ? oldContent.slice(0, 1021) + '...' : oldContent,
    'After':   newContent.length > 1024 ? newContent.slice(0, 1021) + '...' : newContent,
  }, undefined, newMessage.guild.id);

    await sendLog(client, newMessage.guild.id, embed);
  },
};