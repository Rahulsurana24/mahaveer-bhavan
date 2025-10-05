-- Remove all sample/seed data from tables
-- This ensures a clean database with no test data

-- Clear all notifications (sample data)
DELETE FROM notifications WHERE id IS NOT NULL;

-- Clear all messages (sample data)
DELETE FROM messages WHERE id IS NOT NULL;

-- Clear all gallery items (sample data)
DELETE FROM gallery_items WHERE id IS NOT NULL;

-- Clear all donations (sample data)
DELETE FROM donations WHERE id IS NOT NULL;

-- Clear all event registrations (sample data)
DELETE FROM event_registrations WHERE id IS NOT NULL;

-- Clear all events (sample data)
DELETE FROM events WHERE id IS NOT NULL;

-- Clear all trip related data (sample data)
DELETE FROM trip_documents WHERE id IS NOT NULL;
DELETE FROM trip_attendance WHERE id IS NOT NULL;
DELETE FROM trip_assignments WHERE id IS NOT NULL;
DELETE FROM trip_registrations WHERE id IS NOT NULL;
DELETE FROM trips WHERE id IS NOT NULL;

-- Keep members, user_profiles, and user_roles tables intact
-- as they contain user account data

COMMENT ON SCHEMA public IS 'All sample/seed data has been removed. Database is clean and ready for production use.';