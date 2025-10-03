-- ================================================
-- MiniSocial 通知系统数据库设置脚本
-- ================================================
-- 请在 Supabase SQL Editor 中运行此脚本
-- 路径: Supabase Dashboard > SQL Editor > New Query

-- ================================================
-- 1. 创建通知类型枚举
-- ================================================
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('like', 'comment', 'repost', 'follow');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ================================================
-- 2. 创建 notifications 表
-- ================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 3. 创建索引以优化查询
-- ================================================
-- 主查询索引（按接收者和创建时间）
CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON notifications(recipient_id, created_at DESC);

-- 未读通知查询索引
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON notifications(recipient_id, is_read, created_at DESC);

-- 通知类型筛选索引
CREATE INDEX IF NOT EXISTS notifications_recipient_type_idx
  ON notifications(recipient_id, type, created_at DESC);

-- 发送者索引
CREATE INDEX IF NOT EXISTS notifications_sender_idx
  ON notifications(sender_id);

-- 动态相关通知索引
CREATE INDEX IF NOT EXISTS notifications_post_idx
  ON notifications(post_id);

-- ================================================
-- 4. 启用行级安全（RLS）
-- ================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- 用户只能查看自己的通知
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = recipient_id);

-- 用户可以更新自己的通知（标记已读）
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

-- 允许系统创建通知（任何登录用户都可以创建通知）
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- 用户可以删除自己的通知
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = recipient_id);

-- ================================================
-- 5. 创建触发器：点赞时自动创建通知
-- ================================================
DROP TRIGGER IF EXISTS create_like_notification_trigger ON likes;

CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- 获取动态所有者ID
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

  -- 只有当点赞者不是动态所有者时才创建通知
  IF post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (recipient_id, sender_id, type, post_id)
    VALUES (post_owner_id, NEW.user_id, 'like', NEW.post_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_like_notification_trigger
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

-- ================================================
-- 6. 创建触发器：评论时自动创建通知
-- ================================================
DROP TRIGGER IF EXISTS create_comment_notification_trigger ON comments;

CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- 获取动态所有者ID
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

  -- 只有当评论者不是动态所有者时才创建通知
  IF post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (recipient_id, sender_id, type, post_id, comment_id)
    VALUES (post_owner_id, NEW.user_id, 'comment', NEW.post_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_comment_notification_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

-- ================================================
-- 7. 创建触发器：取消点赞时删除通知
-- ================================================
DROP TRIGGER IF EXISTS delete_like_notification_trigger ON likes;

CREATE OR REPLACE FUNCTION delete_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM notifications
  WHERE sender_id = OLD.user_id
    AND post_id = OLD.post_id
    AND type = 'like';

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delete_like_notification_trigger
  AFTER DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION delete_like_notification();

-- ================================================
-- 8. 创建触发器：删除评论时删除通知
-- ================================================
DROP TRIGGER IF EXISTS delete_comment_notification_trigger ON comments;

CREATE OR REPLACE FUNCTION delete_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM notifications
  WHERE comment_id = OLD.id
    AND type = 'comment';

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delete_comment_notification_trigger
  AFTER DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION delete_comment_notification();

-- ================================================
-- 完成！
-- ================================================
-- 通知系统数据库设置完成。
-- 现在可以使用通知功能了。
