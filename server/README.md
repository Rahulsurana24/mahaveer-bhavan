# WhatsApp Web.js Server

Backend server for WhatsApp messaging integration using whatsapp-web.js library.

## Features

- QR code-based authentication
- Session persistence
- Message sending (single and bulk)
- Contact synchronization
- Real-time status updates
- Integration with Supabase database

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Environment Variables

The server reads environment variables from the parent directory's `.env` file:

```env
# Required variables in ../env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
WHATSAPP_SERVER_PORT=3001  # Default: 3001
```

### 3. Run Database Migration

Before starting the server, ensure the WhatsApp integration migration is applied:

```bash
# From the root project directory
npx supabase migration up
```

Or manually apply: `supabase/migrations/20251023190000_whatsapp_integration.sql`

### 4. Start the Server

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health
```

Returns server and WhatsApp connection status.

### Get Session Status
```
GET /api/whatsapp/status
```

Returns current WhatsApp session status and QR code if available.

### Request QR Code
```
POST /api/whatsapp/request-qr
```

Initiates WhatsApp connection and generates QR code for scanning.

### Disconnect Session
```
POST /api/whatsapp/disconnect
```

Disconnects the current WhatsApp session and clears authentication.

### Send Message
```
POST /api/whatsapp/send-message
Content-Type: application/json

{
  "phone": "+919876543210",
  "message": "Hello from Mahaveer Bhavan!",
  "message_id": "uuid-optional"
}
```

Sends a single WhatsApp message.

### Send Bulk Messages
```
POST /api/whatsapp/send-bulk
Content-Type: application/json

{
  "messages": [
    {
      "phone": "+919876543210",
      "message": "Message 1",
      "message_id": "uuid-optional"
    },
    {
      "phone": "+919876543211",
      "message": "Message 2",
      "message_id": "uuid-optional"
    }
  ]
}
```

Sends multiple WhatsApp messages with rate limiting (1 second delay between messages).

### Get Contacts
```
GET /api/whatsapp/contacts
```

Returns synced WhatsApp contacts (limited to first 100).

## Status States

- `disconnected`: Not connected to WhatsApp
- `connecting`: Initializing connection
- `qr_ready`: QR code is ready for scanning
- `authenticated`: User scanned QR and authenticated
- `ready`: Fully connected and ready to send messages
- `error`: Connection error occurred

## Session Persistence

Sessions are stored locally in the `.wwebjs_auth` directory. Once authenticated, the session persists across server restarts, so you don't need to scan QR code again.

To reset the session:
1. Stop the server
2. Delete the `.wwebjs_auth` directory
3. Start the server again

## Deployment Notes

### Production Deployment

For production deployment (e.g., on a VPS or cloud server):

1. Install Chromium dependencies:
```bash
# Ubuntu/Debian
sudo apt-get install -y \
  chromium-browser \
  libxss1 \
  libnss3 \
  libasound2 \
  libatk-bridge2.0-0 \
  libgtk-3-0

# Or use puppeteer-extra with stealth plugin
```

2. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start index.js --name whatsapp-server
pm2 save
pm2 startup
```

3. Setup reverse proxy with nginx for HTTPS (recommended)

4. Ensure the server has sufficient resources (minimum 1GB RAM)

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

## Troubleshooting

### QR Code Not Generating

- Check if Chromium/Chrome is properly installed
- Verify puppeteer can launch headless browser
- Check server logs for errors

### Session Keeps Disconnecting

- WhatsApp Web may have logged out from the phone
- The phone may be offline
- Session data may be corrupted (delete `.wwebjs_auth` and reconnect)

### Messages Not Sending

- Verify phone number format (should include country code)
- Check if the recipient has WhatsApp
- Ensure you're not rate-limited (wait between messages)

## Security Considerations

- **Never commit the `.wwebjs_auth` directory** - it contains sensitive session data
- Use environment variables for all sensitive configuration
- Implement authentication/authorization on API endpoints before production
- Use HTTPS in production
- Rate limit API endpoints to prevent abuse
- Monitor for suspicious activity

## License

MIT
