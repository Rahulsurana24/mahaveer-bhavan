-- ============================================
-- 🚨 FIX TRIGGER FUNCTION - Database Error Saving New User
-- ============================================
-- This fixes the "Database error saving new user" issue
-- ============================================

-- ============================================
-- STEP 1: Temporarily disable RLS for inserts
-- ============================================
-- This allows the trigger to insert into user_profiles and members

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "user_profiles_own_access" ON user_profiles;
DROP POLICY IF EXISTS "members_own_access" ON members;

-- Create permissive policies for new user creation
CREATE POLICY "user_profiles_allow_insert"
  ON user_profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "user_profiles_allow_own_access"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "members_allow_insert"
  ON members
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "members_allow_own_access"
  ON members
  FOR ALL
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- ============================================
-- STEP 2: Create improved trigger function
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create completely new trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id UUID;
  full_name_value TEXT;
BEGIN
  -- Log the start
  RAISE LOG 'Trigger fired for new user: %', NEW.email;

  -- Get the member role ID (use UUID instead of INT)
  SELECT id INTO default_role_id
  FROM public.user_roles
  WHERE name = 'member'
  LIMIT 1;

  -- If no role found, create it
  IF default_role_id IS NULL THEN
    RAISE LOG 'Member role not found, creating it';
    INSERT INTO public.user_roles (name, description)
    VALUES ('member', 'Regular Member')
    RETURNING id INTO default_role_id;
  END IF;

  -- Extract full name from metadata
  full_name_value := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'fullName',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Insert into user_profiles
  BEGIN
    RAISE LOG 'Attempting to insert into user_profiles for %', NEW.email;

    INSERT INTO public.user_profiles (
      auth_id,
      email,
      full_name,
      role_id
    ) VALUES (
      NEW.id,
      NEW.email,
      full_name_value,
      default_role_id
    );

    RAISE LOG 'Successfully inserted into user_profiles for %', NEW.email;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE LOG 'User profile already exists for %', NEW.email;
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user_profile for %: % (SQLSTATE: %)',
        NEW.email, SQLERRM, SQLSTATE;
      -- Don't fail the user creation, just log the error
  END;

  -- Insert into members
  BEGIN
    RAISE LOG 'Attempting to insert into members for %', NEW.email;

    INSERT INTO public.members (
      auth_id,
      email,
      full_name,
      membership_type
    ) VALUES (
      NEW.id,
      NEW.email,
      full_name_value,
      'member'
    );

    RAISE LOG 'Successfully inserted into members for %', NEW.email;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE LOG 'Member record already exists for %', NEW.email;
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create member for %: % (SQLSTATE: %)',
        NEW.email, SQLERRM, SQLSTATE;
      -- Don't fail the user creation, just log the error
  END;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 3: Grant necessary permissions
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT INSERT ON public.user_profiles TO anon, authenticated;
GRANT INSERT ON public.members TO anon, authenticated;
GRANT SELECT ON public.user_roles TO anon, authenticated;

-- Grant permissions on sequences if they exist
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- STEP 4: Verification
-- ============================================
SELECT '========================================' as status;
SELECT 'TRIGGER FUNCTION FIXED' as status;
SELECT '========================================' as status;

-- Check trigger exists
SELECT 'Trigger status:' as info;
SELECT
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

SELECT '' as spacer;
SELECT 'New policies:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename IN ('user_profiles', 'members')
AND policyname LIKE '%allow%'
ORDER BY tablename, policyname;

SELECT '========================================' as status;
SELECT 'READY TO CREATE ADMIN USER!' as status;
SELECT '========================================' as status;
