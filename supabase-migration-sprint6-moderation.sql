-- =====================================================
-- Sprint 6: 内容审核系统 - 数据库迁移
-- =====================================================

-- 1. 管理员角色表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'support')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  permissions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, role)
);

-- 2. 举报类型枚举
-- =====================================================
DO $$ BEGIN
  CREATE TYPE report_type AS ENUM ('post', 'comment', 'user', 'message');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM (
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'nudity',
    'misinformation',
    'copyright',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM (
    'pending',
    'reviewing',
    'resolved',
    'dismissed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. 举报记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 被举报内容
  report_type report_type NOT NULL,
  reported_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reported_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,

  -- 举报详情
  reason report_reason NOT NULL,
  description TEXT,
  status report_status DEFAULT 'pending',

  -- 审核信息
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  resolution_note TEXT,

  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束：至少有一个被举报对象
  CONSTRAINT at_least_one_reported_object CHECK (
    (reported_post_id IS NOT NULL)::int +
    (reported_comment_id IS NOT NULL)::int +
    (reported_user_id IS NOT NULL)::int +
    (reported_message_id IS NOT NULL)::int = 1
  )
);

-- 4. 审核操作记录表
-- =====================================================
DO $$ BEGIN
  CREATE TYPE moderation_action_type AS ENUM (
    'warning',
    'content_removal',
    'temporary_ban',
    'permanent_ban',
    'account_suspension',
    'content_restore',
    'ban_lift'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 操作者
  moderator_id UUID NOT NULL REFERENCES auth.users(id),

  -- 目标
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  target_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,

  -- 操作详情
  action_type moderation_action_type NOT NULL,
  reason TEXT NOT NULL,
  related_report_id UUID REFERENCES reports(id),

  -- 封禁相关
  ban_duration_days INTEGER, -- NULL 表示永久封禁
  ban_expires_at TIMESTAMPTZ,

  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. 敏感词表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.banned_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL CHECK (category IN ('profanity', 'hate_speech', 'spam', 'violence', 'other')),
  replacement TEXT, -- 可选的替换词
  is_regex BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 用户封禁记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('temporary', 'permanent')),
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  lifted_by UUID REFERENCES auth.users(id),
  lifted_at TIMESTAMPTZ,
  lift_reason TEXT
);

-- =====================================================
-- 索引
-- =====================================================

-- 举报表索引
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported_post_id ON reports(reported_post_id) WHERE reported_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_reported_comment_id ON reports(reported_comment_id) WHERE reported_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id) WHERE reported_user_id IS NOT NULL;

-- 审核操作索引
CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator_id ON moderation_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_user_id ON moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created_at ON moderation_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_action_type ON moderation_actions(action_type);

-- 管理员角色索引
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_is_active ON admin_roles(is_active);

-- 封禁记录索引
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_is_active ON user_bans(is_active);
CREATE INDEX IF NOT EXISTS idx_user_bans_expires_at ON user_bans(expires_at);

-- 部分唯一索引：确保一个用户同时只能有一个活跃封禁
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_bans_user_id_active_unique
  ON user_bans(user_id)
  WHERE is_active = TRUE;

-- 敏感词索引
CREATE INDEX IF NOT EXISTS idx_banned_words_word ON banned_words(word);
CREATE INDEX IF NOT EXISTS idx_banned_words_is_active ON banned_words(is_active);

-- =====================================================
-- RLS 策略
-- =====================================================

-- 启用 RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

-- admin_roles 策略
CREATE POLICY "管理员可以查看所有角色"
  ON admin_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = TRUE
    )
  );

-- reports 策略
CREATE POLICY "用户可以创建举报"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "用户可以查看自己的举报"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "管理员可以查看所有举报"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = TRUE
    )
  );

CREATE POLICY "管理员可以更新举报"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = TRUE
    )
  );

-- moderation_actions 策略
CREATE POLICY "管理员可以查看审核操作"
  ON moderation_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = TRUE
    )
  );

CREATE POLICY "管理员可以创建审核操作"
  ON moderation_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = TRUE
    )
  );

-- user_bans 策略
CREATE POLICY "用户可以查看自己的封禁记录"
  ON user_bans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "管理员可以查看所有封禁记录"
  ON user_bans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = TRUE
    )
  );

CREATE POLICY "管理员可以创建封禁记录"
  ON user_bans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = TRUE
    )
  );

CREATE POLICY "管理员可以更新封禁记录"
  ON user_bans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = TRUE
    )
  );

-- =====================================================
-- 辅助函数
-- =====================================================

-- 检查用户是否是管理员
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = $1
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户是否被封禁
CREATE OR REPLACE FUNCTION is_user_banned(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_bans
    WHERE user_bans.user_id = $1
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 自动解除过期封禁
CREATE OR REPLACE FUNCTION auto_lift_expired_bans()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_bans
  SET is_active = FALSE
  WHERE expires_at IS NOT NULL
    AND expires_at <= NOW()
    AND is_active = TRUE;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建定时触发器（每小时检查一次过期封禁）
CREATE OR REPLACE FUNCTION create_ban_expiry_job()
RETURNS void AS $$
BEGIN
  -- 注意：这需要 pg_cron 扩展，如果 Supabase 不支持，可以在应用层实现
  -- PERFORM cron.schedule('lift-expired-bans', '0 * * * *', 'SELECT auto_lift_expired_bans()');
END;
$$ LANGUAGE plpgsql;

-- 更新举报的 updated_at
CREATE OR REPLACE FUNCTION update_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at_trigger
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_report_updated_at();

-- 更新敏感词的 updated_at
CREATE OR REPLACE FUNCTION update_banned_word_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER banned_words_updated_at_trigger
  BEFORE UPDATE ON banned_words
  FOR EACH ROW
  EXECUTE FUNCTION update_banned_word_updated_at();

-- =====================================================
-- 视图：待处理举报统计
-- =====================================================
CREATE OR REPLACE VIEW pending_reports_summary AS
SELECT
  report_type,
  reason,
  COUNT(*) as count,
  MIN(created_at) as oldest_report
FROM reports
WHERE status = 'pending'
GROUP BY report_type, reason
ORDER BY count DESC;

-- =====================================================
-- 视图：审核员工作负载
-- =====================================================
CREATE OR REPLACE VIEW moderator_workload AS
SELECT
  ar.user_id,
  p.username,
  ar.role,
  COUNT(ma.id) as actions_count,
  MAX(ma.created_at) as last_action_at
FROM admin_roles ar
LEFT JOIN profiles p ON ar.user_id = p.id
LEFT JOIN moderation_actions ma ON ar.user_id = ma.moderator_id
WHERE ar.is_active = TRUE
GROUP BY ar.user_id, p.username, ar.role
ORDER BY actions_count DESC;

-- =====================================================
-- 初始化一些常见的敏感词（示例）
-- =====================================================
INSERT INTO banned_words (word, severity, category, is_active) VALUES
  ('spam', 'low', 'spam', TRUE),
  ('advertisement', 'low', 'spam', TRUE)
ON CONFLICT (word) DO NOTHING;

-- =====================================================
-- 完成！
-- =====================================================
