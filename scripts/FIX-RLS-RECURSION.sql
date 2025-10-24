-- ============================================
-- 🚨 FIX RLS INFINITE RECURSION
-- ============================================
-- This fixes the "infinite recursion detected in policy" error
-- ============================================

-- ============================================
-- STEP 1: Drop ALL policies that cause recursion
-- ============================================
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON user_profiles;

DROP POLICY IF EXISTS "Members can manage own data" ON members;
DROP POLICY IF EXISTS "Admins can view all members" ON members;
DROP POLICY IF EXISTS "Members can view own data" ON members;
DROP POLICY IF EXISTS "Allow all for authenticated" ON members;

-- ============================================
-- STEP 2: Disable RLS on user_roles (lookup table)
-- ============================================
-- user_roles is just a lookup table, it doesn't need RLS
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create SAFE policies for user_profiles
-- ============================================

-- Policy 1: Users can view and manage their own profile
CREATE POLICY "user_profiles_own_access"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Policy 2: Create a helper function to check admin status (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name TEXT;
BEGIN
  -- Get the user's role name directly without RLS
  SELECT ur.name INTO user_role_name
  FROM user_profiles up
  JOIN user_roles ur ON up.role_id = ur.id
  WHERE up.auth_id = user_id;

  -- Check if role is admin-level
  RETURN user_role_name IN ('superadmin', 'admin', 'management_admin', 'view_only_admin');
END;
$$;

-- Policy 3: Admins can view all profiles (using helper function)
CREATE POLICY "user_profiles_admin_view_all"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Policy 4: Admins can update all profiles (using helper function)
CREATE POLICY "user_profiles_admin_update_all"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- STEP 4: Create SAFE policies for members
-- ============================================

-- Policy 1: Users can view and manage their own member data
CREATE POLICY "members_own_access"
  ON members
  FOR ALL
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Policy 2: Admins can view all members (using helper function)
CREATE POLICY "members_admin_view_all"
  ON members
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Policy 3: Admins can update all members (using helper function)
CREATE POLICY "members_admin_update_all"
  ON members
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- STEP 5: Verification
-- ============================================
SELECT '========================================' as status;
SELECT 'RLS POLICIES FIXED' as status;
SELECT '========================================' as status;

-- Show active policies
SELECT 'Active policies on user_profiles:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

SELECT '' as spacer;
SELECT 'Active policies on members:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'members'
ORDER BY policyname;

SELECT '' as spacer;
SELECT 'user_roles RLS status (should be disabled):' as info;
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'user_roles';

SELECT '========================================' as status;
SELECT 'READY TO TEST!' as status;
SELECT '========================================' as status;
