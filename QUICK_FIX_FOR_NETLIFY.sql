-- ============================================
-- QUICK FIX FOR NETLIFY ADMIN LOGIN
-- ============================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/editor
--
-- Then sign up at: https://your-netlify-app.netlify.app/admin/auth
-- With: rahulsuranat@gmail.com / 9480413653

-- Step 1: Ensure superadmin role exists
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
ON CONFLICT (name) DO NOTHING;

-- Step 2: Ensure member role exists (default)
INSERT INTO user_roles (name, description, permissions)
VALUES (
  'member',
  'Regular member with basic access',
  jsonb_build_object('view_events', true, 'view_trips', true)
)
ON CONFLICT (name) DO NOTHING;

-- Step 3: Create trigger to auto-assign roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  -- Assign superadmin role to rahulsuranat@gmail.com
  IF NEW.email = 'rahulsuranat@gmail.com' THEN
    SELECT id INTO v_role_id FROM user_roles WHERE name = 'superadmin';
  ELSE
    SELECT id INTO v_role_id FROM user_roles WHERE name = 'member';
  END IF;

  -- Create user profile
  INSERT INTO public.user_profiles (auth_id, email, full_name, role_id, needs_password_change)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    v_role_id,
    CASE WHEN NEW.email = 'rahulsuranat@gmail.com' THEN false ELSE true END
  )
  ON CONFLICT (auth_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Step 4: Activate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Clean up any existing rahulsuranat@gmail.com user
DO $$
DECLARE
  v_auth_id uuid;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'rahulsuranat@gmail.com';
  IF v_auth_id IS NOT NULL THEN
    DELETE FROM user_profiles WHERE auth_id = v_auth_id;
    DELETE FROM auth.users WHERE id = v_auth_id;
  END IF;
END $$;

-- ============================================
-- SUCCESS! Now follow these steps:
-- ============================================
-- 1. Go to: https://your-netlify-app.netlify.app/admin/auth
-- 2. Click "Sign Up"
-- 3. Enter:
--    Email: rahulsuranat@gmail.com
--    Password: 9480413653
--    Name: Super Admin
-- 4. Click "Sign Up"
-- 5. Log in with the same credentials
-- 6. You should now have admin access!
-- ============================================

-- Verify setup (run after signup)
SELECT
  'Setup Check' as status,
  COUNT(*) as superadmin_role_exists
FROM user_roles
WHERE name = 'superadmin';

SELECT
  'Trigger Check' as status,
  COUNT(*) as trigger_exists
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
