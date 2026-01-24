#!/bin/bash
set -e

DOMAIN="digityzeinternational.online"
EMAIL="ayaan007ayk@gmail.com" # Using the commit email I saw earlier as fallback, or noreply

# 1. Install Certbot if missing
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot
fi

# 2. Check if cert exists
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Obtaining SSL Certificate for $DOMAIN..."
    # Stop any conflicting services temporarily
    systemctl stop nginx || true
    docker compose down || true
    
    # Run Certbot in standalone mode
    certbot certonly --standalone \
      --non-interactive \
      --agree-tos \
      --email "admin@$DOMAIN" \
      -d "$DOMAIN"
else
    echo "SSL Certificate already exists for $DOMAIN."
fi

# 3. Auto-renewal setup (crontab check could go here, but certbot usually adds one)
