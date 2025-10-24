-- Enhanced Messaging System Migration
-- Creates tables for messages, calls, and notifications

-- Messages Table (enhanced)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call History Table
CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'declined', 'failed')),
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table (enhanced)
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'call', 'like', 'comment', 'follow', 'event', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Typing Indicators Table (for real-time typing status)
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, recipient_id)
);

-- Message Suggestions Table (AI-powered suggestions)
CREATE TABLE IF NOT EXISTS message_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  suggested_member_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason TEXT, -- e.g., "common_interests", "recent_events", "mutual_connections"
  score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_call_history_caller_id ON call_history(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_history_callee_id ON call_history(callee_id);
CREATE INDEX IF NOT EXISTS idx_call_history_created_at ON call_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_member_id ON user_notifications(member_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_sender_recipient ON typing_indicators(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_message_suggestions_member_id ON message_suggestions(member_id);
CREATE INDEX IF NOT EXISTS idx_message_suggestions_score ON message_suggestions(score DESC);

-- RLS Policies

-- Messages - Users can only see their own conversations
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_id FROM user_profiles WHERE id = sender_id OR id = recipient_id
    )
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = sender_id)
  );

CREATE POLICY "Users can update their received messages"
  ON messages FOR UPDATE
  USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = recipient_id)
  );

-- Call History - Users can see their own calls
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call history"
  ON call_history FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_id FROM user_profiles WHERE id = caller_id OR id = callee_id
    )
  );

CREATE POLICY "Users can create call records"
  ON call_history FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = caller_id)
  );

-- Notifications - Users can only see their own notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

CREATE POLICY "System can create notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

-- Typing Indicators - Users can see typing status in their conversations
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view typing indicators in their conversations"
  ON typing_indicators FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_id FROM user_profiles WHERE id = sender_id OR id = recipient_id
    )
  );

CREATE POLICY "Users can update their typing status"
  ON typing_indicators FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = sender_id)
  );

CREATE POLICY "Users can update their own typing indicators"
  ON typing_indicators FOR UPDATE
  USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = sender_id)
  );

-- Message Suggestions - Users can see their own suggestions
ALTER TABLE message_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own message suggestions"
  ON message_suggestions FOR SELECT
  USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_messages_updated_at_trigger
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

CREATE TRIGGER update_typing_indicators_updated_at
  BEFORE UPDATE ON typing_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- Function to create notification when message is sent
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notifications (member_id, type, title, body, link)
  VALUES (
    NEW.recipient_id,
    'message',
    'New Message',
    (SELECT full_name FROM user_profiles WHERE id = NEW.sender_id) || ' sent you a message',
    '/messages'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_notification_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();

-- Function to create notification when call is made
CREATE OR REPLACE FUNCTION create_call_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'missed' THEN
    INSERT INTO user_notifications (member_id, type, title, body, link)
    VALUES (
      NEW.callee_id,
      'call',
      'Missed Call',
      (SELECT full_name FROM user_profiles WHERE id = NEW.caller_id) || ' tried to call you',
      '/messages'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER call_notification_trigger
  AFTER INSERT ON call_history
  FOR EACH ROW
  EXECUTE FUNCTION create_call_notification();

-- Function to generate message suggestions based on common interests
CREATE OR REPLACE FUNCTION generate_message_suggestions(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Clear old suggestions
  DELETE FROM message_suggestions WHERE member_id = user_id;

  -- Add suggestions for members who attended same events
  INSERT INTO message_suggestions (member_id, suggested_member_id, reason, score)
  SELECT DISTINCT
    user_id,
    er2.member_id,
    'attended_same_events',
    3.0
  FROM event_registrations er1
  JOIN event_registrations er2 ON er1.event_id = er2.event_id
  WHERE er1.member_id = user_id
    AND er2.member_id != user_id
    AND er2.member_id NOT IN (
      SELECT recipient_id FROM messages WHERE sender_id = user_id
      UNION
      SELECT sender_id FROM messages WHERE recipient_id = user_id
    )
  LIMIT 10;

  -- Add suggestions for members in same trips
  INSERT INTO message_suggestions (member_id, suggested_member_id, reason, score)
  SELECT DISTINCT
    user_id,
    tr2.member_id,
    'same_trip_participants',
    2.5
  FROM trip_registrations tr1
  JOIN trip_registrations tr2 ON tr1.trip_id = tr2.trip_id
  WHERE tr1.member_id = user_id
    AND tr2.member_id != user_id
    AND tr2.member_id NOT IN (
      SELECT recipient_id FROM messages WHERE sender_id = user_id
      UNION
      SELECT sender_id FROM messages WHERE recipient_id = user_id
    )
  LIMIT 10;

  -- Add suggestions for mutual followers
  INSERT INTO message_suggestions (member_id, suggested_member_id, reason, score)
  SELECT DISTINCT
    user_id,
    mf2.following_id,
    'mutual_connections',
    2.0
  FROM member_follows mf1
  JOIN member_follows mf2 ON mf1.following_id = mf2.follower_id
  WHERE mf1.follower_id = user_id
    AND mf2.following_id != user_id
    AND mf2.following_id NOT IN (
      SELECT recipient_id FROM messages WHERE sender_id = user_id
      UNION
      SELECT sender_id FROM messages WHERE recipient_id = user_id
    )
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Add unread message count to user_profiles if not exists
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS unread_messages_count INTEGER DEFAULT 0;

-- Trigger to update unread message count
CREATE OR REPLACE FUNCTION update_unread_messages_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles
    SET unread_messages_count = unread_messages_count + 1
    WHERE id = NEW.recipient_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_read = false AND NEW.is_read = true THEN
    UPDATE user_profiles
    SET unread_messages_count = GREATEST(unread_messages_count - 1, 0)
    WHERE id = NEW.recipient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_unread_messages_count_trigger
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_messages_count();
