-- Ensure super admin roles are set up correctly
-- This migration ensures both super admin users have the correct role assigned

DO $$
DECLARE
  superadmin_role_id uuid;
  user1_auth_id uuid;
  user2_auth_id uuid;
BEGIN
  -- Get the superadmin role ID
  SELECT id INTO superadmin_role_id FROM user_roles WHERE name = 'superadmin';
  
  -- Get the auth IDs for both super admin emails
  SELECT id INTO user1_auth_id FROM auth.users WHERE email = 'rahulsuranat@gmail.com';
  SELECT id INTO user2_auth_id FROM auth.users WHERE email = 'rahulsurana67@gmail.com';
  
  -- Update/create profile for first super admin
  IF user1_auth_id IS NOT NULL AND superadmin_role_id IS NOT NULL THEN
    INSERT INTO user_profiles (auth_id, email, full_name, role_id, is_active)
    VALUES (
      user1_auth_id,
      'rahulsuranat@gmail.com',
      'Rahul Surana',
      superadmin_role_id,
      true
    )
    ON CONFLICT (auth_id) 
    DO UPDATE SET 
      role_id = superadmin_role_id,
      is_active = true,
      updated_at = now();
  END IF;
  
  -- Update/create profile for second super admin
  IF user2_auth_id IS NOT NULL AND superadmin_role_id IS NOT NULL THEN
    INSERT INTO user_profiles (auth_id, email, full_name, role_id, is_active)
    VALUES (
      user2_auth_id,
      'rahulsurana67@gmail.com',
      'Rahul Surana',
      superadmin_role_id,
      true
    )
    ON CONFLICT (auth_id) 
    DO UPDATE SET 
      role_id = superadmin_role_id,
      is_active = true,
      updated_at = now();
  END IF;
END $$;

-- Update the handle_new_user trigger to be more reliable
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- Get the default member role
  SELECT id INTO default_role_id
  FROM user_roles
  WHERE name = 'member';
  
  -- Check if this is one of our superadmin emails
  IF NEW.email IN ('rahulsuranat@gmail.com', 'rahulsurana67@gmail.com') THEN
    SELECT id INTO default_role_id
    FROM user_roles
    WHERE name = 'superadmin';
  END IF;
  
  -- Insert or update user profile
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
    is_active = EXCLUDED.is_active,
    updated_at = now();
  
  RETURN NEW;
END;
$$;