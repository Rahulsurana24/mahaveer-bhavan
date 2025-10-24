# Create Admin User - Step by Step Guide

## Option 1: Using Supabase Dashboard (Recommended)

### Step 1: Create Auth User
1. Go to https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/auth/users
2. Click **"Add user"** button
3. Fill in:
   - **Email**: `admin@mahaveer.com` (or your preferred admin email)
   - **Password**: Create a strong password (save it!)
   - **Auto Confirm User**: ✅ Check this box (important!)
4. Click **"Create user"**
5. **Copy the User ID** that appears in the users list

### Step 2: Update User Profile to Admin Role
1. Go to https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/editor
2. Click on **"user_profiles"** table
3. Find the row with the auth_id matching your new user's ID
4. Click to edit the row
5. Change `role_id` to the ID of the 'superadmin' role (usually 1 or 2)
   - To find the role ID: Look at the **"user_roles"** table
   - Find the row where `name = 'superadmin'`
   - Use that ID
6. Click **Save**

### Step 3: Test Login
1. Go to your app: https://mahaveer-bhavan.netlify.app/admin-auth
2. Use the admin email and password you created
3. Check browser console (F12) for detailed logs

---

## Option 2: Using SQL (Faster)

Run this in Supabase SQL Editor:

```sql
-- First, get the role IDs
SELECT id, name FROM user_roles;

-- Create auth user (you'll need to do this via Dashboard or API)
-- After creating the auth user, get their ID and run:

-- Update the profile to be superadmin (replace USER_ID_HERE)
UPDATE user_profiles
SET role_id = (SELECT id FROM user_roles WHERE name = 'superadmin')
WHERE auth_id = 'USER_ID_HERE';

-- Verify the update
SELECT
  up.id,
  up.email,
  up.full_name,
  ur.name as role
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
WHERE up.auth_id = 'USER_ID_HERE';
```

---

## Option 3: Create Admin via Supabase API (Automated)

If you want me to create a script that does this automatically, I can create a Node.js script that:
1. Creates the auth user using Supabase Admin API
2. Automatically updates the profile to admin role
3. Validates the setup

Would you like me to create this automated script?

---

## Troubleshooting

### Issue: "Unable to verify admin credentials"
**Causes:**
1. User profile doesn't have admin role_id
2. RLS policies are blocking the query
3. user_roles table relationship is broken

**Fix:**
Run the `setup-database.sql` script first to fix RLS policies:
```bash
# In Supabase Dashboard > SQL Editor
# Copy and paste contents of scripts/setup-database.sql
# Click "Run"
```

### Issue: Can't find user_profiles row
**Cause:** The database trigger didn't create the profile automatically

**Fix:**
```sql
-- Manually create the profile
INSERT INTO user_profiles (auth_id, email, full_name, role_id)
VALUES (
  'AUTH_USER_ID_HERE',
  'admin@mahaveer.com',
  'Admin User',
  (SELECT id FROM user_roles WHERE name = 'superadmin')
);
```

---

## Current Credentials
- **Supabase URL**: https://juvrytwhtivezeqrmtpq.supabase.co
- **Project ID**: juvrytwhtivezeqrmtpq
- **Database**: postgresql://postgres:s3GVV2zOmFjT2aH4@db.juvrytwhtivezeqrmtpq.supabase.co:5432/postgres

## Recommended Admin Credentials (for testing)
- **Email**: admin@mahaveer.com
- **Password**: (Create a strong one like: AdminMahaveer2025!)
