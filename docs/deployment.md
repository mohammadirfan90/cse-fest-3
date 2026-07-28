# Production Deployment Guide

This guide details the configuration and deployment prerequisites for hosting the CSE Fest 2026 platform on a Windows Server VM using Nginx as a reverse proxy, PM2 for process management, and Supabase for database/authentication.

---

## 🔑 Deployment Essentials

### 1. Codebase & Runtime Setup (Server Mode)
Because this Next.js application uses dynamic server-side logic (e.g. database interactions, auth middleware, and local file storage writes), it cannot be exported as a static HTML site (`out/` folder). It must run as a live Node.js server.
*   **Prerequisites:** Install Node.js (v20.x or higher) and `pnpm` (or `npm`/`yarn`) on the server.
*   **Process Manager:** Install PM2 globally to run the server in the background and restart it if it crashes:
    ```bash
    npm install -g pm2
    ```

### 2. Local File Storage Setup
Your submissions system writes files directly to the server's disk using `node:fs` calls (configured by `SUBMISSIONS_DIR` or defaulting to `./storage/submissions`).
*   **Storage Directory:** Create the storage folder in the root of the project directory on the server:
    ```bash
    mkdir -p storage/submissions
    ```
*   **Folder Permissions:** Grant write permissions so the Node.js process can write files to it:
    ```bash
    chmod -R 775 storage
    ```
*   **Disk Space:** Ensure the server partition has enough disk space to accommodate submissions (e.g., several gigabytes if you have multiple teams submitting 200MB video showcases).

---

## 3. Web Server Setup (Nginx Reverse Proxy)

By default, the Next.js server runs on port `3000`. Install Nginx to forward public traffic (ports 80 and 443) to Next.js.

### Nginx Buffer Configuration
To prevent 502 Bad Gateway errors caused by large authorization headers, configure the proxy buffers in `nginx.conf`:

```nginx
# HTTP Server Block (Redirect to HTTPS)
server {
    listen 80;
    server_name csefest.smuct.ac.bd;

    # Certbot challenge path
    location /.well-known/acme-challenge/ {
        root C:/acme-challenge;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    server_name csefest.smuct.ac.bd;

    ssl_certificate C:/certs/csefest/csefest.smuct.ac.bd-chain.pem;
    ssl_certificate_key C:/certs/csefest/csefest.smuct.ac.bd-key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

    client_max_body_size 250M;

    # Scale buffer sizes to prevent 502 Bad Gateway
    proxy_buffer_size 256k;
    proxy_buffers 8 256k;
    proxy_busy_buffers_size 512k;
    large_client_header_buffers 4 32k;

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
    }
}
```

---

## 4. PM2 Daemon Configuration

Run Next.js via PM2 to ensure background persistence and auto-recovery:
```bash
pm2 start npm --name "csefest-server" -- run start
pm2 save
```

Use `pm2-logrotate` to prevent logs from filling up the disk:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 5
```

---

## 5. VM Disk Alert Script

To monitor the 50GB storage limit on the university VM, schedule this script (`disk-alert.sh`) via cron to run hourly:
```bash
#!/bin/bash
CURRENT_USAGE=$(df -h / | grep / | head -n 1 | awk '{ print $5 }' | cut -d'%' -f1)
if [ "$CURRENT_USAGE" -gt 85 ]; then
  curl -X POST -H "Content-Type: application/json" \
    -d '{"content": "🚨 WARNING: Disk Space on CSE Fest VM exceeds 85%! Current usage: '"$CURRENT_USAGE"'%"}' \
    https://discord.com/api/webhooks/your-alert-webhook
fi
```
