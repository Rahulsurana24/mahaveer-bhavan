# WhatsApp Integration - Quick Start

## Prerequisites

✅ Database migration applied
✅ `.env` file configured
✅ WhatsApp server dependencies installed

## Start Both Servers

### Terminal 1: WhatsApp Server

```bash
cd server
npm start
```

Wait for: `🚀 WhatsApp server running on port 3001`

### Terminal 2: Frontend

```bash
npm run dev
```

Frontend available at: `http://localhost:5173`

## Connect WhatsApp (First Time Only)

1. Login as admin
2. Go to **Communication Center**
3. Click **WhatsApp Settings** tab
4. Click **Connect WhatsApp** button
5. Scan QR code with your phone:
   - Open WhatsApp → Settings → Linked Devices
   - Tap "Link a Device"
   - Scan the QR code
6. Wait for green "Connected" status

## Send Messages

1. Go to **Compose Message** tab
2. Check **WhatsApp** channel
3. Select recipients
4. Type message
5. Click **Send Now**

## Status Check

**Green badge** = Connected ✅
**Yellow badge** = Connecting ⏳
**Gray badge** = Disconnected ⚠️

## Common Commands

```bash
# Check server status
curl http://localhost:3001/health

# Restart WhatsApp server
cd server && npm start

# Reset session (reconnect with different phone)
rm -rf server/.wwebjs_auth && cd server && npm start
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| QR code not showing | Check if server is running on port 3001 |
| Messages not sending | Verify green "Connected" badge |
| Session disconnected | Restart server: `cd server && npm start` |
| Need to reconnect | Click "Disconnect" then "Connect WhatsApp" |

## Need Help?

See full documentation: `WHATSAPP_INTEGRATION_GUIDE.md`

---

**Remember:** Keep the WhatsApp server running for messages to work!
