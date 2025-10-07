-- Fix infinite recursion in user_profiles RLS policies
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Superadmin can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name text;
BEGIN
  SELECT ur.name INTO user_role_name
  FROM user_profiles up
  JOIN user_roles ur ON up.role_id = ur.id
  WHERE up.auth_id = user_auth_id;
  
  RETURN user_role_name IN ('admin', 'superadmin', 'management_admin');
END;
$$;

-- Create security definer function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_user_superadmin(user_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name text;
BEGIN
  SELECT ur.name INTO user_role_name
  FROM user_profiles up
  JOIN user_roles ur ON up.role_id = ur.id
  WHERE up.auth_id = user_auth_id;
  
  RETURN user_role_name = 'superadmin';
END;
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Users can read own profile"
ON user_profiles FOR SELECT
USING (auth_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth_id = auth.uid());

CREATE POLICY "Admins can read all profiles"
ON user_profiles FOR SELECT
USING (is_user_admin(auth.uid()));

CREATE POLICY "Superadmin can manage all profiles"
ON user_profiles FOR ALL
USING (is_user_superadmin(auth.uid()));