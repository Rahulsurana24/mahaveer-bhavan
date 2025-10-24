# 🚀 Deploy WhatsApp Server to Render.com

Complete guide for deploying your WhatsApp server to Render and connecting with Netlify.

---

## 📋 What You'll Set Up

```
Netlify (Frontend) → Render (WhatsApp Server) → Supabase (Database)
```

**Total Time**: ~20 minutes
**Cost**: Free tier available (or $7/month for better performance)

---

## 🎯 Step-by-Step Guide

### Step 1: Apply Database Migration (5 minutes)

First, add WhatsApp tables to your Supabase database:

1. Go to: **https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq**
2. Click **"SQL Editor"** in left sidebar
3. Click **"New Query"**
4. Open this file on your computer:
   ```
   mahaveer-bhavan/supabase/migrations/20251023190000_whatsapp_integration.sql
   ```
5. Copy **all contents** (268 lines)
6. Paste into SQL Editor
7. Click **"Run"**
8. ✅ Should see: **"Success. No rows returned"**

**Verify it worked:**
```bash
cd mahaveer-bhavan
node apply-whatsapp-migration.js
```
Should show: ✓ "whatsapp_sessions table already exists"

---

### Step 2: Prepare Code for Render (2 minutes)

Render needs to know where your server code is. Let's create a render configuration.

**Create `render.yaml` in the root of your repository:**

```bash
cd /workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan
```

Create file:

```yaml
services:
  - type: web
    name: mahaveer-whatsapp-server
    env: node
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: VITE_SUPABASE_URL
        value: https://juvrytwhtivezeqrmtpq.supabase.co
      - key: VITE_SUPABASE_ANON_KEY
        value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJ5dHdodGl2ZXplcXJtdHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTMzMDksImV4cCI6MjA3Mzk2OTMwOX0.kElx1ywKoltQxqOd0cP0_Fw9b4kDdd-syZbIhwD61tc
      - key: WHATSAPP_SERVER_PORT
        value: 3001
```

**Commit and push to GitHub:**

```bash
git add render.yaml
git commit -m "Add Render configuration for WhatsApp server"
git push origin main
```

---

### Step 3: Deploy to Render (5 minutes)

#### A. Sign Up / Login to Render

1. Go to: **https://render.com**
2. Click **"Get Started"** or **"Sign In"**
3. Choose **"Sign in with GitHub"** (easiest)
4. Authorize Render to access your repositories

#### B. Create New Web Service

1. Click **"New +"** button (top right)
2. Select **"Web Service"**
3. Find your repository: **"Rahulsurana24/mahaveer-bhavan"**
4. Click **"Connect"**

#### C. Configure the Service

Render will ask for these settings:

**Name:**
```
mahaveer-whatsapp-server
```

**Region:**
```
Choose closest to you (e.g., Oregon, Frankfurt, Singapore)
```

**Branch:**
```
main
```

**Root Directory:**
```
server
```
⚠️ **Important**: Type `server` here - this tells Render your code is in the `server` folder

**Runtime:**
```
Node
```

**Build Command:**
```
npm install
```

**Start Command:**
```
npm start
```

#### D. Environment Variables

Scroll down to **"Environment Variables"** section.

Click **"Add Environment Variable"** and add these **3 variables**:

**Variable 1:**
```
Key: VITE_SUPABASE_URL
Value: https://juvrytwhtivezeqrmtpq.supabase.co
```

**Variable 2:**
```
Key: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJ5dHdodGl2ZXplcXJtdHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTMzMDksImV4cCI6MjA3Mzk2OTMwOX0.kElx1ywKoltQxqOd0cP0_Fw9b4kDdd-syZbIhwD61tc
```

**Variable 3:**
```
Key: WHATSAPP_SERVER_PORT
Value: 3001
```

#### E. Choose Plan

**Free Tier** (if available):
- 750 hours/month free
- Good for testing
- Spins down after 15 min inactivity

**Starter Plan** ($7/month - Recommended):
- Always running (no spin down)
- Better for production
- WhatsApp session stays connected

Choose plan and click **"Create Web Service"**

#### F. Wait for Deployment

Render will:
1. Clone your repository
2. Install dependencies (~2 minutes)
3. Start the server
4. Show "Live" status (green dot)

Watch the **Logs** tab to see progress.

You should see in logs:
```
🚀 WhatsApp server running on port 3001
📡 Health check: http://localhost:3001/health
```

#### G. Get Your Server URL

At the top of the page, you'll see your service URL:
```
https://mahaveer-whatsapp-server.onrender.com
```

**Copy this URL!** You'll need it for Netlify.

---

### Step 4: Test Your Render Deployment (1 minute)

Open terminal and test:

```bash
curl https://mahaveer-whatsapp-server.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "whatsapp_status": "disconnected",
  "is_ready": false,
  "timestamp": "2025-10-23T18:00:00.000Z"
}
```

✅ If you see this, your server is working!

---

### Step 5: Update Netlify Environment Variable (3 minutes)

Now connect your Netlify frontend to the Render backend.

#### A. Go to Netlify Dashboard

1. Visit: **https://app.netlify.com**
2. Click on your **mahaveer-bhavan** site
3. Go to **"Site configuration"** (left sidebar)
4. Click **"Environment variables"**

#### B. Add WhatsApp API URL

1. Click **"Add a variable"** or **"Add environment variables"**
2. Enter:
   ```
   Key: VITE_WHATSAPP_API_URL
   Value: https://mahaveer-whatsapp-server.onrender.com/api/whatsapp
   ```
   (Use your actual Render URL from Step 3G)
3. Click **"Create variable"** or **"Save"**

#### C. Redeploy Your Site

1. Go to **"Deploys"** tab
2. Click **"Trigger deploy"** button
3. Select **"Deploy site"**
4. Wait ~2 minutes for deployment to complete

✅ Your site will now connect to the Render WhatsApp server!

---

### Step 6: Connect WhatsApp & Scan QR Code (5 minutes)

Now the fun part - connecting your WhatsApp!

#### A. Open Your Live Site

1. Go to: **https://mahaveer-bhavan.netlify.app**
2. **Login as admin**

#### B. Navigate to WhatsApp Settings

1. Click **"Communication Center"** in sidebar
2. Click **"WhatsApp Settings"** tab
3. Click **"Connect WhatsApp"** button

#### C. Wait for QR Code

**Wait 10-15 seconds** - the QR code will appear.

If using **Free Tier**, the first time might take **30-60 seconds** (cold start).

You'll see a loading spinner, then the QR code appears.

#### D. Scan QR Code with Your Phone

**On Android:**
1. Open **WhatsApp** app
2. Tap **⋮** (three dots) in top-right corner
3. Tap **"Linked Devices"**
4. Tap **"Link a Device"**
5. Enter PIN if prompted
6. Point camera at QR code on computer screen
7. Tap **"Link"** when it scans

**On iPhone:**
1. Open **WhatsApp** app
2. Tap **"Settings"** (bottom-right)
3. Tap **"Linked Devices"**
4. Tap **"Link a Device"**
5. Authenticate with Face ID/Touch ID
6. Point camera at QR code on screen
7. Done! It links automatically

#### E. Wait for Connection

After scanning:
- You'll see **"Authenticating..."** status
- Wait **30 seconds**
- Status changes to **"Connected"** with green badge
- Shows your phone number

✅ **Your WhatsApp is now connected!**

---

### Step 7: Send Test Message (2 minutes)

Let's test it works!

#### A. Go to Compose Message

1. Click **"Compose Message"** tab
2. Check the **☑️ WhatsApp** checkbox
3. Select **"All Members"** (or specific group)

#### B. Compose and Send

1. Type message: **"Test from Mahaveer Bhavan Admin Panel"**
2. Click **"Send Now"**

#### C. Check Your WhatsApp

- Message should arrive in **10-30 seconds**
- All selected members receive it
- Each message has 1-second delay (rate limiting)

✅ **If you received the message, everything is working!**

---

## 🎉 You're Done!

Your complete setup:

```
┌──────────────────┐
│  Netlify         │  ✅ Frontend deployed
│  (React App)     │  → https://mahaveer-bhavan.netlify.app
└────────┬─────────┘
         │
         │ API Calls
         ▼
┌──────────────────┐
│  Render          │  ✅ WhatsApp server running
│  (Node.js API)   │  → https://your-app.onrender.com
└────────┬─────────┘
         │
         │ Stores data
         ▼
┌──────────────────┐
│  Supabase        │  ✅ Database with WhatsApp tables
│  (PostgreSQL)    │
└──────────────────┘
```

---

## 🔧 Important: Free Tier Notes

If you chose **Free Tier** on Render:

### Cold Starts

- Service **spins down** after 15 minutes of inactivity
- First request takes **30-60 seconds** to wake up
- QR code generation will be slower
- **Not ideal for production** (users will wait)

### WhatsApp Session

- WhatsApp session is saved in Render
- **Survives restarts** (session persists)
- But cold starts can cause delays

### Upgrade to Starter ($7/month) if:

- You send messages frequently
- You want instant response
- Production use case
- Go to Render dashboard → Your service → Settings → Change plan

---

## 🎯 How to Use Daily

### Sending Messages

1. Go to: **https://mahaveer-bhavan.netlify.app**
2. Login as admin
3. **Communication Center** → **Compose Message**
4. Check **☑️ WhatsApp**
5. Select recipients
6. Type message
7. Click **Send Now**

**Done!** Messages sent automatically.

### Check Status

Look at badge in Communication Center header:
- 🟢 **Green** = Connected (ready to send)
- 🟡 **Yellow** = Connecting
- 🟤 **Gray** = Disconnected (need to reconnect)

---

## 🐛 Troubleshooting

### QR Code Not Appearing?

**Check Render is running:**
```bash
curl https://your-app.onrender.com/health
```

If error:
1. Go to Render dashboard
2. Check **"Events"** tab for errors
3. Check **"Logs"** tab
4. Look for error messages

### Free Tier Taking Too Long?

**First request after inactivity = cold start**

Solution:
- Wait 60 seconds
- Or upgrade to Starter plan ($7/month)

### Messages Not Sending?

**Check connection status:**
1. Look at badge - should be green
2. If gray/red, go to WhatsApp Settings tab
3. Click "Disconnect" then "Connect WhatsApp"
4. Scan QR code again

### QR Code Expired?

**QR codes expire after 5 minutes**

Solution:
- Click "Connect WhatsApp" again
- New QR code appears
- Scan immediately

### Render Says "Deploy Failed"?

**Check these:**
1. Is `server` set as Root Directory?
2. Are environment variables added?
3. Check build logs for npm install errors
4. Verify `server/package.json` exists

---

## 📊 Monitoring

### Check Server Status

```bash
curl https://your-app.onrender.com/health
```

### View Logs

1. Go to Render dashboard
2. Click your service
3. Click **"Logs"** tab
4. See real-time server output

### Check Database

```bash
cd mahaveer-bhavan
node apply-whatsapp-migration.js
```

---

## 🔄 Updating Your Server

When you update code:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Update WhatsApp server"
   git push origin main
   ```

2. **Render auto-deploys** (if enabled)
   - Or manually: Render dashboard → "Manual Deploy"

3. **WhatsApp session persists** - no need to rescan QR code

---

## 💰 Pricing

### Free Tier
- 750 hours/month free
- Spins down after 15 min inactivity
- Good for testing
- **$0/month**

### Starter Plan (Recommended for Production)
- Always running
- No cold starts
- Better performance
- **$7/month**

### Your Total Stack Cost:
- Netlify: **Free**
- Supabase: **Free**
- Render: **$0** (free tier) or **$7** (starter)

**Total**: $0-7/month

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Database migration applied (Step 1)
- [ ] Render service deployed and "Live" (Step 3)
- [ ] Health endpoint works (Step 4)
- [ ] Netlify env variable added (Step 5)
- [ ] Netlify redeployed (Step 5)
- [ ] Can access WhatsApp Settings tab (Step 6)
- [ ] QR code appears (Step 6)
- [ ] Scanned QR code with phone (Step 6)
- [ ] Status shows "Connected" green badge (Step 6)
- [ ] Test message sent successfully (Step 7)
- [ ] Message received on WhatsApp (Step 7)

✅ All checked = **You're ready for production!**

---

## 📚 Additional Resources

- **Render Documentation**: https://render.com/docs
- **Full Integration Guide**: `WHATSAPP_INTEGRATION_GUIDE.md`
- **Quick Reference**: `WHATSAPP_QUICKSTART.md`
- **Render Dashboard**: https://dashboard.render.com

---

## 🆘 Need Help?

**Check server status:**
```bash
curl https://your-app.onrender.com/health
```

**Check migration:**
```bash
node apply-whatsapp-migration.js
```

**View Render logs:**
Render Dashboard → Your Service → Logs tab

**Common issues**: See Troubleshooting section above

---

## 🎊 Success!

You now have a fully functional WhatsApp messaging system:

✅ **Backend**: Running 24/7 on Render
✅ **Frontend**: Deployed on Netlify
✅ **Database**: WhatsApp tables in Supabase
✅ **WhatsApp**: Connected and ready to send messages

**Start sending WhatsApp messages to your members!** 🚀
