-- PRODUCTION READY MIGRATION - COMPLETE SYSTEM
-- Created: 2025-10-23
-- This migration includes ALL fixes and features for production deployment

-- ====================================================================
-- PART 1: FIX CUSTOM FORM FIELDS TABLE
-- ====================================================================

-- Add missing columns to custom_form_fields
ALTER TABLE custom_form_fields
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS required boolean DEFAULT false;

-- Update any existing is_required column to required
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'custom_form_fields'
               AND column_name = 'is_required') THEN
        ALTER TABLE custom_form_fields RENAME COLUMN is_required TO required;
    END IF;
END $$;

-- ====================================================================
-- PART 2: ATTENDANCE SYSTEM TABLES
-- ====================================================================

-- Attendance Items Configuration
CREATE TABLE IF NOT EXISTS attendance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES attendance_items(id) ON DELETE CASCADE,
  marked_by uuid REFERENCES user_profiles(id),
  marked_at timestamp with time zone DEFAULT now(),
  scan_method text NOT NULL CHECK (scan_method IN ('qr_scan', 'manual')),
  notes text,
  UNIQUE(member_id, item_id, DATE(marked_at))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_member ON attendance_records(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_item ON attendance_records(item_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(DATE(marked_at));
CREATE INDEX IF NOT EXISTS idx_attendance_items_active ON attendance_items(is_active);

-- ====================================================================
-- PART 3: CALENDAR SYSTEM TABLES
-- ====================================================================

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('trip', 'event', 'upvas', 'biyashna', 'holiday', 'custom')),
  event_date date NOT NULL,
  end_date date,
  color text DEFAULT '#10b981',
  is_holiday boolean DEFAULT false,
  visible_to_members boolean DEFAULT true,
  reference_id uuid,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for calendar
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_visible ON calendar_events(visible_to_members);

-- ====================================================================
-- PART 4: NOTIFICATION SYSTEM
-- ====================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement')),
  link text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ====================================================================
-- PART 5: IMPORT LOGS
-- ====================================================================

CREATE TABLE IF NOT EXISTS import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type text NOT NULL CHECK (import_type IN ('members', 'trip_allocations', 'bulk_messaging')),
  file_name text NOT NULL,
  total_rows integer NOT NULL,
  successful_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  error_details jsonb,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
  imported_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_import_logs_type ON import_logs(import_type);
CREATE INDEX IF NOT EXISTS idx_import_logs_imported_by ON import_logs(imported_by);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at DESC);

-- ====================================================================
-- PART 6: MESSAGE ATTACHMENTS
-- ====================================================================

CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_log_id uuid NOT NULL REFERENCES message_logs(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_log ON message_attachments(message_log_id);

-- ====================================================================
-- PART 7: GALLERY ENHANCEMENTS
-- ====================================================================

-- Add storage columns to gallery_items if they don't exist
ALTER TABLE gallery_items
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS mime_type text;

-- ====================================================================
-- PART 8: ROW LEVEL SECURITY POLICIES
-- ====================================================================

-- Enable RLS
ALTER TABLE attendance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Attendance Items Policies
DROP POLICY IF EXISTS "Anyone can view active attendance items" ON attendance_items;
CREATE POLICY "Anyone can view active attendance items"
  ON attendance_items FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage attendance items" ON attendance_items;
CREATE POLICY "Admins can manage attendance items"
  ON attendance_items FOR ALL
  TO authenticated
  USING (public.is_admin_role(auth.uid()))
  WITH CHECK (public.is_admin_role(auth.uid()));

-- Attendance Records Policies
DROP POLICY IF EXISTS "Members can view their own attendance" ON attendance_records;
CREATE POLICY "Members can view their own attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
    OR public.is_admin_role(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can create attendance records" ON attendance_records;
CREATE POLICY "Admins can create attendance records"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all attendance records" ON attendance_records;
CREATE POLICY "Admins can view all attendance records"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (public.is_admin_role(auth.uid()));

-- Calendar Events Policies
DROP POLICY IF EXISTS "Members can view visible calendar events" ON calendar_events;
CREATE POLICY "Members can view visible calendar events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (visible_to_members = true OR public.is_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage calendar events" ON calendar_events;
CREATE POLICY "Admins can manage calendar events"
  ON calendar_events FOR ALL
  TO authenticated
  USING (public.is_admin_role(auth.uid()))
  WITH CHECK (public.is_admin_role(auth.uid()));

-- Notification Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  ))
  WITH CHECK (user_id IN (
    SELECT id FROM user_profiles WHERE auth_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete notifications" ON notifications;
CREATE POLICY "Admins can delete notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (public.is_admin_role(auth.uid()));

-- Import Logs Policies
DROP POLICY IF EXISTS "Admins can view import logs" ON import_logs;
CREATE POLICY "Admins can view import logs"
  ON import_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can create import logs" ON import_logs;
CREATE POLICY "Admins can create import logs"
  ON import_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can update import logs" ON import_logs;
CREATE POLICY "Admins can update import logs"
  ON import_logs FOR UPDATE
  TO authenticated
  USING (public.is_admin_role(auth.uid()));

-- Message Attachments Policies
DROP POLICY IF EXISTS "Admins can manage message attachments" ON message_attachments;
CREATE POLICY "Admins can manage message attachments"
  ON message_attachments FOR ALL
  TO authenticated
  USING (public.is_admin_role(auth.uid()));

-- ====================================================================
-- PART 9: HELPER FUNCTIONS
-- ====================================================================

-- Function to create notification for user
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'info',
  p_link text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for all members
CREATE OR REPLACE FUNCTION create_notification_for_all_members(
  p_title text,
  p_message text,
  p_type text DEFAULT 'announcement',
  p_link text DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT up.id, p_title, p_message, p_type, p_link
  FROM user_profiles up
  INNER JOIN user_roles ur ON up.role_id = ur.id
  WHERE ur.name = 'member';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id
  AND user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid());

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
  AND is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- PART 10: TRIGGERS
-- ====================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_attendance_items_updated_at ON attendance_items;
CREATE TRIGGER update_attendance_items_updated_at
  BEFORE UPDATE ON attendance_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- PART 11: SAMPLE DATA
-- ====================================================================

-- Insert sample attendance items
INSERT INTO attendance_items (item_name, description, is_active) VALUES
('Kit Distribution', 'Monthly kit distribution for members', true),
('Gift Distribution', 'Festive gifts for members', true),
('Prasad Distribution', 'Prasad after satsang', true),
('Book Distribution', 'Spiritual books and literature', true)
ON CONFLICT DO NOTHING;

-- Insert sample calendar events
INSERT INTO calendar_events (title, description, event_type, event_date, color, is_holiday, visible_to_members) VALUES
('Mahaveer Jayanti', 'Birth anniversary of Lord Mahaveer', 'holiday', '2025-04-10', '#f59e0b', true, true),
('Monthly Satsang', 'Regular monthly spiritual gathering', 'event', CURRENT_DATE + INTERVAL '7 days', '#10b981', false, true),
('Upvas Day', 'Fasting day for spiritual practice', 'upvas', CURRENT_DATE + INTERVAL '14 days', '#8b5cf6', false, true)
ON CONFLICT DO NOTHING;

-- ====================================================================
-- PART 12: STATISTICS VIEWS
-- ====================================================================

CREATE OR REPLACE VIEW attendance_stats AS
SELECT
  i.id as item_id,
  i.item_name,
  COUNT(DISTINCT r.member_id) as total_members,
  COUNT(r.id) as total_records,
  DATE(r.marked_at) as attendance_date
FROM attendance_items i
LEFT JOIN attendance_records r ON i.id = r.item_id
GROUP BY i.id, i.item_name, DATE(r.marked_at);

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================

-- After running this migration:
-- 1. Create storage buckets: 'gallery' (public) and 'messaging-attachments' (private)
-- 2. Configure storage bucket policies (see STORAGE_BUCKETS_SETUP.md)
-- 3. Test all features systematically
-- 4. Deploy application
