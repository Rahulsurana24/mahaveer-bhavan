-- WhatsApp Integration Tables and Functions
-- This migration adds support for WhatsApp Web.js session management

-- Create whatsapp_sessions table to store session data
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT NOT NULL UNIQUE DEFAULT 'default',
  session_data JSONB,
  qr_code TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'qr_ready', 'authenticated', 'ready', 'error')),
  phone_number TEXT,
  last_seen_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  CONSTRAINT whatsapp_sessions_session_name_key UNIQUE (session_name)
);

-- Create whatsapp_messages table to log all WhatsApp messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_content TEXT NOT NULL,
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  whatsapp_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES user_profiles(id)
);

-- Create whatsapp_contacts table to store WhatsApp contacts
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  name TEXT,
  is_business BOOLEAN DEFAULT FALSE,
  profile_pic_url TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT whatsapp_contacts_session_phone_unique UNIQUE (session_id, phone_number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_created_by ON whatsapp_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_session_id ON whatsapp_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient_phone ON whatsapp_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_by ON whatsapp_messages(sent_by);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_session_id ON whatsapp_contacts(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone_number ON whatsapp_contacts(phone_number);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();

CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();

CREATE TRIGGER update_whatsapp_contacts_updated_at
  BEFORE UPDATE ON whatsapp_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();

-- Enable Row Level Security
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_sessions
-- Admins can view all sessions
CREATE POLICY "Admins can view WhatsApp sessions"
  ON whatsapp_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- Admins can insert sessions
CREATE POLICY "Admins can insert WhatsApp sessions"
  ON whatsapp_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- Admins can update sessions
CREATE POLICY "Admins can update WhatsApp sessions"
  ON whatsapp_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- Admins can delete sessions
CREATE POLICY "Admins can delete WhatsApp sessions"
  ON whatsapp_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- RLS Policies for whatsapp_messages
-- Admins can view all messages
CREATE POLICY "Admins can view WhatsApp messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- Admins can insert messages
CREATE POLICY "Admins can insert WhatsApp messages"
  ON whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- Admins can update messages
CREATE POLICY "Admins can update WhatsApp messages"
  ON whatsapp_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- RLS Policies for whatsapp_contacts
-- Admins can view all contacts
CREATE POLICY "Admins can view WhatsApp contacts"
  ON whatsapp_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- Admins can manage contacts
CREATE POLICY "Admins can manage WhatsApp contacts"
  ON whatsapp_contacts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- Create function to get current session status
CREATE OR REPLACE FUNCTION get_whatsapp_session_status()
RETURNS TABLE (
  status TEXT,
  phone_number TEXT,
  last_seen_at TIMESTAMPTZ,
  is_ready BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ws.status,
    ws.phone_number,
    ws.last_seen_at,
    (ws.status = 'ready') as is_ready
  FROM whatsapp_sessions ws
  WHERE ws.session_name = 'default'
  ORDER BY ws.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_whatsapp_session_status() TO authenticated;

-- Create function to clean old QR codes and disconnected sessions
CREATE OR REPLACE FUNCTION cleanup_old_whatsapp_sessions()
RETURNS void AS $$
BEGIN
  -- Clear QR codes older than 5 minutes that are still in qr_ready status
  UPDATE whatsapp_sessions
  SET qr_code = NULL, status = 'error', error_message = 'QR code expired'
  WHERE status = 'qr_ready'
  AND updated_at < NOW() - INTERVAL '5 minutes';

  -- Mark sessions as disconnected if not seen in 30 minutes
  UPDATE whatsapp_sessions
  SET status = 'disconnected', error_message = 'Session timeout'
  WHERE status IN ('connecting', 'authenticated', 'ready')
  AND last_seen_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_whatsapp_sessions() TO authenticated;

-- Insert default session record
INSERT INTO whatsapp_sessions (session_name, status)
VALUES ('default', 'disconnected')
ON CONFLICT (session_name) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE whatsapp_sessions IS 'Stores WhatsApp Web session data including QR codes and authentication status';
COMMENT ON TABLE whatsapp_messages IS 'Logs all WhatsApp messages sent through the system';
COMMENT ON TABLE whatsapp_contacts IS 'Stores synchronized WhatsApp contacts from the connected session';
