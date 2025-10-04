-- Update RLS policies for trip tables to use new security definer functions
-- Update trip_assignments policies
DROP POLICY IF EXISTS "Admins can manage trip assignments" ON trip_assignments;
DROP POLICY IF EXISTS "Members can view own trip assignments" ON trip_assignments;

CREATE POLICY "Admins can manage trip assignments"
  ON trip_assignments FOR ALL
  TO authenticated
  USING (is_admin_role(auth.uid()));

CREATE POLICY "Members can view own trip assignments"
  ON trip_assignments FOR SELECT
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE auth_id = auth.uid()
  ));

-- Update trip_attendance policies
DROP POLICY IF EXISTS "Admins can manage trip attendance" ON trip_attendance;
DROP POLICY IF EXISTS "Members can view own attendance" ON trip_attendance;

CREATE POLICY "Admins can manage trip attendance"
  ON trip_attendance FOR ALL
  TO authenticated
  USING (is_admin_role(auth.uid()));

CREATE POLICY "Members can view own attendance"
  ON trip_attendance FOR SELECT
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE auth_id = auth.uid()
  ));

-- Update trip_documents policies
DROP POLICY IF EXISTS "Admins can manage trip documents" ON trip_documents;
DROP POLICY IF EXISTS "Registered members can view trip documents" ON trip_documents;

CREATE POLICY "Admins can manage trip documents"
  ON trip_documents FOR ALL
  TO authenticated
  USING (is_admin_role(auth.uid()));

CREATE POLICY "Registered members can view trip documents"
  ON trip_documents FOR SELECT
  TO authenticated
  USING (trip_id IN (
    SELECT trip_id FROM trip_registrations 
    WHERE member_id IN (
      SELECT id FROM members WHERE auth_id = auth.uid()
    )
  ));