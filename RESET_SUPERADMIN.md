# Reset Superadmin User

This guide provides multiple methods to reset and recreate the superadmin user for the Mahaveer Bhavan application.

## Superadmin Credentials

- **Email**: `rahulsuranat@gmail.com`
- **Password**: `9480413653`
- **Default Name**: `Super Admin`

---

## Method 1: Manual Signup (Recommended - Easiest)

This is the simplest method and works every time.

### Steps:

1. **Clean up existing user** (if exists):
   - Go to Supabase Dashboard → Authentication → Users
   - Find `rahulsuranat@gmail.com` and delete it
   - OR run this SQL in Supabase SQL Editor:
   ```sql
   SELECT cleanup_superadmin('rahulsuranat@gmail.com');
   ```

2. **Sign up through the app**:
   - Open your app and go to `/admin/auth`
   - Click on the signup/register option
   - Enter:
     - Email: `rahulsuranat@gmail.com`
     - Password: `9480413653`
     - Name: `Super Admin`
   - Submit the form

3. **Automatic role assignment**:
   - The system has a trigger that automatically detects this email
   - It will assign the `superadmin` role automatically
   - No additional steps needed!

4. **Verify**:
   - Log in with the credentials
   - Check that you have access to `/admin/admins` (Admin Management)
   - This page is only accessible to superadmins

---

## Method 2: Using SQL Functions

If you prefer to use SQL directly, we've provided helper functions.

### Option A: User Already Exists in Auth

If the user already exists in `auth.users` but doesn't have the correct role:

```sql
-- Assign superadmin role to existing user
SELECT create_superadmin_profile('rahulsuranat@gmail.com', 'Super Admin');
```

### Option B: User Needs to be Recreated

If you need to completely recreate the user:

```sql
-- Step 1: Clean up existing user
SELECT cleanup_superadmin('rahulsuranat@gmail.com');

-- Step 2: User must sign up through the UI (Method 1)
-- The trigger will automatically assign superadmin role
```

### Run SQL Queries:

1. **Via Supabase Dashboard**:
   - Go to Supabase Dashboard → SQL Editor
   - Paste the SQL
   - Click "Run"

2. **Via Supabase CLI**:
   ```bash
   npx supabase db execute "SELECT cleanup_superadmin('rahulsuranat@gmail.com');"
   ```

---

## Method 3: Using the Reset Script

We've provided an automated script that handles everything.

### Prerequisites:

- Supabase CLI installed (`npm install -g supabase`)
- Service Role Key from Supabase Dashboard

### Steps:

1. **Set environment variable**:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```

   Get your service role key from:
   - Supabase Dashboard → Project Settings → API → `service_role` secret

2. **Run the script**:
   ```bash
   cd /workspace/cmh0jggje00baqyi55mvuv7or/mahaveer-bhavan
   ./scripts/reset-superadmin.sh
   ```

3. **Follow the prompts**:
   - The script will clean up the existing user
   - Create a new user with the credentials
   - Assign superadmin role automatically

---

## Method 4: Using Supabase Admin API

For programmatic access or automation:

```bash
# Set variables
SUPABASE_URL="https://your-project.supabase.co"
SERVICE_ROLE_KEY="your-service-role-key"

# Step 1: Clean up (optional)
curl -X POST "$SUPABASE_URL/rest/v1/rpc/cleanup_superadmin" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_email": "rahulsuranat@gmail.com"}'

# Step 2: Create user
curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rahulsuranat@gmail.com",
    "password": "9480413653",
    "email_confirm": true,
    "user_metadata": {
      "full_name": "Super Admin"
    }
  }'

# The trigger will automatically assign superadmin role
```

---

## Verification

After resetting the superadmin, verify it works:

### 1. Check Database:

```sql
-- Check user_profiles
SELECT
  up.email,
  up.full_name,
  ur.name as role,
  up.needs_password_change
FROM user_profiles up
JOIN user_roles ur ON up.role_id = ur.id
WHERE up.email = 'rahulsuranat@gmail.com';

-- Expected output:
-- email: rahulsuranat@gmail.com
-- role: superadmin
-- needs_password_change: false
```

### 2. Test Login:

1. Go to `/admin/auth`
2. Log in with:
   - Email: `rahulsuranat@gmail.com`
   - Password: `9480413653`
3. Should redirect to `/admin/dashboard`

### 3. Test Permissions:

1. Navigate to `/admin/admins` (Admin Management)
2. Should see the page (only superadmins have access)
3. Try creating a new admin user
4. Try viewing system logs at `/admin/logs`

---

## Troubleshooting

### Issue: "User already exists"

**Solution**: Clean up first using Method 1 or run:
```sql
SELECT cleanup_superadmin('rahulsuranat@gmail.com');
```

### Issue: "Role not found"

**Solution**: Ensure roles are set up:
```sql
SELECT ensure_superadmin_setup();
```

### Issue: "Trigger not working"

**Solution**: Check that the trigger exists:
```sql
-- Verify trigger
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Recreate trigger if needed
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Issue: "User created but not superadmin"

**Solution**: Manually assign role:
```sql
SELECT create_superadmin_profile('rahulsuranat@gmail.com', 'Super Admin');
```

### Issue: "Can't access admin pages"

**Solution**: Check role assignment and re-login:
```sql
-- Check current role
SELECT
  up.email,
  ur.name as role
FROM user_profiles up
JOIN user_roles ur ON up.role_id = ur.id
WHERE up.email = 'rahulsuranat@gmail.com';

-- If wrong role, fix it:
UPDATE user_profiles
SET role_id = (SELECT id FROM user_roles WHERE name = 'superadmin')
WHERE email = 'rahulsuranat@gmail.com';
```

Then log out and log back in.

---

## Database Functions Reference

### cleanup_superadmin(p_email)
Deletes user from auth.users and user_profiles.

```sql
SELECT cleanup_superadmin('rahulsuranat@gmail.com');
```

### ensure_superadmin_setup()
Ensures superadmin role exists and trigger is configured.

```sql
SELECT ensure_superadmin_setup();
```

### create_superadmin_profile(p_email, p_full_name)
Creates or updates user profile with superadmin role (user must exist in auth.users).

```sql
SELECT create_superadmin_profile('rahulsuranat@gmail.com', 'Super Admin');
```

---

## Security Notes

⚠️ **Important Security Considerations**:

1. **Change the default password** immediately after first login
2. The default password (`9480413653`) is documented and should be changed
3. Use strong passwords for production deployments
4. Keep your service role key secure and never commit it to version control
5. Consider enabling 2FA for superadmin accounts in production

---

## Quick Reference

**Most common scenario** (User needs to be recreated):

1. Go to Supabase Dashboard → Authentication → Users
2. Delete `rahulsuranat@gmail.com` if exists
3. Go to your app at `/admin/auth`
4. Sign up with: `rahulsuranat@gmail.com` / `9480413653`
5. Log in and verify access to `/admin/admins`

Done! ✅
