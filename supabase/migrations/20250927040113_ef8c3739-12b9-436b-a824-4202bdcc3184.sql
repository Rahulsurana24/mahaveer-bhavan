-- Create the default super admin user
-- First we need to manually insert the user into auth.users
-- This should be done after the user signs up normally through the app

-- Create a function to set up the super admin after they sign up
CREATE OR REPLACE FUNCTION setup_super_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_auth_id uuid;
  superadmin_role_id uuid;
BEGIN
  -- Get the super admin user ID (rahulsuranat@gmail.com)
  SELECT id INTO admin_auth_id
  FROM auth.users
  WHERE email = 'rahulsuranat@gmail.com';
  
  -- Get the superadmin role ID
  SELECT id INTO superadmin_role_id
  FROM user_roles
  WHERE name = 'superadmin';
  
  -- If both exist, create/update the user profile
  IF admin_auth_id IS NOT NULL AND superadmin_role_id IS NOT NULL THEN
    INSERT INTO user_profiles (auth_id, email, full_name, role_id)
    VALUES (
      admin_auth_id,
      'rahulsuranat@gmail.com',
      'Rahul Surana',
      superadmin_role_id
    )
    ON CONFLICT (auth_id) 
    DO UPDATE SET role_id = superadmin_role_id;
    
    RAISE NOTICE 'Super admin setup completed for rahulsuranat@gmail.com';
  ELSE
    RAISE NOTICE 'User or role not found. User must sign up first.';
  END IF;
END;
$$;

-- Also update the user profile creation trigger to handle the super admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- Get the default member role
  SELECT id INTO default_role_id
  FROM user_roles
  WHERE name = 'member';
  
  -- Create user profile with default role (or superadmin if it's the special email)
  IF NEW.email = 'rahulsuranat@gmail.com' THEN
    -- Make this user a superadmin
    SELECT id INTO default_role_id
    FROM user_roles
    WHERE name = 'superadmin';
  END IF;
  
  INSERT INTO public.user_profiles (auth_id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_role_id
  );
  
  RETURN NEW;
END;
$$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();