-- Update members table structure to match the new registration form
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS middle_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS street_address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS country text;

-- Update the trigger to handle member creation from user profiles
CREATE OR REPLACE FUNCTION create_member_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_member_id text;
BEGIN
  -- Generate member ID based on membership type
  SELECT generate_member_id(COALESCE(NEW.raw_user_meta_data->>'membership_type', 'Extra'))
  INTO new_member_id;
  
  -- Create member record if user has required metadata
  IF NEW.raw_user_meta_data ? 'full_name' THEN
    INSERT INTO members (
      id,
      auth_id,
      full_name,
      first_name,
      middle_name,
      last_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      street_address,
      city,
      state,
      postal_code,
      country,
      membership_type,
      emergency_contact,
      photo_url,
      status
    ) VALUES (
      new_member_id,
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'middle_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      CASE 
        WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
        THEN (NEW.raw_user_meta_data->>'date_of_birth')::date 
        ELSE NULL 
      END,
      NEW.raw_user_meta_data->>'gender',
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'street_address',
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'state',
      NEW.raw_user_meta_data->>'postal_code',
      NEW.raw_user_meta_data->>'country',
      COALESCE(NEW.raw_user_meta_data->>'membership_type', 'Extra'),
      CASE 
        WHEN NEW.raw_user_meta_data ? 'emergency_contact' 
        THEN (NEW.raw_user_meta_data->>'emergency_contact')::jsonb
        ELSE '{}'::jsonb
      END,
      '/placeholder.svg',
      'active'
    ) ON CONFLICT (auth_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create member records
DROP TRIGGER IF EXISTS on_auth_user_create_member ON auth.users;
CREATE TRIGGER on_auth_user_create_member
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_member_from_profile();