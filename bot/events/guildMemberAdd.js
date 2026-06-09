const { buildEventEmbed, sendLog } = require('../services/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  async execute(member, client) {
    const accountAgeDays = Math.floor(
      (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24)
    );

    const isNew = accountAgeDays < 7;

    const embed = buildEventEmbed('guildMemberAdd', {
  'User':         `${member.user.username} (<@${member.user.id}>)`,
  'Account Age':  `${accountAgeDays} day(s)`,
  'Member Count': `${member.guild.memberCount}`,
  ...(isNew ? { '⚠️ New Account': 'This account is less than 7 days old' } : {}),
}, undefined, member.guild.id);

    await sendLog(client, member.guild.id, embed);
  },
};