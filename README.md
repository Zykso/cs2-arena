# CS2 Arena — Tournament Platform

A full-featured CS2 tournament management platform with live bracket tracking, team management, player stats, and direct CS2 server control via RCON.

![CS2 Arena](https://img.shields.io/badge/CS2-Tournament_Platform-orange?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-24+-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge)

---

## Features

- **Tournament Formats** — Single Elimination, Double Elimination, Round Robin, Swiss System
- **Live Brackets** — Real-time bracket updates via WebSockets
- **Team Management** — Create teams, invite players via shareable link
- **Player Stats** — K/D, ADR, rating leaderboard across all matches
- **Server Control** — Live RCON console, map switching, match launching
- **Steam Authentication** — Login with Steam
- **Admin Panel** — Manage user roles (user / admin / superadmin)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite via Prisma ORM |
| Real-time | Socket.io |
| Auth | Steam OpenID (passport-steam) |

---

## Requirements

- Node.js 18+
- A Steam API key — [Get one here](https://steamcommunity.com/dev/apikey)
- A CS2 server with RCON enabled (optional, for server control)

---

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/cs2-arena.git
cd cs2-arena
```

### 2. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in:

```env
SESSION_SECRET=any_long_random_string
STEAM_API_KEY=your_steam_api_key
CLIENT_URL=http://localhost:5173
API_URL=http://localhost:3001
```

### 4. Set up the database

```bash
cd backend
npx prisma db push
```

### 5. Start the platform

**Windows:**
```
Double-click start.bat
```

**Linux / macOS:**
```bash
chmod +x start.sh
./start.sh
```

Then open **http://localhost:5173** in your browser.

---

## First-time Setup

1. Open the app and **Login with Steam**
2. Set yourself as superadmin by running this in the backend folder:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.update({
  where: { steamId: 'YOUR_STEAM_ID_64' },
  data: { role: 'superadmin' }
}).then(() => { console.log('Done'); prisma.\$disconnect(); });
"
```

> Find your Steam64 ID at [steamid.io](https://steamid.io)

---

## CS2 Server Setup

To connect your CS2 server, add these to your `server.cfg`:

```
rcon_password        your_rcon_password
sv_rcon_whitelist_address  your_machine_ip
sv_rcon_maxfailures  999
sv_rcon_banpenalty   0
```

Then go to **Servers → Add Server** in the app and enter your server details.

---

## Project Structure

```
cs2-arena/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── services/         # Prisma, RCON, bracket logic, auth
│   │   ├── socket/           # Socket.io handlers
│   │   └── index.ts          # Entry point
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/            # React pages
│       ├── components/       # Shared components
│       ├── hooks/            # useAuth, useSocket
│       └── api/              # API client
├── start.bat                 # Windows startup script
├── start.sh                  # Linux/macOS startup script
└── README.md
```

---

## License

MIT
