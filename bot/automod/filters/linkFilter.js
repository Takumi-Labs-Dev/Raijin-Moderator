/**
 * Link / Invite Filter
 * Blocks Discord invites and external URLs with whitelist support
 */

/**
 * Check if message contains blocked links
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

  let triggered = false;
  let matchType = null;
  let matchedUrl = null;

  // Check Discord invites
  if (config.blockInvites) {
    const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9-]+/gi;
    const inviteMatch = content.match(inviteRegex);
    
    if (inviteMatch) {
      // Check if invite is whitelisted
      const isWhitelisted = config.whitelistInvites && config.whitelistInvites.some(invite => 
        inviteMatch[0].toLowerCase().includes(invite.toLowerCase())
      );
      
      if (!isWhitelisted) {
        triggered = true;
        matchType = 'invite';
        matchedUrl = inviteMatch[0];
      }
    }
  }

  // Check external URLs
  if (!triggered && config.blockLinks) {
    const urlRegex = /https?:\/\/(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/gi;
    const urlMatches = content.match(urlRegex);
    
    if (urlMatches) {
      // Check if domain is whitelisted
      const isWhitelisted = urlMatches.some(url => {
        const domain = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
        return config.whitelistDomains && config.whitelistDomains.some(whitelisted => 
          domain.toLowerCase().includes(whitelisted.toLowerCase())
        );
      });
      
      if (!isWhitelisted) {
        triggered = true;
        matchType = 'link';
        matchedUrl = urlMatches[0];
      }
    }
  }

  if (triggered) {
    return {
      triggered: true,
      matchType: matchType,
      url: matchedUrl,
      actions: config.actions || ['delete'],
      response: config.response || null,
    };
  }

  return { triggered: false };
}

module.exports = { check };
