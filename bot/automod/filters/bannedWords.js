/**
 * Banned Words Filter
 * Detects banned words/phrases with configurable match types
 */

/**
 * Check if message contains banned words
 */
function check(message, config) {
  if (!config || !config.enabled || !config.words || config.words.length === 0) {
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

  // Check each banned word rule
  for (const rule of config.words) {
    if (!rule.enabled) continue;

    let match = false;
    const word = rule.word;
    const matchType = rule.matchType || 'contains';
    const caseSensitive = rule.caseSensitive || false;

    const text = caseSensitive ? content : content.toLowerCase();
    const searchWord = caseSensitive ? word : word.toLowerCase();

    switch (matchType) {
      case 'exact':
        match = text === searchWord;
        break;
      case 'contains':
        match = text.includes(searchWord);
        break;
      case 'regex':
        try {
          const regex = new RegExp(word, caseSensitive ? 'g' : 'gi');
          match = regex.test(text);
        } catch (error) {
          console.error(`[automod] Invalid regex in banned words: ${word}`, error);
        }
        break;
    }

    if (match) {
      return {
        triggered: true,
        rule: rule,
        word: word,
        matchType: matchType,
        actions: rule.actions || ['delete'],
        response: rule.response || null,
      };
    }
  }

  return { triggered: false };
}

module.exports = { check };
