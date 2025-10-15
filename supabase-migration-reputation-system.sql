-- ============================================================
-- 用户声誉系统数据库迁移
-- Sprint 3: 添加声誉评分和统计字段
-- ============================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 1: 添加声誉相关字段到 profiles 表
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
BEGIN
  -- 声誉分数 (0-100)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'reputation_score'
  ) THEN
    ALTER TABLE profiles ADD COLUMN reputation_score INTEGER DEFAULT 0;
  END IF;

  -- 声誉等级 (Bronze, Silver, Gold, Diamond, Legend)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'reputation_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN reputation_level TEXT DEFAULT 'Bronze';
  END IF;

  -- 声誉最后更新时间
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'reputation_updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN reputation_updated_at TIMESTAMPTZ;
  END IF;

  -- 链上交易数量
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'on_chain_tx_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN on_chain_tx_count INTEGER DEFAULT 0;
  END IF;

  -- DeFi 协议参与数量
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'defi_protocol_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN defi_protocol_count INTEGER DEFAULT 0;
  END IF;

  -- 钱包年龄（天数）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'wallet_age_days'
  ) THEN
    ALTER TABLE profiles ADD COLUMN wallet_age_days INTEGER DEFAULT 0;
  END IF;

  -- ETH 余额（Wei，存储为字符串避免精度问题）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'eth_balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN eth_balance TEXT;
  END IF;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 2: 添加字段注释
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMENT ON COLUMN profiles.reputation_score IS '用户声誉分数 (0-100)';
COMMENT ON COLUMN profiles.reputation_level IS '声誉等级 (Bronze/Silver/Gold/Diamond/Legend)';
COMMENT ON COLUMN profiles.reputation_updated_at IS '声誉最后更新时间';
COMMENT ON COLUMN profiles.on_chain_tx_count IS '链上交易总数';
COMMENT ON COLUMN profiles.defi_protocol_count IS '参与的 DeFi 协议数量';
COMMENT ON COLUMN profiles.wallet_age_days IS '钱包年龄（天数）';
COMMENT ON COLUMN profiles.eth_balance IS 'ETH 余额（Wei）';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 3: 创建声誉历史记录表
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS reputation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 快照数据
  score INTEGER NOT NULL,
  level TEXT NOT NULL,

  -- 各维度得分（用于分析）
  wallet_age_score INTEGER DEFAULT 0,
  activity_score INTEGER DEFAULT 0,
  defi_score INTEGER DEFAULT 0,
  asset_score INTEGER DEFAULT 0,
  social_score INTEGER DEFAULT 0,

  -- 统计数据
  tx_count INTEGER DEFAULT 0,
  protocol_count INTEGER DEFAULT 0,
  wallet_age_days INTEGER DEFAULT 0,

  -- 时间戳
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 4: 创建索引
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX IF NOT EXISTS idx_reputation_history_user_id
ON reputation_history(user_id);

CREATE INDEX IF NOT EXISTS idx_reputation_history_calculated_at
ON reputation_history(calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_reputation_score
ON profiles(reputation_score DESC)
WHERE reputation_score > 0;

CREATE INDEX IF NOT EXISTS idx_profiles_reputation_level
ON profiles(reputation_level)
WHERE wallet_address IS NOT NULL;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 5: 启用 RLS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 6: 创建 RLS 策略
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
BEGIN
  -- 删除旧策略（如果存在）
  DROP POLICY IF EXISTS "Users can view their own reputation history" ON reputation_history;
  DROP POLICY IF EXISTS "Service can insert reputation records" ON reputation_history;
  DROP POLICY IF EXISTS "Anyone can view reputation history" ON reputation_history;
END $$;

-- 所有人可以查看声誉历史（用于排行榜等功能）
CREATE POLICY "Anyone can view reputation history"
ON reputation_history
FOR SELECT
USING (true);

-- 系统可以插入声誉记录（通过 service_role）
CREATE POLICY "Service can insert reputation records"
ON reputation_history
FOR INSERT
WITH CHECK (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 7: 添加表注释
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMENT ON TABLE reputation_history IS '用户声誉分数历史记录（用于追踪和分析）';
COMMENT ON COLUMN reputation_history.user_id IS '用户 ID';
COMMENT ON COLUMN reputation_history.score IS '总分 (0-100)';
COMMENT ON COLUMN reputation_history.level IS '等级';
COMMENT ON COLUMN reputation_history.wallet_age_score IS '钱包年龄得分';
COMMENT ON COLUMN reputation_history.activity_score IS '活跃度得分';
COMMENT ON COLUMN reputation_history.defi_score IS 'DeFi 参与度得分';
COMMENT ON COLUMN reputation_history.asset_score IS '资产规模得分';
COMMENT ON COLUMN reputation_history.social_score IS '社交活动得分';
COMMENT ON COLUMN reputation_history.calculated_at IS '计算时间';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 8: 创建便捷视图（可选）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE VIEW user_reputation_summary AS
SELECT
  p.id as user_id,
  p.username,
  p.wallet_address,
  p.reputation_score,
  p.reputation_level,
  p.reputation_updated_at,
  p.on_chain_tx_count,
  p.defi_protocol_count,
  p.wallet_age_days,
  -- 计算排名（按分数降序）
  RANK() OVER (ORDER BY p.reputation_score DESC) as rank,
  -- 获取最新历史记录
  (
    SELECT json_build_object(
      'wallet_age_score', rh.wallet_age_score,
      'activity_score', rh.activity_score,
      'defi_score', rh.defi_score,
      'asset_score', rh.asset_score,
      'social_score', rh.social_score
    )
    FROM reputation_history rh
    WHERE rh.user_id = p.id
    ORDER BY rh.calculated_at DESC
    LIMIT 1
  ) as score_breakdown
FROM profiles p
WHERE p.wallet_address IS NOT NULL
ORDER BY p.reputation_score DESC;

COMMENT ON VIEW user_reputation_summary IS '用户声誉概览（包含排名和得分详情）';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 完成！
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT 'Reputation system migration completed successfully!' AS status;

-- 验证新字段
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'reputation_score',
    'reputation_level',
    'reputation_updated_at',
    'on_chain_tx_count',
    'defi_protocol_count',
    'wallet_age_days',
    'eth_balance'
  )
ORDER BY column_name;
