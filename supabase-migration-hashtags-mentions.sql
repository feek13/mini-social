-- ================================================
-- 话题标签和提及功能数据库迁移
-- ================================================
-- 请在 Supabase SQL Editor 中运行此脚本

-- ================================================
-- 1. 创建 hashtags 表（话题标签）
-- ================================================
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- 话题名称（小写，不含 #）
  usage_count INTEGER DEFAULT 0, -- 使用次数
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS hashtags_name_idx ON hashtags(name);
CREATE INDEX IF NOT EXISTS hashtags_usage_count_idx ON hashtags(usage_count DESC);

-- 启用行级安全（RLS）
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Hashtags are viewable by everyone" ON hashtags;

-- 所有人可读
CREATE POLICY "Hashtags are viewable by everyone"
  ON hashtags FOR SELECT
  USING (true);

-- ================================================
-- 2. 创建 post_hashtags 表（动态-话题关联）
-- ================================================
CREATE TABLE IF NOT EXISTS post_hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  hashtag_id UUID REFERENCES hashtags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, hashtag_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS post_hashtags_post_id_idx ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS post_hashtags_hashtag_id_idx ON post_hashtags(hashtag_id);

-- 启用行级安全（RLS）
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Post hashtags are viewable by everyone" ON post_hashtags;

-- 所有人可读
CREATE POLICY "Post hashtags are viewable by everyone"
  ON post_hashtags FOR SELECT
  USING (true);

-- ================================================
-- 3. 创建 mentions 表（提及）
-- ================================================
CREATE TABLE IF NOT EXISTS mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mentioner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 确保 post_id 或 comment_id 有一个不为空
  CONSTRAINT mentions_source_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- 创建索引
CREATE INDEX IF NOT EXISTS mentions_post_id_idx ON mentions(post_id);
CREATE INDEX IF NOT EXISTS mentions_comment_id_idx ON mentions(comment_id);
CREATE INDEX IF NOT EXISTS mentions_mentioned_user_id_idx ON mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS mentions_mentioner_user_id_idx ON mentions(mentioner_user_id);

-- 启用行级安全（RLS）
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Mentions are viewable by everyone" ON mentions;

-- 所有人可读
CREATE POLICY "Mentions are viewable by everyone"
  ON mentions FOR SELECT
  USING (true);

-- ================================================
-- 4. 创建触发器：自动更新话题的 usage_count
-- ================================================
DROP TRIGGER IF EXISTS update_hashtag_usage_count_trigger ON post_hashtags;

CREATE OR REPLACE FUNCTION update_hashtag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags SET usage_count = usage_count + 1 WHERE id = NEW.hashtag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hashtags SET usage_count = usage_count - 1 WHERE id = OLD.hashtag_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hashtag_usage_count_trigger
  AFTER INSERT OR DELETE ON post_hashtags
  FOR EACH ROW
  EXECUTE FUNCTION update_hashtag_usage_count();

-- ================================================
-- 5. 创建触发器：提及时自动创建通知
-- ================================================
DROP TRIGGER IF EXISTS create_mention_notification_trigger ON mentions;

CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_type TEXT;
BEGIN
  -- 不给自己创建提及通知
  IF NEW.mentioned_user_id = NEW.mentioner_user_id THEN
    RETURN NEW;
  END IF;

  -- 确定通知类型
  IF NEW.post_id IS NOT NULL THEN
    notification_type := 'mention_post';
  ELSE
    notification_type := 'mention_comment';
  END IF;

  -- 创建通知
  INSERT INTO notifications (
    user_id,
    type,
    actor_id,
    post_id,
    comment_id,
    created_at
  ) VALUES (
    NEW.mentioned_user_id,
    notification_type,
    NEW.mentioner_user_id,
    NEW.post_id,
    NEW.comment_id,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_mention_notification_trigger
  AFTER INSERT ON mentions
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notification();

-- ================================================
-- 完成！
-- ================================================
-- 话题标签和提及功能数据库设置完成。
