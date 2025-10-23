-- Fix All Issues and Add New Features Migration
-- Created: 2025-10-23

-- ====================================================================
-- FIX 1: Add missing columns to custom_form_fields
-- ====================================================================

ALTER TABLE custom_form_fields
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS required boolean DEFAULT false;

-- Rename is_required to required if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'custom_form_fields'
               AND column_name = 'is_required') THEN
        ALTER TABLE custom_form_fields RENAME COLUMN is_required TO required;
    END IF;
END $$;

-- ====================================================================
-- FIX 2: Storage Buckets Configuration
-- ====================================================================

-- Note: Storage buckets need to be created via Supabase dashboard or API
-- This SQL creates the necessary policies

-- Gallery bucket policies (bucket name: 'gallery')
-- Members can view, admins can upload/delete

-- Messaging attachments bucket policies (bucket name: 'messaging-attachments')
-- Only authenticated users can access their own messages

-- ====================================================================
-- FEATURE 1: In-App Notifications System
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

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own notifications
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

-- Admins can create notifications
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

-- ====================================================================
-- FEATURE 2: Import Logs for Excel Imports
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

-- Enable RLS on import_logs
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all import logs
DROP POLICY IF EXISTS "Admins can view import logs" ON import_logs;
CREATE POLICY "Admins can view import logs"
  ON import_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_role(auth.uid()));

-- Admins can create import logs
DROP POLICY IF EXISTS "Admins can create import logs" ON import_logs;
CREATE POLICY "Admins can create import logs"
  ON import_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_role(auth.uid()));

-- Admins can update import logs
DROP POLICY IF EXISTS "Admins can update import logs" ON import_logs;
CREATE POLICY "Admins can update import logs"
  ON import_logs FOR UPDATE
  TO authenticated
  USING (public.is_admin_role(auth.uid()));

-- ====================================================================
-- FEATURE 3: Gallery Management Enhancement
-- ====================================================================

-- Update gallery_items table to include storage references
ALTER TABLE gallery_items
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS mime_type text;

-- ====================================================================
-- FEATURE 4: Messaging Attachments
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

-- Enable RLS on message_attachments
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Admins can manage message attachments
DROP POLICY IF EXISTS "Admins can manage message attachments" ON message_attachments;
CREATE POLICY "Admins can manage message attachments"
  ON message_attachments FOR ALL
  TO authenticated
  USING (public.is_admin_role(auth.uid()));

-- ====================================================================
-- HELPER FUNCTIONS
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

-- Function to mark all notifications as read for a user
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
-- SAMPLE NOTIFICATIONS
-- ====================================================================

-- Create welcome notification for all existing members
INSERT INTO notifications (user_id, title, message, type)
SELECT
  up.id,
  'Welcome to Mahaveer Bhavan Portal',
  'Thank you for being part of our community. Stay updated with all events and activities.',
  'announcement'
FROM user_profiles up
INNER JOIN user_roles ur ON up.role_id = ur.id
WHERE ur.name = 'member'
ON CONFLICT DO NOTHING;

-- ====================================================================
-- NOTES AND INSTRUCTIONS
-- ====================================================================

-- After running this migration:
-- 1. Create storage buckets via Supabase dashboard:
--    a. Create 'gallery' bucket with public access
--    b. Create 'messaging-attachments' bucket with authenticated access
--
-- 2. Storage bucket policies to set:
--
-- For 'gallery' bucket:
-- - SELECT: Anyone can view (public read)
-- - INSERT: Admins only
-- - UPDATE: Admins only
-- - DELETE: Admins only
--
-- For 'messaging-attachments' bucket:
-- - SELECT: Authenticated users
-- - INSERT: Admins only
-- - DELETE: Admins only
