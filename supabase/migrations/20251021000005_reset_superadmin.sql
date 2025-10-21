-- ============================================
-- RESET SUPERADMIN USER
-- ============================================
-- Provides functions to reset and recreate the superadmin user

-- Function to clean up existing superadmin data
CREATE OR REPLACE FUNCTION cleanup_superadmin(
  p_email text DEFAULT 'rahulsuranat@gmail.com'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id uuid;
BEGIN
  -- Get the auth ID for this email
  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE email = p_email;

  IF v_auth_id IS NOT NULL THEN
    -- Delete from user_profiles first (foreign key)
    DELETE FROM user_profiles WHERE auth_id = v_auth_id;

    -- Delete from auth.users (requires RLS bypass)
    DELETE FROM auth.users WHERE id = v_auth_id;

    RAISE NOTICE 'Cleaned up superadmin user: %', p_email;
  ELSE
    RAISE NOTICE 'No existing superadmin found for: %', p_email;
  END IF;
END;
$$;

-- Function to ensure superadmin role exists and setup trigger
CREATE OR REPLACE FUNCTION ensure_superadmin_setup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_superadmin_role_id uuid;
BEGIN
  -- Ensure superadmin role exists
  SELECT id INTO v_superadmin_role_id
  FROM user_roles
  WHERE name = 'superadmin';

  IF v_superadmin_role_id IS NULL THEN
    INSERT INTO user_roles (name, description, permissions)
    VALUES (
      'superadmin',
      'Super Administrator with full system access',
      jsonb_build_object(
        'all', true,
        'manage_admins', true,
        'manage_members', true,
        'manage_events', true,
        'manage_trips', true,
        'manage_finances', true,
        'view_logs', true,
        'system_settings', true
      )
    )
    RETURNING id INTO v_superadmin_role_id;

    RAISE NOTICE 'Created superadmin role';
  END IF;

  RAISE NOTICE 'Superadmin setup verified. Role ID: %', v_superadmin_role_id;
END;
$$;

-- Recreate the handle_new_user trigger to ensure it works correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  -- Determine the role for this user
  IF NEW.email = 'rahulsuranat@gmail.com' THEN
    -- Superadmin user
    SELECT id INTO v_role_id
    FROM user_roles
    WHERE name = 'superadmin';

    RAISE NOTICE 'Creating superadmin user profile for: %', NEW.email;
  ELSE
    -- Default member role
    SELECT id INTO v_role_id
    FROM user_roles
    WHERE name = 'member';
  END IF;

  -- If role not found, use a fallback
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id
    FROM user_roles
    ORDER BY name
    LIMIT 1;
  END IF;

  -- Create user profile
  INSERT INTO public.user_profiles (auth_id, email, full_name, role_id, needs_password_change)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin User'),
    v_role_id,
    CASE WHEN NEW.email = 'rahulsuranat@gmail.com' THEN false ELSE true END
  )
  ON CONFLICT (auth_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to manually create superadmin profile if user already exists
CREATE OR REPLACE FUNCTION create_superadmin_profile(
  p_email text DEFAULT 'rahulsuranat@gmail.com',
  p_full_name text DEFAULT 'Super Admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id uuid;
  v_role_id uuid;
BEGIN
  -- Get the auth ID
  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE email = p_email;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %. User must sign up first.', p_email;
  END IF;

  -- Get superadmin role ID
  SELECT id INTO v_role_id
  FROM user_roles
  WHERE name = 'superadmin';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Superadmin role not found';
  END IF;

  -- Create or update user profile
  INSERT INTO user_profiles (auth_id, email, full_name, role_id, needs_password_change)
  VALUES (v_auth_id, p_email, p_full_name, v_role_id, false)
  ON CONFLICT (auth_id)
  DO UPDATE SET
    role_id = v_role_id,
    full_name = p_full_name,
    needs_password_change = false;

  RAISE NOTICE 'Superadmin profile created/updated for: %', p_email;
END;
$$;

-- Execute setup to ensure everything is ready
SELECT ensure_superadmin_setup();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_superadmin TO postgres;
GRANT EXECUTE ON FUNCTION ensure_superadmin_setup TO postgres;
GRANT EXECUTE ON FUNCTION create_superadmin_profile TO postgres;

-- Instructions for manual superadmin recreation:
COMMENT ON FUNCTION cleanup_superadmin IS '
Usage: SELECT cleanup_superadmin(''rahulsuranat@gmail.com'');
Then have the user sign up again through the UI with:
  Email: rahulsuranat@gmail.com
  Password: 9480413653
The trigger will automatically assign superadmin role.
';

COMMENT ON FUNCTION create_superadmin_profile IS '
Usage: SELECT create_superadmin_profile(''rahulsuranat@gmail.com'', ''Super Admin'');
Use this if the user already exists in auth.users but needs superadmin role assigned.
';
