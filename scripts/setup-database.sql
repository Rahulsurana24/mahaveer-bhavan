-- ============================================
-- Mahaveer Bhavan Database Setup Script
-- ============================================
-- This script will:
-- 1. Check database structure
-- 2. Fix RLS policies for authentication
-- 3. Create admin user if needed
-- ============================================

-- First, let's check what we have
SELECT 'Checking user_profiles table...' as status;
SELECT COUNT(*) as profile_count FROM user_profiles;

SELECT 'Checking user_roles table...' as status;
SELECT * FROM user_roles ORDER BY id;

SELECT 'Checking existing profiles and their roles...' as status;
SELECT
  up.id,
  up.auth_id,
  up.email,
  up.full_name,
  ur.name as role_name
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
ORDER BY up.created_at DESC
LIMIT 10;

-- ============================================
-- Fix RLS Policies for Authentication
-- ============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Create new policies that allow authenticated users to query their profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN user_roles ur ON up.role_id = ur.id
      WHERE up.auth_id = auth.uid()
      AND ur.name IN ('admin', 'superadmin', 'management_admin')
    )
  );

-- ============================================
-- Check if we need to create admin role
-- ============================================
INSERT INTO user_roles (name, description)
VALUES
  ('superadmin', 'Super Administrator with full access'),
  ('admin', 'Administrator with management access'),
  ('management_admin', 'Management Administrator'),
  ('view_only_admin', 'View-only Administrator'),
  ('member', 'Regular Member')
ON CONFLICT (name) DO NOTHING;

SELECT 'User roles setup complete' as status;
SELECT * FROM user_roles;

-- ============================================
-- Instructions for creating admin user
-- ============================================
SELECT '
To create an admin user:
1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add user"
3. Enter email and password
4. After user is created, get the user ID from the Users table
5. Update the user_profiles table to set role_id to admin role ID

Or run this after creating auth user:
UPDATE user_profiles
SET role_id = (SELECT id FROM user_roles WHERE name = ''superadmin'')
WHERE email = ''your-admin-email@example.com'';
' as instructions;
