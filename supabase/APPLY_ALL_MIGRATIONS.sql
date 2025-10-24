-- ============================================================================
-- APPLY ALL MESSAGING MIGRATIONS - ONE-CLICK DEPLOYMENT
-- ============================================================================
-- This script combines all necessary migrations for the WhatsApp messaging system
-- Run this entire script in Supabase SQL Editor to set up everything at once
--
-- Project: Mahaveer Bhavan
-- Feature: WhatsApp-like Messaging Module
-- Date: 2025-10-24
-- ============================================================================

\echo '🚀 Starting WhatsApp Messaging System Setup...'
\echo ''

-- ============================================================================
-- PART 1: CORE MESSAGING TABLES
-- ============================================================================

\echo '📦 Part 1/3: Creating core messaging tables...'

-- Update existing messages table with multimedia support
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document')),
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS media_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS media_file_name TEXT,
  ADD COLUMN IF NOT EXISTS media_file_size BIGINT,
  ADD COLUMN IF NOT EXISTS media_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS group_id UUID;

-- Rename message_text to content if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'message_text'
  ) THEN
    ALTER TABLE messages RENAME COLUMN message_text TO content;
  END IF;
END $$;

-- Ensure content column exists and is nullable
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create voice_messages table
CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  waveform_data JSONB,
  transcription TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

\echo '✅ Core messaging tables created'
\echo ''

-- ============================================================================
-- PART 2: INDEXES FOR PERFORMANCE
-- ============================================================================

\echo '⚡ Part 2/3: Creating indexes...'

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_delivered_at ON messages(delivered_at);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_message_id ON voice_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_sender_recipient ON typing_indicators(sender_id, recipient_id);

\echo '✅ Indexes created'
\echo ''

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY POLICIES
-- ============================================================================

\echo '🔒 Part 3/3: Configuring security policies...'

-- Enable RLS on new tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

-- Groups policies
DROP POLICY IF EXISTS "Users can view groups they're members of" ON groups;
CREATE POLICY "Users can view groups they're members of"
  ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_members
      WHERE user_id IN (
        SELECT id FROM user_profiles WHERE auth_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can create groups" ON groups;
CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (
    created_by IN (
      SELECT id FROM user_profiles WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group admins can update groups" ON groups;
CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE
  USING (
    id IN (
      SELECT group_id FROM group_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
      AND role = 'admin'
    )
  );

-- Group members policies
DROP POLICY IF EXISTS "Users can view group members of their groups" ON group_members;
CREATE POLICY "Users can view group members of their groups"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Group admins can add members" ON group_members;
CREATE POLICY "Group admins can add members"
  ON group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Group admins can remove members" ON group_members;
CREATE POLICY "Group admins can remove members"
  ON group_members FOR DELETE
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
      AND role = 'admin'
    )
  );

-- Message reactions policies
DROP POLICY IF EXISTS "Users can view reactions on messages they can see" ON message_reactions;
CREATE POLICY "Users can view reactions on messages they can see"
  ON message_reactions FOR SELECT
  USING (
    message_id IN (SELECT id FROM messages WHERE
      auth.uid() IN (
        SELECT auth_id FROM user_profiles WHERE id IN (sender_id, recipient_id)
      )
      OR
      group_id IN (
        SELECT group_id FROM group_members
        WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;
CREATE POLICY "Users can remove their own reactions"
  ON message_reactions FOR DELETE
  USING (
    user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
  );

-- Voice messages policies
DROP POLICY IF EXISTS "Users can view voice message metadata" ON voice_messages;
CREATE POLICY "Users can view voice message metadata"
  ON voice_messages FOR SELECT
  USING (
    message_id IN (SELECT id FROM messages WHERE
      auth.uid() IN (
        SELECT auth_id FROM user_profiles WHERE id IN (sender_id, recipient_id)
      )
      OR
      group_id IN (
        SELECT group_id FROM group_members
        WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can create voice message metadata" ON voice_messages;
CREATE POLICY "Users can create voice message metadata"
  ON voice_messages FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT id FROM messages WHERE sender_id IN (
        SELECT id FROM user_profiles WHERE auth_id = auth.uid()
      )
    )
  );

-- Update messages policies for group support
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (
    -- Direct messages
    (auth.uid() IN (
      SELECT auth_id FROM user_profiles WHERE id = sender_id OR id = recipient_id
    ))
    OR
    -- Group messages
    (group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
    ))
  );

\echo '✅ Security policies configured'
\echo ''

-- ============================================================================
-- PART 4: TRIGGERS AND FUNCTIONS
-- ============================================================================

\echo '⚙️  Part 4/3: Creating triggers and functions...'

-- Function: Update delivered_at timestamp
CREATE OR REPLACE FUNCTION update_message_delivered()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivered_at IS NULL AND NEW.is_read = false THEN
    NEW.delivered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_message_delivered ON messages;
CREATE TRIGGER set_message_delivered
  BEFORE UPDATE ON messages
  FOR EACH ROW
  WHEN (OLD.delivered_at IS NULL AND NEW.delivered_at IS NOT NULL)
  EXECUTE FUNCTION update_message_delivered();

-- Function: Add group creator as admin
CREATE OR REPLACE FUNCTION add_group_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS add_creator_to_group ON groups;
CREATE TRIGGER add_creator_to_group
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION add_group_creator_as_admin();

-- Function: Update group updated_at
CREATE OR REPLACE FUNCTION update_group_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groups SET updated_at = NOW() WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_group_on_message ON messages;
CREATE TRIGGER update_group_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.group_id IS NOT NULL)
  EXECUTE FUNCTION update_group_updated_at();

\echo '✅ Triggers and functions created'
\echo ''

-- ============================================================================
-- PART 5: STORAGE CONFIGURATION
-- ============================================================================

\echo '📦 Part 5/3: Configuring storage bucket...'

-- Create message-media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-media',
  'message-media',
  true,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Authenticated users can upload message media" ON storage.objects;
CREATE POLICY "Authenticated users can upload message media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Public read access for message media" ON storage.objects;
CREATE POLICY "Public read access for message media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'message-media');

DROP POLICY IF EXISTS "Users can update their own message media" ON storage.objects;
CREATE POLICY "Users can update their own message media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'message-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own message media" ON storage.objects;
CREATE POLICY "Users can delete their own message media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'message-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

\echo '✅ Storage bucket configured'
\echo ''

-- ============================================================================
-- PART 6: REALTIME CONFIGURATION
-- ============================================================================

\echo '🔴 Part 6/3: Enabling realtime...'

-- Enable realtime for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS messages;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS groups;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS group_members;

\echo '✅ Realtime enabled'
\echo ''

-- ============================================================================
-- PART 7: HELPFUL VIEWS
-- ============================================================================

\echo '📊 Part 7/3: Creating helper views...'

-- Storage statistics view
CREATE OR REPLACE VIEW message_media_stats AS
SELECT
  COUNT(*) as total_files,
  SUM((metadata->>'size')::bigint) as total_size_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as total_size_mb,
  COUNT(CASE WHEN metadata->>'mimetype' LIKE 'image/%' THEN 1 END) as image_count,
  COUNT(CASE WHEN metadata->>'mimetype' LIKE 'video/%' THEN 1 END) as video_count,
  COUNT(CASE WHEN metadata->>'mimetype' LIKE 'audio/%' THEN 1 END) as audio_count,
  COUNT(CASE WHEN metadata->>'mimetype' NOT LIKE 'image/%'
         AND metadata->>'mimetype' NOT LIKE 'video/%'
         AND metadata->>'mimetype' NOT LIKE 'audio/%' THEN 1 END) as document_count
FROM storage.objects
WHERE bucket_id = 'message-media';

\echo '✅ Helper views created'
\echo ''

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

\echo '✅ ============================================'
\echo '✅  WHATSAPP MESSAGING SYSTEM SETUP COMPLETE!'
\echo '✅ ============================================'
\echo ''
\echo '📋 Verification Checklist:'

DO $$
DECLARE
  table_count INTEGER;
  bucket_exists BOOLEAN;
  realtime_count INTEGER;
BEGIN
  -- Check tables
  SELECT COUNT(*) INTO table_count FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('groups', 'group_members', 'message_reactions', 'voice_messages');

  -- Check storage bucket
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'message-media') INTO bucket_exists;

  -- Check realtime
  SELECT COUNT(*) INTO realtime_count FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('messages', 'typing_indicators', 'groups');

  RAISE NOTICE '';
  RAISE NOTICE '✅ Tables created: % out of 4', table_count;
  RAISE NOTICE '✅ Storage bucket: %', CASE WHEN bucket_exists THEN 'Created' ELSE 'Not found' END;
  RAISE NOTICE '✅ Realtime tables: % out of 5', realtime_count;
  RAISE NOTICE '';
  RAISE NOTICE '📱 Next Steps:';
  RAISE NOTICE '   1. Enable realtime in Dashboard → Database → Replication';
  RAISE NOTICE '   2. Test message sending in the app';
  RAISE NOTICE '   3. Verify file uploads work';
  RAISE NOTICE '   4. Create a test group chat';
  RAISE NOTICE '';
  RAISE NOTICE '📚 See MIGRATION_DEPLOYMENT_GUIDE.md for detailed instructions';
  RAISE NOTICE '';
END $$;
