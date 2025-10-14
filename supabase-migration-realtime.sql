-- ================================================
-- DeFi 实时更新功能 - 数据库迁移
-- ================================================
-- 请在 Supabase SQL Editor 中运行此脚本
-- 路径: Supabase Dashboard > SQL Editor > New Query
--
-- 此脚本为现有的 DeFi 缓存表添加实时更新支持字段

-- ================================================
-- 1. 为 defi_protocols 表添加实时更新字段
-- ================================================

-- 添加最后实时更新时间
ALTER TABLE defi_protocols
ADD COLUMN IF NOT EXISTS last_realtime_update TIMESTAMPTZ;

-- 添加实时更新启用标志
ALTER TABLE defi_protocols
ADD COLUMN IF NOT EXISTS realtime_enabled BOOLEAN DEFAULT FALSE;

-- 创建索引以优化实时查询
CREATE INDEX IF NOT EXISTS defi_protocols_realtime_update_idx
ON defi_protocols(last_realtime_update DESC);

CREATE INDEX IF NOT EXISTS defi_protocols_realtime_enabled_idx
ON defi_protocols(realtime_enabled) WHERE realtime_enabled = true;

-- ================================================
-- 2. 为 defi_yields 表添加实时更新字段
-- ================================================

-- 添加最后实时更新时间
ALTER TABLE defi_yields
ADD COLUMN IF NOT EXISTS last_realtime_update TIMESTAMPTZ;

-- 添加数据源标识（defillama 或 dexscreener）
ALTER TABLE defi_yields
ADD COLUMN IF NOT EXISTS realtime_source TEXT
CHECK (realtime_source IN ('defillama', 'dexscreener', NULL));

-- 添加实时数据标志
ALTER TABLE defi_yields
ADD COLUMN IF NOT EXISTS is_realtime BOOLEAN DEFAULT FALSE;

-- 创建索引
CREATE INDEX IF NOT EXISTS defi_yields_realtime_update_idx
ON defi_yields(last_realtime_update DESC);

CREATE INDEX IF NOT EXISTS defi_yields_realtime_source_idx
ON defi_yields(realtime_source) WHERE realtime_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS defi_yields_is_realtime_idx
ON defi_yields(is_realtime) WHERE is_realtime = true;

-- ================================================
-- 3. 创建实时数据更新日志表（可选，用于监控）
-- ================================================

CREATE TABLE IF NOT EXISTS defi_realtime_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_type TEXT NOT NULL CHECK (data_type IN ('protocols', 'yields', 'prices')),
  records_updated INTEGER DEFAULT 0,
  source TEXT,
  update_duration_ms INTEGER,
  status TEXT CHECK (status IN ('success', 'partial', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS defi_realtime_logs_type_idx
ON defi_realtime_logs(data_type);

CREATE INDEX IF NOT EXISTS defi_realtime_logs_created_at_idx
ON defi_realtime_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS defi_realtime_logs_status_idx
ON defi_realtime_logs(status);

-- 启用 RLS
ALTER TABLE defi_realtime_logs ENABLE ROW LEVEL SECURITY;

-- 允许所有人查看日志（可选，可以改为只允许管理员）
CREATE POLICY "Realtime logs are viewable by everyone"
  ON defi_realtime_logs FOR SELECT
  USING (true);

-- ================================================
-- 4. 创建实时数据刷新函数
-- ================================================

-- 标记需要实时更新的协议
CREATE OR REPLACE FUNCTION mark_protocols_for_realtime()
RETURNS void AS $$
BEGIN
  -- 将 TVL 超过 1B 的协议标记为需要实时更新
  UPDATE defi_protocols
  SET realtime_enabled = true
  WHERE tvl > 1000000000 AND realtime_enabled = false;

  -- 将长时间未更新的热门协议标记为需要实时更新
  UPDATE defi_protocols
  SET realtime_enabled = true
  WHERE tvl > 100000000
    AND (last_realtime_update IS NULL OR last_realtime_update < NOW() - INTERVAL '10 minutes')
    AND realtime_enabled = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 清理过期的实时数据
CREATE OR REPLACE FUNCTION cleanup_stale_realtime_data()
RETURNS void AS $$
BEGIN
  -- 重置超过 10 分钟未更新的实时标志
  UPDATE defi_yields
  SET is_realtime = false
  WHERE is_realtime = true
    AND last_realtime_update < NOW() - INTERVAL '10 minutes';

  -- 清理超过 7 天的日志
  DELETE FROM defi_realtime_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 5. 创建视图：实时数据摘要
-- ================================================

CREATE OR REPLACE VIEW defi_realtime_summary AS
SELECT
  'protocols' AS data_type,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE realtime_enabled = true) AS realtime_enabled_count,
  COUNT(*) FILTER (WHERE last_realtime_update > NOW() - INTERVAL '5 minutes') AS recently_updated_count,
  MAX(last_realtime_update) AS last_update
FROM defi_protocols

UNION ALL

SELECT
  'yields' AS data_type,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE is_realtime = true) AS realtime_enabled_count,
  COUNT(*) FILTER (WHERE last_realtime_update > NOW() - INTERVAL '5 minutes') AS recently_updated_count,
  MAX(last_realtime_update) AS last_update
FROM defi_yields;

-- ================================================
-- 完成！
-- ================================================
-- 实时更新功能的数据库设置完成。
--
-- 使用说明：
-- 1. 运行 mark_protocols_for_realtime() 标记需要实时更新的协议
-- 2. 应用服务器将通过 SSE 每 2 秒推送更新
-- 3. 查询 defi_realtime_summary 视图查看实时更新状态
-- 4. 定期运行 cleanup_stale_realtime_data() 清理过期数据
--
-- 监控查询示例：
-- SELECT * FROM defi_realtime_summary;
-- SELECT * FROM defi_realtime_logs ORDER BY created_at DESC LIMIT 10;

-- 初始化：标记需要实时更新的协议
SELECT mark_protocols_for_realtime();
