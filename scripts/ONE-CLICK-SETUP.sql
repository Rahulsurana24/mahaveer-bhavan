-- ============================================
-- 🚀 MAHAVEER BHAVAN - ONE-CLICK COMPLETE SETUP
-- ============================================
-- Copy this ENTIRE file and run it in Supabase SQL Editor
-- This will set up EVERYTHING needed for authentication
-- ============================================

-- ============================================
-- STEP 1: Create User Roles
-- ============================================
INSERT INTO user_roles (name, description)
VALUES
  ('superadmin', 'Super Administrator with full system access'),
  ('admin', 'Administrator with management access'),
  ('management_admin', 'Management Administrator with reporting access'),
  ('view_only_admin', 'View-only Administrator'),
  ('member', 'Regular Member')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description;

-- ============================================
-- STEP 2: Temporarily Disable RLS for Setup
-- ============================================
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Drop and Recreate RLS Policies
-- ============================================

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON user_profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Policy 3: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_id);

-- Policy 4: Admins can view ALL profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin', 'view_only_admin')
    )
  );

-- Policy 5: Admins can update ALL profiles
CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- Policy 6: Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- ============================================
-- STEP 4: Members Table RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Members can view own data" ON members;
DROP POLICY IF EXISTS "Admins can view all members" ON members;
DROP POLICY IF EXISTS "Admins can update members" ON members;
DROP POLICY IF EXISTS "Admins can insert members" ON members;

CREATE POLICY "Members can view own data"
  ON members FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id);

CREATE POLICY "Admins can view all members"
  ON members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin', 'view_only_admin')
    )
  );

CREATE POLICY "Admins can update members"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

CREATE POLICY "Admins can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- ============================================
-- STEP 5: Create Database Trigger
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id INT;
BEGIN
  -- Get the 'member' role ID
  SELECT id INTO default_role_id FROM public.user_roles WHERE name = 'member' LIMIT 1;

  -- Insert into user_profiles
  INSERT INTO public.user_profiles (
    auth_id,
    email,
    full_name,
    role_id
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_role_id
  );

  -- Insert into members
  INSERT INTO public.members (
    auth_id,
    email,
    full_name,
    membership_type
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'member'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 6: Re-enable RLS
-- ============================================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ✅ VERIFICATION
-- ============================================
SELECT '========================================' as "STATUS";
SELECT '✅ SETUP COMPLETE!' as "STATUS";
SELECT '========================================' as "STATUS";

SELECT 'User Roles:' as "INFO";
SELECT id, name FROM user_roles ORDER BY id;

SELECT '----------------------------------------' as "SPACER";
SELECT 'RLS Policies on user_profiles:' as "INFO";
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'user_profiles';

SELECT '----------------------------------------' as "SPACER";
SELECT 'Database Trigger:' as "INFO";
SELECT COUNT(*) as trigger_count FROM pg_trigger WHERE tgname = 'on_auth_user_created';

SELECT '----------------------------------------' as "SPACER";
SELECT '========================================' as "NEXT_STEPS";
SELECT '1. Go to: Auth > Users' as "STEP";
SELECT '2. Click "Add user"' as "STEP";
SELECT '3. Email: admin@mahaveer.com' as "STEP";
SELECT '4. Password: AdminMahaveer2025!' as "STEP";
SELECT '5. ✅ Check "Auto Confirm User"' as "STEP";
SELECT '6. Click "Create user"' as "STEP";
SELECT '----------------------------------------' as "SPACER";
SELECT '7. After user is created, run this SQL:' as "STEP";
SELECT '----------------------------------------' as "SPACER";
SELECT 'UPDATE user_profiles' as "SQL_COMMAND";
SELECT 'SET role_id = (SELECT id FROM user_roles WHERE name = ''superadmin'')' as "SQL_COMMAND";
SELECT 'WHERE email = ''admin@mahaveer.com'';' as "SQL_COMMAND";
SELECT '----------------------------------------' as "SPACER";
SELECT '8. Verify with:' as "STEP";
SELECT 'SELECT up.email, ur.name as role FROM user_profiles up' as "SQL_VERIFY";
SELECT 'LEFT JOIN user_roles ur ON up.role_id = ur.id' as "SQL_VERIFY";
SELECT 'WHERE up.email = ''admin@mahaveer.com'';' as "SQL_VERIFY";
SELECT '========================================' as "DONE";
