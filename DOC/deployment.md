# Deployment Guide — CSE Fest 2026 Management Platform

This document details the configuration and deployment prerequisites for hosting the CSE Fest 2026 platform on a **University Server (Linux)** using **local filesystem storage** for uploads and **Supabase** for database and authentication.

---

## 🔑 Deployment Essentials

### 1. Codebase & Runtime Setup (Server Mode)
Because this Next.js application uses dynamic server-side logic (e.g. database interactions, auth middleware, and local file storage writes), **it cannot be exported as a static HTML site (`out/` folder)**. It must run as a live Node.js server.
* **Prerequisites**: Install **Node.js (v20.x or higher)** and `pnpm` (or `npm`/`yarn`) on the server.
* **Process Manager**: Install **PM2** globally to run the server in the background and restart it if it crashes:
  ```bash
  sudo npm install -g pm2
  ```

---

### 2. Local File Storage Setup
Your submissions system writes files directly to the server's disk using `node:fs` calls (configured by `SUBMISSIONS_DIR` or defaulting to `./storage/submissions`).
* **Storage Directory**: Create the storage folder in the root of the project directory on the server:
  ```bash
  mkdir -p storage/submissions
  ```
* **Folder Permissions**: Grant write permissions so the Node.js process can write files to it:
  ```bash
  chmod -R 775 storage
  ```
* **Disk Space**: Ensure the server partition has enough disk space to accommodate submissions (e.g., several gigabytes if you have multiple teams submitting 200MB video showcases).

---

### 3. Server Access & Code Transfer
* **Method**: Use SSH/SFTP (via FileZilla, WinSCP, or git clone) to transfer code.
* **Transfer steps**:
  1. Copy the project folder to `/var/www/cse-fest` (excluding `node_modules`, `.next`, and `.env`).
  2. Install dependencies directly on the server: `pnpm install` (or `npm install`).
  3. Compile the production build: `npm run build`. This generates the optimized server code in `.next/`.
  4. Spin up the background server via PM2:
     ```bash
     pm2 start npm --name "csefest-server" -- run start
     ```

---

### 4. Web Server Setup (Nginx Reverse Proxy with Rate Limiting)
By default, the Next.js server runs on port `3000`. Install **Nginx** to forward public traffic (ports 80 and 443) to Next.js.

> [!IMPORTANT]
> In Nginx, rate-limiting zones (`limit_req_zone`) **must** be defined within the `http` block of `/etc/nginx/nginx.conf`. They cannot be defined inside individual site configurations (`sites-available`).
> Attempting to place rate-limiting zones directly in the site configuration will fail Nginx syntax checks (`nginx -t`).

#### Step 4a: Configure Rate Limiting Zones in `/etc/nginx/nginx.conf`
Open the global Nginx configuration file:
```bash
sudo nano /etc/nginx/nginx.conf
```
Add the following lines inside the `http { ... }` block:
```nginx
# Rate limiting zones: 10MB memory can track ~160,000 IPs
limit_req_zone $binary_remote_addr zone=global_limit:10m rate=15r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=10r/m;
```

#### Step 4b: Configure the Site Server Blocks
Create a file `/etc/nginx/sites-available/csefest`:
```bash
sudo nano /etc/nginx/sites-available/csefest
```
Add the following configuration, which redirects all standard HTTP traffic to HTTPS, binds to IPv4 and IPv6, handles Let's Encrypt challenges, sets the `250M` upload limit for videos/PDFs, applies security headers, and proxies requests to Next.js:
```nginx
# HTTP Server Block (Redirect to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name csefest.smuct.edu.bd; # Replace with your university subdomain

    # Certbot webroot challenges path
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name csefest.smuct.edu.bd; # Replace with your university subdomain

    # SSL Certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/csefest.smuct.edu.bd/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/csefest.smuct.edu.bd/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Enforce University VM File Upload Limits (hard limit 250MB)
    client_max_body_size 250M;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;

    # Reverse Proxy for Next.js Application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Global API/Route rate limiting fallback
        limit_req zone=global_limit burst=30 nodelay;
    }

    # Custom rate-limiting locations for highly sensitive endpoints
    location /api/auth/ {
        limit_req zone=auth_limit burst=5;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/submissions/upload {
        limit_req zone=upload_limit burst=3;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
* **Activate Nginx block**:
  ```bash
  sudo ln -s /etc/nginx/sites-available/csefest /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl restart nginx
  ```

---

### 5. Environment Variables (`.env`)
Create a secure `.env` file in your root folder on the server. Do not commit this to Git:
```ini
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key # Keep strictly secret on the server!

# Cloudinary Credentials (ID Cards and Payments Screen Uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Local File Storage Configuration
# The application uses UPLOAD_DIR first, then SUBMISSIONS_DIR, and falls back to "storage/submissions"
UPLOAD_DIR=storage/submissions
SUBMISSIONS_DIR=storage/submissions

# Auth Redirect Domain
NEXT_PUBLIC_SITE_URL=https://csefest.smuct.edu.bd
```

---

### 6. Reverse Proxy & SSL (HTTPS Setup)
Google OAuth requires HTTPS endpoints to function.
* Install **Certbot** to provision a Let’s Encrypt SSL certificate:
  ```bash
  sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx -d csefest.smuct.edu.bd
  ```
  Certbot will automatically obtain certificates and modify Nginx to handle HTTPS (port 443) seamlessly.
* **Test SSL Certificate Auto-Renewal**:
  Verify that the auto-renewal configuration works by running:
  ```bash
  sudo certbot renew --dry-run
  ```
  This command performs a renewal test without writing actual certificates, verifying the scheduled system task is configured correctly.

---

### 7. Supabase Integration
* Run your database SQL migrations inside the Supabase SQL Editor.
* In the **Supabase Dashboard**, navigate to **Authentication > Providers > Google**:
  * Enable the Google provider.
  * Enter your **Google Client ID** and **Client Secret** (created in the Google Cloud Console).
  * Copy the Supabase Redirect URI and paste it back into your Google Cloud console authorized redirect list (usually `https://your-project-id.supabase.co/auth/v1/callback`).
* Navigate to **Authentication > URL Configuration** (Critical for OAuth redirects):
  * **Site URL**: Update this to your deployed domain: `https://csefest.smuct.edu.bd`
  * **Redirect URLs**: Add your production callback URL: `https://csefest.smuct.edu.bd/auth/callback` to ensure Supabase allows redirecting authentication codes back to your deployment. If not configured, Supabase will fall back to `http://localhost:3000`.

---

### 8. Firewall & Network Whitelisting
To prevent firewall blocks on API calls and database connections, coordinate with the University IT department to configure the server network rules:
* **Inbound Traffic (Open to public)**:
  * Port `80` (HTTP) — Required for Certbot validation & HTTP-to-HTTPS redirect.
  * Port `443` (HTTPS) — User and API traffic.
  * Port `22` (SSH) — Administrative access (should be restricted to coordinator/developer IPs).
* **Outbound Traffic (Must be whitelisted)**:
  * HTTPS (`port 443` TCP and UDP/WebSockets if using realtime) to:
    * `*.supabase.co` — Database connection endpoints, Realtime service, and Auth API.
    * `accounts.google.com` & `www.googleapis.com` — For Google OAuth integration.
    * `api.cloudinary.com` — Media delivery network for file uploads.
  * HTTPS (`port 443`) to Package Registries (for deployment steps only):
    * `registry.npmjs.org` & `registry.yarnpkg.com`

---

### 9. Error Logging & Disk Space Monitoring (50GB Storage Limit)
Keep active logs and monitor disk space to protect the system under the strict 50GB storage restriction:
* **PM2 Log Rotation**: Configure PM2 to auto-rotate logs so they do not consume disk space:
  ```bash
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 10M
  pm2 set pm2-logrotate:retain 5
  ```
* **Server-side logs**: Use PM2 to view real-time logs:
  ```bash
  pm2 logs csefest-server
  ```
* **Nginx access and error logs**:
  ```bash
  tail -f /var/log/nginx/error.log
  ```
* **Disk Space Warning Alert**:
  1. Create a script file `/usr/local/bin/disk-alert.sh`:
     ```bash
     sudo nano /usr/local/bin/disk-alert.sh
     ```
  2. Paste the following script contents (replace the webhook URL with your admin Discord or Slack notification channel):
     ```bash
     #!/bin/bash
     CURRENT_USAGE=$(df -h / | grep / | head -n 1 | awk '{ print $5 }' | cut -d'%' -f1)
     if [ "$CURRENT_USAGE" -gt 85 ]; then
       curl -X POST -H "Content-Type: application/json" \
         -d '{"content": "🚨 WARNING: Disk Space on CSE Fest VM exceeds 85%! Current usage: '"$CURRENT_USAGE"'%"}' \
         https://discord.com/api/webhooks/your-alert-webhook
     fi
     ```
  3. Make the script executable:
     ```bash
     sudo chmod +x /usr/local/bin/disk-alert.sh
     ```
  4. Schedule the script to run hourly via cron:
     ```bash
     sudo crontab -e
     ```
     Add the following line to the end of the crontab:
     ```text
     0 * * * * /usr/local/bin/disk-alert.sh
     ```
