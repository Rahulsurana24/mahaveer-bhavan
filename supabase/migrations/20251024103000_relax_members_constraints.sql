-- Relax NOT NULL constraints on members table
-- Users signing up won't have all information initially

ALTER TABLE members
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN address DROP NOT NULL,
ALTER COLUMN date_of_birth DROP NOT NULL,
ALTER COLUMN photo_url DROP NOT NULL,
ALTER COLUMN emergency_contact DROP NOT NULL,
ALTER COLUMN membership_type SET DEFAULT 'member';

-- Update membership_type check constraint to include 'member'
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_membership_type_check;
ALTER TABLE members ADD CONSTRAINT members_membership_type_check
  CHECK (membership_type = ANY (ARRAY['Trustee'::text, 'Tapasvi'::text, 'Karyakarta'::text, 'Labharti'::text, 'Extra'::text, 'member'::text]));

-- Now retry the sync
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

-- Verification
DO $$
DECLARE
  user_count INTEGER;
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO member_count FROM members;

  RAISE NOTICE '✅ Members constraints relaxed';
  RAISE NOTICE 'Auth users: %, Members: %', user_count, member_count;

  IF user_count = member_count THEN
    RAISE NOTICE '✅ All auth users have corresponding member entries';
  ELSE
    RAISE NOTICE '⚠️  Mismatch: % auth users but % members', user_count, member_count;
  END IF;
END $$;
