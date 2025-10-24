# Database Migration & Storage Configuration Guide

## Overview

This guide will help you apply the WhatsApp messaging database migrations and configure Supabase Storage for the Mahaveer Bhavan application.

---

## 📋 Prerequisites

- Access to Supabase Dashboard: https://supabase.com/dashboard
- Project ID: `juvrytwhtivezeqrmtpq`
- Admin access to the project

---

## 🗄️ Step 1: Apply Database Migrations

### Migration Files to Apply (in order):

1. **`20251024110000_whatsapp_messaging_complete.sql`** - Core messaging tables
2. **`20251024111000_configure_message_media_storage.sql`** - Storage bucket setup

### How to Apply Migrations:

#### Option A: Via Supabase Dashboard SQL Editor (Recommended)

1. **Navigate to SQL Editor:**
   - Go to https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq
   - Click on **SQL Editor** in the left sidebar

2. **Apply First Migration (Core Messaging):**
   - Click **New Query**
   - Copy the entire contents of `supabase/migrations/20251024110000_whatsapp_messaging_complete.sql`
   - Paste into the SQL editor
   - Click **Run** (or press Ctrl/Cmd + Enter)
   - Wait for confirmation message: ✅ "Success. No rows returned"

3. **Apply Second Migration (Storage):**
   - Click **New Query** again
   - Copy the entire contents of `supabase/migrations/20251024111000_configure_message_media_storage.sql`
   - Paste into the SQL editor
   - Click **Run**
   - Look for success messages in the Results panel

4. **Verify Migrations:**
   - Check for success messages in the output
   - Look for ✅ confirmation notices

#### Option B: Via Supabase CLI (If Available)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref juvrytwhtivezeqrmtpq

# Push migrations
supabase db push

# Or apply specific migrations
supabase db push --include-all
```

---

## 📦 Step 2: Verify Database Tables

After applying migrations, verify the following tables exist:

### Core Tables (Should Already Exist):
- ✅ `user_profiles`
- ✅ `messages` (enhanced with new columns)

### New Tables Created:
- ✅ `groups` - Group chat metadata
- ✅ `group_members` - Group membership
- ✅ `message_reactions` - Emoji reactions
- ✅ `voice_messages` - Voice message metadata
- ✅ `typing_indicators` - Real-time typing status

### Verification Steps:

1. Go to **Table Editor** in Supabase Dashboard
2. Check that all tables are listed
3. Click on `messages` table and verify new columns:
   - `message_type`
   - `media_url`
   - `media_thumbnail_url`
   - `media_duration_seconds`
   - `media_file_name`
   - `media_file_size`
   - `media_mime_type`
   - `delivered_at`
   - `group_id`

---

## 🪣 Step 3: Configure Storage Bucket

The storage bucket should be created automatically by the migration, but verify:

### Verify Storage Bucket:

1. **Navigate to Storage:**
   - Go to https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/storage/buckets
   - Look for `message-media` bucket

2. **Check Bucket Configuration:**
   - Click on `message-media` bucket
   - Verify settings:
     - **Public:** ✅ Enabled
     - **File size limit:** 50 MB
     - **Allowed MIME types:** Images, Videos, Audio, Documents

### If Bucket Doesn't Exist (Manual Creation):

If the migration didn't create the bucket, create it manually:

1. **Create Bucket:**
   - Click **New Bucket**
   - Bucket name: `message-media`
   - ✅ Check "Public bucket"
   - Click **Create bucket**

2. **Configure Bucket:**
   - Click on the bucket name
   - Go to **Configuration** tab
   - Set **File size limit:** `52428800` (50MB in bytes)
   - Click **Save**

3. **Set Up Policies:**
   - Go to **Policies** tab
   - The migration should have created 4 policies
   - If not, run the storage migration SQL again

---

## 🔒 Step 4: Verify Storage Policies

Ensure these policies exist for the `message-media` bucket:

1. **"Authenticated users can upload message media"** (INSERT)
   - Allows users to upload files to their own folders

2. **"Public read access for message media"** (SELECT)
   - Allows anyone to view/download files

3. **"Users can update their own message media"** (UPDATE)
   - Allows users to update their files

4. **"Users can delete their own message media"** (DELETE)
   - Allows users to delete their files

### How to Check:

1. Go to **Storage** → `message-media` → **Policies** tab
2. Verify all 4 policies are listed
3. Each policy should have status: ✅ **Enabled**

### If Policies Don't Exist:

Run this SQL in the SQL Editor:

```sql
-- Re-run just the policy creation part
-- Copy from the storage migration file, lines with CREATE POLICY
```

---

## 🔄 Step 5: Enable Realtime

Enable realtime subscriptions for instant messaging:

1. **Navigate to Realtime Settings:**
   - Go to **Database** → **Replication**
   - Or: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/database/replication

2. **Enable Realtime for Tables:**

   Enable replication for these tables:
   - ✅ `messages`
   - ✅ `typing_indicators`
   - ✅ `message_reactions`
   - ✅ `groups`
   - ✅ `group_members`

3. **How to Enable:**
   - Find each table in the list
   - Click the toggle switch to **enable** replication
   - Repeat for all 5 tables

4. **Verify:**
   - All 5 tables should show: ✅ **Enabled**

---

## 🧪 Step 6: Test the Setup

### Test 1: Storage Upload

1. Go to **Storage** → `message-media`
2. Try uploading a test image
3. Should succeed without errors
4. Verify you can view the uploaded file

### Test 2: Database Queries

Run these test queries in SQL Editor:

```sql
-- Test 1: Check messages table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Test 2: Check if storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'message-media';

-- Test 3: Check storage policies
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

-- Test 4: Check realtime publication
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Test 5: View storage stats (if any files uploaded)
SELECT * FROM message_media_stats;
```

### Test 3: Application Testing

1. **Open the Application:**
   - Navigate to your Netlify deployment
   - Or run locally: `npm run dev`

2. **Test Messaging:**
   - Login with a test account
   - Go to Messages/Chats page
   - Start a new conversation
   - Send a text message
   - Verify message appears instantly

3. **Test Typing Indicators:**
   - Open chat with another user (use two browsers/devices)
   - Start typing in one browser
   - Verify "typing..." indicator appears in other browser

4. **Test File Upload (When Implemented):**
   - Try uploading an image
   - Verify it uploads to `message-media` bucket
   - Verify image displays in chat

---

## ✅ Verification Checklist

Use this checklist to ensure everything is configured correctly:

### Database:
- [ ] Migration 1 applied successfully (Core messaging tables)
- [ ] Migration 2 applied successfully (Storage configuration)
- [ ] `messages` table has new columns (message_type, media_url, etc.)
- [ ] `groups` table exists
- [ ] `group_members` table exists
- [ ] `message_reactions` table exists
- [ ] `voice_messages` table exists
- [ ] `typing_indicators` table exists

### Storage:
- [ ] `message-media` bucket exists
- [ ] Bucket is set to **Public**
- [ ] File size limit is 50MB
- [ ] 4 storage policies are active
- [ ] Can upload test file successfully

### Realtime:
- [ ] `messages` table has realtime enabled
- [ ] `typing_indicators` table has realtime enabled
- [ ] `message_reactions` table has realtime enabled
- [ ] `groups` table has realtime enabled
- [ ] `group_members` table has realtime enabled

### Application:
- [ ] Can send text messages
- [ ] Messages appear instantly (realtime)
- [ ] Typing indicators work
- [ ] Message status indicators show (✓, ✓✓)
- [ ] Can create group chats
- [ ] Unread count badges display correctly

---

## 🐛 Troubleshooting

### Issue: Migration Fails with "relation already exists"

**Solution:** Tables may already exist. Check if previous migrations were applied.

```sql
-- Check what tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Issue: Storage Bucket Not Created

**Solution:** Create manually via Dashboard (see Step 3) or run the storage migration SQL separately.

### Issue: Upload Fails with "Permission Denied"

**Solution:** Check storage policies:

```sql
-- List all storage policies
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';
```

Re-run the policy creation section of the migration if needed.

### Issue: Realtime Not Working

**Solution:**
1. Verify realtime is enabled for tables (Step 5)
2. Check browser console for connection errors
3. Verify Supabase URL and anon key are correct in `.env`

### Issue: File Upload Size Limit

**Solution:** Increase the bucket size limit:

```sql
-- Update bucket size limit to 50MB
UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'message-media';
```

---

## 📞 Support

If you encounter issues:

1. **Check Supabase Logs:**
   - Dashboard → Logs
   - Look for error messages

2. **Check Browser Console:**
   - F12 → Console tab
   - Look for JavaScript errors

3. **Verify Environment Variables:**
   - Check `.env` file has correct Supabase URL and keys
   - Restart dev server after changes

4. **Database Inspection:**
   - Use SQL Editor to run diagnostic queries
   - Check table structures and data

---

## 🎉 Success!

Once all checklist items are complete, your WhatsApp-like messaging system is fully configured and ready to use!

**Next Steps:**
- Test all features thoroughly
- Monitor storage usage
- Set up monitoring alerts
- Consider implementing file cleanup policies for old media

---

## 📊 Monitoring

### Storage Usage:

```sql
-- Check storage statistics
SELECT * FROM message_media_stats;

-- List recent uploads
SELECT
  name,
  metadata->>'size' as size_bytes,
  metadata->>'mimetype' as mime_type,
  created_at
FROM storage.objects
WHERE bucket_id = 'message-media'
ORDER BY created_at DESC
LIMIT 10;
```

### Message Statistics:

```sql
-- Total messages by type
SELECT
  message_type,
  COUNT(*) as count
FROM messages
GROUP BY message_type
ORDER BY count DESC;

-- Messages per day (last 7 days)
SELECT
  DATE(created_at) as date,
  COUNT(*) as message_count
FROM messages
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Unread messages
SELECT
  recipient_id,
  COUNT(*) as unread_count
FROM messages
WHERE is_read = false
GROUP BY recipient_id
ORDER BY unread_count DESC;
```

---

**Happy Messaging! 💬**
