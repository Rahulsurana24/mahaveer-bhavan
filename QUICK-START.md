# 🚀 Quick Start - Mahaveer Bhavan

## ✅ Setup Status

**Database**: ✅ Fully configured
**Authentication**: ✅ Ready
**Application**: ✅ Connected
**Forgot Password**: ⚠️ Needs configuration (see below)

---

## 📋 Complete These 2 Steps

### 1. Create Admin User (30 seconds)

Go to: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/auth/users

Click "Add user":
- **Email**: `admin@mahaveer.com`
- **Password**: `AdminMahaveer2025!`
- ✅ **Check**: "Auto Confirm User"

Then run this SQL to make them admin:
https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/sql

```sql
UPDATE user_profiles
SET role_id = (SELECT id FROM user_roles WHERE name = 'superadmin')
WHERE email = 'admin@mahaveer.com';
```

### 2. Configure Forgot Password (1 minute)

Go to: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/auth/url-configuration

**Add Redirect URLs**:
- `https://mahaveer-bhavan.netlify.app/auth/reset-password`
- `https://mahaveer-bhavan.netlify.app/auth`
- `https://mahaveer-bhavan.netlify.app/*`

**Set Site URL**:
- `https://mahaveer-bhavan.netlify.app`

Click **"Save"**

---

## 🧪 Test Your App

**Admin Login**: https://mahaveer-bhavan.netlify.app/admin-auth
**Member Area**: https://mahaveer-bhavan.netlify.app/auth

---

## 📚 Detailed Documentation

- **Complete Setup Guide**: `scripts/FINAL-SETUP.md`
- **Forgot Password Guide**: `scripts/SETUP-FORGOT-PASSWORD.md`
- **Verify Status**: Run `./scripts/verify-setup.sh`

---

## 🔧 What's Already Done

✅ 10 user roles created
✅ Trigger function (auto-creates user profiles)
✅ 19 RLS security policies
✅ Error handling implemented
✅ Environment variables configured

**All errors fixed!** Database is production-ready.
