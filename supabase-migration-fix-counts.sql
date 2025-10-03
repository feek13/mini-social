-- ================================================
-- 修复帖子计数字段和触发器
-- ================================================

-- 1. 添加缺失的字段（如果不存在）
DO $$
BEGIN
  -- 添加 comments_count 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'comments_count'
  ) THEN
    ALTER TABLE posts ADD COLUMN comments_count INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- 添加 repost_count 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'repost_count'
  ) THEN
    ALTER TABLE posts ADD COLUMN repost_count INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- 添加 is_repost 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'is_repost'
  ) THEN
    ALTER TABLE posts ADD COLUMN is_repost BOOLEAN DEFAULT FALSE NOT NULL;
  END IF;

  -- 添加 original_post_id 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'original_post_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN original_post_id UUID REFERENCES posts(id) ON DELETE CASCADE;
  END IF;

  -- 添加 repost_comment 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'repost_comment'
  ) THEN
    ALTER TABLE posts ADD COLUMN repost_comment TEXT;
  END IF;

  -- 添加 images 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'images'
  ) THEN
    ALTER TABLE posts ADD COLUMN images TEXT[];
  END IF;

  -- 添加 hot_score 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'hot_score'
  ) THEN
    ALTER TABLE posts ADD COLUMN hot_score FLOAT DEFAULT 0;
  END IF;
END $$;

-- 2. 创建或替换评论计数触发器
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 只更新一级评论的计数（parent_comment_id IS NULL）
    IF NEW.parent_comment_id IS NULL THEN
      UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 只更新一级评论的计数
    IF OLD.parent_comment_id IS NULL THEN
      UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS update_comments_count_trigger ON comments;

-- 创建新触发器
CREATE TRIGGER update_comments_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_count();

-- 3. 创建或替换转发计数触发器
CREATE OR REPLACE FUNCTION update_post_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 当创建转发时，增加原帖的转发计数
    IF NEW.is_repost = TRUE AND NEW.original_post_id IS NOT NULL THEN
      UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.original_post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 当删除转发时，减少原帖的转发计数
    IF OLD.is_repost = TRUE AND OLD.original_post_id IS NOT NULL THEN
      UPDATE posts SET repost_count = GREATEST(repost_count - 1, 0) WHERE id = OLD.original_post_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS update_repost_count_trigger ON posts;

-- 创建新触发器
CREATE TRIGGER update_repost_count_trigger
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_repost_count();

-- 4. 重新计算所有帖子的评论计数和转发计数
-- 更新评论计数（只计算一级评论）
UPDATE posts p
SET comments_count = (
  SELECT COUNT(*)
  FROM comments c
  WHERE c.post_id = p.id AND c.parent_comment_id IS NULL
);

-- 更新转发计数
UPDATE posts p
SET repost_count = (
  SELECT COUNT(*)
  FROM posts repost
  WHERE repost.original_post_id = p.id AND repost.is_repost = TRUE
);

-- 5. 重新计算所有评论的回复计数
UPDATE comments c
SET reply_count = (
  SELECT COUNT(*)
  FROM comments reply
  WHERE reply.parent_comment_id = c.id
);

-- 完成
DO $$
BEGIN
  RAISE NOTICE '✓ 计数字段和触发器已更新';
  RAISE NOTICE '✓ 所有计数已重新计算';
END $$;
