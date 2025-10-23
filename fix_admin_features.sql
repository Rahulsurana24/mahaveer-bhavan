-- Fix Admin Panel Features
-- This script fixes RLS policies, member ID generation, and admin creation issues

-- 1. Fix member ID generation function with new prefixes
-- K for Karyakarta, T for Tapasvi, L for Labharti, E for Extra, TR for Trustee
CREATE OR REPLACE FUNCTION public.generate_member_id(membership_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefix text;
  next_number integer;
  new_id text;
BEGIN
  -- Map membership types to prefixes
  CASE membership_type
    WHEN 'Karyakarta' THEN prefix := 'K';
    WHEN 'Tapasvi' THEN prefix := 'T';
    WHEN 'Labharti' THEN prefix := 'L';
    WHEN 'Extra' THEN prefix := 'E';
    WHEN 'Trustee' THEN prefix := 'TR';
    ELSE prefix := 'E'; -- Default to Extra
  END CASE;

  -- Get the highest number for this prefix
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM '[0-9]+$') AS INTEGER
    )
  ), 0) INTO next_number
  FROM members
  WHERE id ~ ('^' || prefix || '-[0-9]+$');

  -- Increment and format
  next_number := next_number + 1;
  new_id := prefix || '-' || LPAD(next_number::text, 3, '0');

  RETURN new_id;
END;
$$;

-- 2. Fix RLS policies for user_profiles to allow superadmin to create admins
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Superadmin can manage all profiles" ON user_profiles;

-- Create new comprehensive policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin_role(auth.uid()));

CREATE POLICY "Users can update own basic profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Users cannot change their own role
    role_id = (SELECT role_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Superadmin can create and update all profiles"
  ON user_profiles FOR ALL
  USING (public.is_superadmin_role(auth.uid()))
  WITH CHECK (public.is_superadmin_role(auth.uid()));

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (public.is_admin_role(auth.uid()));

CREATE POLICY "Admins can update member profiles"
  ON user_profiles FOR UPDATE
  USING (
    public.is_admin_role(auth.uid()) AND
    NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.id = user_profiles.role_id
      AND ur.name IN ('admin', 'superadmin', 'management_admin', 'view_only_admin')
    )
  );

-- 3. Ensure handle_new_user trigger properly creates member records with new prefixes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_role_id uuid;
  membership_type text;
  generated_id text;
BEGIN
  -- Get the member role ID
  SELECT id INTO member_role_id FROM user_roles WHERE name = 'member' LIMIT 1;

  -- Extract membership type from user metadata, default to 'Extra'
  membership_type := COALESCE(NEW.raw_user_meta_data->>'membership_type', 'Extra');

  -- Generate member ID
  generated_id := generate_member_id(membership_type);

  -- Create user profile
  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    role_id,
    is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    member_role_id,
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- Create member record with generated ID
  INSERT INTO members (
    id,
    user_id,
    email,
    full_name,
    first_name,
    middle_name,
    last_name,
    phone,
    date_of_birth,
    gender,
    address,
    city,
    state,
    postal_code,
    country,
    membership_type,
    status,
    photo_url
  ) VALUES (
    generated_id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'middle_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'date_of_birth')::date, NULL),
    COALESCE(NEW.raw_user_meta_data->>'gender', 'Male'),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    COALESCE(NEW.raw_user_meta_data->>'postal_code', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'India'),
    membership_type,
    'active',
    '/placeholder.svg'
  ) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 5. Ensure system_settings table has proper RLS
DROP POLICY IF EXISTS "Anyone can read settings" ON system_settings;
DROP POLICY IF EXISTS "Superadmin can manage settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can read settings" ON system_settings;

CREATE POLICY "Admins can read settings"
  ON system_settings FOR SELECT
  USING (public.is_admin_role(auth.uid()));

CREATE POLICY "Superadmin can manage all settings"
  ON system_settings FOR ALL
  USING (public.is_superadmin_role(auth.uid()))
  WITH CHECK (public.is_superadmin_role(auth.uid()));

-- Verify the changes
SELECT 'Member ID generation function updated' as status;
SELECT 'RLS policies updated for user_profiles' as status;
SELECT 'handle_new_user trigger function updated' as status;
SELECT 'Permissions granted' as status;
SELECT 'System settings RLS policies updated' as status;
