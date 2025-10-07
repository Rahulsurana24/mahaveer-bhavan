-- Complete Database Rebuild with Proper Security

-- ============================================
-- STEP 1: CREATE SECURITY DEFINER FUNCTIONS
-- ============================================

-- Function to get user role (prevents RLS recursion)
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

-- Function to check if user is admin
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

-- Function to check if user is superadmin
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

-- ============================================
-- STEP 2: UPDATE handle_new_user TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
  new_member_id text;
  superadmin_role_id uuid;
BEGIN
  -- Get the default member role
  SELECT id INTO default_role_id FROM user_roles WHERE name = 'member';
  
  -- Get superadmin role
  SELECT id INTO superadmin_role_id FROM user_roles WHERE name = 'superadmin';
  
  -- Check if this is the initial admin email
  IF NEW.email = 'rahulsuranat@gmail.com' THEN
    -- Create user profile with superadmin role
    INSERT INTO public.user_profiles (auth_id, email, full_name, role_id, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Rahul Surana'),
      superadmin_role_id,
      true
    )
    ON CONFLICT (auth_id) DO UPDATE 
    SET 
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
      role_id = superadmin_role_id,
      updated_at = now();
    
    RETURN NEW;
  END IF;
  
  -- For regular users, create profile with member role
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

-- ============================================
-- STEP 3: ADD PASSWORD CHANGE TRACKING
-- ============================================

-- Add column to track if password needs to be changed
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS needs_password_change boolean DEFAULT false;

-- Update initial admin to require password change
UPDATE user_profiles 
SET needs_password_change = true 
WHERE email = 'rahulsuranat@gmail.com';

COMMENT ON COLUMN user_profiles.needs_password_change IS 'Flag to force password change on next login';