import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...data } = await req.json();

    switch (action) {
      case 'send_message':
        return await sendWhatsAppMessage(data);
      case 'send_bulk_messages':
        return await sendBulkMessages(data);
      case 'verify_webhook':
        return await verifyWebhook(data);
      case 'generate_qr_login':
        return await generateQRLogin(data);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('WhatsApp integration error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function sendWhatsAppMessage(data: any) {
  // WhatsApp Business API integration would go here
  // For now, returning mock response
  
  console.log('Sending WhatsApp message:', {
    phone: data.phone,
    message: data.message,
    type: data.type || 'text'
  });

  return new Response(
    JSON.stringify({
      message_id: `wa_${Date.now()}`,
      status: 'sent',
      phone: data.phone
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function sendBulkMessages(data: any) {
  const { recipients, message, template } = data;
  const results = [];

  for (const recipient of recipients) {
    // Simulate sending to each recipient
    results.push({
      phone: recipient.phone,
      status: 'sent',
      message_id: `wa_${Date.now()}_${recipient.id}`
    });
  }

  return new Response(
    JSON.stringify({
      batch_id: `batch_${Date.now()}`,
      results,
      total_sent: results.length
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function verifyWebhook(data: any) {
  // Webhook verification for WhatsApp
  return new Response(
    JSON.stringify({ verified: true }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function generateQRLogin(data: any) {
  // Generate QR code for WhatsApp login
  const sessionId = `session_${Date.now()}`;
  
  return new Response(
    JSON.stringify({
      session_id: sessionId,
      qr_code: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}