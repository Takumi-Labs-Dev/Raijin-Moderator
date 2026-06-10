/**
 * Auto Moderation Actions
 * Executes punishments when filters trigger
 */

const { createCase } = require('../../services/caseManager');
const { buildModEmbed, sendLog } = require('../../services/logger');

/**
 * Delete a message
 */
async function deleteMessage(message) {
  try {
    await message.delete();
    return { success: true, action: 'delete' };
  } catch (error) {
    console.error('[automod] Failed to delete message:', error);
    return { success: false, action: 'delete', error: error.message };
  }
}

/**
 * Warn a user
 */
async function warnUser(message, reason, client) {
  try {
    const { loadWarnings, saveWarnings } = require('../../services/storage');
    const warnings = loadWarnings();
    const guildId = message.guildId;
    const target = message.author;

    if (!warnings[guildId]) warnings[guildId] = {};
    if (!warnings[guildId][target.id]) warnings[guildId][target.id] = { warnings: [] };

    const userWarnings = warnings[guildId][target.id].warnings;
    const warningId = userWarnings.length + 1;

    userWarnings.push({
      warningId,
      reason,
      moderatorId: client.user.id,
      moderatorName: client.user.username,
      timestamp: new Date().toISOString(),
    });

    saveWarnings(warnings);

    // Create case
    const newCase = createCase(guildId, 'warn', target.id, target.username, client.user.id, client.user.username, reason);

    // Log to channel
    const botAvatar = client.user.displayAvatarURL();
    const embed = buildModEmbed('warn', target, { id: client.user.id, username: client.user.username }, reason, newCase.caseId, botAvatar);
    await sendLog(client, guildId, embed);

    return { success: true, action: 'warn', caseId: newCase.caseId, warningCount: userWarnings.length };
  } catch (error) {
    console.error('[automod] Failed to warn user:', error);
    return { success: false, action: 'warn', error: error.message };
  }
}

/**
 * Mute (timeout) a user
 */
async function muteUser(message, duration, reason, client) {
  try {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return { success: false, action: 'mute', error: 'Member not found' };

    // Parse duration (default to 10 minutes if not specified)
    let ms = 10 * 60 * 1000; // 10 minutes default
    if (duration) {
      const match = duration.toString().trim().toLowerCase().match(/^(\d+)(m|h|d)$/);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2];
        const map = { m: 60000, h: 3600000, d: 86400000 };
        ms = value * map[unit];
      }
    }

    await member.edit({ communicationDisabledUntil: new Date(Date.now() + ms).toISOString() });

    // Create case
    const newCase = createCase(message.guildId, 'mute', message.author.id, message.author.username, client.user.id, client.user.username, reason);

    // Log to channel
    const botAvatar = client.user.displayAvatarURL();
    const embed = buildModEmbed('mute', message.author, { id: client.user.id, username: client.user.username }, reason, newCase.caseId, botAvatar);
    await sendLog(client, message.guildId, embed);

    return { success: true, action: 'mute', caseId: newCase.caseId, duration };
  } catch (error) {
    console.error('[automod] Failed to mute user:', error);
    return { success: false, action: 'mute', error: error.message };
  }
}

/**
 * Kick a user
 */
async function kickUser(message, reason, client) {
  try {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return { success: false, action: 'kick', error: 'Member not found' };

    await member.kick(reason);

    // Create case
    const newCase = createCase(message.guildId, 'kick', message.author.id, message.author.username, client.user.id, client.user.username, reason);

    // Log to channel
    const botAvatar = client.user.displayAvatarURL();
    const embed = buildModEmbed('kick', message.author, { id: client.user.id, username: client.user.username }, reason, newCase.caseId, botAvatar);
    await sendLog(client, message.guildId, embed);

    return { success: true, action: 'kick', caseId: newCase.caseId };
  } catch (error) {
    console.error('[automod] Failed to kick user:', error);
    return { success: false, action: 'kick', error: error.message };
  }
}

/**
 * Ban a user
 */
async function banUser(message, reason, client) {
  try {
    await message.guild.members.ban(message.author.id, { reason });

    // Create case
    const newCase = createCase(message.guildId, 'ban', message.author.id, message.author.username, client.user.id, client.user.username, reason);

    // Log to channel
    const botAvatar = client.user.displayAvatarURL();
    const embed = buildModEmbed('ban', message.author, { id: client.user.id, username: client.user.username }, reason, newCase.caseId, botAvatar);
    await sendLog(client, message.guildId, embed);

    return { success: true, action: 'ban', caseId: newCase.caseId };
  } catch (error) {
    console.error('[automod] Failed to ban user:', error);
    return { success: false, action: 'ban', error: error.message };
  }
}

/**
 * Execute multiple actions in sequence
 */
async function executeActions(actions, message, reason, client, duration = null) {
  const results = [];

  for (const action of actions) {
    switch (action) {
      case 'delete':
        results.push(await deleteMessage(message));
        break;
      case 'warn':
        results.push(await warnUser(message, reason, client));
        break;
      case 'mute':
        results.push(await muteUser(message, duration, reason, client));
        break;
      case 'kick':
        results.push(await kickUser(message, reason, client));
        break;
      case 'ban':
        results.push(await banUser(message, reason, client));
        break;
    }
  }

  return results;
}

module.exports = {
  deleteMessage,
  warnUser,
  muteUser,
  kickUser,
  banUser,
  executeActions,
};
