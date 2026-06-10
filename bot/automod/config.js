/**
 * Auto Moderation Config Utilities
 * Helps initialize and validate automod config structure
 */

const { loadConfig, saveConfig } = require('../services/storage');

/**
 * Get default automod config structure
 */
function getDefaultConfig() {
  return {
    enabled: false,
    continueAfterTrigger: false,
    bannedWords: {
      enabled: false,
      immuneRoles: [],
      whitelistChannels: [],
      words: [],
    },
    spam: {
      enabled: false,
      limit: 5,
      interval: 3000,
      immuneRoles: [],
      whitelistChannels: [],
      actions: ['delete', 'mute'],
      response: null,
    },
    links: {
      enabled: false,
      blockInvites: true,
      blockLinks: true,
      whitelistDomains: [],
      whitelistInvites: [],
      immuneRoles: [],
      whitelistChannels: [],
      actions: ['delete'],
      response: null,
    },
    caps: {
      enabled: false,
      threshold: 70,
      minLength: 5,
      immuneRoles: [],
      whitelistChannels: [],
      actions: ['delete'],
      response: null,
    },
    mentions: {
      enabled: false,
      limit: 5,
      excludeUserMentions: false,
      immuneRoles: [],
      whitelistChannels: [],
      actions: ['delete'],
      response: null,
    },
    antiRaid: {
      enabled: false,
      threshold: 5,
      detectionWindow: 10000,
      cooldown: 60000,
      actions: ['slowmode'],
      slowmodeDuration: 10,
      minAccountAge: 7,
    },
    warningEscalation: {
      enabled: false,
      rules: [
        {
          threshold: 3,
          actions: ['mute'],
          duration: '10m',
        },
        {
          threshold: 5,
          actions: ['ban'],
          duration: null,
        },
      ],
    },
  };
}

/**
 * Ensure automod config exists for a guild
 */
function ensureGuildConfig(guildId) {
  const config = loadConfig();

  if (!config[guildId]) {
    config[guildId] = {};
  }

  if (!config[guildId].automod) {
    config[guildId].automod = getDefaultConfig();
    saveConfig(config);
  }

  return config[guildId].automod;
}

/**
 * Update automod config for a guild
 */
function updateGuildConfig(guildId, updates) {
  const config = loadConfig();

  if (!config[guildId]) {
    config[guildId] = {};
  }

  if (!config[guildId].automod) {
    config[guildId].automod = getDefaultConfig();
  }

  // Deep merge updates
  config[guildId].automod = deepMerge(config[guildId].automod, updates);
  saveConfig(config);

  return config[guildId].automod;
}

/**
 * Deep merge objects
 */
function deepMerge(target, source) {
  const output = { ...target };

  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  }

  return output;
}

module.exports = {
  getDefaultConfig,
  ensureGuildConfig,
  updateGuildConfig,
};
