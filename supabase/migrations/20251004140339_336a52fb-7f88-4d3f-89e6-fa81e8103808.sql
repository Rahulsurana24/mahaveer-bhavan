-- Fix infinite recursion in RLS policies by creating proper security definer functions
-- Drop existing problematic functions and policies
DROP FUNCTION IF EXISTS public.is_user_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_user_superadmin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_permission(text, uuid) CASCADE;

-- Create security definer functions to check roles without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_auth_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.name
  FROM user_profiles up
  JOIN user_roles ur ON up.role_id = ur.id
  WHERE up.auth_id = user_auth_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_role(user_auth_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = user_auth_id
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin_role(user_auth_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = user_auth_id
      AND ur.name = 'superadmin'
  );
$$;

-- Recreate RLS policies on user_roles table using security definer functions
DROP POLICY IF EXISTS "Anyone can read roles" ON user_roles;
DROP POLICY IF EXISTS "Only superadmin can manage roles" ON user_roles;

CREATE POLICY "Anyone can read roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only superadmin can manage roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (is_superadmin_role(auth.uid()));

-- Update user_profiles RLS policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Superadmin can manage all profiles" ON user_profiles;

CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_admin_role(auth.uid()) OR auth_id = auth.uid());

CREATE POLICY "Superadmin can manage all profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (is_superadmin_role(auth.uid()));

-- Create function to setup super admins
CREATE OR REPLACE FUNCTION public.setup_super_admins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  superadmin_role_id uuid;
BEGIN
  -- Get superadmin role
  SELECT id INTO superadmin_role_id FROM user_roles WHERE name = 'superadmin';
  
  -- Setup rahulsuranat@gmail.com as superadmin
  UPDATE user_profiles 
  SET role_id = superadmin_role_id 
  WHERE email = 'rahulsuranat@gmail.com';
  
  -- Setup rahulsurana67@gmail.com as superadmin
  UPDATE user_profiles 
  SET role_id = superadmin_role_id 
  WHERE email = 'rahulsurana67@gmail.com';
  
  RAISE NOTICE 'Super admins setup completed';
END;
$$;

-- Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
  new_member_id text;
BEGIN
  -- Get the default member role
  SELECT id INTO default_role_id FROM user_roles WHERE name = 'member';
  
  -- Check if this is a superadmin email
  IF NEW.email IN ('rahulsuranat@gmail.com', 'rahulsurana67@gmail.com') THEN
    SELECT id INTO default_role_id FROM user_roles WHERE name = 'superadmin';
  END IF;
  
  -- Create user profile
  INSERT INTO public.user_profiles (auth_id, email, full_name, role_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    default_role_id,
    true
  )
  ON CONFLICT (auth_id) DO UPDATE 
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    role_id = EXCLUDED.role_id,
    updated_at = now();
  
  -- Create member record if metadata exists
  IF NEW.raw_user_meta_data ? 'full_name' THEN
    -- Generate member ID
    SELECT generate_member_id(COALESCE(NEW.raw_user_meta_data->>'membership_type', 'Extra'))
    INTO new_member_id;
    
    INSERT INTO members (
      id, auth_id, full_name, first_name, middle_name, last_name,
      email, phone, date_of_birth, gender, address, street_address,
      city, state, postal_code, country, membership_type,
      emergency_contact, photo_url, status
    ) VALUES (
      new_member_id, NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'middle_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      (NEW.raw_user_meta_data->>'date_of_birth')::date,
      NEW.raw_user_meta_data->>'gender',
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'street_address',
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'state',
      NEW.raw_user_meta_data->>'postal_code',
      NEW.raw_user_meta_data->>'country',
      COALESCE(NEW.raw_user_meta_data->>'membership_type', 'Extra'),
      COALESCE((NEW.raw_user_meta_data->>'emergency_contact')::jsonb, '{}'::jsonb),
      '/placeholder.svg',
      'active'
    )
    ON CONFLICT (auth_id) DO UPDATE
    SET updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;