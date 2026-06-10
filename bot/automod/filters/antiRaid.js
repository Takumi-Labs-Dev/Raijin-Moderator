/**
 * Anti-Raid Filter
 * Detects sudden member join spikes and triggers protective measures
 */

// In-memory store for join tracking
const joinTracker = new Map();

/**
 * Check if a raid is in progress
 */
function check(guild, config) {
  if (!config || !config.enabled) {
    return { triggered: false };
  }

  const guildId = guild.id;

  // Initialize tracker for guild if not exists
  if (!joinTracker.has(guildId)) {
    joinTracker.set(guildId, {
      joins: [],
      lastAction: null,
    });
  }

  const tracker = joinTracker.get(guildId);
  const now = Date.now();

  // Clean old joins outside the detection window
  const detectionWindow = config.detectionWindow || 10000; // 10 seconds default
  tracker.joins = tracker.joins.filter(timestamp => now - timestamp < detectionWindow);

  // Check if cooldown period is active
  if (tracker.lastAction) {
    const cooldown = config.cooldown || 60000; // 1 minute default
    if (now - tracker.lastAction < cooldown) {
      return { triggered: false, reason: 'Cooldown active' };
    }
  }

  // Check if threshold exceeded
  const threshold = config.threshold || 5; // 5 joins in detection window
  const joinCount = tracker.joins.length;

  if (joinCount >= threshold) {
    // Mark that action was taken
    tracker.lastAction = now;

    return {
      triggered: true,
      joinCount: joinCount,
      threshold: threshold,
      detectionWindow: detectionWindow,
      actions: config.actions || ['slowmode'],
    };
  }

  return { triggered: false };
}

/**
 * Record a member join for tracking
 */
function recordJoin(guildId) {
  if (!joinTracker.has(guildId)) {
    joinTracker.set(guildId, {
      joins: [],
      lastAction: null,
    });
  }

  const tracker = joinTracker.get(guildId);
  tracker.joins.push(Date.now());
}

/**
 * Execute anti-raid actions
 */
async function executeActions(guild, actions, config) {
  const results = [];

  for (const action of actions) {
    try {
      switch (action) {
        case 'slowmode':
          // Enable slowmode on all text channels
          const slowmodeDuration = config.slowmodeDuration || 10; // 10 seconds default
          const channels = guild.channels.cache.filter(c => c.isTextBased());
          
          for (const channel of channels) {
            await channel[1].setRateLimitPerUser(slowmodeDuration, 'Anti-raid protection');
          }
          results.push({ success: true, action: 'slowmode', duration: slowmodeDuration });
          break;

        case 'lockdown':
          // Lock channels (set permissions to deny SEND_MESSAGES)
          const lockdownChannels = guild.channels.cache.filter(c => c.isTextBased());
          const everyoneRole = guild.roles.everyone;
          
          for (const channel of lockdownChannels) {
            await channel[1].permissionOverwrites.edit(everyoneRole, {
              SendMessages: false,
            }, 'Anti-raid lockdown');
          }
          results.push({ success: true, action: 'lockdown' });
          break;

        case 'restrict':
          // Restrict new accounts (less than X days old)
          const minAge = config.minAccountAge || 7; // 7 days default
          const members = await guild.members.fetch();
          const now = Date.now();
          const cutoff = now - (minAge * 24 * 60 * 60 * 1000);
          
          let restrictedCount = 0;
          for (const member of members.values()) {
            if (member.user.createdTimestamp > cutoff) {
              // Add muted role or timeout
              await member.edit({ communicationDisabledUntil: new Date(now + 3600000).toISOString() }, 'Anti-raid restriction');
              restrictedCount++;
            }
          }
          results.push({ success: true, action: 'restrict', count: restrictedCount });
          break;
      }
    } catch (error) {
      console.error(`[automod] Failed to execute anti-raid action ${action}:`, error);
      results.push({ success: false, action, error: error.message });
    }
  }

  return results;
}

/**
 * Clean up old entries to prevent memory leaks
 */
function cleanup() {
  const now = Date.now();
  const maxAge = 300000; // 5 minutes

  for (const [guildId, tracker] of joinTracker.entries()) {
    tracker.joins = tracker.joins.filter(timestamp => now - timestamp < maxAge);
    
    // Reset lastAction if cooldown expired
    if (tracker.lastAction && now - tracker.lastAction > maxAge) {
      tracker.lastAction = null;
    }

    // Remove empty trackers
    if (tracker.joins.length === 0 && !tracker.lastAction) {
      joinTracker.delete(guildId);
    }
  }
}

// Run cleanup every minute
setInterval(cleanup, 60000);

module.exports = { check, recordJoin, executeActions, cleanup };
