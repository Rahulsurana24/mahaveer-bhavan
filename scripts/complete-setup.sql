-- ============================================
-- Mahaveer Bhavan - Complete Database Setup
-- ============================================
-- Run this entire script in Supabase SQL Editor to set up everything
-- ============================================

-- STEP 1: Create/Update User Roles
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

-- Verify roles
SELECT 'User Roles Created:' as status;
SELECT id, name, description FROM user_roles ORDER BY id;

-- STEP 2: Fix RLS Policies for user_profiles
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

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

-- Policy 3: Users can insert their own profile (for signup)
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

SELECT 'RLS Policies Created Successfully' as status;

-- STEP 3: Create Database Trigger for Auto Profile Creation
-- ============================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id INT;
BEGIN
  -- Get the 'member' role ID (default role for new signups)
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

SELECT 'Database Trigger Created Successfully' as status;

-- STEP 4: Fix members table RLS (if needed)
-- ============================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own data" ON members;
DROP POLICY IF EXISTS "Admins can view all members" ON members;

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

SELECT 'Members Table RLS Policies Created' as status;

-- ============================================
-- FINAL VERIFICATION
-- ============================================
SELECT 'Setup Complete! Verification:' as status;
SELECT COUNT(*) as total_roles FROM user_roles;
SELECT COUNT(*) as total_policies FROM pg_policies WHERE tablename = 'user_profiles';
SELECT COUNT(*) as total_triggers FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- ============================================
-- NEXT STEPS
-- ============================================
SELECT '
✅ Database setup is complete!

📝 NEXT STEPS:

1. CREATE ADMIN USER:
   - Go to: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/auth/users
   - Click "Add user"
   - Email: admin@mahaveer.com (or your choice)
   - Password: (Create a strong password)
   - ✅ Check "Auto Confirm User"
   - Click "Create user"

2. MAKE USER AN ADMIN:
   After creating the user, run this SQL (replace the email):

   UPDATE user_profiles
   SET role_id = (SELECT id FROM user_roles WHERE name = ''superadmin'')
   WHERE email = ''admin@mahaveer.com'';

3. VERIFY:
   SELECT
     up.email,
     ur.name as role
   FROM user_profiles up
   LEFT JOIN user_roles ur ON up.role_id = ur.id
   WHERE up.email = ''admin@mahaveer.com'';

4. TEST LOGIN:
   - Go to: https://mahaveer-bhavan.netlify.app/admin-auth
   - Login with your admin credentials
   - Open browser console (F12) to see detailed logs

💡 TIP: The trigger will auto-create profiles for new users!
' as instructions;
