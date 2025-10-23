-- Attendance and Calendar System Migrations
-- Created: 2025-10-23

-- ====================================================================
-- ATTENDANCE SYSTEM TABLES
-- ====================================================================

-- Attendance Items Configuration (managed by management_admin)
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
-- CALENDAR SYSTEM TABLES
-- ====================================================================

-- Calendar Events (for both admin and members)
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
  reference_id uuid, -- Can link to events or trips table
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for calendar queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_visible ON calendar_events(visible_to_members);

-- ====================================================================
-- ROW LEVEL SECURITY POLICIES
-- ====================================================================

-- Enable RLS
ALTER TABLE attendance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

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
      SELECT id FROM members WHERE email = (
        SELECT email FROM user_profiles WHERE auth_id = auth.uid()
      )
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

-- ====================================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ====================================================================

-- Update timestamp trigger function (create if doesn't exist)
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
-- SAMPLE DATA (Optional)
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
-- STATISTICS VIEWS (Optional - for performance)
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
