#!/bin/bash
# CS2 Arena - Auto-update script
# Checks for new commits on GitHub and rebuilds if there are changes.
# Installed as a systemd timer by setup.sh — runs every 5 minutes.

REPO_DIR="/opt/cs2-arena"
LOG="/var/log/cs2-arena-update.log"

cd "$REPO_DIR" || exit 1

git fetch origin main >> "$LOG" 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[$(date)] New version detected ($LOCAL -> $REMOTE), updating..." >> "$LOG"
    git pull origin main >> "$LOG" 2>&1
    docker compose up -d --build >> "$LOG" 2>&1
    echo "[$(date)] Update complete." >> "$LOG"
fi
