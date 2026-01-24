#!/bin/bash
set -e

APP_DIR="/home/root/call-companion"

echo "➡️  Stopping Docker Containers..."
cd $APP_DIR
docker compose down

echo "➡️  Installing Backend Dependencies..."
cd $APP_DIR/backend
npm install

echo "➡️  Installing Frontend Dependencies..."
cd $APP_DIR/frontend
npm install

echo "➡️  Building Frontend..."
npm run build

echo "➡️  Starting Backend with PM2..."
cd $APP_DIR/backend
# Check if already running to avoid duplicates
if pm2 list | grep -q "call-companion-backend"; then
    pm2 restart call-companion-backend
else
    pm2 start index.js --name "call-companion-backend"
fi

echo "✅  Migration Complete! (Don't forget to update Nginx)"
