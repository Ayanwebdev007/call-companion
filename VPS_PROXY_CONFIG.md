# How to Configure Your VPS Nginx (Host)

Since your VPS has its own Nginx server running (hosting your other sites), you need to tell it to forward traffic for `digityzeinternational.online` to our new Docker app on port `8081`.

### 1. SSH into your VPS
```bash
ssh root@69.62.76.142
```

### 2. Create a new config file
```bash
nano /etc/nginx/sites-available/digityzeinternational.online
```
*(If you prefer to edit the main file directly, you can check `/etc/nginx/sites-available/default`)*

### 3. Paste this configuration
```nginx
server {
    server_name digityzeinternational.online www.digityzeinternational.online;

    # Proxy to the Docker Container
    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Listen on Port 80 (HTTP)
    listen 80;
}
```
**Exit and Save:** Press `Ctrl+X`, then `Y`, then `Enter`.

### 4. Enable the site (Symbolic Link)
```bash
ln -s /etc/nginx/sites-available/digityzeinternational.online /etc/nginx/sites-enabled/
```

### 5. Obtain SSL Certificate (Green Lock)
Now run Certbot on the **host** (not inside Docker) to secure this proxy:
```bash
certbot --nginx -d digityzeinternational.online
```
*   Select the option to **Redirect HTTP to HTTPS** (usually "2").

### 6. Verify
Visit **[https://digityzeinternational.online](https://digityzeinternational.online)**.
It should now show your app secure!
