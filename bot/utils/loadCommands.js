const fs = require('fs');
const path = require('path');

function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  let loaded = 0;

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (!command.data || !command.execute) {
      console.warn(`[loadCommands] Skipping ${file} — missing data or execute`);
      continue;
    }

    client.commands.set(command.data.name, command);
    loaded++;
  }

  console.log(`[loadCommands] Loaded ${loaded} commands`);
}

module.exports = loadCommands;