-- ============================================
-- 🚨 EMERGENCY FIX - Run This Now!
-- ============================================
-- This fixes ALL authentication issues
-- ============================================

-- ============================================
-- STEP 1: DISABLE RLS COMPLETELY (Temporary)
-- ============================================
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Ensure User Roles Exist
-- ============================================
INSERT INTO user_roles (name, description)
VALUES
  ('superadmin', 'Super Administrator with full system access'),
  ('admin', 'Administrator with management access'),
  ('management_admin', 'Management Administrator'),
  ('view_only_admin', 'View-only Administrator'),
  ('member', 'Regular Member')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 3: Fix the Trigger Function
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id INT;
BEGIN
  -- Get the 'member' role ID
  SELECT id INTO default_role_id
  FROM public.user_roles
  WHERE name = 'member'
  LIMIT 1;

  -- If no member role exists, create it
  IF default_role_id IS NULL THEN
    INSERT INTO public.user_roles (name, description)
    VALUES ('member', 'Regular Member')
    RETURNING id INTO default_role_id;
  END IF;

  -- Insert into user_profiles (with error handling)
  BEGIN
    INSERT INTO public.user_profiles (
      auth_id,
      email,
      full_name,
      role_id
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
      default_role_id
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Failed to create user_profile for %: %', NEW.email, SQLERRM;
  END;

  -- Insert into members (with error handling)
  BEGIN
    INSERT INTO public.members (
      auth_id,
      email,
      full_name,
      membership_type
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
      'member'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Failed to create member for %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 4: Create Admin User Profile Manually
-- ============================================

-- First, check if admin user exists in auth.users
DO $$
DECLARE
  admin_auth_id UUID;
  admin_role_id INT;
BEGIN
  -- Find admin user in auth.users by email
  SELECT id INTO admin_auth_id
  FROM auth.users
  WHERE email = 'admin@mahaveer.com'
  LIMIT 1;

  -- Get superadmin role ID
  SELECT id INTO admin_role_id
  FROM user_roles
  WHERE name = 'superadmin'
  LIMIT 1;

  -- If admin user exists but no profile, create it
  IF admin_auth_id IS NOT NULL THEN
    -- Delete existing profile if any (to avoid conflicts)
    DELETE FROM user_profiles WHERE auth_id = admin_auth_id;
    DELETE FROM members WHERE auth_id = admin_auth_id;

    -- Create user_profile
    INSERT INTO user_profiles (
      auth_id,
      email,
      full_name,
      role_id
    ) VALUES (
      admin_auth_id,
      'admin@mahaveer.com',
      'Admin User',
      admin_role_id
    );

    -- Create member record
    INSERT INTO members (
      auth_id,
      email,
      full_name,
      membership_type
    ) VALUES (
      admin_auth_id,
      'admin@mahaveer.com',
      'Admin User',
      'admin'
    );

    RAISE NOTICE 'Admin profile created for user: %', admin_auth_id;
  ELSE
    RAISE NOTICE 'Admin user not found in auth.users. Create user first via Supabase Dashboard.';
  END IF;
END;
$$;

-- ============================================
-- STEP 5: Fix RLS Policies
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON user_profiles;

-- Simple policy: Users can see and update their own profile
CREATE POLICY "Users can manage own profile"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Simple policy: Admins can see all profiles
CREATE POLICY "Admins can view all"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin', 'view_only_admin')
    )
  );

-- Members table policies
DROP POLICY IF EXISTS "Members can view own data" ON members;
DROP POLICY IF EXISTS "Admins can view all members" ON members;
DROP POLICY IF EXISTS "Allow all for authenticated" ON members;

CREATE POLICY "Members can manage own data"
  ON members
  FOR ALL
  TO authenticated
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Admins can view all members"
  ON members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin', 'view_only_admin')
    )
  );

-- ============================================
-- STEP 6: Re-enable RLS
-- ============================================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
SELECT '========================================' as status;
SELECT 'VERIFICATION RESULTS' as status;
SELECT '========================================' as status;

-- Check roles
SELECT 'User Roles:' as check_name;
SELECT id, name FROM user_roles ORDER BY id;

-- Check if admin user exists in auth
SELECT '----------------------------------------' as spacer;
SELECT 'Admin User in auth.users:' as check_name;
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'admin@mahaveer.com';

-- Check if admin profile exists
SELECT '----------------------------------------' as spacer;
SELECT 'Admin Profile in user_profiles:' as check_name;
SELECT
  up.id,
  up.auth_id,
  up.email,
  up.full_name,
  ur.name as role
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
WHERE up.email = 'admin@mahaveer.com';

-- Check trigger
SELECT '----------------------------------------' as spacer;
SELECT 'Database Trigger Status:' as check_name;
SELECT COUNT(*) as trigger_exists
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Check RLS policies
SELECT '----------------------------------------' as spacer;
SELECT 'RLS Policies Count:' as check_name;
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'user_profiles';

SELECT '========================================' as status;
SELECT 'IF ADMIN USER SHOWS NULL ABOVE:' as next_step;
SELECT 'Go to Supabase Dashboard > Auth > Users' as next_step;
SELECT 'Click "Add user" and create admin@mahaveer.com' as next_step;
SELECT 'Then run this script again!' as next_step;
SELECT '========================================' as status;
