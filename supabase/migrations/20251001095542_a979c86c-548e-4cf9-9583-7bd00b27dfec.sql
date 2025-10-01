-- Enhance trips table with all required fields
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS target_audience text[] DEFAULT ARRAY['Karyakarta', 'Labharti', 'Tapasvi', 'Trustee', 'Extra'],
ADD COLUMN IF NOT EXISTS registration_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS registration_deadline date,
ADD COLUMN IF NOT EXISTS image_url text;

-- Create trip_assignments table for room/seat allocations
CREATE TABLE IF NOT EXISTS trip_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  member_id text REFERENCES members(id) ON DELETE CASCADE,
  room_number text,
  bus_seat_number text,
  train_seat_number text,
  pnr_number text,
  flight_ticket_number text,
  additional_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(trip_id, member_id)
);

-- Enable RLS on trip_assignments
ALTER TABLE trip_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for trip_assignments
CREATE POLICY "Admins can manage trip assignments"
ON trip_assignments FOR ALL
USING (is_user_admin(auth.uid()));

CREATE POLICY "Members can view own trip assignments"
ON trip_assignments FOR SELECT
USING (member_id IN (
  SELECT id FROM members WHERE auth_id = auth.uid()
));

-- Create trip_documents table
CREATE TABLE IF NOT EXISTS trip_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on trip_documents
ALTER TABLE trip_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for trip_documents
CREATE POLICY "Admins can manage trip documents"
ON trip_documents FOR ALL
USING (is_user_admin(auth.uid()));

CREATE POLICY "Registered members can view trip documents"
ON trip_documents FOR SELECT
USING (
  trip_id IN (
    SELECT trip_id FROM trip_registrations 
    WHERE member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  )
);

-- Create trip_attendance table
CREATE TABLE IF NOT EXISTS trip_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  member_id text REFERENCES members(id) ON DELETE CASCADE,
  attended boolean DEFAULT false,
  marked_at timestamp with time zone,
  marked_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(trip_id, member_id)
);

-- Enable RLS on trip_attendance
ALTER TABLE trip_attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for trip_attendance
CREATE POLICY "Admins can manage trip attendance"
ON trip_attendance FOR ALL
USING (is_user_admin(auth.uid()));

CREATE POLICY "Members can view own attendance"
ON trip_attendance FOR SELECT
USING (member_id IN (
  SELECT id FROM members WHERE auth_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_trip_assignments_updated_at
  BEFORE UPDATE ON trip_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_documents_updated_at
  BEFORE UPDATE ON trip_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();