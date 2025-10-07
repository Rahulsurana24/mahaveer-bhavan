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
      case 'send_email':
        return await sendEmail(data);
      case 'send_bulk_emails':
        return await sendBulkEmails(data);
      case 'send_template_email':
        return await sendTemplateEmail(data);
      case 'verify_email':
        return await sendVerificationEmail(data);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Email service error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function sendEmail(data: any) {
  // Email service integration (SendGrid/AWS SES) would go here
  console.log('Sending email:', {
    to: data.to,
    subject: data.subject,
    content: data.content,
    from: data.from || 'noreply@mahaweerbhavan.org'
  });

  return new Response(
    JSON.stringify({
      message_id: `email_${Date.now()}`,
      status: 'sent',
      to: data.to
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function sendBulkEmails(data: any) {
  const { recipients, subject, content, template } = data;
  const results = [];

  for (const recipient of recipients) {
    // Simulate sending to each recipient
    results.push({
      email: recipient.email,
      status: 'sent',
      message_id: `email_${Date.now()}_${recipient.id}`
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

async function sendTemplateEmail(data: any) {
  const { template_id, recipient, variables } = data;
  
  // Template email logic
  return new Response(
    JSON.stringify({
      message_id: `template_${Date.now()}`,
      status: 'sent',
      template_id,
      recipient: recipient.email
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function sendVerificationEmail(data: any) {
  const { email, verification_url } = data;
  
  const emailContent = `
    <h2>Verify Your Email - Mahaveer Bhavan</h2>
    <p>Please click the link below to verify your email address:</p>
    <a href="${verification_url}">Verify Email</a>
    <p>This link will expire in 24 hours.</p>
  `;

  return await sendEmail({
    to: email,
    subject: 'Verify Your Email - Mahaveer Bhavan',
    content: emailContent
  });
}