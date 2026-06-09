<div align="center">

<img src="https://i.ibb.co/SXf4xZMN/Raijin-Profile.png" width="30%" />

# 雷 ¦ Raijin

### High-Performance Discord Moderation Bot & Dashboard

*A precision-engineered Discord moderation system built for control, visibility, and real-time server management.*

---

![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge\&logo=nodedotjs\&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge\&logo=discord\&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge\&logo=docker\&logoColor=white)
![JSON](https://img.shields.io/badge/Storage-JSON-000000?style=for-the-badge\&logo=json\&logoColor=white)

</div>

---

## ✦ Features

* **⚔️ Moderation Commands** — Execute `ban`, `kick`, `timeout`, and `warn` via modern slash commands
* **📋 Advanced Logging** — Records every moderation action with full moderator + user details
* **⚠️ Warning System** — Tracks warnings and complete moderation history per user
* **📁 Case Logs** — Structured logs for accountability and audits
* **📝 Message Logs** — Tracks deletions, edits, joins, and leaves in real time
* **🚩 Risk Detection** — Flags newly created accounts for potential threats
* **💾 Persistent Storage** — Data survives restarts with zero loss
* **⚡ Lightweight System** — Local JSON-based storage, no database required

---

## ✦ Dashboard System

* **🌐 Web Control Panel** — Manage your server remotely
* **📊 Logs & Cases Viewer** — Clean interface for logs, cases, and user history
* **⚙️ Configurable Settings** — Adjust moderation settings without touching code
* **📡 Real-Time Monitoring** — Live server activity tracking
* **🛡️ Full Admin Control** — Built for speed, clarity, and complete oversight

---

## ✦ Tech Stack

| Layer       | Tool               |
| ----------- | ------------------ |
| Runtime     | Node.js (LTS)      |
| Bot Library | Discord.js v14     |
| Storage     | Local JSON files   |
| Hosting     | Docker (Windows)   |
| Dashboard   | Node.js Web Panel  |
| Editor      | Visual Studio Code |

---

## ✦ Setup

### Prerequisites

* Node.js (LTS)
* Docker Desktop
* A Discord bot token

### 1. Clone the repo

```bash
git clone https://github.com/Takumi-Labs-Dev/Raijin.git
cd Raijin
npm install
```

### 2. Create your `.env` file

```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id
GUILD_ID=your_server_id
PORT=3000
```

### 3. Register slash commands

```bash
node bot/deploy-commands.js
```

### 4. Start with Docker

```bash
docker-compose up --build -d
```

### 5. Open the dashboard

http://localhost:3000

---

## ✦ Bot Commands

| Command    | Description                  |
| ---------- | ---------------------------- |
| `/ban`     | Ban a user from the server   |
| `/kick`    | Kick a user                  |
| `/timeout` | Temporarily mute a user      |
| `/warn`    | Issue a warning              |
| `/case`    | View moderation case details |
| `/logs`    | View recent moderation logs  |

---

## ✦ How It Works

Moderator executes command
↓
Raijin processes action
↓
User affected (ban/kick/etc.)
↓
Action logged with full details
↓
Dashboard updates in real-time

---

## ✦ System Highlights

| Feature              | Description                         |
| -------------------- | ----------------------------------- |
| Precision Moderation | Fast and reliable command execution |
| Full Visibility      | Every action tracked and viewable   |
| Zero Data Loss       | Persistent JSON storage             |
| Real-Time Insight    | Instant logging + dashboard updates |

---

## ✦ Version

**Current Version:** `1.0.0`

---

## ✦ License

Private — All rights reserved © Takumi Labs

</div>
