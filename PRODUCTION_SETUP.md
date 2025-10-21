# Production Setup Guide - Netlify Deployment

This guide will help you set up the superadmin user and configure your production deployment on Netlify.

## Issue: "Invalid Credentials" on Admin Login

If you're seeing "Invalid Credentials" when trying to log in as admin, it's because the superadmin user doesn't exist in your production database yet.

---

## Quick Fix (5 minutes)

### Step 1: Apply Migrations to Production

Your migrations need to be applied to your production Supabase database.

**Option A: Using Supabase Dashboard**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Run each migration file in order:

```sql
-- Run these in order:
-- 1. First, check if migrations are already applied
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

-- 2. If migrations are missing, you need to apply them manually
-- Copy and paste the contents of each migration file in order:
-- - 20251021000001_add_member_approval_system.sql
-- - 20251021000002_payment_configuration.sql
-- - 20251021000003_trip_assignment_enhancements.sql
-- - 20251021000004_system_logs.sql
-- - 20251021000005_reset_superadmin.sql
```

**Option B: Using Supabase CLI** (Recommended if you have it set up)

```bash
# Link to your production project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push

# Or apply specific migrations
npx supabase migration up
```

---

### Step 2: Create Superadmin User in Production

After migrations are applied, create the superadmin user:

#### Method 1: SQL in Supabase Dashboard (Easiest)

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
-- Step 1: Ensure setup functions exist
SELECT ensure_superadmin_setup();

-- Step 2: Clean up any existing user (if needed)
SELECT cleanup_superadmin('rahulsuranat@gmail.com');
```

3. Now go to your **production app** at your Netlify URL
4. Navigate to `/admin/auth`
5. Click "Sign Up" or "Register"
6. Enter:
   - **Email**: `rahulsuranat@gmail.com`
   - **Password**: `9480413653`
   - **Name**: `Super Admin`
7. Submit the form

The trigger will automatically assign superadmin role! ✅

#### Method 2: Using Supabase Auth Admin API

If you can't sign up through the UI, use the Admin API:

```bash
# Get your Service Role Key from:
# Supabase Dashboard → Project Settings → API → service_role (secret)

export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the reset script
node scripts/reset-superadmin.js
```

#### Method 3: Manual Creation in Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Invite User"
3. Enter:
   - Email: `rahulsuranat@gmail.com`
   - Check "Auto Confirm Email"
4. After user is created, go to SQL Editor and run:

```sql
-- Assign superadmin role to the user
SELECT create_superadmin_profile('rahulsuranat@gmail.com', 'Super Admin');
```

5. Now set the password:
   - Go back to Authentication → Users
   - Find the user
   - Click the three dots → "Reset Password"
   - Set password to: `9480413653`

---

### Step 3: Verify the Setup

1. **Check in SQL Editor:**

```sql
-- Verify user exists with superadmin role
SELECT
  up.email,
  up.full_name,
  ur.name as role,
  up.needs_password_change,
  up.created_at
FROM user_profiles up
JOIN user_roles ur ON up.role_id = ur.id
WHERE up.email = 'rahulsuranat@gmail.com';

-- Expected result:
-- email: rahulsuranat@gmail.com
-- role: superadmin
-- needs_password_change: false
```

2. **Test Login:**
   - Go to your Netlify URL: `https://your-app.netlify.app/admin/auth`
   - Log in with:
     - Email: `rahulsuranat@gmail.com`
     - Password: `9480413653`
   - Should successfully log in and redirect to `/admin/dashboard`

3. **Test Admin Access:**
   - Navigate to `/admin/admins` (Admin Management)
   - You should see the page (only superadmins have access)

---

## Troubleshooting

### Issue: "User already exists" during signup

**Solution:**
```sql
-- Delete the existing user
SELECT cleanup_superadmin('rahulsuranat@gmail.com');

-- Then sign up again through the UI
```

### Issue: "Trigger not found" error

**Solution:**
```sql
-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify it exists
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Issue: User created but doesn't have superadmin role

**Solution:**
```sql
-- Manually assign superadmin role
UPDATE user_profiles
SET role_id = (SELECT id FROM user_roles WHERE name = 'superadmin'),
    needs_password_change = false
WHERE email = 'rahulsuranat@gmail.com';
```

Then log out and log back in.

### Issue: Still getting "Invalid Credentials"

**Possible causes:**

1. **Migrations not applied**: Verify migrations are applied:
```sql
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

2. **Wrong Supabase project**: Verify your Netlify environment variables point to the correct Supabase project:
   - Check `VITE_SUPABASE_URL` in Netlify Environment Variables
   - Check `VITE_SUPABASE_ANON_KEY` in Netlify Environment Variables

3. **RLS policies blocking**: Temporarily disable RLS to test:
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('user_profiles', 'user_roles');

-- If needed, temporarily disable for testing (re-enable after!)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

4. **Email confirmation required**: Check auth settings:
   - Supabase Dashboard → Authentication → Settings
   - Look for "Enable email confirmations"
   - For development, you might want this disabled

---

## Environment Variables for Netlify

Make sure these are set in Netlify:

1. Go to Netlify Dashboard → Your Site → Site Configuration → Environment Variables

2. Add these variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

3. Get these values from:
   - Supabase Dashboard → Project Settings → API
   - URL: Project URL
   - anon/public: The `anon` `public` key

4. After adding/updating environment variables:
   - Trigger a new deploy in Netlify
   - Deploys → Trigger deploy → Deploy site

---

## Production Checklist

- [ ] Migrations applied to production database
- [ ] Superadmin user created (`rahulsuranat@gmail.com`)
- [ ] Superadmin role assigned correctly
- [ ] Can log in at `/admin/auth`
- [ ] Can access `/admin/admins` (Admin Management)
- [ ] Environment variables set in Netlify
- [ ] Latest code deployed to Netlify
- [ ] Password changed from default (security!)

---

## Security Recommendations

After getting the superadmin working:

1. **Change the default password immediately!**
   - Log in with `9480413653`
   - Go to Profile or Settings
   - Change to a strong password

2. **Enable Email Confirmation** (for production):
   - Supabase Dashboard → Authentication → Settings
   - Enable "Enable email confirmations"
   - Configure email templates

3. **Set up proper SMTP** (optional but recommended):
   - Supabase Dashboard → Project Settings → Auth
   - Configure SMTP for password reset emails

4. **Review RLS policies**:
   - Make sure Row Level Security is enabled on all tables
   - Test with a non-admin user to verify permissions

---

## Need More Help?

If you're still having issues:

1. **Check Netlify Build Logs:**
   - Go to Netlify Dashboard → Deploys
   - Click on the latest deploy
   - Check the build logs for errors

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for authentication errors

3. **Check Supabase Logs:**
   - Supabase Dashboard → Logs
   - Look for auth-related errors

4. **Common Error Messages:**
   - "Invalid login credentials" = User doesn't exist or wrong password
   - "Email not confirmed" = Email confirmation is enabled
   - "User not found" = User not in database
   - "Invalid API key" = Wrong environment variables

---

## Quick Command Reference

```bash
# Check current superadmin status (run in SQL Editor)
SELECT
  up.email,
  ur.name as role,
  up.needs_password_change
FROM user_profiles up
JOIN user_roles ur ON up.role_id = ur.id
WHERE up.email = 'rahulsuranat@gmail.com';

# Clean up and start fresh
SELECT cleanup_superadmin('rahulsuranat@gmail.com');

# Create superadmin profile (if user already exists in auth.users)
SELECT create_superadmin_profile('rahulsuranat@gmail.com', 'Super Admin');

# Verify trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

---

**Next Steps:**

1. Apply migrations to production ✓
2. Create superadmin user ✓
3. Test login ✓
4. Change default password ⚠️
5. Start using the system! 🎉
