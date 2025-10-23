-- ============================================
-- STORAGE BUCKETS SETUP
-- ============================================
-- This migration creates storage buckets for gallery and messaging
-- and sets up all necessary RLS policies

-- ============================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================

-- Create gallery bucket (public - anyone can view)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery',
  'gallery',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Create messaging-attachments bucket (private - only authenticated users)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messaging-attachments',
  'messaging-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. STORAGE POLICIES FOR GALLERY BUCKET
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Gallery images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON storage.objects;

-- Allow public read access to gallery
CREATE POLICY "Gallery images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

-- Allow authenticated users to upload to gallery
CREATE POLICY "Authenticated users can upload gallery images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gallery' AND
  (
    -- Check if user is an admin
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
    OR
    -- Or check if user is a member
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.status = 'active'
    )
  )
);

-- Allow admins to update gallery images
CREATE POLICY "Admins can update gallery images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gallery' AND
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- Allow admins to delete gallery images
CREATE POLICY "Admins can delete gallery images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'gallery' AND
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- ============================================
-- 3. STORAGE POLICIES FOR MESSAGING BUCKET
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all message attachments" ON storage.objects;

-- Allow users to view their own attachments (and admins to view all)
CREATE POLICY "Users can view their own message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'messaging-attachments' AND
  (
    -- File path starts with user's member ID
    (storage.foldername(name))[1] IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
    OR
    -- Or user is an admin
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  )
);

-- Allow authenticated users to upload attachments
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'messaging-attachments' AND
  -- File path must start with user's member ID
  (storage.foldername(name))[1] IN (
    SELECT id FROM members WHERE auth_id = auth.uid()
  )
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'messaging-attachments' AND
  (
    -- File path starts with user's member ID
    (storage.foldername(name))[1] IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
    OR
    -- Or user is an admin
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  )
);

-- ============================================
-- 4. CREATE MISSING TABLES
-- ============================================

-- Message attachments table (if not exists)
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Import logs table (if not exists)
CREATE TABLE IF NOT EXISTS import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type text NOT NULL CHECK (import_type IN ('members', 'trip_allocations', 'bulk_messaging')),
  file_name text NOT NULL,
  total_rows integer NOT NULL,
  successful_rows integer DEFAULT 0,
  failed_rows integer DEFAULT 0,
  error_details jsonb,
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  imported_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Attendance items table (if not exists)
CREATE TABLE IF NOT EXISTS attendance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  qr_code text UNIQUE,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Attendance records table (if not exists)
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_item_id uuid NOT NULL REFERENCES attendance_items(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES members(id),
  marked_at timestamp with time zone DEFAULT now(),
  marked_by uuid REFERENCES user_profiles(id),
  method text CHECK (method IN ('qr_scan', 'manual', 'bulk_import'))
);

-- Calendar events table (if not exists)
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  location text,
  event_type text NOT NULL CHECK (event_type IN ('event', 'trip', 'meeting', 'other')),
  related_id uuid,
  is_all_day boolean DEFAULT false,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Notifications table with proper user_id reference (updating the existing one)
DO $$
BEGIN
  -- Drop the existing notifications table and recreate with correct schema
  DROP TABLE IF EXISTS notifications CASCADE;

  CREATE TABLE notifications (
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

  -- Create index for faster queries
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
END $$;

-- ============================================
-- 5. RLS POLICIES FOR TABLES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Message Attachments Policies
DROP POLICY IF EXISTS "Users can view message attachments" ON message_attachments;
DROP POLICY IF EXISTS "Users can insert message attachments" ON message_attachments;

CREATE POLICY "Users can view message attachments"
ON message_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_attachments.message_id
    AND (
      m.sender_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
      OR m.receiver_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

CREATE POLICY "Users can insert message attachments"
ON message_attachments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_attachments.message_id
    AND m.sender_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
  )
);

-- Import Logs Policies
DROP POLICY IF EXISTS "Admins can view import logs" ON import_logs;
DROP POLICY IF EXISTS "Admins can insert import logs" ON import_logs;

CREATE POLICY "Admins can view import logs"
ON import_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

CREATE POLICY "Admins can insert import logs"
ON import_logs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- Attendance Items Policies
DROP POLICY IF EXISTS "Everyone can view attendance items" ON attendance_items;
DROP POLICY IF EXISTS "Admins can manage attendance items" ON attendance_items;

CREATE POLICY "Everyone can view attendance items"
ON attendance_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage attendance items"
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

-- Attendance Records Policies
DROP POLICY IF EXISTS "Users can view attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Users can mark attendance" ON attendance_records;

CREATE POLICY "Users can view attendance records"
ON attendance_records FOR SELECT
TO authenticated
USING (
  member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

CREATE POLICY "Users can mark attendance"
ON attendance_records FOR INSERT
TO authenticated
WITH CHECK (
  member_id IN (SELECT id FROM members WHERE auth_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- Calendar Events Policies
DROP POLICY IF EXISTS "Everyone can view calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Admins can manage calendar events" ON calendar_events;

CREATE POLICY "Everyone can view calendar events"
ON calendar_events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage calendar events"
ON calendar_events FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.auth_id = auth.uid()
    AND ur.name IN ('admin', 'superadmin', 'management_admin')
  )
);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid()));

CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
TO authenticated
USING (user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid()));

-- ============================================
-- 6. NOTIFICATION HELPER FUNCTIONS
-- ============================================

-- Function to create a notification for a specific user
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

-- Function to create notifications for all active members
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
  WHERE up.is_active = true
  AND EXISTS (
    SELECT 1 FROM members m
    WHERE m.auth_id = up.auth_id
    AND m.status = 'active'
  );

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

-- Function to mark all notifications as read for current user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_id = auth.uid())
  AND is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

-- Add description and required to custom_form_fields if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'custom_form_fields'
                 AND column_name = 'description') THEN
    ALTER TABLE custom_form_fields ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'custom_form_fields'
                 AND column_name = 'required') THEN
    ALTER TABLE custom_form_fields ADD COLUMN required boolean DEFAULT false;
  END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
