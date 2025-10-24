# Apply Instagram Gallery Migration

This migration creates the database schema for the Instagram-like gallery with posts, reels, likes, comments, and follows.

## Migration File
`supabase/migrations/20251024070000_instagram_gallery.sql`

## What This Migration Creates

### Tables:
1. **gallery_posts** - Posts and reels
2. **gallery_likes** - Like tracking
3. **gallery_comments** - Comment system with threading
4. **member_follows** - Follow/unfollow system
5. **gallery_shares** - Share tracking

### Features:
- Automatic like/comment/share counts
- Automatic follower/following counts
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for real-time updates

## How to Apply

### Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy the entire contents of `supabase/migrations/20251024070000_instagram_gallery.sql`
5. Paste into the SQL editor
6. Click **Run** to execute
7. Verify no errors in the output

### Method 2: Supabase CLI

```bash
# If you have Supabase CLI set up
cd /path/to/mahaveer-bhavan
supabase db push
```

### Method 3: Manual SQL Execution

```bash
# Connect to your database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migration
\i supabase/migrations/20251024070000_instagram_gallery.sql
```

## Verify Migration

After applying, verify the tables exist:

```sql
-- Check tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'gallery_%';

-- Should return:
-- gallery_posts
-- gallery_likes
-- gallery_comments
-- gallery_shares
-- member_follows

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'gallery_%';

-- All should show rowsecurity = true
```

## Features Now Available

### 1. Posts & Reels
- Upload photos and videos
- Add captions and locations
- Auto-tracked likes, comments, shares

### 2. Like System
- Like/unlike any post
- Real-time like counts
- See who liked your posts

### 3. Comment System
- Comment on posts
- Reply to comments (threading)
- Auto-tracked comment counts

### 4. Follow System
- Follow/unfollow members
- Auto-tracked follower/following counts
- See follower lists

### 5. Share System
- Share posts
- Track share counts

## Security

All tables have Row Level Security enabled:

- **Read**: Anyone can view published content
- **Create**: Only authenticated members can create
- **Update**: Only owners can update their content
- **Delete**: Only owners can delete their content

## Performance

Indexes are created on:
- member_id (fast user queries)
- post_id (fast post queries)
- created_at (fast chronological sorting)
- type (fast post/reel filtering)

## Troubleshooting

### Error: "relation already exists"
- Tables may already exist
- Safe to ignore or drop tables first

### Error: "permission denied"
- Ensure you have admin access to the database
- Check your Supabase project permissions

### Error: "function does not exist"
- Run the entire migration file
- Don't run parts separately

## Next Steps

After migration:
1. Test the new Gallery page at `/gallery`
2. Create a test post
3. Test like/comment/follow features
4. Upload some sample images

## Rollback (If Needed)

To remove all Instagram gallery tables:

```sql
DROP TABLE IF EXISTS gallery_shares CASCADE;
DROP TABLE IF EXISTS gallery_comments CASCADE;
DROP TABLE IF EXISTS gallery_likes CASCADE;
DROP TABLE IF EXISTS gallery_posts CASCADE;
DROP TABLE IF EXISTS member_follows CASCADE;

ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS followers_count,
  DROP COLUMN IF EXISTS following_count;
```

**Note**: This will delete all gallery data permanently!
