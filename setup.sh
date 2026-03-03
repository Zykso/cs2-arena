#!/bin/bash
set -e

# CS2 Arena - Ubuntu Server Setup Script
# Run as root or with sudo privileges

echo "=== CS2 Arena Setup ==="

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "[1/4] Installing Docker..."
    apt-get update -q
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -q
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "Docker installed."
else
    echo "[1/4] Docker already installed, skipping."
fi

# Clone or update repo
REPO_DIR="/opt/cs2-arena"
if [ ! -d "$REPO_DIR" ]; then
    echo "[2/4] Cloning repository..."
    git clone https://github.com/ZyKSo/CS2-Tournament.git "$REPO_DIR"
else
    echo "[2/4] Repository already exists, pulling latest..."
    git -C "$REPO_DIR" pull
fi

cd "$REPO_DIR"

# Set up .env if not present
if [ ! -f ".env" ]; then
    echo "[3/4] Setting up .env file..."
    cp .env.example .env

    # Try to auto-detect server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')

    # Prompt for required values
    read -rp "Enter your Steam API key (get from https://steamcommunity.com/dev/apikey): " STEAM_KEY
    read -rp "Enter a session secret (any long random string): " SESSION_SECRET_VAL
    read -rp "Enter your server IP [$SERVER_IP]: " INPUT_IP
    SERVER_IP="${INPUT_IP:-$SERVER_IP}"

    sed -i "s|your_steam_api_key_here|$STEAM_KEY|" .env
    sed -i "s|change_this_to_a_long_random_string|$SESSION_SECRET_VAL|" .env
    sed -i "s|http://your-server-ip|http://$SERVER_IP|g" .env

    echo ".env configured."
else
    echo "[3/4] .env already exists, skipping."
fi

# Install auto-update systemd timer
echo "[4/5] Installing auto-update timer (checks GitHub every 5 minutes)..."

cat > /etc/systemd/system/cs2-arena-update.service <<'SERVICE'
[Unit]
Description=CS2 Arena auto-update
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/cs2-arena/update.sh
WorkingDirectory=/opt/cs2-arena
SERVICE

cat > /etc/systemd/system/cs2-arena-update.timer <<'TIMER'
[Unit]
Description=Run CS2 Arena auto-update every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
TIMER

chmod +x "$REPO_DIR/update.sh"
systemctl daemon-reload
systemctl enable --now cs2-arena-update.timer
echo "Auto-update timer installed."

# Start services
echo "[5/5] Starting CS2 Arena with Docker Compose..."
docker compose up -d --build

echo ""
echo "=== Setup complete! ==="
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "CS2 Arena is running at: http://$SERVER_IP"
echo ""
echo "Useful commands:"
echo "  View logs:       docker compose logs -f        (run from $REPO_DIR)"
echo "  Stop:            docker compose down"
echo "  Restart:         docker compose restart"
echo "  Update log:      tail -f /var/log/cs2-arena-update.log"
echo "  Timer status:    systemctl status cs2-arena-update.timer"
