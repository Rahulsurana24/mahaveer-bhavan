-- ============================================
-- QUICK RESET SUPERADMIN SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor to prepare for superadmin recreation

-- Step 1: Ensure the setup functions are available
SELECT ensure_superadmin_setup();

-- Step 2: Clean up existing superadmin user (if exists)
SELECT cleanup_superadmin('rahulsuranat@gmail.com');

-- Step 3: Verify the trigger is active
SELECT
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Other'
  END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Step 4: Verify superadmin role exists
SELECT
  id,
  name,
  description,
  permissions
FROM user_roles
WHERE name = 'superadmin';

-- ============================================
-- AFTER RUNNING THIS SCRIPT:
-- ============================================
-- 1. Go to your app at /admin/auth
-- 2. Sign up with:
--    Email: rahulsuranat@gmail.com
--    Password: 9480413653
-- 3. The trigger will automatically assign superadmin role
-- 4. Log in and verify access

-- ============================================
-- ALTERNATIVE: If user already exists in auth.users
-- ============================================
-- If the user already signed up but doesn't have superadmin role:
-- SELECT create_superadmin_profile('rahulsuranat@gmail.com', 'Super Admin');

-- ============================================
-- VERIFY AFTER SIGNUP:
-- ============================================
-- Run this to check if superadmin was created correctly:
--
-- SELECT
--   up.email,
--   up.full_name,
--   ur.name as role,
--   up.needs_password_change,
--   up.created_at
-- FROM user_profiles up
-- JOIN user_roles ur ON up.role_id = ur.id
-- WHERE up.email = 'rahulsuranat@gmail.com';
