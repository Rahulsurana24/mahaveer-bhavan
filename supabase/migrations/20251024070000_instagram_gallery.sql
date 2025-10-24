-- Instagram-like Gallery System Migration
-- Creates tables for posts, likes, comments, and follows

-- Gallery Posts Table (Posts and Reels)
CREATE TABLE IF NOT EXISTS gallery_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('post', 'reel')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT, -- For reels
  caption TEXT,
  location TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery Likes Table
CREATE TABLE IF NOT EXISTS gallery_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES gallery_posts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, member_id)
);

-- Gallery Comments Table
CREATE TABLE IF NOT EXISTS gallery_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES gallery_posts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES gallery_comments(id) ON DELETE CASCADE, -- For reply threads
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member Follows Table
CREATE TABLE IF NOT EXISTS member_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Gallery Shares Table
CREATE TABLE IF NOT EXISTS gallery_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES gallery_posts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gallery_posts_member_id ON gallery_posts(member_id);
CREATE INDEX IF NOT EXISTS idx_gallery_posts_type ON gallery_posts(type);
CREATE INDEX IF NOT EXISTS idx_gallery_posts_created_at ON gallery_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_likes_post_id ON gallery_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_gallery_likes_member_id ON gallery_likes(member_id);
CREATE INDEX IF NOT EXISTS idx_gallery_comments_post_id ON gallery_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_gallery_comments_parent_id ON gallery_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_member_follows_follower_id ON member_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_member_follows_following_id ON member_follows(following_id);

-- RLS Policies

-- Gallery Posts - Everyone can read published posts, members can create/update/delete their own
ALTER TABLE gallery_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published gallery posts"
  ON gallery_posts FOR SELECT
  USING (is_published = true);

CREATE POLICY "Members can create their own gallery posts"
  ON gallery_posts FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

CREATE POLICY "Members can update their own gallery posts"
  ON gallery_posts FOR UPDATE
  USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

CREATE POLICY "Members can delete their own gallery posts"
  ON gallery_posts FOR DELETE
  USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

-- Gallery Likes - Everyone can read, members can like/unlike
ALTER TABLE gallery_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery likes"
  ON gallery_likes FOR SELECT
  USING (true);

CREATE POLICY "Members can create likes"
  ON gallery_likes FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

CREATE POLICY "Members can delete their own likes"
  ON gallery_likes FOR DELETE
  USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

-- Gallery Comments - Everyone can read, members can comment
ALTER TABLE gallery_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery comments"
  ON gallery_comments FOR SELECT
  USING (true);

CREATE POLICY "Members can create comments"
  ON gallery_comments FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

CREATE POLICY "Members can update their own comments"
  ON gallery_comments FOR UPDATE
  USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

CREATE POLICY "Members can delete their own comments"
  ON gallery_comments FOR DELETE
  USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

-- Member Follows - Everyone can read, members can follow/unfollow
ALTER TABLE member_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view member follows"
  ON member_follows FOR SELECT
  USING (true);

CREATE POLICY "Members can create follows"
  ON member_follows FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = follower_id)
  );

CREATE POLICY "Members can delete their own follows"
  ON member_follows FOR DELETE
  USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = follower_id)
  );

-- Gallery Shares - Everyone can read, members can share
ALTER TABLE gallery_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery shares"
  ON gallery_shares FOR SELECT
  USING (true);

CREATE POLICY "Members can create shares"
  ON gallery_shares FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = member_id)
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gallery_posts_updated_at
  BEFORE UPDATE ON gallery_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_gallery_updated_at();

CREATE TRIGGER update_gallery_comments_updated_at
  BEFORE UPDATE ON gallery_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_gallery_updated_at();

-- Triggers to update counts
CREATE OR REPLACE FUNCTION increment_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gallery_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gallery_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_post_likes
  AFTER INSERT ON gallery_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_likes_count();

CREATE TRIGGER decrement_post_likes
  AFTER DELETE ON gallery_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_post_likes_count();

CREATE OR REPLACE FUNCTION increment_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gallery_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gallery_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_post_comments
  AFTER INSERT ON gallery_comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_comments_count();

CREATE TRIGGER decrement_post_comments
  AFTER DELETE ON gallery_comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_post_comments_count();

CREATE OR REPLACE FUNCTION increment_post_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gallery_posts SET shares_count = shares_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_post_shares
  AFTER INSERT ON gallery_shares
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_shares_count();

-- Add follower/following counts to user_profiles if not exists
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Triggers to update follower/following counts
CREATE OR REPLACE FUNCTION increment_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  UPDATE user_profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
  UPDATE user_profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_follow_counts_trigger
  AFTER INSERT ON member_follows
  FOR EACH ROW
  EXECUTE FUNCTION increment_follow_counts();

CREATE TRIGGER decrement_follow_counts_trigger
  AFTER DELETE ON member_follows
  FOR EACH ROW
  EXECUTE FUNCTION decrement_follow_counts();
