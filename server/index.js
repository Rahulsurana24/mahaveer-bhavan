import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.WHATSAPP_SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// WhatsApp client instance
let client = null;
let qrCodeData = null;
let isReady = false;
let currentStatus = 'disconnected';

// Create session directory if it doesn't exist
const sessionPath = path.join(__dirname, '.wwebjs_auth');
if (!fs.existsSync(sessionPath)) {
  fs.mkdirSync(sessionPath, { recursive: true });
}

// Initialize WhatsApp client
function initializeClient() {
  console.log('🔄 Initializing WhatsApp client...');

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionPath
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  // QR Code generation
  client.on('qr', async (qr) => {
    console.log('📱 QR Code received, generating image...');
    currentStatus = 'qr_ready';

    try {
      // Generate QR code as data URL
      qrCodeData = await qrcode.toDataURL(qr);

      // Update database
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          session_name: 'default',
          qr_code: qrCodeData,
          status: 'qr_ready',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'session_name'
        });

      console.log('✅ QR Code saved to database');
    } catch (error) {
      console.error('❌ Error generating QR code:', error);
    }
  });

  // Authentication successful
  client.on('authenticated', async () => {
    console.log('✅ WhatsApp authenticated successfully');
    currentStatus = 'authenticated';
    qrCodeData = null;

    await supabase
      .from('whatsapp_sessions')
      .update({
        status: 'authenticated',
        qr_code: null,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('session_name', 'default');
  });

  // Authentication failure
  client.on('auth_failure', async (msg) => {
    console.error('❌ Authentication failed:', msg);
    currentStatus = 'error';

    await supabase
      .from('whatsapp_sessions')
      .update({
        status: 'error',
        error_message: `Authentication failed: ${msg}`,
        updated_at: new Date().toISOString()
      })
      .eq('session_name', 'default');
  });

  // Client is ready
  client.on('ready', async () => {
    console.log('✅ WhatsApp client is ready!');
    isReady = true;
    currentStatus = 'ready';

    try {
      // Get client info
      const clientInfo = client.info;
      const phoneNumber = clientInfo.wid.user;

      console.log(`📞 Connected as: ${phoneNumber}`);

      await supabase
        .from('whatsapp_sessions')
        .update({
          status: 'ready',
          phone_number: phoneNumber,
          qr_code: null,
          last_seen_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('session_name', 'default');

      console.log('✅ Session status updated in database');
    } catch (error) {
      console.error('❌ Error updating ready status:', error);
    }
  });

  // Disconnected
  client.on('disconnected', async (reason) => {
    console.log('⚠️ WhatsApp client disconnected:', reason);
    isReady = false;
    currentStatus = 'disconnected';
    qrCodeData = null;

    await supabase
      .from('whatsapp_sessions')
      .update({
        status: 'disconnected',
        error_message: `Disconnected: ${reason}`,
        updated_at: new Date().toISOString()
      })
      .eq('session_name', 'default');

    // Try to reconnect after 5 seconds
    setTimeout(() => {
      console.log('🔄 Attempting to reconnect...');
      initializeClient();
    }, 5000);
  });

  // Initialize the client
  client.initialize().catch(error => {
    console.error('❌ Error initializing client:', error);
    currentStatus = 'error';
  });
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    whatsapp_status: currentStatus,
    is_ready: isReady,
    timestamp: new Date().toISOString()
  });
});

// Get session status
app.get('/api/whatsapp/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('session_name', 'default')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({
      status: currentStatus,
      is_ready: isReady,
      qr_code: qrCodeData,
      session: data || null
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Request new QR code
app.post('/api/whatsapp/request-qr', async (req, res) => {
  try {
    if (isReady) {
      return res.json({
        success: false,
        message: 'WhatsApp is already connected',
        status: currentStatus
      });
    }

    // If client doesn't exist or is not initializing, start it
    if (!client || currentStatus === 'error' || currentStatus === 'disconnected') {
      initializeClient();
      currentStatus = 'connecting';

      await supabase
        .from('whatsapp_sessions')
        .upsert({
          session_name: 'default',
          status: 'connecting',
          qr_code: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'session_name'
        });
    }

    res.json({
      success: true,
      message: 'QR code requested. Please wait...',
      status: currentStatus
    });
  } catch (error) {
    console.error('Error requesting QR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect session
app.post('/api/whatsapp/disconnect', async (req, res) => {
  try {
    if (client) {
      await client.destroy();
      client = null;
    }

    isReady = false;
    currentStatus = 'disconnected';
    qrCodeData = null;

    await supabase
      .from('whatsapp_sessions')
      .update({
        status: 'disconnected',
        qr_code: null,
        phone_number: null,
        session_data: null,
        updated_at: new Date().toISOString()
      })
      .eq('session_name', 'default');

    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send message
app.post('/api/whatsapp/send-message', async (req, res) => {
  try {
    const { phone, message, message_id } = req.body;

    if (!isReady || !client) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp is not connected'
      });
    }

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    // Format phone number (remove + and add @c.us)
    const formattedPhone = phone.replace(/[^\d]/g, '') + '@c.us';

    // Send message
    const sentMessage = await client.sendMessage(formattedPhone, message);

    // Update database if message_id provided
    if (message_id) {
      await supabase
        .from('whatsapp_messages')
        .update({
          status: 'sent',
          whatsapp_message_id: sentMessage.id._serialized,
          sent_at: new Date().toISOString()
        })
        .eq('id', message_id);
    }

    res.json({
      success: true,
      message_id: sentMessage.id._serialized,
      timestamp: sentMessage.timestamp
    });

  } catch (error) {
    console.error('Error sending message:', error);

    // Update database with error if message_id provided
    if (req.body.message_id) {
      await supabase
        .from('whatsapp_messages')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', req.body.message_id);
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send bulk messages
app.post('/api/whatsapp/send-bulk', async (req, res) => {
  try {
    const { messages } = req.body; // Array of {phone, message, message_id}

    if (!isReady || !client) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp is not connected'
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }

    const results = [];

    for (const msg of messages) {
      try {
        const formattedPhone = msg.phone.replace(/[^\d]/g, '') + '@c.us';
        const sentMessage = await client.sendMessage(formattedPhone, msg.message);

        // Update database
        if (msg.message_id) {
          await supabase
            .from('whatsapp_messages')
            .update({
              status: 'sent',
              whatsapp_message_id: sentMessage.id._serialized,
              sent_at: new Date().toISOString()
            })
            .eq('id', msg.message_id);
        }

        results.push({
          phone: msg.phone,
          success: true,
          message_id: sentMessage.id._serialized
        });

        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error sending to ${msg.phone}:`, error);

        if (msg.message_id) {
          await supabase
            .from('whatsapp_messages')
            .update({
              status: 'failed',
              error_message: error.message
            })
            .eq('id', msg.message_id);
        }

        results.push({
          phone: msg.phone,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results: results,
      total: messages.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

  } catch (error) {
    console.error('Error in bulk send:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get contacts
app.get('/api/whatsapp/contacts', async (req, res) => {
  try {
    if (!isReady || !client) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp is not connected'
      });
    }

    const contacts = await client.getContacts();

    res.json({
      success: true,
      count: contacts.length,
      contacts: contacts.slice(0, 100).map(c => ({
        phone: c.id.user,
        name: c.name || c.pushname,
        is_business: c.isBusiness
      }))
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 API base URL: http://localhost:${PORT}/api/whatsapp`);
  console.log('');
  console.log('Waiting for connection request...');
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️ Shutting down gracefully...');

  if (client) {
    await client.destroy();
  }

  process.exit(0);
});
