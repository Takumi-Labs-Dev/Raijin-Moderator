/**
 * Caps Lock Filter
 * Detects excessive capital letters in messages
 */

/**
 * Check if message has excessive caps
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

  // Ignore short messages (less than minimum length)
  const minLength = config.minLength || 5;
  if (content.length < minLength) {
    return { triggered: false };
  }

  // Calculate caps percentage
  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) {
    return { triggered: false };
  }

  const caps = letters.replace(/[a-z]/g, '').length;
  const capsPercentage = (caps / letters.length) * 100;

  // Check threshold
  const threshold = config.threshold || 70; // 70% default

  if (capsPercentage >= threshold) {
    return {
      triggered: true,
      capsPercentage: Math.round(capsPercentage),
      threshold: threshold,
      actions: config.actions || ['delete'],
      response: config.response || null,
    };
  }

  return { triggered: false };
}

module.exports = { check };
