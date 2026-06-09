module.exports = {
  name: 'ready',
  once: true,

  execute(client) {
    console.log(`[雷 ¦ Raijin] Online as ${client.user.tag}`);
    console.log(`[雷 ¦ Raijin] Serving ${client.guilds.cache.size} guild(s)`);
  },
};