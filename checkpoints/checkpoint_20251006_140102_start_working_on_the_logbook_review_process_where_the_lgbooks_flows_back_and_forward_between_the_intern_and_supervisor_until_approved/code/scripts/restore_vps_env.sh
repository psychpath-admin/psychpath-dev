#!/bin/bash

echo "🔁 Restoring previously preserved VPS Docker environment for PsychPATH..."

# 1. Confirm you're in the right project directory
cd ~/psychpath-dev || { echo "❌ Project directory not found"; exit 1; }

# 2. Reset all local changes and clean untracked files (CAUTION)
read -p "⚠️ This will delete all local uncommitted changes. Continue? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
    echo "❌ Cancelled."
    exit 1
fi

git reset --hard
git clean -fd
echo "✅ Cleaned working directory"

# 3. Pull the latest from main branch
git checkout main
git pull origin main

# 4. Restore environment file
if [ -f .env.vps ]; then
    cp .env.vps .env.production
    echo "✅ Restored .env.production from .env.vps"
else
    echo "⚠️ .env.vps not found, skipping .env restoration"
fi

# 5. Restore nginx.conf
if [ -f nginx/nginx.conf.vps ]; then
    cp nginx/nginx.conf.vps nginx/nginx.conf
    echo "✅ Restored nginx.conf from nginx.conf.vps"
else
    echo "⚠️ nginx.conf.vps not found, skipping nginx restoration"
fi

# 6. Rebuild and relaunch the containers
echo "🚀 Rebuilding Docker containers..."
docker compose down
docker compose --env-file .env.production up -d --build

# 7. Final container check
echo ""
docker ps

echo "✅ Restore complete. Visit the public IP or localhost to test the running app."
