-- ============================================
-- FIX ADMIN CREATION POLICIES
-- ============================================
-- This migration fixes RLS policies to allow admin creation
--
-- Issue: Admins couldn't create new admin users because:
-- 1. No INSERT policy for user_profiles (only superadmin has ALL)
-- 2. No UPDATE policy for admins to modify other users' profiles
-- 3. The handle_new_user trigger creates profiles with default role,
--    but then the UPDATE to set admin role fails

-- ============================================
-- 1. ADD ADMIN UPDATE POLICY
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;

-- Allow admins to update user profiles (for role assignment)
CREATE POLICY "Admins can update profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  -- User is an admin
  EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
)
WITH CHECK (
  -- User is an admin
  EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- Allow admins to insert user profiles (for manual profile creation if needed)
CREATE POLICY "Admins can insert profiles"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- User is an admin
  EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- ============================================
-- 2. IMPROVE HANDLE_NEW_USER TRIGGER
-- ============================================

-- Recreate the function to handle admin creation better
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_superadmin_role_id uuid;
  v_member_role_id uuid;
BEGIN
  -- Get the superadmin role ID
  SELECT id INTO v_superadmin_role_id
  FROM public.user_roles
  WHERE name = 'superadmin'
  LIMIT 1;

  -- Get the member role ID (default)
  SELECT id INTO v_member_role_id
  FROM public.user_roles
  WHERE name = 'member'
  LIMIT 1;

  -- Insert user profile
  -- If email is rahulsuranat@gmail.com, make them superadmin automatically
  -- Otherwise, use member role as default (will be updated by admin creation flow)
  INSERT INTO public.user_profiles (auth_id, email, full_name, role_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE
      WHEN NEW.email = 'rahulsuranat@gmail.com' THEN v_superadmin_role_id
      ELSE v_member_role_id
    END,
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. ADD HELPER FUNCTION FOR ADMIN CREATION
-- ============================================

-- Function to update user role (callable by admins)
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_auth_id uuid,
  p_role_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;

  -- Update the user's role
  UPDATE user_profiles
  SET role_id = p_role_id,
      updated_at = now()
  WHERE auth_id = p_user_auth_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, uuid) TO authenticated;

-- ============================================
-- 4. ADD HELPER FUNCTION TO CHECK IF EMAIL EXISTS
-- ============================================

CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE email = p_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Summary of changes:
-- ✅ Added "Admins can update profiles" policy
-- ✅ Added "Admins can insert profiles" policy
-- ✅ Improved handle_new_user trigger function
-- ✅ Added update_user_role helper function for admins
-- ✅ Added check_email_exists helper function

-- Now admins can:
-- 1. Create new admin users via signUp
-- 2. Update user profiles to assign admin roles
-- 3. Check if email already exists before creating

COMMENT ON POLICY "Admins can update profiles" ON user_profiles IS 'Allows admins to update user profiles for role assignment and admin creation';
COMMENT ON POLICY "Admins can insert profiles" ON user_profiles IS 'Allows admins to manually insert user profiles if needed';
COMMENT ON FUNCTION public.update_user_role(uuid, uuid) IS 'Allows admins to update a user''s role. Requires admin privileges.';
COMMENT ON FUNCTION public.check_email_exists(text) IS 'Check if an email already exists in user_profiles';
