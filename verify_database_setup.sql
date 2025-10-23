-- ============================================
-- DATABASE SETUP VERIFICATION SCRIPT
-- ============================================
-- Run this script to verify all required database setup is in place
-- Usage: Copy and paste into Supabase SQL Editor or run via psql

-- ============================================
-- 1. CHECK IF TRIGGER HAS SECURITY DEFINER
-- ============================================

SELECT
  p.proname AS function_name,
  p.prosecdef AS has_security_definer,
  CASE
    WHEN p.prosecdef = true THEN '✅ PASS'
    ELSE '❌ FAIL - Missing SECURITY DEFINER'
  END AS status
FROM pg_proc p
WHERE p.proname = 'handle_new_user';

-- Expected: has_security_definer = true

-- ============================================
-- 2. CHECK RLS POLICIES ON USER_PROFILES
-- ============================================

SELECT
  policyname,
  cmd,
  CASE
    WHEN policyname LIKE '%Admins can%' THEN '✅ Required for admin operations'
    WHEN policyname LIKE '%System can%' THEN '✅ Required for trigger'
    ELSE 'ℹ️ Other policy'
  END AS status
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- Expected policies:
-- ✅ "Admins can update profiles" (UPDATE)
-- ✅ "Admins can insert profiles" (INSERT)
-- ✅ "System can insert profiles" (INSERT)

-- ============================================
-- 3. CHECK RLS POLICIES ON ATTENDANCE_RECORDS
-- ============================================

SELECT
  policyname,
  cmd,
  CASE
    WHEN policyname LIKE '%Admins can insert%' THEN '✅ Required for marking attendance'
    WHEN policyname LIKE '%view%' THEN '✅ Required for viewing'
    ELSE 'ℹ️ Other policy'
  END AS status
FROM pg_policies
WHERE tablename = 'attendance_records'
ORDER BY cmd, policyname;

-- Expected policies:
-- ✅ "Admins can insert attendance" (INSERT)
-- ✅ "Users can view own attendance" (SELECT)
-- ✅ "Admins can view all attendance" (SELECT)

-- ============================================
-- 4. CHECK RLS POLICIES ON ATTENDANCE_ITEMS
-- ============================================

SELECT
  policyname,
  cmd,
  CASE
    WHEN policyname LIKE '%Admins can manage%' THEN '✅ Required for creating items'
    WHEN policyname LIKE '%view%' THEN '✅ Required for viewing'
    ELSE 'ℹ️ Other policy'
  END AS status
FROM pg_policies
WHERE tablename = 'attendance_items'
ORDER BY cmd, policyname;

-- Expected policies:
-- ✅ "Admins can manage attendance items" (ALL)
-- ✅ "Users can view attendance items" (SELECT)

-- ============================================
-- 5. CHECK RLS POLICIES ON TRIP_REGISTRATIONS
-- ============================================

SELECT
  policyname,
  cmd,
  qual IS NOT NULL AS has_using,
  with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE tablename = 'trip_registrations'
ORDER BY cmd, policyname;

-- Should have policies allowing admins to SELECT trip registrations

-- ============================================
-- 6. CHECK IF RPC FUNCTIONS EXIST
-- ============================================

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE
    WHEN p.proname = 'update_user_role' THEN '✅ Required for admin creation'
    WHEN p.proname = 'check_email_exists' THEN '✅ Helper for validation'
    ELSE 'ℹ️ Other function'
  END AS status
FROM pg_proc p
WHERE p.proname IN ('update_user_role', 'check_email_exists')
ORDER BY p.proname;

-- Expected functions:
-- ✅ update_user_role(uuid, uuid)
-- ✅ check_email_exists(text)

-- ============================================
-- 7. CHECK IF TRIGGER EXISTS
-- ============================================

SELECT
  t.tgname AS trigger_name,
  c.relname AS table_name,
  p.proname AS function_name,
  CASE
    WHEN t.tgname = 'on_auth_user_created' THEN '✅ Required for auto profile creation'
    ELSE 'ℹ️ Other trigger'
  END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- Expected: on_auth_user_created trigger on auth.users

-- ============================================
-- 8. CHECK COLUMN EXISTS
-- ============================================

SELECT
  column_name,
  data_type,
  column_default,
  CASE
    WHEN column_name = 'needs_password_change' THEN '✅ Required for admin creation'
    ELSE 'ℹ️ Checked'
  END AS status
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('needs_password_change', 'role_id', 'auth_id', 'email');

-- Expected columns:
-- ✅ needs_password_change (boolean)
-- ✅ role_id (uuid)
-- ✅ auth_id (uuid)
-- ✅ email (text)

-- ============================================
-- 9. SUMMARY CHECK
-- ============================================

DO $$
DECLARE
  v_trigger_ok BOOLEAN;
  v_security_definer BOOLEAN;
  v_user_policies INT;
  v_attendance_policies INT;
  v_rpc_functions INT;
BEGIN
  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) INTO v_trigger_ok;

  -- Check security definer
  SELECT prosecdef INTO v_security_definer
  FROM pg_proc WHERE proname = 'handle_new_user';

  -- Count policies
  SELECT COUNT(*) INTO v_user_policies
  FROM pg_policies
  WHERE tablename = 'user_profiles'
  AND policyname LIKE '%Admins can%';

  SELECT COUNT(*) INTO v_attendance_policies
  FROM pg_policies
  WHERE tablename = 'attendance_records'
  AND policyname LIKE '%Admins%';

  SELECT COUNT(*) INTO v_rpc_functions
  FROM pg_proc
  WHERE proname IN ('update_user_role', 'check_email_exists');

  -- Print summary
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'DATABASE SETUP VERIFICATION SUMMARY';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger exists: %', CASE WHEN v_trigger_ok THEN '✅ PASS' ELSE '❌ FAIL' END;
  RAISE NOTICE 'Security definer: %', CASE WHEN v_security_definer THEN '✅ PASS' ELSE '❌ FAIL' END;
  RAISE NOTICE 'User profile policies: % %', v_user_policies, CASE WHEN v_user_policies >= 2 THEN '✅ PASS' ELSE '❌ FAIL' END;
  RAISE NOTICE 'Attendance policies: % %', v_attendance_policies, CASE WHEN v_attendance_policies >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END;
  RAISE NOTICE 'RPC functions: % %', v_rpc_functions, CASE WHEN v_rpc_functions = 2 THEN '✅ PASS' ELSE '❌ FAIL' END;
  RAISE NOTICE '';

  IF v_trigger_ok AND v_security_definer AND v_user_policies >= 2 AND v_attendance_policies >= 1 AND v_rpc_functions = 2 THEN
    RAISE NOTICE '✅✅✅ ALL CHECKS PASSED! ✅✅✅';
    RAISE NOTICE 'Database is properly configured.';
  ELSE
    RAISE NOTICE '❌❌❌ SOME CHECKS FAILED! ❌❌❌';
    RAISE NOTICE 'You need to deploy the migration:';
    RAISE NOTICE 'supabase/migrations/20251023180000_fix_trigger_and_permissions.sql';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
END $$;

-- ============================================
-- WHAT TO DO IF CHECKS FAIL
-- ============================================

/*

If any checks fail, you need to deploy the migration:

## Option 1: Supabase CLI
cd mahaveer-bhavan
supabase db push

## Option 2: Direct SQL
psql $DATABASE_URL -f supabase/migrations/20251023180000_fix_trigger_and_permissions.sql

## Option 3: Supabase Dashboard
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of: supabase/migrations/20251023180000_fix_trigger_and_permissions.sql
3. Paste and click "Run"

After deploying, run this verification script again to confirm.

*/
