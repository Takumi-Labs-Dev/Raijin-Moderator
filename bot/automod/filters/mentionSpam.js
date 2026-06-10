/**
 * Mention Spam Filter
 * Detects excessive mentions in a single message
 */

/**
 * Check if message has too many mentions
 */
function check(message, config) {
  if (!config || !config.enabled) {
    return { triggered: false };
  }

  const content = message.content;
  const member = message.member;

  // Check role immunity
  if (config.immuneRoles && config.immuneRoles.length > 0) {
    const hasImmuneRole = member.roles.cache.some(role => config.immuneRoles.includes(role.id));
    if (hasImmuneRole) {
      return { triggered: false, reason: 'Role immunity' };
    }
  }

  // Check channel whitelist
  if (config.whitelistChannels && config.whitelistChannels.length > 0) {
    if (config.whitelistChannels.includes(message.channelId)) {
      return { triggered: false, reason: 'Channel whitelisted' };
    }
  }

  // Count mentions
  const userMentions = message.mentions.users.size;
  const roleMentions = message.mentions.roles.size;
  const totalMentions = userMentions + roleMentions;

  // Check if user mentions should be excluded
  let effectiveMentions = totalMentions;
  if (config.excludeUserMentions) {
    effectiveMentions = roleMentions;
  }

  // Check threshold
  const limit = config.limit || 5;

  if (effectiveMentions > limit) {
    return {
      triggered: true,
      mentionCount: effectiveMentions,
      limit: limit,
      userMentions: userMentions,
      roleMentions: roleMentions,
      actions: config.actions || ['delete'],
      response: config.response || null,
    };
  }

  return { triggered: false };
}

module.exports = { check };
