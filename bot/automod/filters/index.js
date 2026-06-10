/**
 * Auto Moderation Filters
 * Each filter is independent and returns a result object
 */

const bannedWords = require('./bannedWords');
const spamProtection = require('./spamProtection');
const linkFilter = require('./linkFilter');
const capsFilter = require('./capsFilter');
const mentionSpam = require('./mentionSpam');
const antiRaid = require('./antiRaid');

module.exports = {
  bannedWords,
  spamProtection,
  linkFilter,
  capsFilter,
  mentionSpam,
  antiRaid,
};
