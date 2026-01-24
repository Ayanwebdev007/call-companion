# VPS System Architecture

This document explains exactly how your VPS is currently configured. 

## 🏗️ The Big Picture

Your VPS is like a building with a main receptionist (Host Nginx) and several different offices (Your Websites).

### Visual Diagram
```mermaid
graph TD
    User((User on Internet)) -->|HTTPS / Port 443| HostNginx[Host Nginx Server]
    
    subgraph "Your VPS (Host OS)"
        HostNginx -->|Domain: other-site.com| PM2[PM2 Apps (Legacy)]
        HostNginx -->|Domain: digityzeinternational.online| Proxy[Proxy Pass]
        
        subgraph "Docker Container (New & Clean)"
            Proxy -->|Port 8081| AppFrontend[Call Companion]
        end
    end
```

## 🔍 The Components (PM2 Setup)

### 1. The Frontend (Static Files - No Port!)
*   **How it works:** We built your React app into "static files" (HTML, CSS, JS).
*   **Location:** `/home/root/call-companion/frontend/dist`
*   **Why no port?** Nginx reads these files directly from the disk and sends them to the user. It is faster and uses **0% CPU** when no one is visiting.

### 2. The Backend (Node.js API - Port 5000)
*   **How it works:** This is a "living program" that needs to think, connect to databases, and send logic.
*   **Managed By:** PM2 (Name: `call-companion-backend`).
*   **Port:** It listens on **Port 5000** for requests from Nginx.

### 3. The Bridge (Nginx)
*   **Url `/`**: Nginx grabs a file from the disk (Frontend).
*   **Url `/api/`**: Nginx talks to Port 5000 (Backend).

## 🛠️ Manual Control Guide

Since you want to manage things manually, here are the key commands:

### To Manage the App (Start/Stop)
SSH into your VPS and run:
```bash
cd /home/root/call-companion

# STOP the app
docker compose down

# START the app (and see logs)
docker compose up -d
docker compose logs -f
```

### To Manage the Web Server (Host Nginx)
```bash
# Check status
systemctl status nginx

# Restart (if you edit config)
systemctl reload nginx
```

### To Edit the Connection (Proxy Config)
The file that connects them is located here:
```bash
/etc/nginx/sites-available/digityzeinternational.online
```

## 🚀 Step-by-Step: What happens when you visit the site?

Here is the exact journey of a user's request:

**Step 1: The Browser**
*   User types `https://digityzeinternational.online`.
*   Browser asks DNS: "Where is this?" -> DNS says: `69.62.76.142`.

**Step 2: The Host Endpoint (Port 443)**
*   Your VPS receives the request on **Port 443** (Secure HTTPS).
*   **Host Nginx** wakes up. It checks its certificate (provided by Let's Encrypt).
*   It authorizes the secure connection.

**Step 3: The Proxy Hand-off**
*   Host Nginx looks at the config `/etc/nginx/sites-available/digityzeinternational.online`.
*   It sees the rule: `proxy_pass http://localhost:8081`.
*   It essentially says: *"I'll handle the encryption. Hey Port 8081, here is some traffic for you!"*

**Step 4: Using the Tunnel (Port 8081)**
*   Traffic travels internally inside your server from the Host OS to the Docker engine.
*   It enters the **Docker Container** on Port 80 (mapped from 8081).

**Step 5: Inside the Container**
*   **Container Nginx** receives the request.
*   If it's for the frontend (`/`), it serves the React HTML file.
*   If it's for the backend (`/api/...`), it forwards it internally to `http://backend:5000`.

## ✋ Manual Controls (Cheat Sheet)

If you want to feel the controls yourself, try these:

**1. "I want to see the live traffic logs"**
```bash
# See requests hitting the Main Server
tail -f /var/log/nginx/access.log

# See requests hitting the App
cd ~/call-companion
docker compose logs -f
```

**2. "I want to restart the whole server"**
```bash
reboot
# (Everything will come back up automatically because we set `restart: always`)
```

**3. "I want to edit the proxy config"**
```bash
nano /etc/nginx/sites-available/digityzeinternational.online
# (Make changes, then Ctrl+X -> Y -> Enter)
systemctl reload nginx
```

