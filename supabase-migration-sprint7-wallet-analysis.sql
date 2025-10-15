-- ==========================================
-- Sprint 7: DeFi 钱包分析系统
-- ==========================================
-- 此迁移脚本创建钱包追踪、快照和标签系统所需的表
-- 支持多链 EVM 地址分析和智能标签

-- 1. 钱包追踪表
-- 用户可以追踪任意钱包地址，获取实时更新和通知
CREATE TABLE IF NOT EXISTS wallet_trackers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  nickname TEXT, -- 用户为钱包设置的别名
  notes TEXT, -- 备注信息
  tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_enabled BOOLEAN DEFAULT TRUE, -- 是否开启钱包变动通知
  last_notified_at TIMESTAMP WITH TIME ZONE, -- 上次发送通知时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, wallet_address)
);

-- 索引：按用户查询追踪的钱包
CREATE INDEX IF NOT EXISTS idx_wallet_trackers_user_id
  ON wallet_trackers(user_id);

-- 索引：按钱包地址查询追踪者（统计被关注度）
CREATE INDEX IF NOT EXISTS idx_wallet_trackers_address
  ON wallet_trackers(wallet_address);

-- 索引：查询开启通知的追踪记录
CREATE INDEX IF NOT EXISTS idx_wallet_trackers_notifications
  ON wallet_trackers(notification_enabled, last_notified_at)
  WHERE notification_enabled = TRUE;

-- 2. 钱包快照表
-- 定期缓存钱包的完整数据，避免频繁调用外部 API
CREATE TABLE IF NOT EXISTS wallet_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  snapshot_data JSONB NOT NULL, -- 完整的钱包数据（余额、代币、NFT、交易等）
  total_value_usd DECIMAL(20, 2), -- 总资产价值（USD）
  total_tokens INTEGER DEFAULT 0, -- 代币种类数量
  total_nfts INTEGER DEFAULT 0, -- NFT 数量
  total_chains INTEGER DEFAULT 0, -- 涉及的链数量
  chains TEXT[], -- 链列表（如：['ethereum', 'bsc', 'polygon']）
  snapshot_type TEXT DEFAULT 'full', -- full: 完整快照, quick: 快速快照
  expires_at TIMESTAMP WITH TIME ZONE, -- 缓存过期时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 额外的元数据
  metadata JSONB DEFAULT '{}'::jsonb -- 存储 API 调用次数、数据源等信息
);

-- 索引：按地址和时间查询最新快照
CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_address_time
  ON wallet_snapshots(wallet_address, created_at DESC);

-- 索引：清理过期快照
CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_expires
  ON wallet_snapshots(expires_at)
  WHERE expires_at IS NOT NULL;

-- 索引：按资产规模查询（找鲸鱼钱包）
CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_value
  ON wallet_snapshots(total_value_usd DESC NULLS LAST);

-- 3. 钱包标签表
-- 根据钱包行为自动生成智能标签
CREATE TABLE IF NOT EXISTS wallet_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  label_type TEXT NOT NULL, -- asset_size, behavior, protocol, profit, risk
  label_value TEXT NOT NULL, -- 具体标签值（如：whale, diamond_hands, aave_user）
  label_display TEXT, -- 显示文本（支持中英文）
  confidence DECIMAL(3, 2), -- 标签置信度 (0.00-1.00)
  evidence JSONB, -- 标签依据数据（如：持仓时长、交易频率等）
  auto_generated BOOLEAN DEFAULT TRUE, -- 是否自动生成
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(wallet_address, label_type, label_value)
);

-- 索引：按地址查询所有标签
CREATE INDEX IF NOT EXISTS idx_wallet_labels_address
  ON wallet_labels(wallet_address);

-- 索引：按标签类型查询
CREATE INDEX IF NOT EXISTS idx_wallet_labels_type
  ON wallet_labels(label_type);

-- 索引：按置信度排序
CREATE INDEX IF NOT EXISTS idx_wallet_labels_confidence
  ON wallet_labels(confidence DESC NULLS LAST);

-- 索引：查询自动生成的标签（用于批量更新）
CREATE INDEX IF NOT EXISTS idx_wallet_labels_auto
  ON wallet_labels(auto_generated, updated_at)
  WHERE auto_generated = TRUE;

-- 4. 钱包对比记录表
-- 记录用户创建的钱包对比分析
CREATE TABLE IF NOT EXISTS wallet_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_addresses TEXT[] NOT NULL, -- 对比的钱包地址列表
  comparison_name TEXT, -- 对比名称
  comparison_data JSONB, -- 对比结果数据
  is_public BOOLEAN DEFAULT FALSE, -- 是否公开
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引：按用户查询对比记录
CREATE INDEX IF NOT EXISTS idx_wallet_comparisons_user
  ON wallet_comparisons(user_id, created_at DESC);

-- 索引：查询公开的对比
CREATE INDEX IF NOT EXISTS idx_wallet_comparisons_public
  ON wallet_comparisons(is_public, created_at DESC)
  WHERE is_public = TRUE;

-- 5. 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为相关表添加更新时间触发器
DROP TRIGGER IF EXISTS update_wallet_trackers_updated_at ON wallet_trackers;
CREATE TRIGGER update_wallet_trackers_updated_at
  BEFORE UPDATE ON wallet_trackers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallet_labels_updated_at ON wallet_labels;
CREATE TRIGGER update_wallet_labels_updated_at
  BEFORE UPDATE ON wallet_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallet_comparisons_updated_at ON wallet_comparisons;
CREATE TRIGGER update_wallet_comparisons_updated_at
  BEFORE UPDATE ON wallet_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS (Row Level Security) 策略

-- wallet_trackers: 用户只能查看和管理自己的追踪记录
ALTER TABLE wallet_trackers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以查看自己的钱包追踪" ON wallet_trackers;
CREATE POLICY "用户可以查看自己的钱包追踪"
  ON wallet_trackers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以创建钱包追踪" ON wallet_trackers;
CREATE POLICY "用户可以创建钱包追踪"
  ON wallet_trackers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以更新自己的钱包追踪" ON wallet_trackers;
CREATE POLICY "用户可以更新自己的钱包追踪"
  ON wallet_trackers FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以删除自己的钱包追踪" ON wallet_trackers;
CREATE POLICY "用户可以删除自己的钱包追踪"
  ON wallet_trackers FOR DELETE
  USING (auth.uid() = user_id);

-- wallet_snapshots: 所有人可读（缓存数据）
ALTER TABLE wallet_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可以查看钱包快照" ON wallet_snapshots;
CREATE POLICY "所有人可以查看钱包快照"
  ON wallet_snapshots FOR SELECT
  TO authenticated
  USING (true);

-- wallet_labels: 所有人可读
ALTER TABLE wallet_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可以查看钱包标签" ON wallet_labels;
CREATE POLICY "所有人可以查看钱包标签"
  ON wallet_labels FOR SELECT
  TO authenticated
  USING (true);

-- wallet_comparisons: 用户可管理自己的对比，公开对比所有人可见
ALTER TABLE wallet_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以查看自己的对比和公开对比" ON wallet_comparisons;
CREATE POLICY "用户可以查看自己的对比和公开对比"
  ON wallet_comparisons FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "用户可以创建对比" ON wallet_comparisons;
CREATE POLICY "用户可以创建对比"
  ON wallet_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以更新自己的对比" ON wallet_comparisons;
CREATE POLICY "用户可以更新自己的对比"
  ON wallet_comparisons FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以删除自己的对比" ON wallet_comparisons;
CREATE POLICY "用户可以删除自己的对比"
  ON wallet_comparisons FOR DELETE
  USING (auth.uid() = user_id);

-- 7. 辅助函数：获取钱包的最新快照
CREATE OR REPLACE FUNCTION get_latest_wallet_snapshot(
  p_wallet_address TEXT,
  p_max_age_hours INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  wallet_address TEXT,
  snapshot_data JSONB,
  total_value_usd DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ws.id,
    ws.wallet_address,
    ws.snapshot_data,
    ws.total_value_usd,
    ws.created_at
  FROM wallet_snapshots ws
  WHERE
    ws.wallet_address = p_wallet_address
    AND ws.created_at > NOW() - (p_max_age_hours || ' hours')::INTERVAL
  ORDER BY ws.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 辅助函数：获取钱包的追踪者数量
CREATE OR REPLACE FUNCTION get_wallet_tracker_count(p_wallet_address TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM wallet_trackers
    WHERE wallet_address = p_wallet_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 辅助函数：清理过期快照（定期任务调用）
CREATE OR REPLACE FUNCTION cleanup_expired_snapshots()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM wallet_snapshots
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '✅ Sprint 7 钱包分析系统数据库迁移完成！';
  RAISE NOTICE '📊 已创建表：wallet_trackers, wallet_snapshots, wallet_labels, wallet_comparisons';
  RAISE NOTICE '🔒 已配置 RLS 策略和索引';
  RAISE NOTICE '⚡ 已创建辅助函数：get_latest_wallet_snapshot, get_wallet_tracker_count, cleanup_expired_snapshots';
END $$;
