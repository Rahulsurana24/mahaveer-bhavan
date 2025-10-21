-- ============================================
-- TRIP ASSIGNMENT SYSTEM ENHANCEMENTS
-- ============================================
-- Adds template-based assignment system with custom fields

-- STEP 1: Add assignment template support to trips table
-- ============================================

-- Create enum for assignment templates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_template_type') THEN
        CREATE TYPE assignment_template_type AS ENUM ('bus', 'train', 'flight', 'hotel', 'none');
    END IF;
END $$;

-- Add columns to trips table
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS assignment_template assignment_template_type DEFAULT 'none',
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN trips.assignment_template IS 'Template type for trip assignments (bus, train, flight, hotel, none)';
COMMENT ON COLUMN trips.custom_fields IS 'Array of custom field definitions: [{name, type, required}]';

-- STEP 2: Enhance trip_assignments table with flexible assignment_data
-- ============================================

-- Add assignment_data column for flexible field storage
ALTER TABLE trip_assignments
ADD COLUMN IF NOT EXISTS assignment_data jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN trip_assignments.assignment_data IS 'Flexible JSON storage for all assignment fields (template + custom)';

-- STEP 3: Create function to get template fields
-- ============================================

CREATE OR REPLACE FUNCTION get_template_fields(template_type assignment_template_type)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE template_type
    WHEN 'bus' THEN
      '[{"name":"seat_number","type":"text","label":"Seat Number","required":true}]'::jsonb
    WHEN 'train' THEN
      '[{"name":"coach_number","type":"text","label":"Coach Number","required":true},
        {"name":"berth_number","type":"text","label":"Berth Number","required":true},
        {"name":"pnr","type":"text","label":"PNR Number","required":true}]'::jsonb
    WHEN 'flight' THEN
      '[{"name":"flight_number","type":"text","label":"Flight Number","required":true},
        {"name":"seat_number","type":"text","label":"Seat Number","required":true},
        {"name":"pnr","type":"text","label":"PNR Number","required":true},
        {"name":"terminal","type":"text","label":"Terminal","required":false}]'::jsonb
    WHEN 'hotel' THEN
      '[{"name":"room_number","type":"text","label":"Room Number","required":true},
        {"name":"room_type","type":"text","label":"Room Type","required":false},
        {"name":"floor","type":"number","label":"Floor","required":false}]'::jsonb
    ELSE '[]'::jsonb
  END;
END;
$$;

COMMENT ON FUNCTION get_template_fields IS 'Returns field definitions for a given assignment template type';

-- STEP 4: Create view for assignments with member details
-- ============================================

CREATE OR REPLACE VIEW trip_assignments_with_members AS
SELECT
  ta.id,
  ta.trip_id,
  ta.member_id,
  ta.assignment_data,
  ta.created_at,
  ta.updated_at,
  m.full_name,
  m.email,
  m.phone,
  m.photo_url,
  m.membership_type,
  tr.registered_at,
  tr.registration_status
FROM trip_assignments ta
JOIN members m ON ta.member_id = m.id
LEFT JOIN trip_registrations tr ON ta.trip_id = tr.trip_id AND ta.member_id = tr.member_id;

COMMENT ON VIEW trip_assignments_with_members IS 'Trip assignments with member details for display';

-- STEP 5: Grant permissions
-- ============================================

GRANT SELECT ON trip_assignments_with_members TO authenticated;
GRANT EXECUTE ON FUNCTION get_template_fields TO authenticated;
