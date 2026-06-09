const { loadCases, saveCases } = require('./storage');

function createCase(guildId, type, userId, username, moderatorId, moderatorName, reason) {
  const data = loadCases();

  if (!data[guildId]) {
    data[guildId] = {
      caseCounter: 0,
      cases: [],
    };
  }

  const guildData = data[guildId];
  guildData.caseCounter += 1;

  const newCase = {
    caseId:        guildData.caseCounter,
    type,
    userId,
    username,
    moderatorId,
    moderatorName,
    reason,
    timestamp:     new Date().toISOString(),
  };

  guildData.cases.push(newCase);
  saveCases(data);

  return newCase;
}

function getCase(guildId, caseId) {
  const data = loadCases();

  if (!data[guildId]) return null;

  const found = data[guildId].cases.find(c => c.caseId === caseId);
  return found || null;
}

module.exports = { createCase, getCase };