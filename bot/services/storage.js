const fs = require('fs');
const path = require('path');

const dataPath = process.env.RAIJIN_DATA_DIR || path.join(__dirname, '..', 'data');

const FILES = {
  cases:    path.join(dataPath, 'cases.json'),
  warnings: path.join(dataPath, 'warnings.json'),
  config:   path.join(dataPath, 'config.json'),
};

function read(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function write(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Cases
function loadCases()        { return read(FILES.cases); }
function saveCases(data)    { write(FILES.cases, data); }

// Warnings
function loadWarnings()     { return read(FILES.warnings); }
function saveWarnings(data) { write(FILES.warnings, data); }

// Config
function loadConfig()       { return read(FILES.config); }
function saveConfig(data)   { write(FILES.config, data); }

module.exports = {
  loadCases, saveCases,
  loadWarnings, saveWarnings,
  loadConfig, saveConfig,
};