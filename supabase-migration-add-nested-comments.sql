-- ================================================
-- 数据库迁移：添加嵌套评论支持
-- ================================================
-- 这个脚本用于更新现有的 comments 表以支持嵌套评论功能

-- 1. 添加新字段（如果不存在）
DO $$
BEGIN
  -- 添加 parent_comment_id 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'parent_comment_id'
  ) THEN
    ALTER TABLE comments ADD COLUMN parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;
  END IF;

  -- 添加 depth 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'depth'
  ) THEN
    ALTER TABLE comments ADD COLUMN depth INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- 添加 reply_count 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'reply_count'
  ) THEN
    ALTER TABLE comments ADD COLUMN reply_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- 2. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx ON comments(parent_comment_id);

-- 3. 创建触发器函数（覆盖旧的）
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 如果有父评论，增加父评论的回复数
    IF NEW.parent_comment_id IS NOT NULL THEN
      UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 如果有父评论，减少父评论的回复数
    IF OLD.parent_comment_id IS NOT NULL THEN
      UPDATE comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_comment_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建触发器（先删除旧的）
DROP TRIGGER IF EXISTS update_reply_count_trigger ON comments;

CREATE TRIGGER update_reply_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reply_count();

-- ================================================
-- 迁移完成！
-- ================================================
-- 现在你的数据库已支持嵌套评论功能
