/**
 * Auto Moderation Module
 * Coordinates all automod filters and actions
 */

module.exports = {
  filters: require('./filters'),
  actions: require('./actions'),
  handler: require('./handler'),
};
