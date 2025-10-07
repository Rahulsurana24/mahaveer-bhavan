-- Create default admin user and roles
-- First, let's ensure we have the basic user roles
INSERT INTO user_roles (name, description, permissions) VALUES
('member', 'Regular member with basic access', '{"read_profile": true, "update_profile": true, "view_events": true, "register_events": true}'),
('admin', 'Administrator with management privileges', '{"manage_members": true, "manage_events": true, "view_reports": true, "send_communications": true}'),
('superadmin', 'Super administrator with full access', '{"manage_all": true, "manage_admins": true, "system_settings": true}')
ON CONFLICT (name) DO NOTHING;

-- Create a function to create admin users (to be called after user signup)
CREATE OR REPLACE FUNCTION create_admin_user(
  user_email text,
  user_role text DEFAULT 'admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_auth_id uuid;
  role_uuid uuid;
BEGIN
  -- Get the auth user ID
  SELECT id INTO user_auth_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_auth_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Get the role ID
  SELECT id INTO role_uuid
  FROM user_roles
  WHERE name = user_role;
  
  IF role_uuid IS NULL THEN
    RAISE EXCEPTION 'Role % not found', user_role;
  END IF;
  
  -- Create or update user profile with admin role
  INSERT INTO user_profiles (auth_id, email, full_name, role_id)
  SELECT 
    user_auth_id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    role_uuid
  FROM auth.users au
  WHERE au.id = user_auth_id
  ON CONFLICT (auth_id) 
  DO UPDATE SET role_id = role_uuid;
END;
$$;