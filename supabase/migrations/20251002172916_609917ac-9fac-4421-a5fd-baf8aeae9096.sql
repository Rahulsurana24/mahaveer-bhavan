-- Create test users and assign roles
-- Note: Users must sign up first before their profiles can be assigned roles
-- This migration creates a helper function to easily set up test users after they sign up

-- Function to create test admin accounts (to be called after users sign up)
CREATE OR REPLACE FUNCTION public.setup_test_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  superadmin_role_id uuid;
  admin_role_id uuid;
  management_admin_role_id uuid;
  view_only_admin_role_id uuid;
  member_role_id uuid;
BEGIN
  -- Get all role IDs
  SELECT id INTO superadmin_role_id FROM user_roles WHERE name = 'superadmin';
  SELECT id INTO admin_role_id FROM user_roles WHERE name = 'admin';
  SELECT id INTO management_admin_role_id FROM user_roles WHERE name = 'management_admin';
  SELECT id INTO view_only_admin_role_id FROM user_roles WHERE name = 'view_only_admin';
  SELECT id INTO member_role_id FROM user_roles WHERE name = 'member';

  -- Setup test superadmin (rahulsuranat@gmail.com)
  UPDATE user_profiles 
  SET role_id = superadmin_role_id 
  WHERE email = 'rahulsuranat@gmail.com';

  -- Setup new superadmin (rahulsurana67@gmail.com)
  UPDATE user_profiles 
  SET role_id = superadmin_role_id 
  WHERE email = 'rahulsurana67@gmail.com';

  -- Setup test admin (testadmin@mahaveer.com)
  UPDATE user_profiles 
  SET role_id = admin_role_id 
  WHERE email = 'testadmin@mahaveer.com';

  -- Setup test management admin (testmanagement@mahaveer.com)
  UPDATE user_profiles 
  SET role_id = management_admin_role_id 
  WHERE email = 'testmanagement@mahaveer.com';

  -- Setup test view-only admin (testviewer@mahaveer.com)
  UPDATE user_profiles 
  SET role_id = view_only_admin_role_id 
  WHERE email = 'testviewer@mahaveer.com';

  RAISE NOTICE 'Test users setup completed. Users must sign up first before running this function.';
END;
$function$;

-- Add instructions comment
COMMENT ON FUNCTION public.setup_test_users() IS 'Run this function after test users have signed up to assign them appropriate roles. Test accounts: testadmin@mahaveer.com, testmanagement@mahaveer.com, testviewer@mahaveer.com with password: Test@123';

-- Update the handle_new_user function to automatically assign superadmin role to rahulsurana67@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
  
  INSERT INTO public.user_profiles (auth_id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_role_id
  );
  
  RETURN NEW;
END;
$function$;