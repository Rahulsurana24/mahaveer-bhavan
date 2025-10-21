-- ============================================
-- PRODUCTION QUICK FIX
-- ============================================
-- Run this in Supabase SQL Editor to fix admin login
--
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select your PRODUCTION project
-- 3. Go to SQL Editor (left sidebar)
-- 4. Copy and paste this ENTIRE file
-- 5. Click "Run" or press Ctrl+Enter
-- 6. Then follow the signup instructions below

-- ============================================
-- STEP 1: Verify Database Setup
-- ============================================

-- Check if user_roles table exists and has superadmin role
DO $$
DECLARE
  v_superadmin_role_id uuid;
BEGIN
  -- Check for superadmin role
  SELECT id INTO v_superadmin_role_id
  FROM user_roles
  WHERE name = 'superadmin';

  IF v_superadmin_role_id IS NULL THEN
    RAISE NOTICE 'Creating superadmin role...';
    INSERT INTO user_roles (name, description, permissions)
    VALUES (
      'superadmin',
      'Super Administrator with full system access',
      jsonb_build_object(
        'all', true,
        'manage_admins', true,
        'manage_members', true,
        'manage_events', true,
        'manage_trips', true,
        'manage_finances', true,
        'view_logs', true,
        'system_settings', true
      )
    )
    RETURNING id INTO v_superadmin_role_id;
    RAISE NOTICE 'Superadmin role created: %', v_superadmin_role_id;
  ELSE
    RAISE NOTICE 'Superadmin role already exists: %', v_superadmin_role_id;
  END IF;
END $$;

-- ============================================
-- STEP 2: Create/Update Trigger Function
-- ============================================

-- This trigger automatically assigns superadmin role to rahulsuranat@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  -- Determine the role for this user
  IF NEW.email = 'rahulsuranat@gmail.com' THEN
    -- Superadmin user
    SELECT id INTO v_role_id
    FROM user_roles
    WHERE name = 'superadmin';

    RAISE NOTICE 'Creating superadmin user profile for: %', NEW.email;
  ELSE
    -- Default member role
    SELECT id INTO v_role_id
    FROM user_roles
    WHERE name = 'member';
  END IF;

  -- If role not found, use a fallback
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id
    FROM user_roles
    ORDER BY name
    LIMIT 1;
  END IF;

  -- Create user profile
  INSERT INTO public.user_profiles (auth_id, email, full_name, role_id, needs_password_change)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin User'),
    v_role_id,
    CASE WHEN NEW.email = 'rahulsuranat@gmail.com' THEN false ELSE true END
  )
  ON CONFLICT (auth_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

RAISE NOTICE '✓ Trigger created successfully';

-- ============================================
-- STEP 3: Clean Up Existing User (if any)
-- ============================================

DO $$
DECLARE
  v_auth_id uuid;
BEGIN
  -- Check if user exists
  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE email = 'rahulsuranat@gmail.com';

  IF v_auth_id IS NOT NULL THEN
    RAISE NOTICE 'Found existing user, cleaning up...';

    -- Delete from user_profiles first (foreign key)
    DELETE FROM user_profiles WHERE auth_id = v_auth_id;

    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = v_auth_id;

    RAISE NOTICE '✓ Existing user cleaned up';
  ELSE
    RAISE NOTICE 'No existing user found, ready for fresh signup';
  END IF;
END $$;

-- ============================================
-- STEP 4: Verify Setup
-- ============================================

-- Check trigger exists
SELECT
  'TRIGGER CHECK' as status,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ Trigger exists and is enabled'
    ELSE '✗ Trigger not found - something went wrong'
  END as result
FROM pg_trigger
WHERE tgname = 'on_auth_user_created' AND tgenabled = 'O';

-- Check superadmin role exists
SELECT
  'ROLE CHECK' as status,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ Superadmin role exists'
    ELSE '✗ Superadmin role not found - something went wrong'
  END as result
FROM user_roles
WHERE name = 'superadmin';

-- ============================================
-- SUCCESS! NEXT STEPS:
-- ============================================
--
-- 1. Go to your Netlify app URL: https://your-app.netlify.app/admin/auth
--
-- 2. Click "Sign Up" or "Register"
--
-- 3. Enter these credentials:
--    Email: rahulsuranat@gmail.com
--    Password: 9480413653
--    Name: Super Admin
--
-- 4. Submit the form
--
-- 5. The trigger will automatically assign superadmin role!
--
-- 6. Log in with the same credentials
--
-- 7. Verify you can access /admin/admins (Admin Management page)
--
-- ⚠️  IMPORTANT: Change the password after first login!
--
-- ============================================
-- TROUBLESHOOTING:
-- ============================================
--
-- If signup fails, you can manually create the user:
--
-- Option 1: Via Supabase Dashboard
-- - Go to Authentication → Users
-- - Click "Invite User"
-- - Email: rahulsuranat@gmail.com
-- - Check "Auto Confirm Email"
-- - After user is created, run this:
--   SELECT create_superadmin_profile('rahulsuranat@gmail.com', 'Super Admin');
--
-- Option 2: Check if user already exists
-- - Run this to see if user exists:
SELECT
  u.email,
  u.id as auth_id,
  up.id as profile_id,
  ur.name as role
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.auth_id
LEFT JOIN user_roles ur ON up.role_id = ur.id
WHERE u.email = 'rahulsuranat@gmail.com';
--
-- If user exists but no profile, run:
--   SELECT create_superadmin_profile('rahulsuranat@gmail.com', 'Super Admin');
-- ============================================
