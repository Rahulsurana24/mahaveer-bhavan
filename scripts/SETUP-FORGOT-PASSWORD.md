# Configure Forgot Password in Supabase

## Step-by-Step Setup

### 1. Configure Email Redirect URLs in Supabase

1. **Go to Supabase Authentication Settings**:
   - URL: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/auth/url-configuration

2. **Add Redirect URLs**:
   In the "Redirect URLs" section, add these URLs:
   ```
   https://mahaveer-bhavan.netlify.app/auth/reset-password
   https://mahaveer-bhavan.netlify.app/auth
   https://mahaveer-bhavan.netlify.app/*
   http://localhost:8080/auth/reset-password
   http://localhost:8080/*
   ```

3. **Set Site URL**:
   - Site URL: `https://mahaveer-bhavan.netlify.app`

4. **Click "Save"**

---

### 2. Configure Email Templates (Optional but Recommended)

1. **Go to Email Templates**:
   - URL: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/auth/templates

2. **Edit "Reset Password" Template**:
   ```html
   <h2>Reset Password</h2>
   <p>Follow this link to reset the password for your Mahaveer Bhavan account:</p>
   <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
   <p>Or copy and paste this URL into your browser:</p>
   <p>{{ .ConfirmationURL }}</p>
   <p>If you didn't request this, you can safely ignore this email.</p>
   ```

3. **Configure the Redirect URL Pattern**:
   - Make sure the confirmation URL redirects to: `https://mahaveer-bhavan.netlify.app/auth/reset-password`

---

### 3. Test Forgot Password Flow

1. **Go to Member Login**:
   - URL: https://mahaveer-bhavan.netlify.app/auth

2. **Click "Forgot Password"**

3. **Enter Email**: Use a valid email (admin@mahaveer.com or any test user)

4. **Check Email**: You should receive a password reset email

5. **Click Link**: Should redirect to reset password page

6. **Enter New Password**: Complete the reset

---

## Current Configuration Status

### Existing Code (Already Implemented)

✅ **Reset Password Page**: `/auth/reset-password` exists
✅ **Forgot Password Form**: Already in LoginForm component
✅ **AuthContext Method**: `resetPassword()` function exists

### What Needs Configuration

⚠️ **Supabase Redirect URLs**: Need to add in Supabase Dashboard (Step 1 above)
⚠️ **Email Templates**: Should customize for better user experience

---

## Troubleshooting

### Issue: "Invalid redirect URL"
**Fix**: Make sure you added ALL redirect URLs in Step 1

### Issue: Email not received
**Possible causes**:
1. User email not confirmed
2. SMTP not configured in Supabase
3. Email in spam folder

**Fix**:
1. Check Supabase > Auth > Users - make sure "Email Confirmed" is checked
2. Check spam folder
3. Verify SMTP settings in Supabase

### Issue: Reset link doesn't work
**Fix**:
1. Make sure redirect URL matches EXACTLY what you configured
2. Check that the page `/auth/reset-password` exists and loads correctly

---

## Quick Setup Commands

### Run in Supabase Dashboard

No SQL needed for forgot password! Just configure URLs in the dashboard.

### Test Reset Password

```javascript
// Test in browser console on your site
const { data, error } = await supabase.auth.resetPasswordForEmail(
  'admin@mahaveer.com',
  {
    redirectTo: 'https://mahaveer-bhavan.netlify.app/auth/reset-password'
  }
);
console.log({ data, error });
```

---

## Summary Checklist

- [ ] Add redirect URLs in Supabase Auth settings
- [ ] Set site URL to mahaveer-bhavan.netlify.app
- [ ] Customize email template (optional)
- [ ] Test forgot password flow
- [ ] Verify reset password page works

---

**After completing these steps, forgot password will work perfectly!** ✅
