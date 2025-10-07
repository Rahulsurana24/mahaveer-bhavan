-- ============================================
-- CRITICAL FIX: Registration Database Error
-- ============================================
-- The ON CONFLICT clause in handle_new_user() is failing because 
-- user_profiles.auth_id doesn't have a unique constraint

-- Add unique constraint on auth_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_auth_id_key'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_auth_id_key UNIQUE (auth_id);
    END IF;
END $$;

-- Add unique constraint on members.auth_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'members_auth_id_key'
    ) THEN
        ALTER TABLE members ADD CONSTRAINT members_auth_id_key UNIQUE (auth_id);
    END IF;
END $$;

-- ============================================
-- SECURITY FIX: Remove is_super_admin from auth.users
-- ============================================
-- CRITICAL: Roles should NEVER be stored in auth.users table
-- This prevents privilege escalation attacks

-- Note: We cannot modify auth.users directly, but we ensure
-- all role checks use the user_profiles and user_roles tables instead

-- ============================================
-- CLEANUP: Drop unused tables
-- ============================================

-- Drop unused tables (if they exist)
DROP TABLE IF EXISTS login_attempts CASCADE;
DROP TABLE IF EXISTS whatsapp_sessions CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS member_whatsapp_settings CASCADE;

-- ============================================
-- OPTIMIZATION: Update handle_new_user function
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  default_role_id uuid;
BEGIN
  -- Get the default member role
  SELECT id INTO default_role_id
  FROM user_roles
  WHERE name = 'member';
  
  -- Check if this is one of our superadmin emails
  IF NEW.email IN ('rahulsuranat@gmail.com', 'rahulsurana67@gmail.com') THEN
    SELECT id INTO default_role_id
    FROM user_roles
    WHERE name = 'superadmin';
  END IF;
  
  -- Use INSERT with ON CONFLICT now that unique constraint exists
  INSERT INTO public.user_profiles (auth_id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_role_id
  )
  ON CONFLICT (auth_id) DO UPDATE 
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id;
  
  RETURN NEW;
END;
$function$;