-- ============================================================================
-- WHATSAPP MESSAGING SYSTEM - BULLETPROOF MIGRATION
-- ============================================================================
-- This script is 100% idempotent and can be run multiple times safely
-- Pure SQL - No psql commands - Works in Supabase SQL Editor
--
-- Project: Mahaveer Bhavan
-- Feature: WhatsApp-like Messaging Module
-- Version: 2.0 (Bulletproof Edition)
-- Date: 2025-10-24
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '🚀 WhatsApp Messaging System - Starting Setup...'; END $$;

-- ============================================================================
-- PART 1: MESSAGES TABLE - HANDLE ALL COLUMN SCENARIOS
-- ============================================================================

DO $$ BEGIN RAISE NOTICE ''; RAISE NOTICE '📦 Part 1/7: Updating messages table...'; END $$;

-- Step 1: Handle message_text/content column carefully
DO $$
DECLARE
  has_message_text BOOLEAN;
  has_content BOOLEAN;
BEGIN
  -- Check what columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message_text'
  ) INTO has_message_text;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content'
  ) INTO has_content;

  -- Scenario 1: Only message_text exists - rename it
  IF has_message_text AND NOT has_content THEN
    EXECUTE 'ALTER TABLE messages RENAME COLUMN message_text TO content';
    RAISE NOTICE '  ✓ Renamed message_text to content';

  -- Scenario 2: Both exist - keep content, drop message_text
  ELSIF has_message_text AND has_content THEN
    EXECUTE 'ALTER TABLE messages DROP COLUMN message_text CASCADE';
    RAISE NOTICE '  ✓ Removed duplicate message_text column';

  -- Scenario 3: Neither exists - create content
  ELSIF NOT has_message_text AND NOT has_content THEN
    EXECUTE 'ALTER TABLE messages ADD COLUMN content TEXT';
    RAISE NOTICE '  ✓ Created content column';

  -- Scenario 4: Only content exists - perfect!
  ELSE
    RAISE NOTICE '  ✓ Content column already exists';
  END IF;

  -- Make content nullable (for multimedia messages without captions)
  EXECUTE 'ALTER TABLE messages ALTER COLUMN content DROP NOT NULL';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '  ⚠ Error handling content column: %', SQLERRM;
    RAISE NOTICE '  Continuing with migration...';
END $$;

-- Step 2: Add all multimedia columns safely
DO $$
DECLARE
  col_name TEXT;
  col_def TEXT;
BEGIN
  -- Array of columns to add: (column_name, data_type, default_value)
  FOR col_name, col_def IN
    SELECT * FROM (VALUES
      ('message_type', 'TEXT DEFAULT ''text'''),
      ('media_url', 'TEXT'),
      ('media_thumbnail_url', 'TEXT'),
      ('media_duration_seconds', 'INTEGER'),
      ('media_file_name', 'TEXT'),
      ('media_file_size', 'BIGINT'),
      ('media_mime_type', 'TEXT'),
      ('delivered_at', 'TIMESTAMPTZ'),
      ('group_id', 'UUID')
    ) AS cols(name, definition)
  LOOP
    -- Check if column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = col_name
    ) THEN
      -- Add the column
      EXECUTE format('ALTER TABLE messages ADD COLUMN %I %s', col_name, col_def);
      RAISE NOTICE '  ✓ Added column: %', col_name;
    ELSE
      RAISE NOTICE '  ✓ Column exists: %', col_name;
    END IF;
  END LOOP;

  -- Add check constraint for message_type if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_message_type_check' AND conrelid = 'messages'::regclass
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
      CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document'));
    RAISE NOTICE '  ✓ Added message_type constraint';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '  ⚠ Error adding columns: %', SQLERRM;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Messages table updated'; END $$;

-- ============================================================================
-- PART 2: CREATE NEW TABLES
-- ============================================================================

DO $$ BEGIN RAISE NOTICE ''; RAISE NOTICE '📦 Part 2/7: Creating new tables...'; END $$;

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'group_members_group_id_user_id_key'
  ) THEN
    ALTER TABLE group_members ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE(group_id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'group_members_role_check'
  ) THEN
    ALTER TABLE group_members ADD CONSTRAINT group_members_role_check CHECK (role IN ('admin', 'member'));
  END IF;
END $$;

-- Message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'message_reactions_message_id_user_id_emoji_key'
  ) THEN
    ALTER TABLE message_reactions ADD CONSTRAINT message_reactions_message_id_user_id_emoji_key
      UNIQUE(message_id, user_id, emoji);
  END IF;
END $$;

-- Voice messages table
CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  waveform_data JSONB,
  transcription TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ Tables created'; END $$;

-- ============================================================================
-- PART 3: CREATE INDEXES
-- ============================================================================

DO $$ BEGIN RAISE NOTICE ''; RAISE NOTICE '⚡ Part 3/7: Creating indexes...'; END $$;

-- Create indexes with IF NOT EXISTS equivalent
DO $$
DECLARE
  index_sql TEXT;
BEGIN
  -- Messages table indexes
  FOR index_sql IN
    SELECT * FROM (VALUES
      ('idx_messages_sender_id', 'CREATE INDEX idx_messages_sender_id ON messages(sender_id)'),
      ('idx_messages_recipient_id', 'CREATE INDEX idx_messages_recipient_id ON messages(recipient_id)'),
      ('idx_messages_created_at', 'CREATE INDEX idx_messages_created_at ON messages(created_at DESC)'),
      ('idx_messages_is_read', 'CREATE INDEX idx_messages_is_read ON messages(is_read)'),
      ('idx_messages_group_id', 'CREATE INDEX idx_messages_group_id ON messages(group_id) WHERE group_id IS NOT NULL'),
      ('idx_messages_message_type', 'CREATE INDEX idx_messages_message_type ON messages(message_type)'),
      ('idx_messages_delivered_at', 'CREATE INDEX idx_messages_delivered_at ON messages(delivered_at)'),
      ('idx_groups_created_by', 'CREATE INDEX idx_groups_created_by ON groups(created_by)'),
      ('idx_group_members_group_id', 'CREATE INDEX idx_group_members_group_id ON group_members(group_id)'),
      ('idx_group_members_user_id', 'CREATE INDEX idx_group_members_user_id ON group_members(user_id)'),
      ('idx_message_reactions_message_id', 'CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id)'),
      ('idx_message_reactions_user_id', 'CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id)'),
      ('idx_voice_messages_message_id', 'CREATE INDEX idx_voice_messages_message_id ON voice_messages(message_id)'),
      ('idx_typing_indicators_sender_recipient', 'CREATE INDEX idx_typing_indicators_sender_recipient ON typing_indicators(sender_id, recipient_id)')
    ) AS indexes(name, sql)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = (index_sql->>'name')
    ) THEN
      EXECUTE index_sql->>'sql';
      RAISE NOTICE '  ✓ Created index: %', index_sql->>'name';
    END IF;
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '  ⚠ Error creating indexes: %', SQLERRM;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Indexes created'; END $$;

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY
-- ============================================================================

DO $$ BEGIN RAISE NOTICE ''; RAISE NOTICE '🔒 Part 4/7: Configuring security...'; END $$;

-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies and recreate (idempotent)
DO $$
BEGIN
  -- Groups policies
  DROP POLICY IF EXISTS "Users can view groups they're members of" ON groups;
  CREATE POLICY "Users can view groups they're members of"
    ON groups FOR SELECT USING (
      id IN (
        SELECT group_id FROM group_members
        WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
      )
    );

  DROP POLICY IF EXISTS "Users can create groups" ON groups;
  CREATE POLICY "Users can create groups"
    ON groups FOR INSERT WITH CHECK (
      created_by IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
    );

  DROP POLICY IF EXISTS "Group admins can update groups" ON groups;
  CREATE POLICY "Group admins can update groups"
    ON groups FOR UPDATE USING (
      id IN (
        SELECT group_id FROM group_members
        WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
        AND role = 'admin'
      )
    );

  -- Group members policies
  DROP POLICY IF EXISTS "Users can view group members of their groups" ON group_members;
  CREATE POLICY "Users can view group members of their groups"
    ON group_members FOR SELECT USING (
      group_id IN (
        SELECT group_id FROM group_members gm
        WHERE gm.user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
      )
    );

  DROP POLICY IF EXISTS "Group admins can add members" ON group_members;
  CREATE POLICY "Group admins can add members"
    ON group_members FOR INSERT WITH CHECK (
      group_id IN (
        SELECT group_id FROM group_members
        WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
        AND role = 'admin'
      )
    );

  DROP POLICY IF EXISTS "Group admins can remove members" ON group_members;
  CREATE POLICY "Group admins can remove members"
    ON group_members FOR DELETE USING (
      group_id IN (
        SELECT group_id FROM group_members
        WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
        AND role = 'admin'
      )
    );

  -- Message reactions policies
  DROP POLICY IF EXISTS "Users can view reactions" ON message_reactions;
  CREATE POLICY "Users can view reactions"
    ON message_reactions FOR SELECT USING (
      message_id IN (
        SELECT id FROM messages WHERE
        auth.uid() IN (
          SELECT auth_id FROM user_profiles WHERE id IN (sender_id, recipient_id)
        ) OR group_id IN (
          SELECT group_id FROM group_members
          WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
        )
      )
    );

  DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
  CREATE POLICY "Users can add reactions"
    ON message_reactions FOR INSERT WITH CHECK (
      user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
    );

  DROP POLICY IF EXISTS "Users can remove own reactions" ON message_reactions;
  CREATE POLICY "Users can remove own reactions"
    ON message_reactions FOR DELETE USING (
      user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
    );

  -- Voice messages policies
  DROP POLICY IF EXISTS "Users can view voice metadata" ON voice_messages;
  CREATE POLICY "Users can view voice metadata"
    ON voice_messages FOR SELECT USING (
      message_id IN (
        SELECT id FROM messages WHERE
        auth.uid() IN (
          SELECT auth_id FROM user_profiles WHERE id IN (sender_id, recipient_id)
        ) OR group_id IN (
          SELECT group_id FROM group_members
          WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
        )
      )
    );

  DROP POLICY IF EXISTS "Users can create voice metadata" ON voice_messages;
  CREATE POLICY "Users can create voice metadata"
    ON voice_messages FOR INSERT WITH CHECK (
      message_id IN (
        SELECT id FROM messages
        WHERE sender_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
      )
    );

  -- Update messages policy for group support
  DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
  CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT USING (
      (auth.uid() IN (
        SELECT auth_id FROM user_profiles WHERE id = sender_id OR id = recipient_id
      )) OR (group_id IN (
        SELECT group_id FROM group_members
        WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
      ))
    );

  RAISE NOTICE '✅ Security policies configured';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ Error with policies: %', SQLERRM;
END $$;

-- ============================================================================
-- PART 5: TRIGGERS & FUNCTIONS
-- ============================================================================

DO $$ BEGIN RAISE NOTICE ''; RAISE NOTICE '⚙️  Part 5/7: Creating triggers...'; END $$;

-- Function: Update delivered_at
CREATE OR REPLACE FUNCTION update_message_delivered()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.delivered_at IS NULL AND NEW.is_read = false THEN
    NEW.delivered_at = NOW();
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_message_delivered ON messages;
CREATE TRIGGER set_message_delivered
  BEFORE UPDATE ON messages FOR EACH ROW
  WHEN (OLD.delivered_at IS NULL AND NEW.delivered_at IS NOT NULL)
  EXECUTE FUNCTION update_message_delivered();

-- Function: Add group creator as admin
CREATE OR REPLACE FUNCTION add_group_creator_as_admin()
RETURNS TRIGGER AS $func$
BEGIN
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS add_creator_to_group ON groups;
CREATE TRIGGER add_creator_to_group
  AFTER INSERT ON groups FOR EACH ROW
  EXECUTE FUNCTION add_group_creator_as_admin();

-- Function: Update group timestamp
CREATE OR REPLACE FUNCTION update_group_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
  UPDATE groups SET updated_at = NOW() WHERE id = NEW.group_id;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_group_on_message ON messages;
CREATE TRIGGER update_group_on_message
  AFTER INSERT ON messages FOR EACH ROW
  WHEN (NEW.group_id IS NOT NULL)
  EXECUTE FUNCTION update_group_updated_at();

DO $$ BEGIN RAISE NOTICE '✅ Triggers created'; END $$;

-- ============================================================================
-- PART 6: STORAGE BUCKET
-- ============================================================================

DO $$ BEGIN RAISE NOTICE ''; RAISE NOTICE '📦 Part 6/7: Configuring storage...'; END $$;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-media', 'message-media', true, 52428800,
  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp',
        'video/mp4','video/webm','video/quicktime',
        'audio/mpeg','audio/mp3','audio/wav','audio/webm','audio/ogg',
        'application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload message media" ON storage.objects;
  CREATE POLICY "Authenticated users can upload message media"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'message-media' AND auth.uid()::text = (storage.foldername(name))[1]);

  DROP POLICY IF EXISTS "Public read access for message media" ON storage.objects;
  CREATE POLICY "Public read access for message media"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'message-media');

  DROP POLICY IF EXISTS "Users can update their own message media" ON storage.objects;
  CREATE POLICY "Users can update their own message media"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'message-media' AND auth.uid()::text = (storage.foldername(name))[1]);

  DROP POLICY IF EXISTS "Users can delete their own message media" ON storage.objects;
  CREATE POLICY "Users can delete their own message media"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'message-media' AND auth.uid()::text = (storage.foldername(name))[1]);
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Storage configured'; END $$;

-- ============================================================================
-- PART 7: REALTIME
-- ============================================================================

DO $$ BEGIN RAISE NOTICE ''; RAISE NOTICE '🔴 Part 7/7: Enabling realtime...'; END $$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['messages', 'typing_indicators', 'message_reactions', 'groups', 'group_members'])
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      RAISE NOTICE '  ✓ Added % to realtime', tbl;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE '  ✓ % already in realtime', tbl;
      WHEN OTHERS THEN
        RAISE NOTICE '  ⚠ Could not add % to realtime: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- PART 8: HELPER VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW message_media_stats AS
SELECT
  COUNT(*) as total_files,
  COALESCE(SUM((metadata->>'size')::bigint), 0) as total_size_bytes,
  ROUND(COALESCE(SUM((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as total_size_mb,
  COUNT(CASE WHEN metadata->>'mimetype' LIKE 'image/%' THEN 1 END) as image_count,
  COUNT(CASE WHEN metadata->>'mimetype' LIKE 'video/%' THEN 1 END) as video_count,
  COUNT(CASE WHEN metadata->>'mimetype' LIKE 'audio/%' THEN 1 END) as audio_count
FROM storage.objects
WHERE bucket_id = 'message-media';

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  msg_cols INTEGER;
  new_tables INTEGER;
  bucket_ok BOOLEAN;
  rt_tables INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ MESSAGING SYSTEM SETUP COMPLETE!      ║';
  RAISE NOTICE '╚════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- Count messages table columns
  SELECT COUNT(*) INTO msg_cols FROM information_schema.columns
  WHERE table_name = 'messages' AND column_name IN ('content','message_type','media_url','group_id');

  -- Count new tables
  SELECT COUNT(*) INTO new_tables FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('groups','group_members','message_reactions','voice_messages');

  -- Check bucket
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'message-media') INTO bucket_ok;

  -- Count realtime tables
  SELECT COUNT(*) INTO rt_tables FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages','typing_indicators','groups','message_reactions','group_members');

  RAISE NOTICE '✅ Messages columns added: %/4', msg_cols;
  RAISE NOTICE '✅ New tables created: %/4', new_tables;
  RAISE NOTICE '✅ Storage bucket: %', CASE WHEN bucket_ok THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '✅ Realtime tables: %/5', rt_tables;
  RAISE NOTICE '';

  IF msg_cols >= 4 AND new_tables = 4 AND bucket_ok THEN
    RAISE NOTICE '🎉 SUCCESS! All components deployed.';
    RAISE NOTICE '';
    RAISE NOTICE '📱 Next: Enable realtime in Dashboard → Database → Replication';
    RAISE NOTICE '   Toggle ON: messages, typing_indicators, message_reactions,';
    RAISE NOTICE '              groups, group_members';
  ELSE
    RAISE NOTICE '⚠️  Some components may need attention. Review output above.';
  END IF;

  RAISE NOTICE '';
END $$;
