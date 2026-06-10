const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const PORT = 3000;
const DASHBOARD_URL = `http://127.0.0.1:${PORT}`;

let mainWindow = null;
let botProcess = null;
let dashboardProcess = null;

function getProjectRoot() {
  const base = path.join(__dirname, '..');
  const unpacked = base.replace('app.asar', 'app.asar.unpacked');
  return fs.existsSync(unpacked) ? unpacked : base;
}

function getUserPaths() {
  const userData = app.getPath('userData');
  return {
    userData,
    dataDir: path.join(userData, 'data'),
    envFile: path.join(userData, '.env'),
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyIfMissing(source, dest) {
  if (!fs.existsSync(dest) && fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
  }
}

function seedUserData() {
  const root = getProjectRoot();
  const bundledData = path.join(root, 'data');
  const { dataDir, envFile } = getUserPaths();

  ensureDir(dataDir);

  for (const file of ['cases.json', 'warnings.json', 'config.json', 'logs.json']) {
    copyIfMissing(path.join(bundledData, file), path.join(dataDir, file));
  }

  copyIfMissing(path.join(root, '.env.example'), envFile);

  if (!fs.existsSync(envFile)) {
    fs.writeFileSync(
      envFile,
      [
        'DISCORD_TOKEN=your_bot_token_here',
        'CLIENT_ID=your_application_client_id',
        'SESSION_SECRET=change_this_to_a_random_32_char_string',
        'DASHBOARD_PASSWORD=admin',
        '',
      ].join('\n'),
      'utf8'
    );
  }
}

function loadEnvFile(envFile) {
  if (!fs.existsSync(envFile)) return;

  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function childEnv() {
  const { dataDir, envFile } = getUserPaths();
  loadEnvFile(envFile);

  return {
    ...process.env,
    RAIJIN_DATA_DIR: dataDir,
    DOTENV_PATH: envFile,
    ELECTRON_RUN_AS_NODE: '1',
  };
}

function spawnNode(script, cwd, extraEnv = {}) {
  const env = { ...childEnv(), ...extraEnv, ELECTRON_RUN_AS_NODE: '1' };

  return spawn(process.execPath, [script], {
    cwd,
    env,
    stdio: 'inherit',
  });
}

function startDashboard() {
  const root = getProjectRoot();
  const script = path.join(root, 'dashboard', 'server.js');

  dashboardProcess = spawnNode(script, path.join(root, 'dashboard'), {
    NODE_ENV: 'production',
    PORT: String(PORT),
  });

  dashboardProcess.on('exit', (code) => {
    dashboardProcess = null;
    if (code !== 0 && code !== null) {
      console.error(`Dashboard exited with code ${code}`);
    }
  });
}

function startBot() {
  const root = getProjectRoot();
  const script = path.join(root, 'bot', 'index.js');
  const { envFile } = getUserPaths();
  loadEnvFile(envFile);

  if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN === 'your_bot_token_here') {
    console.warn('DISCORD_TOKEN not configured — bot will not connect until .env is updated.');
    return;
  }

  botProcess = spawnNode(script, path.join(root, 'bot'));

  botProcess.on('exit', (code) => {
    botProcess = null;
    if (code !== 0 && code !== null) {
      console.error(`Bot exited with code ${code}`);
    }
  });
}

function waitForServer(url, attempts = 60, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    let tries = 0;

    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        tries += 1;
        if (tries >= attempts) {
          reject(new Error(`Server did not start at ${url}`));
          return;
        }
        setTimeout(check, intervalMs);
      });
    };

    check();
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: '雷 ¦ Raijin',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(DASHBOARD_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function stopChildProcesses() {
  for (const proc of [botProcess, dashboardProcess]) {
    if (proc && !proc.killed) {
      proc.kill();
    }
  }
  botProcess = null;
  dashboardProcess = null;
}

async function warnIfEnvMissing() {
  const { envFile } = getUserPaths();
  loadEnvFile(envFile);

  if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN === 'your_bot_token_here') {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'Raijin setup required',
      message: 'Discord bot token not configured',
      detail: `Edit your settings file, then restart Raijin:\n\n${envFile}`,
      buttons: ['Open folder', 'Continue to dashboard'],
      defaultId: 1,
      cancelId: 1,
    });

    if (response === 0) {
      shell.showItemInFolder(envFile);
    }
  }
}

app.whenReady().then(async () => {
  seedUserData();
  startDashboard();

  try {
    await waitForServer(DASHBOARD_URL);
  } catch (err) {
    dialog.showErrorBox('Raijin failed to start', err.message);
    app.quit();
    return;
  }

  await createWindow();
  await warnIfEnvMissing();
  startBot();
});

app.on('window-all-closed', () => {
  stopChildProcesses();
  app.quit();
});

app.on('before-quit', () => {
  stopChildProcesses();
});