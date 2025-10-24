-- Comprehensive fix for all critical database issues
-- Fixes: admin creation, attendance marking, calendar events

-- ============================================
-- FIX 1: Improve handle_new_user trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_role_id uuid;
  v_superadmin_role_id uuid;
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

  -- Create user profile
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
    full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FIX 2: Admin creation - fix RLS policies
-- ============================================

-- Allow admins to insert new user_profiles
DROP POLICY IF EXISTS "Admins can create profiles" ON user_profiles;
CREATE POLICY "Admins can create profiles"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- Allow admins to update any profile
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
CREATE POLICY "Admins can update profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- Allow admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  auth_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin', 'view_only_admin')
  )
);

-- ============================================
-- FIX 3: Attendance marking - ensure tables exist
-- ============================================

-- Create attendance_items table if not exists
CREATE TABLE IF NOT EXISTS attendance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id)
);

-- Enable RLS
ALTER TABLE attendance_items ENABLE ROW LEVEL SECURITY;

-- Policies for attendance_items
DROP POLICY IF EXISTS "Anyone can view active items" ON attendance_items;
CREATE POLICY "Anyone can view active items"
ON attendance_items FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage items" ON attendance_items;
CREATE POLICY "Admins manage items"
ON attendance_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- Create attendance_records table if not exists
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_item_id uuid REFERENCES attendance_items(id) ON DELETE CASCADE,
  member_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('present', 'absent', 'late')),
  marked_at timestamp with time zone DEFAULT now(),
  marked_by uuid REFERENCES user_profiles(id),
  notes text,
  UNIQUE(attendance_item_id, member_id)
);

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Policies for attendance_records
DROP POLICY IF EXISTS "Users view own attendance" ON attendance_records;
CREATE POLICY "Users view own attendance"
ON attendance_records FOR SELECT
TO authenticated
USING (
  member_id = (SELECT id FROM user_profiles WHERE auth_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin', 'view_only_admin')
  )
);

DROP POLICY IF EXISTS "Admins manage attendance" ON attendance_records;
CREATE POLICY "Admins manage attendance"
ON attendance_records FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- ============================================
-- FIX 4: Calendar events - ensure table exists
-- ============================================

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  location text,
  event_type text,
  status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),
  max_participants integer,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policies for events
DROP POLICY IF EXISTS "Anyone can view published events" ON events;
CREATE POLICY "Anyone can view published events"
ON events FOR SELECT
TO authenticated
USING (status = 'published');

DROP POLICY IF EXISTS "Admins manage events" ON events;
CREATE POLICY "Admins manage events"
ON events FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- Create event_registrations table if not exists
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  registered_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, member_id)
);

-- Enable RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Policies for event_registrations
DROP POLICY IF EXISTS "Users view own registrations" ON event_registrations;
CREATE POLICY "Users view own registrations"
ON event_registrations FOR SELECT
TO authenticated
USING (
  member_id = (SELECT id FROM user_profiles WHERE auth_id = auth.uid()) OR
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
WITH CHECK (member_id = (SELECT id FROM user_profiles WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage registrations" ON event_registrations;
CREATE POLICY "Admins manage registrations"
ON event_registrations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- ============================================
-- FIX 5: Create indexes for better performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_attendance_items_date ON attendance_items(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_item ON attendance_records(attendance_item_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_member ON attendance_records(member_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_member ON event_registrations(member_id);

-- ============================================
-- FIX 6: Grant necessary permissions
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_registrations TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE 'Tables created/verified: attendance_items, attendance_records, events, event_registrations';
  RAISE NOTICE 'RLS policies updated for: user_profiles, attendance_items, attendance_records, events, event_registrations';
  RAISE NOTICE 'Trigger handle_new_user recreated with better error handling';
END $$;
