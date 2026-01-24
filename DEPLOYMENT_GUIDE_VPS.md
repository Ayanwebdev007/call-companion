# Deploying Call Companion to VPS

This guide walks you through deploying your application from Render to your own VPS.

## Phase 1: Preparation (Local Machine)

### 1. Gather Environment Variables
You need to copy your environment variables from Render to your local project.
1. Log in to your Render Dashboard.
2. Go to your Backend service -> **Environment**.
3. Copy all variables (e.g., `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, etc.).
4. Create/Update a `.env` file in your local project root (`c:\Users\ayanr\Downloads\1\call-companion-main\call-companion-main\.env`) with these values.
5. **Add one new variable**:
   ```env
   FRONTEND_URL=https://your-purchased-domain.com
   ```
   (Replace `your-purchased-domain.com` with your actual GoDaddy domain).

### 2. Configure DNS (GoDaddy)
1. Log in to GoDaddy.
2. Go to DNS Management for your domain.
3. Add/Edit the **A Record**:
   - **Name**: `@`
   - **Value**: `Your_VPS_IP_Address`
   - **TTL**: 600 seconds (or default).
4. (Optional) Add CNAME for `www`:
   - **Name**: `www`
   - **Value**: `@`

## Phase 2: VPS Setup (Server)

You need to prepare your VPS to run Docker.
1. SSH into your VPS:
   ```bash
   ssh root@your_vps_ip
   ```
2. **Install Docker & Git**:
   Run the following commands on your VPS:
   ```bash
   # Update packages
   sudo apt-get update
   
   # Install prerequisites
   sudo apt-get install -y ca-certificates curl gnupg git

   # Add Docker's official GPG key
   sudo install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   sudo chmod a+r /etc/apt/keyrings/docker.gpg

   # Set up the repository
   echo \
     "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
     sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

   # Install Docker Engine
   sudo apt-get update
   sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

   # Verify Docker Compose
   docker compose version
   ```

## Phase 3: GitHub CI/CD Configuration

We have created a workflow file `.github/workflows/deploy.yml`. Now you need to connect GitHub to your VPS securely.

### 1. Generate SSH Key (If needed)
If you don't have a dedicated SSH key pair for GitHub Actions:
**On your Local Machine:**
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ./vps_key
# Press Enter for no passphrase
```
This creates `vps_key` (private) and `vps_key.pub` (public).

### 2. Add Authorised Key to VPS
**On your VPS:**
Open `~/.ssh/authorized_keys` and paste the content of `vps_key.pub` (from your local machine) into a new line.
```bash
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste content, Save (Ctrl+O) and Exit (Ctrl+X)
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 3. Add Secrets to GitHub
1. Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret**.
3. Add the following secrets (Copy values from your local `.env` file):
   - `VPS_HOST`: Your VPS IP Address.
   - `VPS_USER`: `root` (or your username).
   - `VPS_SSH_KEY`: The private key content.
   - `DATABASE_URL`
   - `GOOGLE_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_SERVICE_ACCOUNT_JSON` (Copy the entire JSON string)
   - `JWT_SECRET`
   - `META_WEBHOOK_VERIFY_TOKEN`
   - `NODE_VERSION`
   - `RESEND_API_KEY`
   - `SENDER_EMAIL`
   - `FRONTEND_URL`: `https://your-purchased-domain.com` (No trailing slash).
   - `GOOGLE_CLIENT_ID`: (Same as your helper value or separate if needed).
   *(Note: `VITE_API_URL` will automatically be set to `FRONTEND_URL` by the deployment script, so you don't need to add it separately if they are the same.)*


## Phase 4: Deploy

1. Commit and Push your changes:
   ```bash
   git add .
   git commit -m "Setup VPS deployment with Docker"
   git push origin main
   ```
2. Go to the **Actions** tab in GitHub. You should see the "Deploy to VPS" workflow running.
3. Once green, visit your domain (e.g., `http://your-domain.com`).

## Troubleshooting
- **Logs**: If something fails, SSH into VPS and run `cd call-companion && docker compose logs -f`.
- **Database**: Ensure your MongoDB Atlas IP Whitelist allows requests from your VPS IP Address (or allow 0.0.0.0/0).
