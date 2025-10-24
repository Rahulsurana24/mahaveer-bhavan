# WhatsApp Server Deployment Guide
## For Netlify + Supabase + GitHub Setup

Since Netlify only hosts static frontends, you need a separate server for the WhatsApp backend.

---

## 🎯 Deployment Options

### Option 1: Local Testing (Development)
**Best for**: Testing the integration before production
**Cost**: Free
**Limitation**: Only works when your computer is on

### Option 2: Railway (Production - Easiest)
**Best for**: Quick production deployment
**Cost**: ~$5/month
**Setup Time**: 10 minutes

### Option 3: DigitalOcean/AWS (Production)
**Best for**: Full control
**Cost**: $5-10/month
**Setup Time**: 30 minutes

---

# 🏠 OPTION 1: Local Testing (Start Here)

Perfect for testing before deploying to production.

## Step 1: Apply Database Migration

**Go to Supabase Dashboard:**
1. Visit: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq
2. Click **SQL Editor** → **New Query**
3. Copy this file: `supabase/migrations/20251023190000_whatsapp_integration.sql`
4. Paste into SQL Editor
5. Click **Run**
6. ✅ Should see "Success"

## Step 2: Start WhatsApp Server Locally

Open terminal and run:

```bash
cd /workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan/server
npm start
```

You should see:
```
🚀 WhatsApp server running on port 3001
📡 Health check: http://localhost:3001/health
📱 API base URL: http://localhost:3001/api/whatsapp

Waiting for connection request...
```

**Keep this terminal open!** The server must stay running.

## Step 3: Start Frontend Locally

Open a **second terminal**:

```bash
cd /workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan
npm run dev
```

Frontend opens at: http://localhost:5173

## Step 4: Connect WhatsApp & Scan QR Code

1. Open browser: **http://localhost:5173**
2. **Login as admin**
3. Go to **Communication Center**
4. Click **"WhatsApp Settings"** tab
5. Click **"Connect WhatsApp"** button
6. **Wait 10-15 seconds** - QR code will appear

7. **On your phone**:
   - Open WhatsApp
   - Tap **⋮** (three dots) → **Linked Devices**
   - Tap **"Link a Device"**
   - Point camera at QR code on screen
   - Tap **"Link"**

8. **Wait 30 seconds** - Status changes to "Connected" (green badge)

## Step 5: Send Test Message

1. Go to **Compose Message** tab
2. Check ☑️ **WhatsApp** channel
3. Select "All Members" or your phone number
4. Type: "Test from Admin Panel"
5. Click **Send Now**
6. Check your WhatsApp ✅

---

# ☁️ OPTION 2: Deploy to Railway (Production)

Railway is the easiest cloud deployment option.

## Prerequisites
- GitHub account with your code pushed
- Railway account (sign up at railway.app)

## Step 1: Prepare Your Code

**Add `server/package.json` start script:**

The file already has:
```json
{
  "scripts": {
    "start": "node index.js"
  }
}
```
✅ Already configured!

## Step 2: Deploy to Railway

### A. Create Railway Project

1. Go to: https://railway.app
2. Click **"Start a New Project"**
3. Click **"Deploy from GitHub repo"**
4. Select your repository: `Rahulsurana24/mahaveer-bhavan`
5. Railway will ask: "Which folder to deploy?"
6. Select: **`server`** folder (important!)

### B. Configure Environment Variables

In Railway dashboard:

1. Click your deployed service
2. Go to **"Variables"** tab
3. Add these variables:

```env
VITE_SUPABASE_URL=https://juvrytwhtivezeqrmtpq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJ5dHdodGl2ZXplcXJtdHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTMzMDksImV4cCI6MjA3Mzk2OTMwOX0.kElx1ywKoltQxqOd0cP0_Fw9b4kDdd-syZbIhwD61tc
WHATSAPP_SERVER_PORT=3001
```

4. Click **"Save"**
5. Railway will redeploy automatically

### C. Get Your Server URL

After deployment:
1. Railway shows your service URL, like: `https://your-app.railway.app`
2. **Copy this URL** - you'll need it for frontend

### D. Test the Deployment

```bash
curl https://your-app.railway.app/health
```

Should return: `{"status":"ok","whatsapp_status":"disconnected"...}`

## Step 3: Update Netlify Frontend

**Update environment variable in Netlify:**

1. Go to: https://app.netlify.com
2. Open your site settings
3. Go to **"Site configuration"** → **"Environment variables"**
4. Add/Update:
   ```
   Key: VITE_WHATSAPP_API_URL
   Value: https://your-app.railway.app/api/whatsapp
   ```
   (Replace `your-app.railway.app` with your actual Railway URL)
5. Click **"Save"**
6. Go to **"Deploys"** → Click **"Trigger deploy"**

## Step 4: Connect WhatsApp from Production Site

1. Go to your Netlify site: **https://mahaveer-bhavan.netlify.app**
2. Login as admin
3. Go to **Communication Center** → **WhatsApp Settings**
4. Click **"Connect WhatsApp"**
5. **QR code appears** (from Railway server)
6. **Scan with your phone** (same process as local)
7. **Session is saved** on Railway server

✅ **Done!** Your WhatsApp integration is now live in production!

---

# 🖥️ OPTION 3: Deploy to DigitalOcean/AWS VPS

For full control over your server.

## Step 1: Create a VPS

### DigitalOcean:
1. Sign up at digitalocean.com
2. Create a new **Droplet**
3. Choose: Ubuntu 22.04 LTS
4. Size: Basic ($6/month)
5. Click **"Create Droplet"**
6. Note the IP address

### AWS EC2:
1. Sign up at aws.amazon.com (Free tier: 1 year)
2. Launch EC2 instance
3. Choose: Ubuntu 22.04
4. Instance type: t2.micro (free tier)
5. Launch and note IP address

## Step 2: SSH into Server

```bash
ssh root@YOUR_SERVER_IP
```

## Step 3: Install Node.js

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install build tools
apt install -y build-essential

# Install Chromium (required for whatsapp-web.js)
apt install -y chromium-browser libnss3 libatk-bridge2.0-0 libgtk-3-0 libxss1 libasound2

# Verify
node -v  # Should show v18.x
npm -v
```

## Step 4: Clone Your Repository

```bash
# Install git
apt install -y git

# Clone your repo
cd /var/www
git clone https://github.com/Rahulsurana24/mahaveer-bhavan.git

cd mahaveer-bhavan/server
```

## Step 5: Configure Environment

```bash
# Create .env file
cat > .env << EOF
VITE_SUPABASE_URL=https://juvrytwhtivezeqrmtpq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJ5dHdodGl2ZXplcXJtdHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTMzMDksImV4cCI6MjA3Mzk2OTMwOX0.kElx1ywKoltQxqOd0cP0_Fw9b4kDdd-syZbIhwD61tc
WHATSAPP_SERVER_PORT=3001
EOF

# Install dependencies
npm install
```

## Step 6: Install PM2 (Process Manager)

```bash
npm install -g pm2

# Start server with PM2
pm2 start index.js --name whatsapp-server

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Copy and run the command it shows

# Check status
pm2 status
```

## Step 7: Configure Firewall

```bash
# Allow SSH, HTTP, and WhatsApp server port
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3001
ufw enable
```

## Step 8: Setup Nginx Reverse Proxy (Optional but recommended)

```bash
# Install nginx
apt install -y nginx

# Create nginx config
cat > /etc/nginx/sites-available/whatsapp-api << 'EOF'
server {
    listen 80;
    server_name YOUR_SERVER_IP;

    location /api/whatsapp {
        proxy_pass http://localhost:3001/api/whatsapp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://localhost:3001/health;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/whatsapp-api /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Restart nginx
systemctl restart nginx
```

## Step 9: Test the Server

```bash
curl http://YOUR_SERVER_IP/health
```

Should return: `{"status":"ok","whatsapp_status":"disconnected"...}`

## Step 10: Update Netlify Frontend

Same as Railway - update environment variable:

```
VITE_WHATSAPP_API_URL=http://YOUR_SERVER_IP/api/whatsapp
```

## Step 11: Setup SSL (Optional - for HTTPS)

```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (requires domain name)
certbot --nginx -d api.yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

## Step 12: Connect WhatsApp

Same process as Railway - visit your Netlify site and scan QR code.

---

# 📱 How to Scan QR Code (Detailed)

## On Android:

1. Open **WhatsApp** app
2. Tap **⋮** (three dots in top-right)
3. Tap **"Linked Devices"**
4. Tap **"Link a Device"**
5. If prompted, enter your WhatsApp PIN
6. Camera opens
7. Point at QR code on computer screen
8. Wait for it to focus and scan
9. Tap **"Link"** if prompted
10. ✅ You see "Device linked" message

## On iPhone:

1. Open **WhatsApp** app
2. Tap **"Settings"** (bottom-right)
3. Tap **"Linked Devices"**
4. Tap **"Link a Device"**
5. If prompted, authenticate with Face ID/Touch ID
6. Camera opens
7. Point at QR code on computer screen
8. Wait for it to scan automatically
9. ✅ You see "Device linked" message

## Troubleshooting QR Scan:

**QR code not appearing?**
- Check WhatsApp server is running
- Check browser console for errors
- Try refreshing the page

**QR code expired?**
- QR codes expire after 5 minutes
- Click "Connect WhatsApp" again to generate new one

**Can't scan QR code?**
- Make sure QR code is fully visible on screen
- Increase screen brightness
- Clean phone camera lens
- Move phone closer/farther from screen

**Phone says "This code is not valid"?**
- QR code may have expired - generate a new one
- Make sure you're scanning the correct QR code
- Try restarting WhatsApp app

---

# 🔧 Maintenance Commands

## Railway:
```bash
# View logs
railway logs

# Restart server
railway up

# Connect to shell
railway shell
```

## VPS (DigitalOcean/AWS):
```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# View logs
pm2 logs whatsapp-server

# Restart server
pm2 restart whatsapp-server

# Stop server
pm2 stop whatsapp-server

# Check status
pm2 status

# Update code
cd /var/www/mahaveer-bhavan
git pull
cd server
npm install
pm2 restart whatsapp-server
```

---

# ✅ Verification Checklist

After deployment:

- [ ] Database migration applied in Supabase
- [ ] WhatsApp server running (Railway/VPS)
- [ ] Health endpoint responds: `curl YOUR_URL/health`
- [ ] Netlify env variable updated: `VITE_WHATSAPP_API_URL`
- [ ] Netlify site redeployed
- [ ] Can access WhatsApp Settings tab
- [ ] Can click "Connect WhatsApp"
- [ ] QR code appears
- [ ] Can scan QR code with phone
- [ ] Status shows "Connected" (green)
- [ ] Can send test message
- [ ] Message received on WhatsApp ✅

---

# 🎯 Recommended Path

For your Netlify + Supabase setup:

1. **Start Local** (Option 1)
   - Test everything works
   - Scan QR code and send test messages
   - Takes 10 minutes

2. **Deploy to Railway** (Option 2)
   - Easiest production deployment
   - Takes 10 minutes
   - Costs ~$5/month

3. **Or deploy to VPS** (Option 3)
   - More control
   - Takes 30 minutes
   - Costs ~$5-6/month

---

# 📚 Quick Links

- **Railway Dashboard**: https://railway.app
- **DigitalOcean**: https://www.digitalocean.com
- **AWS EC2**: https://aws.amazon.com/ec2
- **Supabase Dashboard**: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq
- **Netlify Dashboard**: https://app.netlify.com

---

# 💡 Tips

1. **Always test locally first** before deploying to production
2. **Keep the session data backed up** - it's stored in `.wwebjs_auth/`
3. **Monitor the server logs** regularly
4. **Set up monitoring** (Railway has built-in monitoring)
5. **Use environment variables** for sensitive data

---

# 🆘 Need Help?

Check these files:
- `WHATSAPP_INTEGRATION_GUIDE.md` - Complete technical guide
- `WHATSAPP_QUICKSTART.md` - Quick reference
- `server/README.md` - Server documentation

Or run:
```bash
node apply-whatsapp-migration.js  # Check migration status
curl YOUR_URL/health              # Check server status
```
