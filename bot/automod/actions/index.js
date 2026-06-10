/**
 * Auto Moderation Actions
 * Executes punishments when filters trigger
 */

const { deleteMessage, warnUser, muteUser, kickUser, banUser } = require('./actions');

module.exports = {
  deleteMessage,
  warnUser,
  muteUser,
  kickUser,
  banUser,
};
