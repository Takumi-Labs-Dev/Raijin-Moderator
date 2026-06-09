require('dotenv').config({
  path: process.env.DOTENV_PATH || require('path').join(__dirname, '..', '.env'),
});
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const loadCommands = require('./utils/loadCommands');
const loadEvents = require('./utils/loadEvents');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
});

client.commands = new Collection();

loadCommands(client);
loadEvents(client);

client.login(process.env.DISCORD_TOKEN);