# Mahaveer Bhavan - Setup Scripts

This folder contains scripts to diagnose and fix authentication issues.

## Quick Start - Fix Login Issue

### Option 1: Automated Diagnosis (Recommended)
```bash
cd mahaveer-bhavan
node scripts/diagnose-auth.js
```

This will:
- Check all authentication users
- Verify user roles exist
- Check user profiles
- Identify if admin users exist
- Provide specific fixes for your issues

### Option 2: Manual Fix via Supabase Dashboard

1. **Run Database Setup Script**
   - Go to https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/sql
   - Copy contents of `scripts/setup-database.sql`
   - Paste and click "Run"
   - This fixes RLS policies and creates roles

2. **Create Admin User**
   - Follow instructions in `scripts/create-admin-user.md`
   - Summary:
     1. Create user in Auth > Users
     2. Update their profile to have admin role_id
     3. Test login

## Files

### `diagnose-auth.js`
Node.js script that connects to your Supabase database and:
- Lists all authentication users
- Checks user_roles table
- Verifies user_profiles exist
- Identifies missing admin users
- Provides specific fix instructions

**Usage:**
```bash
node scripts/diagnose-auth.js
```

### `setup-database.sql`
SQL script that:
- Fixes RLS policies for user_profiles
- Creates/updates user_roles
- Sets up proper permissions

**Usage:**
1. Go to Supabase SQL Editor
2. Copy paste the entire file
3. Click "Run"

### `create-admin-user.md`
Step-by-step guide to create your first admin user.
Three methods provided:
1. Via Supabase Dashboard (easiest)
2. Via SQL (faster)
3. Via API (automated)

## Common Issues & Fixes

### Issue: "Unable to verify admin credentials"
**Cause:** No admin users exist in database

**Fix:**
```bash
# 1. Run diagnostic
node scripts/diagnose-auth.js

# 2. Follow the output instructions to create admin user
```

### Issue: "Database error" when logging in
**Cause:** RLS policies blocking profile queries

**Fix:**
1. Run `scripts/setup-database.sql` in Supabase SQL Editor
2. This recreates proper RLS policies

### Issue: Profile not created after signup
**Cause:** Database trigger not working

**Fix:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- If missing, create it (contact developer for trigger code)
```

## Credentials Reference

**Supabase:**
- URL: https://juvrytwhtivezeqrmtpq.supabase.co
- Project ID: juvrytwhtivezeqrmtpq
- Database: postgresql://postgres:s3GVV2zOmFjT2aH4@db.juvrytwhtivezeqrmtpq.supabase.co:5432/postgres

**OpenRouter API:**
- Set in Supabase Edge Functions secrets
- Key: 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

**Netlify:**
- Token: nfp_tQRVYzng4kwjz9fLX6P4BcAh3qkrknvg4589
- Site: mahaveer-bhavan.netlify.app

## Need Help?

1. Run `node scripts/diagnose-auth.js` first
2. Check browser console (F12) when logging in
3. Share error messages for specific help
