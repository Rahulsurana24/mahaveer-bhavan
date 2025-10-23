import { supabase } from '@/integrations/supabase/client';

const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001/api/whatsapp';

export interface WhatsAppMessage {
  phone: string;
  message: string;
  message_id?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  sent: number;
  failed: number;
  results: Array<{
    phone: string;
    success: boolean;
    message_id?: string;
    error?: string;
  }>;
}

/**
 * Check if WhatsApp is connected and ready
 */
export async function checkWhatsAppStatus(): Promise<{
  isReady: boolean;
  status: string;
  phoneNumber: string | null;
}> {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/status`);
    if (!response.ok) {
      return { isReady: false, status: 'error', phoneNumber: null };
    }

    const data = await response.json();
    return {
      isReady: data.is_ready || false,
      status: data.status || 'disconnected',
      phoneNumber: data.session?.phone_number || null
    };
  } catch (error) {
    console.error('Error checking WhatsApp status:', error);
    return { isReady: false, status: 'error', phoneNumber: null };
  }
}

/**
 * Send a single WhatsApp message
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  messageId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        message,
        message_id: messageId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send message');
    }

    return {
      success: data.success,
      messageId: data.message_id
    };
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Send multiple WhatsApp messages (bulk send)
 */
export async function sendBulkWhatsAppMessages(
  messages: WhatsAppMessage[]
): Promise<SendWhatsAppResult> {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/send-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send bulk messages');
    }

    return {
      success: data.success,
      sent: data.sent || 0,
      failed: data.failed || 0,
      results: data.results || []
    };
  } catch (error: any) {
    console.error('Error sending bulk WhatsApp messages:', error);
    return {
      success: false,
      sent: 0,
      failed: messages.length,
      results: messages.map(msg => ({
        phone: msg.phone,
        success: false,
        error: error.message || 'Unknown error'
      }))
    };
  }
}

/**
 * Get member phone numbers based on recipient filter
 */
export async function getMemberPhones(recipientFilter: any): Promise<Array<{
  id: string;
  phone: string;
  name: string;
}>> {
  try {
    let query = supabase
      .from('members')
      .select('id, phone, full_name')
      .eq('status', 'active')
      .not('phone', 'is', null);

    // Apply filters
    switch (recipientFilter.type) {
      case 'membership_type':
        if (recipientFilter.membershipType) {
          query = query.eq('membership_type', recipientFilter.membershipType);
        }
        break;

      case 'event_registration':
        if (recipientFilter.eventId) {
          const { data: registrations } = await supabase
            .from('event_registrations')
            .select('member_id')
            .eq('event_id', recipientFilter.eventId)
            .eq('status', 'confirmed');

          if (registrations) {
            const memberIds = registrations.map(r => r.member_id);
            query = query.in('id', memberIds);
          }
        }
        break;

      case 'trip_registration':
        if (recipientFilter.tripId) {
          const { data: registrations } = await supabase
            .from('trip_registrations')
            .select('member_id')
            .eq('trip_id', recipientFilter.tripId)
            .eq('status', 'confirmed');

          if (registrations) {
            const memberIds = registrations.map(r => r.member_id);
            query = query.in('id', memberIds);
          }
        }
        break;

      case 'all':
      default:
        // No additional filter for 'all'
        break;
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(member => ({
      id: member.id,
      phone: member.phone!,
      name: member.full_name
    }));
  } catch (error) {
    console.error('Error fetching member phones:', error);
    return [];
  }
}

/**
 * Create WhatsApp message log entries in database
 */
export async function createWhatsAppMessageLogs(
  sessionId: string,
  recipients: Array<{ phone: string; name: string; memberId: string }>,
  message: string,
  sentBy: string
): Promise<string[]> {
  try {
    const messageRecords = recipients.map(recipient => ({
      session_id: sessionId,
      recipient_phone: recipient.phone,
      recipient_name: recipient.name,
      message_content: message,
      status: 'pending',
      sent_by: sentBy
    }));

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert(messageRecords)
      .select('id');

    if (error) throw error;

    return (data || []).map(record => record.id);
  } catch (error) {
    console.error('Error creating WhatsApp message logs:', error);
    return [];
  }
}

/**
 * Get active WhatsApp session ID
 */
export async function getActiveWhatsAppSession(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('id')
      .eq('session_name', 'default')
      .eq('status', 'ready')
      .single();

    if (error) return null;

    return data?.id || null;
  } catch (error) {
    console.error('Error getting active session:', error);
    return null;
  }
}
