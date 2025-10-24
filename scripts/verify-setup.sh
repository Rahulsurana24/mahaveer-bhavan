#!/bin/bash

# Verification Script for Mahaveer Bhavan Setup

echo "🔍 Verifying Mahaveer Bhavan Setup..."
echo "======================================================================="
echo ""

PGPASSWORD='s3GVV2zOmFjT2aH4' psql -h db.juvrytwhtivezeqrmtpq.supabase.co -U postgres -d postgres -p 5432 << 'EOF'

\pset border 2
\pset format wrapped

SELECT '✅ DATABASE CONFIGURATION' as "STATUS";
SELECT '=======================================' as "";

SELECT 'User Roles:' as "CHECK";
SELECT COUNT(*) as total,
       string_agg(name, ', ') as roles
FROM user_roles;

SELECT '' as "";
SELECT 'Trigger Function:' as "CHECK";
SELECT COUNT(*) as installed
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

SELECT '' as "";
SELECT 'RLS Policies:' as "CHECK";
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('user_profiles', 'members')
GROUP BY tablename;

SELECT '' as "";
SELECT '📋 ADMIN USER STATUS' as "STATUS";
SELECT '=======================================' as "";

SELECT 'Admin in auth.users:' as "CHECK";
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ NOT CREATED YET'
  END as status,
  COALESCE(MAX(email), 'N/A') as email
FROM auth.users
WHERE email = 'admin@mahaveer.com';

SELECT '' as "";
SELECT 'Admin profile:' as "CHECK";
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ WAITING FOR USER CREATION'
  END as status,
  COALESCE(MAX(ur.name), 'N/A') as role
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
WHERE up.email = 'admin@mahaveer.com';

SELECT '' as "";
SELECT '📊 NEXT STEPS' as "STATUS";
SELECT '=======================================' as "";

-- Check what needs to be done
DO $
DECLARE
  admin_exists boolean;
  admin_role text;
BEGIN
  -- Check if admin user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@mahaveer.com')
  INTO admin_exists;

  IF NOT admin_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ STEP 1: Create admin user';
    RAISE NOTICE '   Go to: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/auth/users';
    RAISE NOTICE '   Click "Add user" and create: admin@mahaveer.com';
    RAISE NOTICE '   Password: AdminMahaveer2025!';
    RAISE NOTICE '   ✅ Check "Auto Confirm User"';
    RAISE NOTICE '';
  ELSE
    -- Check admin role
    SELECT ur.name INTO admin_role
    FROM user_profiles up
    LEFT JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.email = 'admin@mahaveer.com';

    IF admin_role IS NULL THEN
      RAISE NOTICE '';
      RAISE NOTICE '⚠️  Admin user exists but no profile found!';
      RAISE NOTICE '   This should not happen. Check trigger function.';
      RAISE NOTICE '';
    ELSIF admin_role != 'superadmin' THEN
      RAISE NOTICE '';
      RAISE NOTICE '❌ STEP 2: Upgrade to superadmin';
      RAISE NOTICE '   Current role: %', admin_role;
      RAISE NOTICE '   Run this SQL in Supabase SQL Editor:';
      RAISE NOTICE '';
      RAISE NOTICE '   UPDATE user_profiles';
      RAISE NOTICE '   SET role_id = (SELECT id FROM user_roles WHERE name = ''superadmin'')';
      RAISE NOTICE '   WHERE email = ''admin@mahaveer.com'';';
      RAISE NOTICE '';
    ELSE
      RAISE NOTICE '';
      RAISE NOTICE '✅ Admin user is fully configured!';
      RAISE NOTICE '';
      RAISE NOTICE '🎉 READY TO USE!';
      RAISE NOTICE '';
      RAISE NOTICE '📝 Final step: Configure forgot password';
      RAISE NOTICE '   Go to: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/auth/url-configuration';
      RAISE NOTICE '   Add redirect URLs (see FINAL-SETUP.md)';
      RAISE NOTICE '';
      RAISE NOTICE '🔐 Login at: https://mahaveer-bhavan.netlify.app/admin-auth';
      RAISE NOTICE '   Email: admin@mahaveer.com';
      RAISE NOTICE '   Password: AdminMahaveer2025!';
      RAISE NOTICE '';
    END IF;
  END IF;
END;
$;

EOF

echo ""
echo "======================================================================="
echo "📄 See scripts/FINAL-SETUP.md for detailed instructions"
echo "======================================================================="
