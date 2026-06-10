const path = require('path');

// Load .env for local development only — Docker/Electron inject env vars directly
if (process.env.NODE_ENV !== 'production') {
  try {
    const envPath = process.env.DOTENV_PATH || path.join(__dirname, '..', '.env');
    require('dotenv').config({ path: envPath });
  } catch (e) {}
}

// Fallback for local dev if .env still not loading
if (!process.env.SESSION_SECRET)  process.env.SESSION_SECRET  = 'local_dev_secret_32chars_minimum';
if (!process.env.DASHBOARD_PASSWORD) process.env.DASHBOARD_PASSWORD = 'admin';

const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  }
}));

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static('/assets'));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Try again in 15 minutes.'
});

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect('/login.html');
}

function getDataDir() {
  if (process.env.RAIJIN_DATA_DIR) return process.env.RAIJIN_DATA_DIR;
  const dockerPath = path.join('/app', 'data');
  if (fs.existsSync(dockerPath)) return dockerPath;
  return path.join(__dirname, '..', 'data');
}

function readJSON(filename) {
  try {
    const filePath = path.join(getDataDir(), filename);
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function writeJSON(filename, data) {
  try {
    const filePath = path.join(getDataDir(), filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write JSON:', err);
    return false;
  }
}

// ── AUTH ROUTES ───────────────────────────────────────────────────

app.post('/login', loginLimiter, (req, res) => {
  const { password } = req.body;
  if (password === process.env.DASHBOARD_PASSWORD) {
    req.session.authenticated = true;
    res.redirect('/');
  } else {
    res.redirect('/login.html?error=1');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

// ── PAGE ROUTES ───────────────────────────────────────────────────

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/cases', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cases.html'));
});

app.get('/warnings', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'warnings.html'));
});

app.get('/logs', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logs.html'));
});

app.get('/stats', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

app.get('/automod', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'automod.html'));
});

// ── API DATA ROUTES ───────────────────────────────────────────────

app.get('/api/overview', requireAuth, (req, res) => {
  const cases = readJSON('cases.json');
  if (!cases) return res.json({ error: 'No data found' });

  let allCases = [];
  for (const guildId in cases) {
    const guildCases = cases[guildId].cases || [];
    allCases = allCases.concat(guildCases);
  }

  allCases.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const counts = { ban: 0, kick: 0, mute: 0, warn: 0, unmute: 0, clearwarnings: 0 };
  for (const c of allCases) {
    if (counts[c.type] !== undefined) counts[c.type]++;
  }

  const byDate = {};
  for (const c of allCases) {
    const date = c.timestamp.slice(0, 10);
    if (!byDate[date]) byDate[date] = 0;
    byDate[date]++;
  }

  const timeline = Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  res.json({
    counts,
    recent: allCases.slice(0, 10),
    timeline
  });
});

app.get('/api/cases', requireAuth, (req, res) => {
  const cases = readJSON('cases.json');
  if (!cases) return res.json({ cases: [] });

  let allCases = [];
  for (const guildId in cases) {
    const guildCases = cases[guildId].cases || [];
    allCases = allCases.concat(guildCases);
  }

  allCases.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const type   = req.query.type   ? req.query.type.toLowerCase()   : null;
  const search = req.query.search ? req.query.search.toLowerCase() : null;

  if (type)   allCases = allCases.filter(c => c.type === type);
  if (search) allCases = allCases.filter(c =>
    c.username.toLowerCase().includes(search) ||
    c.moderatorName.toLowerCase().includes(search)
  );

  res.json({ cases: allCases, total: allCases.length });
});

app.get('/api/warnings', requireAuth, (req, res) => {
  const warnings = readJSON('warnings.json');
  if (!warnings) return res.json({ found: false });

  const search = req.query.user ? req.query.user.toLowerCase().trim() : null;
  if (!search) return res.json({ found: false });

  let results = [];
  let matchedUsername = null;

  for (const guildId in warnings) {
    const guild = warnings[guildId];
    for (const userId in guild) {
      const cases = readJSON('cases.json');
      if (!cases) continue;
      const guildCases = cases[guildId] ? cases[guildId].cases || [] : [];
      const match = guildCases.find(c =>
        c.userId === userId &&
        c.username.toLowerCase().includes(search)
      );
      if (match) {
        matchedUsername = match.username;
        const userWarnings = guild[userId].warnings || [];
        results = results.concat(userWarnings);
      }
    }
  }

  if (results.length === 0 && !matchedUsername) {
    return res.json({ found: false });
  }

  results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    found: true,
    username: matchedUsername || search,
    total: results.length,
    warnings: results
  });
});

app.get('/api/logs', requireAuth, (req, res) => {
  const logs = readJSON('logs.json');
  if (!logs) return res.json({ logs: [] });

  let allLogs = [];
  for (const guildId in logs) {
    const entries = logs[guildId] || [];
    // Attach guildId and array index so the frontend can reference them for deletion
    entries.forEach((entry, index) => {
      allLogs.push({ ...entry, _guildId: guildId, _index: index });
    });
  }

  allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const type = req.query.type ? req.query.type.toLowerCase() : null;
  if (type) allLogs = allLogs.filter(l => l.type === type);

  res.json({ logs: allLogs, total: allLogs.length });
});

app.get('/api/stats', requireAuth, (req, res) => {
  const cases    = readJSON('cases.json');
  const warnings = readJSON('warnings.json');
  if (!cases) return res.json({ error: 'No data found' });

  let allCases = [];
  for (const guildId in cases) {
    allCases = allCases.concat(cases[guildId].cases || []);
  }

  const typeCounts = { ban: 0, kick: 0, mute: 0, warn: 0, unmute: 0, clearwarnings: 0 };
  for (const c of allCases) {
    if (typeCounts[c.type] !== undefined) typeCounts[c.type]++;
  }

  const now      = new Date();
  const day30ago = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const byDate   = {};

  for (let d = new Date(day30ago); d <= now; d.setDate(d.getDate() + 1)) {
    byDate[d.toISOString().slice(0, 10)] = 0;
  }

  for (const c of allCases) {
    const date = c.timestamp.slice(0, 10);
    if (byDate[date] !== undefined) byDate[date]++;
  }

  const timeline = Object.entries(byDate).map(([date, count]) => ({ date, count }));

  const warnCounts = {};
  for (const c of allCases) {
    if (c.type === 'warn') {
      warnCounts[c.username] = (warnCounts[c.username] || 0) + 1;
    }
  }

  const mostWarned = Object.entries(warnCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([username, count]) => ({ username, count }));

  const modCounts = {};
  for (const c of allCases) {
    modCounts[c.moderatorName] = (modCounts[c.moderatorName] || 0) + 1;
  }

  const topMods = Object.entries(modCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const now2     = new Date();
  const weekAgo  = new Date(now2 - 7  * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now2 - 30 * 24 * 60 * 60 * 1000);

  const thisWeek  = allCases.filter(c => new Date(c.timestamp) >= weekAgo).length;
  const thisMonth = allCases.filter(c => new Date(c.timestamp) >= monthAgo).length;
  const allTime   = allCases.length;

  res.json({
    typeCounts,
    timeline,
    mostWarned,
    topMods,
    summary: { thisWeek, thisMonth, allTime }
  });
});

// ── AUTOMOD API ROUTES ────────────────────────────────────────────

app.get('/api/automod/config/:guildId', requireAuth, (req, res) => {
  const config = readJSON('config.json');
  if (!config) return res.json({ error: 'Config not found' });

  const guildId = req.params.guildId;
  const automodConfig = config[guildId]?.automod || {
    enabled: false,
    continueAfterTrigger: false,
    bannedWords: { enabled: false, immuneRoles: [], whitelistChannels: [], words: [] },
    spam: { enabled: false, limit: 5, interval: 3000, immuneRoles: [], whitelistChannels: [], actions: ['delete', 'mute'], response: null },
    links: { enabled: false, blockInvites: true, blockLinks: true, whitelistDomains: [], whitelistInvites: [], immuneRoles: [], whitelistChannels: [], actions: ['delete'], response: null },
    caps: { enabled: false, threshold: 70, minLength: 5, immuneRoles: [], whitelistChannels: [], actions: ['delete'], response: null },
    mentions: { enabled: false, limit: 5, excludeUserMentions: false, immuneRoles: [], whitelistChannels: [], actions: ['delete'], response: null },
    antiRaid: { enabled: false, threshold: 5, detectionWindow: 10000, cooldown: 60000, actions: ['slowmode'], slowmodeDuration: 10, minAccountAge: 7 },
    warningEscalation: { enabled: false, rules: [{ threshold: 3, actions: ['mute'], duration: '10m' }, { threshold: 5, actions: ['ban'], duration: null }] },
  };

  res.json(automodConfig);
});

app.post('/api/automod/config/:guildId', requireAuth, (req, res) => {
  const config = readJSON('config.json');
  if (!config) return res.json({ error: 'Config not found' });

  const guildId = req.params.guildId;
  const updates = req.body;

  if (!config[guildId]) config[guildId] = {};
  if (!config[guildId].automod) config[guildId].automod = {};

  config[guildId].automod = deepMerge(config[guildId].automod, updates);

  if (writeJSON('config.json', config)) {
    res.json({ success: true, config: config[guildId].automod });
  } else {
    res.json({ success: false, error: 'Failed to save config' });
  }
});

app.post('/api/automod/banned-words/:guildId', requireAuth, (req, res) => {
  const config = readJSON('config.json');
  if (!config) return res.json({ error: 'Config not found' });

  const guildId = req.params.guildId;
  const { action, word } = req.body;

  if (!config[guildId]) config[guildId] = {};
  if (!config[guildId].automod) config[guildId].automod = {};
  if (!config[guildId].automod.bannedWords) config[guildId].automod.bannedWords = { enabled: false, immuneRoles: [], whitelistChannels: [], words: [] };

  const bannedWords = config[guildId].automod.bannedWords;

  if (action === 'add' && word) {
    bannedWords.words.push(word);
  } else if (action === 'remove' && word) {
    bannedWords.words = bannedWords.words.filter(w => w.word !== word);
  } else if (action === 'update' && word) {
    const index = bannedWords.words.findIndex(w => w.word === word.word);
    if (index !== -1) {
      bannedWords.words[index] = word;
    }
  }

  if (writeJSON('config.json', config)) {
    res.json({ success: true, words: bannedWords.words });
  } else {
    res.json({ success: false, error: 'Failed to save config' });
  }
});

// ── GUILD INFO API ────────────────────────────────────────────────

app.get('/api/guild/:guildId', requireAuth, (req, res) => {
  const config = readJSON('config.json');
  if (!config) return res.json({ error: 'Config not found' });

  const guildId = req.params.guildId;
  const guildConfig = config[guildId];

  res.json({
    id: guildId,
    name: guildConfig?.serverName || 'Unknown Server',
    icon: guildConfig?.serverIcon || null,
    memberCount: guildConfig?.memberCount || 0,
    logChannelId: guildConfig?.logChannelId || null
  });
});

// ── DELETE API ROUTES ─────────────────────────────────────────────
// IMPORTANT: specific routes (/guild/:guildId) must come BEFORE
// parameterized ones (/:caseId / /:logId) or Express matches wrong

app.delete('/api/cases/guild/:guildId', requireAuth, (req, res) => {
  const cases = readJSON('cases.json');
  if (!cases) return res.json({ success: false, error: 'Cases not found' });

  const guildId = req.params.guildId;

  if (cases[guildId]) {
    cases[guildId].cases = [];
    if (writeJSON('cases.json', cases)) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Failed to save' });
    }
  } else {
    res.json({ success: false, error: 'Guild not found' });
  }
});

app.delete('/api/cases/:caseId', requireAuth, (req, res) => {
  const cases = readJSON('cases.json');
  if (!cases) return res.json({ success: false, error: 'Cases not found' });

  const rawId = req.params.caseId;
  const caseIdNum = parseInt(rawId);
  let found = false;

  for (const guildId in cases) {
    const guildCases = cases[guildId].cases || [];
    const index = guildCases.findIndex(c =>
      c.caseId === caseIdNum || String(c.caseId) === rawId
    );

    if (index !== -1) {
      guildCases.splice(index, 1);
      cases[guildId].cases = guildCases;
      found = true;
      break;
    }
  }

  if (found) {
    if (writeJSON('cases.json', cases)) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Failed to save cases.json' });
    }
  } else {
    res.json({ success: false, error: 'Case not found' });
  }
});

app.delete('/api/logs/guild/:guildId', requireAuth, (req, res) => {
  const logs = readJSON('logs.json');
  if (!logs) return res.json({ success: false, error: 'Logs not found' });

  const guildId = req.params.guildId;

  if (logs[guildId]) {
    logs[guildId] = [];
    if (writeJSON('logs.json', logs)) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Failed to save' });
    }
  } else {
    res.json({ success: false, error: 'Guild not found' });
  }
});

// Delete a single log by guildId + index (logs have no unique id field)
// Frontend must send: DELETE /api/logs/:guildId/:index
app.delete('/api/logs/:guildId/:index', requireAuth, (req, res) => {
  const logs = readJSON('logs.json');
  if (!logs) return res.json({ success: false, error: 'Logs not found' });

  const { guildId, index } = req.params;
  const idx = parseInt(index);

  if (!logs[guildId]) {
    return res.json({ success: false, error: 'Guild not found' });
  }

  if (isNaN(idx) || idx < 0 || idx >= logs[guildId].length) {
    return res.json({ success: false, error: 'Invalid index' });
  }

  logs[guildId].splice(idx, 1);

  if (writeJSON('logs.json', logs)) {
    res.json({ success: true });
  } else {
    res.json({ success: false, error: 'Failed to save logs.json' });
  }
});

// ── HELPERS ───────────────────────────────────────────────────────

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`雷 ¦ Raijin Dashboard running on port ${PORT}`);
});