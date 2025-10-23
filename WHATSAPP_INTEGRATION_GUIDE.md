# WhatsApp Integration Guide

Complete guide for setting up and using WhatsApp messaging in the Mahaveer Bhavan admin panel.

## Overview

This integration allows admins to send WhatsApp messages directly to members through the Communication Center using QR code-based authentication with WhatsApp Web.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   React Frontend    │────────▶│  Express WhatsApp    │────────▶│  WhatsApp Web   │
│  (Admin Panel)      │  REST   │     Server           │  API    │                 │
└─────────────────────┘         └──────────────────────┘         └─────────────────┘
         │                               │
         │                               │
         └───────────────┬───────────────┘
                         ▼
                  ┌──────────────┐
                  │   Supabase   │
                  │   Database   │
                  └──────────────┘
```

### Components

1. **Express WhatsApp Server** (`/server`)
   - Runs on port 3001
   - Uses `whatsapp-web.js` library
   - Handles QR code generation and message sending
   - Maintains persistent session

2. **React Frontend Components**
   - `WhatsAppSessionManager`: QR code display and session management
   - `WhatsAppStatusIndicator`: Status badge in Communication Center
   - WhatsApp utilities: Helper functions for API calls

3. **Database Tables**
   - `whatsapp_sessions`: Stores session status and QR codes
   - `whatsapp_messages`: Logs all sent WhatsApp messages
   - `whatsapp_contacts`: Synced WhatsApp contacts

## Setup Instructions

### Step 1: Database Migration

Apply the WhatsApp integration migration:

```bash
cd mahaveer-bhavan

# Deploy the migration to Supabase
npx supabase db push

# Or manually apply the migration file
# supabase/migrations/20251023190000_whatsapp_integration.sql
```

This creates the necessary tables and RLS policies.

### Step 2: Install WhatsApp Server Dependencies

```bash
cd server
npm install
```

This installs:
- `whatsapp-web.js` - WhatsApp Web API wrapper
- `express` - HTTP server
- `cors` - Cross-origin resource sharing
- `qrcode` - QR code generation
- `@supabase/supabase-js` - Supabase client
- `dotenv` - Environment variables

### Step 3: Configure Environment Variables

The `.env` file should already have these variables:

```env
# Supabase Configuration (already present)
VITE_SUPABASE_URL="https://juvrytwhtivezeqrmtpq.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"

# WhatsApp Server Configuration (added)
VITE_WHATSAPP_API_URL="http://localhost:3001/api/whatsapp"
WHATSAPP_SERVER_PORT=3001
```

### Step 4: Start the WhatsApp Server

**Development Mode:**
```bash
cd server
npm run dev
```

**Production Mode:**
```bash
cd server
npm start
```

You should see:
```
🚀 WhatsApp server running on port 3001
📡 Health check: http://localhost:3001/health
📱 API base URL: http://localhost:3001/api/whatsapp

Waiting for connection request...
```

### Step 5: Start the React Frontend

In a separate terminal:

```bash
cd mahaveer-bhavan
npm run dev
```

The frontend will be available at `http://localhost:5173`

## How to Use

### Connecting WhatsApp

1. **Login as Admin**
   - Go to the admin panel
   - Navigate to **Communication Center**

2. **Open WhatsApp Settings**
   - Click on the "WhatsApp Settings" tab
   - Click "Connect WhatsApp" button

3. **Scan QR Code**
   - A QR code will appear after a few seconds
   - Open WhatsApp on your phone
   - Go to **Settings** → **Linked Devices**
   - Tap **"Link a Device"**
   - Scan the QR code displayed on screen

4. **Wait for Connection**
   - The status will change to "Authenticating..."
   - Once connected, you'll see "Connected" with your phone number
   - The WhatsApp status indicator in the header will turn green

### Sending Messages via WhatsApp

1. **Go to Compose Message Tab**
   - Navigate to the "Compose Message" tab in Communication Center

2. **Select WhatsApp Channel**
   - Check the "WhatsApp" checkbox in the channels section
   - You can select multiple channels (WhatsApp + Email + SMS)

3. **Select Recipients**
   - Choose recipient filter (All Members, Membership Type, Event, Trip)
   - The system will only send to members who have phone numbers

4. **Compose Message**
   - Enter your message content
   - Subject is not required for WhatsApp-only messages

5. **Send**
   - Click "Send Now" to send immediately
   - Messages will be sent with a 1-second delay between each to avoid rate limiting

### Monitoring WhatsApp Status

The **WhatsApp Status Indicator** shows the current connection state:

- 🟢 **Green with checkmark** - Connected and ready
- 🟡 **Yellow with spinner** - Connecting or authenticating
- 🟤 **Gray** - Disconnected
- 🔴 **Red** - Error

Hover over the badge to see more details.

## API Endpoints

The WhatsApp server exposes these REST endpoints:

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "whatsapp_status": "ready",
  "is_ready": true,
  "timestamp": "2025-10-23T17:30:00.000Z"
}
```

### GET `/api/whatsapp/status`
Get current session status and QR code.

**Response:**
```json
{
  "status": "ready",
  "is_ready": true,
  "qr_code": null,
  "session": {
    "phone_number": "919876543210",
    "last_seen_at": "2025-10-23T17:30:00.000Z",
    "error_message": null
  }
}
```

### POST `/api/whatsapp/request-qr`
Request a new QR code for authentication.

**Response:**
```json
{
  "success": true,
  "message": "QR code requested. Please wait...",
  "status": "connecting"
}
```

### POST `/api/whatsapp/disconnect`
Disconnect the current WhatsApp session.

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp disconnected successfully"
}
```

### POST `/api/whatsapp/send-message`
Send a single WhatsApp message.

**Request Body:**
```json
{
  "phone": "+919876543210",
  "message": "Hello from Mahaveer Bhavan!",
  "message_id": "uuid-optional"
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "whatsapp-message-id",
  "timestamp": 1698765432
}
```

### POST `/api/whatsapp/send-bulk`
Send multiple WhatsApp messages.

**Request Body:**
```json
{
  "messages": [
    {
      "phone": "+919876543210",
      "message": "Message 1",
      "message_id": "uuid-1"
    },
    {
      "phone": "+919876543211",
      "message": "Message 2",
      "message_id": "uuid-2"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [...],
  "total": 2,
  "sent": 2,
  "failed": 0
}
```

## Session Persistence

### How It Works

- WhatsApp session data is stored in `server/.wwebjs_auth/` directory
- Once authenticated, the session persists across server restarts
- You don't need to scan the QR code again after restarting
- Session status is also stored in Supabase database

### Resetting the Session

If you need to connect a different WhatsApp account:

1. Stop the WhatsApp server
2. Delete the session directory:
   ```bash
   rm -rf server/.wwebjs_auth
   ```
3. Restart the server
4. Scan the new QR code

## Troubleshooting

### Issue: QR Code Not Appearing

**Possible Causes:**
- WhatsApp server not running
- Browser can't reach the server

**Solution:**
1. Check if server is running: `http://localhost:3001/health`
2. Check browser console for errors
3. Verify `VITE_WHATSAPP_API_URL` in `.env`

### Issue: QR Code Expired

**Solution:**
- QR codes expire after 5 minutes
- Click "Connect WhatsApp" again to generate a new one

### Issue: Connection Keeps Dropping

**Possible Causes:**
- Phone is offline
- WhatsApp logged out from phone
- Server restarted without persistent session

**Solution:**
1. Verify phone has internet connection
2. Check WhatsApp on phone is logged in
3. Reconnect by scanning QR code again

### Issue: Messages Not Sending

**Possible Causes:**
- Member doesn't have a phone number in the database
- Phone number format is incorrect
- WhatsApp rate limiting

**Solution:**
1. Verify members have phone numbers with country code (+91 for India)
2. Check database: `SELECT phone FROM members WHERE id = '...'`
3. Wait a few minutes if rate-limited

### Issue: Server Crashes on Startup

**Possible Causes:**
- Missing Chromium dependencies (Linux)
- Insufficient system resources

**Solution on Ubuntu/Debian:**
```bash
sudo apt-get install -y \
  chromium-browser \
  libnss3 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  libxss1 \
  libasound2
```

**Check system resources:**
- Minimum 1GB RAM required
- Sufficient disk space for session data

## Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start WhatsApp server with PM2
cd server
pm2 start index.js --name whatsapp-server

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Monitor logs
pm2 logs whatsapp-server
```

### Using Docker

Create `server/Dockerfile`:

```dockerfile
FROM node:18-slim

# Install Chromium and dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application
COPY . .

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
```

Build and run:
```bash
cd server
docker build -t whatsapp-server .
docker run -d -p 3001:3001 --name whatsapp whatsapp-server
```

### Environment Variables for Production

```env
# Frontend (deployed on Netlify)
VITE_WHATSAPP_API_URL="https://your-domain.com/api/whatsapp"

# Backend (on your VPS)
WHATSAPP_SERVER_PORT=3001
VITE_SUPABASE_URL="https://juvrytwhtivezeqrmtpq.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

### Reverse Proxy with Nginx

```nginx
# /etc/nginx/sites-available/whatsapp-api
server {
    listen 80;
    server_name api.your-domain.com;

    location /api/whatsapp {
        proxy_pass http://localhost:3001/api/whatsapp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable SSL with Certbot:
```bash
sudo certbot --nginx -d api.your-domain.com
```

## Security Considerations

### Important Notes

1. **Session Data is Sensitive**
   - Never commit `server/.wwebjs_auth/` to Git
   - This directory contains your WhatsApp session authentication
   - Added to `.gitignore` by default

2. **API Authentication**
   - The API endpoints currently have no authentication
   - Add authentication middleware before production
   - Use JWT tokens or API keys

3. **Rate Limiting**
   - WhatsApp has rate limits on messages
   - The server adds 1-second delay between bulk messages
   - Monitor for "blocked" status from WhatsApp

4. **Phone Number Privacy**
   - WhatsApp messages are logged in the database
   - Ensure proper RLS policies for data access
   - Consider GDPR/privacy regulations

5. **Environment Variables**
   - Never commit `.env` file
   - Use secrets management in production
   - Rotate keys regularly

## Database Schema

### whatsapp_sessions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_name | TEXT | Session identifier (default: 'default') |
| session_data | JSONB | Session authentication data |
| qr_code | TEXT | Base64 QR code image (temporary) |
| status | TEXT | Connection status |
| phone_number | TEXT | Connected phone number |
| last_seen_at | TIMESTAMPTZ | Last activity timestamp |
| error_message | TEXT | Error details if any |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | Admin who created session |

**Status Values:**
- `disconnected` - Not connected
- `connecting` - Initializing
- `qr_ready` - QR code ready to scan
- `authenticated` - User scanned QR
- `ready` - Fully connected
- `error` - Connection error

### whatsapp_messages

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | Foreign key to whatsapp_sessions |
| recipient_phone | TEXT | Recipient phone number |
| recipient_name | TEXT | Recipient name |
| message_content | TEXT | Message text |
| media_url | TEXT | Media attachment URL (optional) |
| status | TEXT | Message delivery status |
| error_message | TEXT | Error details if failed |
| whatsapp_message_id | TEXT | WhatsApp's message ID |
| sent_at | TIMESTAMPTZ | Sent timestamp |
| delivered_at | TIMESTAMPTZ | Delivered timestamp |
| read_at | TIMESTAMPTZ | Read timestamp |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| sent_by | UUID | Admin who sent message |

**Status Values:**
- `pending` - Queued to send
- `sent` - Successfully sent
- `delivered` - Delivered to recipient
- `read` - Read by recipient
- `failed` - Failed to send

### whatsapp_contacts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | Foreign key to whatsapp_sessions |
| phone_number | TEXT | Contact phone number |
| name | TEXT | Contact name |
| is_business | BOOLEAN | Is business account |
| profile_pic_url | TEXT | Profile picture URL |
| last_synced_at | TIMESTAMPTZ | Last sync timestamp |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## Testing

### Manual Testing Checklist

- [ ] WhatsApp server starts successfully
- [ ] Frontend can connect to server API
- [ ] QR code generates and displays
- [ ] Phone can scan QR code
- [ ] Connection status updates to "Connected"
- [ ] Status indicator shows green badge
- [ ] Can send single WhatsApp message
- [ ] Can send bulk WhatsApp messages
- [ ] Messages logged in database
- [ ] Session persists after server restart
- [ ] Disconnect functionality works
- [ ] Reconnect functionality works
- [ ] Error messages display correctly

### Test Sending a Message

1. Ensure WhatsApp is connected (green badge)
2. Go to Compose Message tab
3. Select WhatsApp channel only
4. Select "All Members" or specific filter
5. Enter test message: "Test from Mahaveer Bhavan Communication Center"
6. Click "Send Now"
7. Check your WhatsApp for the message
8. Verify in database:
   ```sql
   SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 10;
   ```

## Support and Maintenance

### Monitoring

**Check Server Status:**
```bash
# If using PM2
pm2 status

# Check logs
pm2 logs whatsapp-server

# Or direct process check
ps aux | grep node
```

**Check Database:**
```sql
-- Check active session
SELECT * FROM whatsapp_sessions WHERE session_name = 'default';

-- Check recent messages
SELECT
  wm.*,
  up.full_name as sender_name
FROM whatsapp_messages wm
LEFT JOIN user_profiles up ON wm.sent_by = up.id
ORDER BY wm.created_at DESC
LIMIT 20;

-- Check failed messages
SELECT * FROM whatsapp_messages WHERE status = 'failed';
```

### Maintenance Tasks

**Weekly:**
- Review failed messages
- Check session status
- Monitor server logs

**Monthly:**
- Clean up old message logs (optional)
- Review WhatsApp usage metrics
- Update dependencies

**As Needed:**
- Restart server if connection issues
- Clear session and reconnect if authenticated incorrectly
- Update WhatsApp Web.js library

## License

This WhatsApp integration is built using the MIT-licensed `whatsapp-web.js` library.

## Credits

- **whatsapp-web.js** - https://github.com/pedroslopez/whatsapp-web.js
- **puppeteer** - Browser automation
- **qrcode** - QR code generation

---

For issues or questions, please check the server logs and database tables first. Most issues can be resolved by restarting the server or reconnecting the session.
