/**
 * Auto Moderation Handler
 * Coordinates all automod filters and executes actions
 */

const { filters } = require('./filters');
const { executeActions } = require('./actions');
const { loadConfig, saveConfig, loadWarnings } = require('../services/storage');
const { buildEventEmbed, sendLog } = require('../services/logger');

/**
 * Process a message through all automod filters
 */
async function handleMessage(message, client) {
  // Skip bots and DMs
  if (message.author.bot || !message.guild) return;

  const guildId = message.guildId;
  const config = loadConfig();

  // Load automod config for this guild
  const automodConfig = config[guildId]?.automod;
  if (!automodConfig || !automodConfig.enabled) return;

  // Check warning escalation before running filters
  const escalationResult = await checkWarningEscalation(message, client, automodConfig.warningEscalation);
  if (escalationResult.triggered) {
    // Execute escalation actions
    const escalationActions = escalationResult.actions || ['mute'];
    const duration = escalationResult.duration || '10m';
    const reason = `Warning escalation: ${escalationResult.warningCount} warnings`;
    
    const results = await executeActions(escalationActions, message, reason, client, duration);
    
    // Log escalation
    await logAutomodTrigger(message, client, {
      type: 'warning_escalation',
      rule: 'Warning Escalation',
      warningCount: escalationResult.warningCount,
      actions: escalationActions,
    });

    return;
  }

  // Run all filters
  const filterResults = [];

  // Banned Words
  if (automodConfig.bannedWords?.enabled) {
    const result = filters.bannedWords.check(message, automodConfig.bannedWords);
    if (result.triggered) filterResults.push({ filter: 'bannedWords', ...result });
  }

  // Spam Protection
  if (automodConfig.spam?.enabled) {
    const result = filters.spamProtection.check(message, automodConfig.spam);
    if (result.triggered) filterResults.push({ filter: 'spam', ...result });
  }

  // Link Filter
  if (automodConfig.links?.enabled) {
    const result = filters.linkFilter.check(message, automodConfig.links);
    if (result.triggered) filterResults.push({ filter: 'links', ...result });
  }

  // Caps Filter
  if (automodConfig.caps?.enabled) {
    const result = filters.capsFilter.check(message, automodConfig.caps);
    if (result.triggered) filterResults.push({ filter: 'caps', ...result });
  }

  // Mention Spam
  if (automodConfig.mentions?.enabled) {
    const result = filters.mentionSpam.check(message, automodConfig.mentions);
    if (result.triggered) filterResults.push({ filter: 'mentions', ...result });
  }

  // Process triggered filters
  for (const result of filterResults) {
    const actions = result.actions || ['delete'];
    const duration = result.duration || null;
    const ruleName = result.rule?.word || result.matchType || result.filter;
    const reason = `Auto Moderation: ${ruleName}`;

    // Execute actions
    const actionResults = await executeActions(actions, message, reason, client, duration);

    // Send auto response if configured
    if (result.response) {
      const response = formatResponse(result.response, message, result);
      try {
        await message.channel.send(response);
      } catch (error) {
        console.error('[automod] Failed to send auto response:', error);
      }
    }

    // Log to channel and file
    await logAutomodTrigger(message, client, {
      type: result.filter,
      rule: ruleName,
      actions: actions,
      details: result,
    });

    // Stop after first trigger (unless configured otherwise)
    if (!automodConfig.continueAfterTrigger) break;
  }
}

/**
 * Check warning escalation
 */
async function checkWarningEscalation(message, client, escalationConfig) {
  if (!escalationConfig || !escalationConfig.enabled) {
    return { triggered: false };
  }

  const warnings = loadWarnings();
  const guildId = message.guildId;
  const userId = message.author.id;

  const userWarnings = warnings[guildId]?.[userId]?.warnings || [];
  const warningCount = userWarnings.length;

  // Check escalation rules
  for (const rule of escalationConfig.rules || []) {
    if (warningCount >= rule.threshold) {
      return {
        triggered: true,
        warningCount: warningCount,
        threshold: rule.threshold,
        actions: rule.actions,
        duration: rule.duration,
      };
    }
  }

  return { triggered: false };
}

/**
 * Format auto response with variables
 */
function formatResponse(template, message, filterResult) {
  let response = template;

  // Replace variables
  response = response.replace(/{user}/g, `<@${message.author.id}>`);
  response = response.replace(/{word}/g, filterResult.word || 'triggered content');
  response = response.replace(/{channel}/g, `<#${message.channelId}>`);

  return response;
}

/**
 * Log automod trigger to channel and file
 */
async function logAutomodTrigger(message, client, data) {
  const embed = buildEventEmbed('automod', {
    'User': `${message.author.username} (<@${message.author.id}>)`,
    'Channel': `<#${message.channelId}>`,
    'Filter': data.type,
    'Rule': data.rule,
    'Actions': data.actions.join(', '),
    ...(data.details?.word && { 'Triggered Word': data.details.word }),
    ...(data.details?.capsPercentage && { 'Caps %': data.details.capsPercentage }),
    ...(data.details?.mentionCount && { 'Mentions': data.details.mentionCount }),
    ...(data.details?.messageCount && { 'Message Count': data.details.messageCount }),
    ...(data.details?.url && { 'URL': data.details.url }),
    ...(data.details?.warningCount && { 'Warning Count': data.details.warningCount }),
  }, client.user.displayAvatarURL(), message.guildId);

  await sendLog(client, message.guildId, embed);
}

/**
 * Handle member join for anti-raid detection
 */
async function handleMemberJoin(member, client) {
  const guildId = member.guild.id;
  const config = loadConfig();

  const automodConfig = config[guildId]?.automod;
  if (!automodConfig || !automodConfig.antiRaid?.enabled) return;

  // Record join
  filters.antiRaid.recordJoin(guildId);

  // Check for raid
  const result = filters.antiRaid.check(member.guild, automodConfig.antiRaid);
  if (result.triggered) {
    // Execute anti-raid actions
    const actionResults = await filters.antiRaid.executeActions(
      member.guild,
      result.actions,
      automodConfig.antiRaid
    );

    // Log raid detection
    const embed = buildEventEmbed('antiRaid', {
      'Event': 'Raid Detected',
      'Join Count': result.joinCount,
      'Threshold': result.threshold,
      'Detection Window': `${result.detectionWindow / 1000}s`,
      'Actions': result.actions.join(', '),
    }, client.user.displayAvatarURL(), guildId);

    await sendLog(client, guildId, embed);
  }
}

module.exports = {
  handleMessage,
  handleMemberJoin,
};
