-- ============================================================================
-- ENABLE REALTIME FOR MESSAGING - SQL METHOD
-- ============================================================================
-- Use this if you don't have the Replication tab in Supabase Dashboard
-- This enables realtime for all messaging tables via SQL
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '🔴 Enabling Realtime for Messaging Tables...'; END $$;

-- ============================================================================
-- METHOD 1: Add Tables to Realtime Publication
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  added_count INTEGER := 0;
  already_added_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📡 Adding tables to realtime publication...';
  RAISE NOTICE '';

  -- Loop through each messaging table
  FOR tbl IN
    SELECT unnest(ARRAY[
      'messages',
      'typing_indicators',
      'message_reactions',
      'groups',
      'group_members'
    ])
  LOOP
    BEGIN
      -- Try to add table to publication
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      added_count := added_count + 1;
      RAISE NOTICE '  ✅ Added: %', tbl;

    EXCEPTION
      WHEN duplicate_object THEN
        already_added_count := already_added_count + 1;
        RAISE NOTICE '  ✓ Already enabled: %', tbl;

      WHEN undefined_table THEN
        RAISE NOTICE '  ⚠️  Table not found: %', tbl;

      WHEN OTHERS THEN
        RAISE NOTICE '  ❌ Error with %: %', tbl, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '  • Newly added: %', added_count;
  RAISE NOTICE '  • Already enabled: %', already_added_count;
  RAISE NOTICE '  • Total enabled: %', added_count + already_added_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- METHOD 2: Verify Realtime Publication
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '🔍 Verifying realtime configuration...'; END $$;

-- Check which tables are in the realtime publication
DO $$
DECLARE
  rec RECORD;
  count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables currently in realtime publication:';
  RAISE NOTICE '';

  FOR rec IN
    SELECT schemaname, tablename
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename IN ('messages', 'typing_indicators', 'message_reactions', 'groups', 'group_members')
    ORDER BY tablename
  LOOP
    count := count + 1;
    RAISE NOTICE '  ✅ %.%', rec.schemaname, rec.tablename;
  END LOOP;

  RAISE NOTICE '';
  IF count = 5 THEN
    RAISE NOTICE '🎉 Perfect! All 5 messaging tables are enabled for realtime.';
  ELSIF count > 0 THEN
    RAISE NOTICE '⚠️  Only % out of 5 tables are enabled.', count;
    RAISE NOTICE '   Run this script again or check for errors above.';
  ELSE
    RAISE NOTICE '❌ No messaging tables found in realtime publication.';
    RAISE NOTICE '   Check if supabase_realtime publication exists.';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- METHOD 3: Alternative - Create Realtime Publication if Missing
-- ============================================================================

-- Check if supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE NOTICE '⚠️  supabase_realtime publication does not exist!';
    RAISE NOTICE '   This is unusual for a Supabase project.';
    RAISE NOTICE '   Contact Supabase support or check your project settings.';
  ELSE
    RAISE NOTICE '✅ supabase_realtime publication exists';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY - Run this separately to check status
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'COPY AND RUN THIS QUERY SEPARATELY TO VERIFY:';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'SELECT tablename, schemaname';
  RAISE NOTICE 'FROM pg_publication_tables';
  RAISE NOTICE 'WHERE pubname = ''supabase_realtime''';
  RAISE NOTICE 'AND tablename IN (''messages'', ''typing_indicators'', ''message_reactions'', ''groups'', ''group_members'')';
  RAISE NOTICE 'ORDER BY tablename;';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- FINAL STATUS
-- ============================================================================

DO $$
DECLARE
  rt_count INTEGER;
BEGIN
  -- Count realtime tables
  SELECT COUNT(*) INTO rt_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'typing_indicators', 'message_reactions', 'groups', 'group_members');

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════╗';
  IF rt_count = 5 THEN
    RAISE NOTICE '║  ✅ REALTIME ENABLED - ALL TABLES OK!    ║';
  ELSIF rt_count > 0 THEN
    RAISE NOTICE '║  ⚠️  REALTIME PARTIAL - % OUT OF 5       ║', rt_count;
  ELSE
    RAISE NOTICE '║  ❌ REALTIME NOT ENABLED                  ║';
  END IF;
  RAISE NOTICE '╚════════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF rt_count = 5 THEN
    RAISE NOTICE '🎉 You''re all set! Messages will appear instantly.';
    RAISE NOTICE '';
    RAISE NOTICE '📱 Test it now:';
    RAISE NOTICE '   1. Open your app in two browsers';
    RAISE NOTICE '   2. Send a message from one';
    RAISE NOTICE '   3. It should appear instantly in the other';
    RAISE NOTICE '';
  ELSIF rt_count > 0 THEN
    RAISE NOTICE '⚠️  Some tables are missing. Run this script again.';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '❌ Realtime is not working. Check errors above.';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Troubleshooting:';
    RAISE NOTICE '   1. Make sure you''re using an admin/postgres user';
    RAISE NOTICE '   2. Check if supabase_realtime publication exists';
    RAISE NOTICE '   3. Review any error messages above';
    RAISE NOTICE '';
  END IF;
END $$;
