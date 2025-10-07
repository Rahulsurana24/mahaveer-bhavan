-- Fix search path security warnings by updating all functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_member_id(membership_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  prefix text;
  counter integer;
  new_id text;
BEGIN
  -- Determine prefix based on membership type
  CASE membership_type
    WHEN 'Trustee' THEN prefix := 'TR';
    WHEN 'Tapasvi' THEN prefix := 'TP';
    WHEN 'Karyakarta' THEN prefix := 'KR';
    WHEN 'Labharti' THEN prefix := 'LB';
    WHEN 'Extra' THEN prefix := 'EX';
    ELSE prefix := 'EX';
  END CASE;
  
  -- Get next counter for this membership type
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO counter
  FROM members
  WHERE id LIKE prefix || '-%';
  
  -- Format with leading zeros
  new_id := prefix || '-' || LPAD(counter::text, 3, '0');
  
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_user_permission(user_auth_id uuid, permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_permissions jsonb;
BEGIN
  SELECT ur.permissions INTO user_permissions
  FROM user_profiles up
  JOIN user_roles ur ON up.role_id = ur.id
  WHERE up.auth_id = user_auth_id;
  
  IF user_permissions IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if permission exists in any category
  RETURN (
    user_permissions ? permission_name OR
    EXISTS (
      SELECT 1 FROM jsonb_each(user_permissions) AS category(key, value)
      WHERE jsonb_typeof(value) = 'object' AND value ? permission_name
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION create_admin_user(
  user_email text,
  user_role text DEFAULT 'admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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