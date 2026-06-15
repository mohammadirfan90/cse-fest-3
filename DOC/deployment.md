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
* **Nginx Configuration**: Create a file `/etc/nginx/sites-available/csefest` and configure reverse proxying, enabling larger uploads (maximum **200MB** payload size + headers) and strict rate limits for protection:
  ```nginx
  # Rate limiting zones: 10MB memory can track ~160,000 IPs
  limit_req_zone $binary_remote_addr zone=general_limit:10m rate=15r/s;
  limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

  server {
      listen 80;
      server_name csefest.smuct.edu.bd; # Replace with your university subdomain

      # Set max upload size to support 200MB video showcases + request headers
      client_max_body_size 220M;

      # Apply general rate limiting across the site
      limit_req zone=general_limit burst=20 nodelay;

      # Apply stricter rate limits on sensitive auth & registration endpoints
      location /api/auth/ {
          limit_req zone=auth_limit burst=5;
          proxy_pass http://localhost:3000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      }

      location / {
          proxy_pass http://localhost:3000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
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
# Supabase settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key

# Storage settings (writes to root directory of server application)
SUBMISSIONS_DIR=storage/submissions

# Auth redirect root domain
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

---

### 7. Supabase Integration
* Run your database SQL migrations inside the Supabase SQL Editor.
* In the **Supabase Dashboard**, navigate to **Authentication > Providers > Google**:
  * Enable the Google provider.
  * Enter your **Google Client ID** and **Client Secret** (created in the Google Cloud Console).
  * Copy the Supabase Redirect URI and paste it back into your Google Cloud console authorized redirect list (usually `https://your-project-id.supabase.co/auth/v1/callback`).
* Navigate to **Authentication > URL Configuration** (Critical for OAuth redirects):
  * **Site URL**: Update this to your deployed domain (e.g. `https://cse-fest-3.vercel.app`).
  * **Redirect URLs**: Add your production callback URL (e.g. `https://cse-fest-3.vercel.app/auth/callback` or a wildcard like `https://*.vercel.app/auth/callback`) to ensure Supabase allows redirecting authentication codes back to your deployment. If not configured, Supabase will fall back to `http://localhost:3000`.

---

### 8. Firewall & Network Whitelisting
To prevent firewall blocks on API calls and database connections, coordinate with the University IT department to configure the server network rules:
* **Inbound Traffic (Open to public)**:
  * Port `80` (HTTP)
  * Port `443` (HTTPS)
  * Port `22` (SSH)
* **Outbound Traffic (Must be whitelisted)**:
  * HTTPS (`port 443`) to your Supabase domain: `https://*.supabase.co`
  * HTTPS (`port 443`) to Google OAuth endpoints: `accounts.google.com` and `www.googleapis.com`

---

### 9. Error Logging & Disk Space Monitoring (50GB Storage Limit)
Keep active logs to debug issues during registrations and the hackathon:
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
* **Disk Space Warning Alert**: Set up an hourly cron job checking root partition usage and notifying administrators if free space falls below 85% to protect files uploads and system stability.
