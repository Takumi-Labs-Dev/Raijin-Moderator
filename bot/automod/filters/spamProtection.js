/**
 * Spam Protection Filter
 * Detects rapid message sending with rate limiting
 */

// In-memory store for message tracking (per guild)
const spamTracker = new Map();

/**
 * Check if user is spamming
 */
function check(message, config) {
  if (!config || !config.enabled) {
    return { triggered: false };
  }

  const guildId = message.guildId;
  const userId = message.author.id;
  const limit = config.limit || 5;
  const interval = config.interval || 3000; // 3 seconds default

  // Check role immunity
  if (config.immuneRoles && config.immuneRoles.length > 0) {
    const member = message.member;
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

  // Initialize tracker for guild if not exists
  if (!spamTracker.has(guildId)) {
    spamTracker.set(guildId, new Map());
  }

  const guildTracker = spamTracker.get(guildId);

  // Initialize tracker for user if not exists
  if (!guildTracker.has(userId)) {
    guildTracker.set(userId, []);
  }

  const userMessages = guildTracker.get(userId);
  const now = Date.now();

  // Clean old messages outside the interval
  const recentMessages = userMessages.filter(timestamp => now - timestamp < interval);
  guildTracker.set(userId, recentMessages);

  // Add current message
  recentMessages.push(now);

  // Check if limit exceeded
  if (recentMessages.length > limit) {
    return {
      triggered: true,
      messageCount: recentMessages.length,
      limit: limit,
      interval: interval,
      actions: config.actions || ['delete', 'mute'],
      response: config.response || null,
    };
  }

  return { triggered: false };
}

/**
 * Clean up old entries to prevent memory leaks
 */
function cleanup() {
  const now = Date.now();
  const maxAge = 60000; // 1 minute

  for (const [guildId, guildTracker] of spamTracker.entries()) {
    for (const [userId, messages] of guildTracker.entries()) {
      const recentMessages = messages.filter(timestamp => now - timestamp < maxAge);
      if (recentMessages.length === 0) {
        guildTracker.delete(userId);
      } else {
        guildTracker.set(userId, recentMessages);
      }
    }

    if (guildTracker.size === 0) {
      spamTracker.delete(guildId);
    }
  }
}

// Run cleanup every 30 seconds
setInterval(cleanup, 30000);

module.exports = { check, cleanup };
