# 🚀 Mahaveer Bhavan - Complete Setup Guide

## ⚡ SUPER QUICK SETUP (5 Minutes)

### Step 1: Run Database Setup (2 minutes)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/sql
   - Click **"New Query"**

2. **Run the Setup Script**
   - Open the file: `scripts/ONE-CLICK-SETUP.sql`
   - Copy the **ENTIRE contents** (Ctrl+A, Ctrl+C)
   - Paste into the SQL Editor
   - Click **"Run"** button (or press Ctrl+Enter)

3. **Wait for Success**
   - You'll see: `✅ SETUP COMPLETE!`
   - It will show you the next steps

---

### Step 2: Create Admin User (2 minutes)

1. **Go to Authentication Page**
   - Click here: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/auth/users

2. **Add New User**
   - Click the **"Add user"** button (top right)

3. **Fill in Details**
   - **Email**: `admin@mahaveer.com`
   - **Password**: `AdminMahaveer2025!` (or create your own strong password)
   - **✅ IMPORTANT**: Check the box **"Auto Confirm User"**
   - Click **"Create user"**

---

### Step 3: Make User an Admin (1 minute)

1. **Go Back to SQL Editor**
   - https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/sql

2. **Run This SQL**
   ```sql
   UPDATE user_profiles
   SET role_id = (SELECT id FROM user_roles WHERE name = 'superadmin')
   WHERE email = 'admin@mahaveer.com';

   -- Verify it worked
   SELECT up.email, ur.name as role
   FROM user_profiles up
   LEFT JOIN user_roles ur ON up.role_id = ur.id
   WHERE up.email = 'admin@mahaveer.com';
   ```

3. **Check Result**
   - You should see: `admin@mahaveer.com | superadmin`

---

### Step 4: Test Login! (30 seconds)

1. **Open Your App**
   - Go to: https://mahaveer-bhavan.netlify.app/admin-auth

2. **Login with Admin Credentials**
   - Email: `admin@mahaveer.com`
   - Password: `AdminMahaveer2025!` (or whatever you set)

3. **Check Browser Console** (Important!)
   - Press **F12** to open Developer Tools
   - Click the **"Console"** tab
   - You should see detailed logs showing the login process

4. **What You'll See**
   - If successful: `[AdminLogin] Admin access granted`
   - If error: Check the console for the specific error message

---

## 🎉 You're Done!

Your admin account is now set up. You can:
- Login at: `/admin-auth`
- Access admin dashboard
- Manage members, events, trips, etc.

---

## 📝 Additional Info

### Creating More Admin Users

Repeat Steps 2 & 3 with different email addresses.

### Creating Regular Members

Same as Step 2, but **skip Step 3** (they'll automatically be "members").

### Testing Member Login

1. Create a non-admin user
2. Go to: https://mahaveer-bhavan.netlify.app/auth
3. Login with member credentials

---

## 🔧 Troubleshooting

### Issue: "Unable to verify admin credentials"

**Check in Browser Console (F12):**

1. Look for: `[AdminLogin] Profile query result:`
2. If you see `null` or `error` → The user doesn't have a profile
3. If you see `role: member` → Run Step 3 again to upgrade to admin

**Quick Fix:**
```sql
-- Check if profile exists
SELECT * FROM user_profiles WHERE email = 'admin@mahaveer.com';

-- If no profile, the trigger didn't run - create manually:
INSERT INTO user_profiles (auth_id, email, full_name, role_id)
VALUES (
  'YOUR_USER_ID_FROM_AUTH_USERS',
  'admin@mahaveer.com',
  'Admin User',
  (SELECT id FROM user_roles WHERE name = 'superadmin')
);
```

### Issue: SQL Error When Running Setup

**Error**: "permission denied" or "RLS policy"

**Fix**: You may need to run this first:
```sql
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- Then run ONE-CLICK-SETUP.sql again
```

### Issue: Can't Create User in Supabase Dashboard

**Check**:
1. Make sure you're logged into Supabase Dashboard
2. Verify you're in the correct project (juvrytwhtivezeqrmtpq)
3. Try refreshing the page

### Issue: User Created But Login Still Fails

**Diagnose**:
1. Open browser console (F12)
2. Look for the specific error in `[AdminLogin]` logs
3. Most common: Role not assigned (run Step 3 again)

---

## 📞 Need Help?

1. **Check Browser Console** - Always start here (F12 → Console)
2. **Run Diagnostic**: `node scripts/diagnose-auth.js`
3. **Verify Database**: Use Supabase Table Editor to check user_profiles table

---

## 🎯 What Got Set Up

✅ User roles (superadmin, admin, member, etc.)
✅ RLS policies for security
✅ Database triggers for auto-creating profiles
✅ Proper authentication flow
✅ Admin login page with detailed error logging

---

## 🔐 Your Current Credentials

**Supabase Project**: juvrytwhtivezeqrmtpq
**Project URL**: https://juvrytwhtivezeqrmtpq.supabase.co
**App URL**: https://mahaveer-bhavan.netlify.app

**Admin Login** (after setup):
- Email: admin@mahaveer.com
- Password: AdminMahaveer2025!
- Login Page: https://mahaveer-bhavan.netlify.app/admin-auth

---

**All setup scripts are in the `scripts/` folder if you need to re-run anything!**
