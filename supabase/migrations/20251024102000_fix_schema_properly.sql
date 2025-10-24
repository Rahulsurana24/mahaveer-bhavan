-- Fix schema properly based on actual table structures
-- The system has both 'members' and 'user_profiles' tables
-- members = actual member data with TEXT ids
-- user_profiles = auth/permissions with UUID ids

-- ============================================
-- FIX 1: Update handle_new_user to also create members entry
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_role_id uuid;
  v_superadmin_role_id uuid;
  v_user_profile_id uuid;
  v_member_id text;
BEGIN
  -- Get role IDs
  SELECT id INTO v_member_role_id FROM public.user_roles WHERE name = 'member' LIMIT 1;
  SELECT id INTO v_superadmin_role_id FROM public.user_roles WHERE name = 'superadmin' LIMIT 1;

  -- Ensure member role exists
  IF v_member_role_id IS NULL THEN
    INSERT INTO public.user_roles (name, description, permissions)
    VALUES ('member', 'Regular member', '{"read_profile": true}')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_member_role_id;
  END IF;

  -- Create user_profiles entry
  INSERT INTO public.user_profiles (
    auth_id,
    email,
    full_name,
    role_id,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    CASE
      WHEN NEW.email = 'rahulsuranat@gmail.com' THEN COALESCE(v_superadmin_role_id, v_member_role_id)
      ELSE v_member_role_id
    END,
    true
  )
  ON CONFLICT (auth_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name)
  RETURNING id INTO v_user_profile_id;

  -- Generate a unique member ID (format: MEM-YYYYMMDD-XXXX)
  v_member_id := 'MEM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');

  -- Create members entry if members table exists
  BEGIN
    INSERT INTO public.members (
      id,
      auth_id,
      email,
      full_name,
      membership_type,
      status,
      created_at
    )
    VALUES (
      v_member_id,
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1)
      ),
      'member',
      'active',
      NOW()
    )
    ON CONFLICT (auth_id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(members.full_name, EXCLUDED.full_name);
  EXCEPTION WHEN undefined_table THEN
    -- members table doesn't exist, skip
    NULL;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FIX 2: Fix attendance_records policies with correct types
-- ============================================

DROP POLICY IF EXISTS "Users view own attendance" ON attendance_records;
CREATE POLICY "Users view own attendance"
ON attendance_records FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id::text FROM members WHERE auth_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin', 'view_only_admin')
  )
);

-- ============================================
-- FIX 3: Fix events policies with correct column names
-- ============================================

DROP POLICY IF EXISTS "Anyone can view published events" ON events;
CREATE POLICY "Anyone can view published events"
ON events FOR SELECT
TO authenticated
USING (is_published = true);

DROP POLICY IF EXISTS "Users can view published events" ON events;

-- ============================================
-- FIX 4: Fix event_registrations policies with correct types
-- ============================================

DROP POLICY IF EXISTS "Users view own registrations" ON event_registrations;
CREATE POLICY "Users view own registrations"
ON event_registrations FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id::text FROM members WHERE auth_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin', 'view_only_admin')
  )
);

DROP POLICY IF EXISTS "Users can register for events" ON event_registrations;
CREATE POLICY "Users can register for events"
ON event_registrations FOR INSERT
TO authenticated
WITH CHECK (
  member_id IN (
    SELECT id::text FROM members WHERE auth_id = auth.uid()
  )
);

-- ============================================
-- FIX 5: Create proper indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_attendance_items_event_date ON attendance_items(event_date);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published);
CREATE INDEX IF NOT EXISTS idx_members_auth_id ON members(auth_id);

-- ============================================
-- FIX 6: Sync existing auth users to members table
-- ============================================

-- Insert missing members for existing auth users
INSERT INTO members (id, auth_id, email, full_name, membership_type, status)
SELECT
  'MEM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY au.created_at)::text, 4, '0'),
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    SPLIT_PART(au.email, '@', 1)
  ),
  'member',
  'active'
FROM auth.users au
LEFT JOIN members m ON m.auth_id = au.id
WHERE m.id IS NULL
AND au.email IS NOT NULL
ON CONFLICT (auth_id) DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON members TO authenticated, anon;
GRANT INSERT, UPDATE ON members TO authenticated;

-- Refresh schema
NOTIFY pgrst, 'reload schema';

-- Verification
DO $$
DECLARE
  user_count INTEGER;
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO member_count FROM members;

  RAISE NOTICE '✅ Schema fixes applied successfully';
  RAISE NOTICE 'Auth users: %, Members: %', user_count, member_count;
  RAISE NOTICE 'Trigger handle_new_user now creates both user_profiles and members entries';
END $$;
