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

DO $$ BEGIN RAISE NOTICE '🚀 Starting WhatsApp Messaging System Setup...'; END $$;

-- ============================================================================
-- PART 1: CORE MESSAGING TABLES
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '📦 Part 1/7: Creating core messaging tables...'; END $$;

-- Handle message_text to content column rename/creation carefully
DO $$
DECLARE
  has_message_text BOOLEAN;
  has_content BOOLEAN;
BEGIN
  -- Check if message_text column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'message_text'
  ) INTO has_message_text;

  -- Check if content column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'content'
  ) INTO has_content;

  -- Handle different scenarios
  IF has_message_text AND NOT has_content THEN
    -- Rename message_text to content
    ALTER TABLE messages RENAME COLUMN message_text TO content;
    RAISE NOTICE 'Renamed message_text to content';
  ELSIF has_message_text AND has_content THEN
    -- Both exist, drop message_text (content is the new column)
    ALTER TABLE messages DROP COLUMN message_text;
    RAISE NOTICE 'Dropped duplicate message_text column';
  ELSIF NOT has_message_text AND NOT has_content THEN
    -- Neither exists, create content
    ALTER TABLE messages ADD COLUMN content TEXT;
    RAISE NOTICE 'Created content column';
  ELSE
    -- Only content exists - perfect, do nothing
    RAISE NOTICE 'Content column already exists';
  END IF;

  -- Make content nullable for multimedia messages
  ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;
END $$;

-- Update existing messages table with multimedia support (safe adds)
DO $$
BEGIN
  -- Add message_type column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';
    ALTER TABLE messages ADD CONSTRAINT messages_message_type_check CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document'));
  END IF;

  -- Add media_url column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'media_url'
  ) THEN
    ALTER TABLE messages ADD COLUMN media_url TEXT;
  END IF;

  -- Add media_thumbnail_url column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'media_thumbnail_url'
  ) THEN
    ALTER TABLE messages ADD COLUMN media_thumbnail_url TEXT;
  END IF;

  -- Add media_duration_seconds column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'media_duration_seconds'
  ) THEN
    ALTER TABLE messages ADD COLUMN media_duration_seconds INTEGER;
  END IF;

  -- Add media_file_name column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'media_file_name'
  ) THEN
    ALTER TABLE messages ADD COLUMN media_file_name TEXT;
  END IF;

  -- Add media_file_size column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'media_file_size'
  ) THEN
    ALTER TABLE messages ADD COLUMN media_file_size BIGINT;
  END IF;

  -- Add media_mime_type column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'media_mime_type'
  ) THEN
    ALTER TABLE messages ADD COLUMN media_mime_type TEXT;
  END IF;

  -- Add delivered_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;

  -- Add group_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN group_id UUID;
  END IF;

  RAISE NOTICE 'Messages table columns updated';
END $$;

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

DO $$ BEGIN RAISE NOTICE '✅ Core messaging tables created'; END $$;

-- ============================================================================
-- PART 2: INDEXES FOR PERFORMANCE
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '⚡ Part 2/7: Creating indexes...'; END $$;

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

DO $$ BEGIN RAISE NOTICE '✅ Indexes created'; END $$;

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY POLICIES
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '🔒 Part 3/7: Configuring security policies...'; END $$;

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

DO $$ BEGIN RAISE NOTICE '✅ Security policies configured'; END $$;

-- ============================================================================
-- PART 4: TRIGGERS AND FUNCTIONS
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '⚙️  Part 4/7: Creating triggers and functions...'; END $$;

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

DO $$ BEGIN RAISE NOTICE '✅ Triggers and functions created'; END $$;

-- ============================================================================
-- PART 5: STORAGE CONFIGURATION
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '📦 Part 5/7: Configuring storage bucket...'; END $$;

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

DO $$ BEGIN RAISE NOTICE '✅ Storage bucket configured'; END $$;

-- ============================================================================
-- PART 6: REALTIME CONFIGURATION
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '🔴 Part 6/7: Enabling realtime...'; END $$;

-- Enable realtime for messaging tables (with error handling)
DO $$
BEGIN
  -- Add messages table to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Table already in publication
  END;

  -- Add typing_indicators table to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;

  -- Add message_reactions table to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;

  -- Add groups table to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE groups;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;

  -- Add group_members table to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Realtime enabled'; END $$;

-- ============================================================================
-- PART 7: HELPFUL VIEWS
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '📊 Part 7/7: Creating helper views...'; END $$;

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

DO $$ BEGIN RAISE NOTICE '✅ Helper views created'; END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
  bucket_exists BOOLEAN;
  realtime_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅  WHATSAPP MESSAGING SYSTEM SETUP COMPLETE!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Verification Checklist:';
  RAISE NOTICE '';

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

  RAISE NOTICE '✅ Tables created: % out of 4', table_count;
  RAISE NOTICE '✅ Storage bucket: %', CASE WHEN bucket_exists THEN 'Created' ELSE 'Not found' END;
  RAISE NOTICE '✅ Realtime tables: % configured', realtime_count;
  RAISE NOTICE '';
  RAISE NOTICE '📱 Next Steps:';
  RAISE NOTICE '   1. Go to Dashboard → Database → Replication';
  RAISE NOTICE '   2. Enable realtime for: messages, typing_indicators,';
  RAISE NOTICE '      message_reactions, groups, group_members';
  RAISE NOTICE '   3. Test message sending in the app';
  RAISE NOTICE '   4. Verify file uploads work';
  RAISE NOTICE '   5. Create a test group chat';
  RAISE NOTICE '';
  RAISE NOTICE '📚 See MIGRATION_DEPLOYMENT_GUIDE.md for details';
  RAISE NOTICE '';
END $$;
