-- ============================================
-- FIX TRIGGER AND PERMISSIONS FOR ADMIN CREATION
-- ============================================
-- This migration fixes the handle_new_user trigger that's causing
-- "Database error saving new user" during signup
--
-- Issue: The trigger function is failing when creating user_profiles
-- Likely causes:
-- 1. Missing SECURITY DEFINER on trigger function
-- 2. RLS blocking the trigger from inserting
-- 3. Missing permissions on the function
-- 4. Role IDs not being found correctly

-- ============================================
-- 1. FIX HANDLE_NEW_USER TRIGGER FUNCTION
-- ============================================

-- Drop existing trigger to recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with better error handling and SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER -- This is critical - allows bypassing RLS
SET search_path = public
AS $$
DECLARE
  v_superadmin_role_id uuid;
  v_member_role_id uuid;
BEGIN
  -- Get the superadmin role ID
  SELECT id INTO v_superadmin_role_id
  FROM public.user_roles
  WHERE name = 'superadmin'
  LIMIT 1;

  -- Get the member role ID (default)
  SELECT id INTO v_member_role_id
  FROM public.user_roles
  WHERE name = 'member'
  LIMIT 1;

  -- If member role doesn't exist, try to create it
  IF v_member_role_id IS NULL THEN
    INSERT INTO public.user_roles (name, description, permissions)
    VALUES ('member', 'Regular member', '{"read_profile": true}')
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO v_member_role_id;
  END IF;

  -- Insert user profile with proper error handling
  BEGIN
    INSERT INTO public.user_profiles (
      auth_id,
      email,
      full_name,
      role_id,
      is_active,
      needs_password_change
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      CASE
        WHEN NEW.email = 'rahulsuranat@gmail.com' THEN v_superadmin_role_id
        ELSE COALESCE(v_member_role_id, v_superadmin_role_id)
      END,
      true,
      false
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Failed to create user_profile for %: %', NEW.email, SQLERRM;
    -- Re-raise to actually fail and show the error
    RAISE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- ============================================
-- 2. ENSURE RLS POLICIES DON'T BLOCK TRIGGER
-- ============================================

-- The trigger runs with SECURITY DEFINER so it should bypass RLS,
-- but let's make sure there's a policy that allows service role

-- Drop and recreate the system insert policy
DROP POLICY IF EXISTS "System can insert profiles" ON user_profiles;

CREATE POLICY "System can insert profiles"
ON user_profiles
FOR INSERT
TO service_role, postgres
WITH CHECK (true);

-- ============================================
-- 3. FIX ATTENDANCE MARKING PERMISSIONS
-- ============================================

-- Ensure attendance_records table has proper policies
DROP POLICY IF EXISTS "Admins can insert attendance" ON attendance_records;
DROP POLICY IF EXISTS "Users can view own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance_records;

CREATE POLICY "Admins can insert attendance"
ON attendance_records
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

CREATE POLICY "Users can view own attendance"
ON attendance_records
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id FROM members WHERE auth_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin', 'view_only_admin')
  )
);

CREATE POLICY "Admins can view all attendance"
ON attendance_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin', 'view_only_admin')
  )
);

-- ============================================
-- 4. FIX ATTENDANCE_ITEMS PERMISSIONS
-- ============================================

DROP POLICY IF EXISTS "Admins can manage attendance items" ON attendance_items;
DROP POLICY IF EXISTS "Users can view attendance items" ON attendance_items;

CREATE POLICY "Admins can manage attendance items"
ON attendance_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

CREATE POLICY "Users can view attendance items"
ON attendance_items
FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================
-- 5. FIX CALENDAR/EVENTS PERMISSIONS
-- ============================================

-- Check if events table exists and add policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN

    DROP POLICY IF EXISTS "Admins can manage events" ON events;
    DROP POLICY IF EXISTS "Users can view published events" ON events;

    CREATE POLICY "Admins can manage events"
    ON events
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM user_profiles up
        JOIN user_roles ur ON up.role_id = ur.id
        WHERE up.auth_id = auth.uid()
        AND ur.name IN ('admin', 'superadmin', 'management_admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM user_profiles up
        JOIN user_roles ur ON up.role_id = ur.id
        WHERE up.auth_id = auth.uid()
        AND ur.name IN ('admin', 'superadmin', 'management_admin')
      )
    );

    CREATE POLICY "Users can view published events"
    ON events
    FOR SELECT
    TO authenticated
    USING (status = 'published' OR status = 'active');

  END IF;
END $$;

-- ============================================
-- 6. REFRESH SCHEMA CACHE
-- ============================================

-- Notify Supabase to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify trigger exists
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'on_auth_user_created';

  RAISE NOTICE 'Trigger on_auth_user_created exists: %', (trigger_count > 0);
END $$;

-- Verify function has SECURITY DEFINER
DO $$
DECLARE
  is_security_definer BOOLEAN;
BEGIN
  SELECT prosecdef INTO is_security_definer
  FROM pg_proc
  WHERE proname = 'handle_new_user';

  RAISE NOTICE 'Function handle_new_user has SECURITY DEFINER: %', is_security_definer;
END $$;

-- Verify RLS policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles'
  AND policyname LIKE '%can%';

  RAISE NOTICE 'Number of RLS policies on user_profiles: %', policy_count;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function to create user_profiles entry when auth.users record is created. Runs with SECURITY DEFINER to bypass RLS.';

-- Summary of changes:
-- ✅ Recreated handle_new_user() with SECURITY DEFINER
-- ✅ Added better error handling in trigger
-- ✅ Added System can insert profiles policy
-- ✅ Fixed attendance_records RLS policies
-- ✅ Fixed attendance_items RLS policies
-- ✅ Fixed events RLS policies
-- ✅ Granted proper permissions to service_role
-- ✅ Added verification checks
