/**
 * Message Create Event
 * Handles incoming messages and routes to automod handler
 */

const { handleMessage } = require('../automod/handler');

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, client) {
    // Route to automod handler
    await handleMessage(message, client);
  },
};
