#!/bin/bash

echo "💾 Backing up current VPS environment for PsychPATH..."

cd ~/psychpath-dev || { echo "❌ Project directory not found"; exit 1; }

# Create a timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Backup .env.production
if [ -f .env.production ]; then
    cp .env.production ".env.vps.$TIMESTAMP"
    cp .env.production ".env.vps"
    echo "✅ Backed up .env.production → .env.vps.$TIMESTAMP and .env.vps"
else
    echo "⚠️ No .env.production found to back up"
fi

# Backup nginx.conf
if [ -f nginx/nginx.conf ]; then
    cp nginx/nginx.conf "nginx/nginx.conf.vps.$TIMESTAMP"
    cp nginx/nginx.conf "nginx/nginx.conf.vps"
    echo "✅ Backed up nginx.conf → nginx/nginx.conf.vps.$TIMESTAMP and nginx/nginx.conf.vps"
else
    echo "⚠️ No nginx/nginx.conf found to back up"
fi

# Optional: backup docker-compose.prod.yml
if [ -f docker-compose.prod.yml ]; then
    cp docker-compose.prod.yml "docker-compose.prod.vps.$TIMESTAMP.yml"
    echo "✅ Backed up docker-compose.prod.yml → docker-compose.prod.vps.$TIMESTAMP.yml"
fi

# Optional: backup backend Dockerfile
if [ -f backend/Dockerfile ]; then
    cp backend/Dockerfile "backend/Dockerfile.vps.$TIMESTAMP"
    echo "✅ Backed up backend Dockerfile → backend/Dockerfile.vps.$TIMESTAMP"
fi

echo "📦 All key config files backed up with timestamp: $TIMESTAMP"
