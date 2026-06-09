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
    allLogs = allLogs.concat(entries);
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

app.listen(PORT, '127.0.0.1', () => {
  console.log(`雷 ¦ Raijin Dashboard running on port ${PORT}`);
});