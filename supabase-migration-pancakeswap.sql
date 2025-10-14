-- PancakeSwap 数据缓存表
-- 用于缓存 PancakeSwap 的池子数据，减少对外部 API 的调用

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS pancakeswap_pools CASCADE;

-- PancakeSwap 池子缓存表
CREATE TABLE pancakeswap_pools (
  id TEXT PRIMARY KEY,
  chain TEXT NOT NULL,
  symbol TEXT NOT NULL,
  pool_meta TEXT, -- "V2" | "V3" | "StableSwap" | "Infinity"
  tvl_usd DECIMAL NOT NULL,
  apy DECIMAL NOT NULL,
  apy_base DECIMAL,
  apy_reward DECIMAL,
  volume_usd_1d DECIMAL,
  volume_usd_7d DECIMAL,
  reward_tokens TEXT[], -- 奖励代币地址数组
  underlying_tokens TEXT[] NOT NULL, -- 底层代币地址数组
  stablecoin BOOLEAN DEFAULT false,
  il_risk TEXT, -- Impermanent Loss 风险等级
  pool_url TEXT,
  data JSONB NOT NULL, -- 完整的池子数据（JSON格式）
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_chain ON pancakeswap_pools(chain);
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_tvl ON pancakeswap_pools(tvl_usd DESC);
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_apy ON pancakeswap_pools(apy DESC);
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_updated ON pancakeswap_pools(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_symbol ON pancakeswap_pools(symbol);
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_pool_meta ON pancakeswap_pools(pool_meta);
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_stablecoin ON pancakeswap_pools(stablecoin);

-- 创建 GIN 索引以支持 JSONB 查询
CREATE INDEX IF NOT EXISTS idx_pancakeswap_pools_data ON pancakeswap_pools USING GIN(data);

-- 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_pancakeswap_pools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pancakeswap_pools_updated_at
BEFORE UPDATE ON pancakeswap_pools
FOR EACH ROW
EXECUTE FUNCTION update_pancakeswap_pools_updated_at();

-- 启用 Row Level Security (RLS)
ALTER TABLE pancakeswap_pools ENABLE ROW LEVEL SECURITY;

-- RLS 策略：所有人可读
CREATE POLICY "Anyone can read pancakeswap pools"
ON pancakeswap_pools
FOR SELECT
USING (true);

-- RLS 策略：仅认证用户可以插入/更新（用于 API 缓存更新）
-- 注意：在生产环境中，这个策略可能需要更严格的权限控制
CREATE POLICY "Authenticated users can insert pancakeswap pools"
ON pancakeswap_pools
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update pancakeswap pools"
ON pancakeswap_pools
FOR UPDATE
TO authenticated
USING (true);

-- 添加注释
COMMENT ON TABLE pancakeswap_pools IS 'PancakeSwap 池子数据缓存表';
COMMENT ON COLUMN pancakeswap_pools.id IS '池子唯一标识符';
COMMENT ON COLUMN pancakeswap_pools.chain IS '区块链名称（如 BSC, Ethereum, Arbitrum）';
COMMENT ON COLUMN pancakeswap_pools.symbol IS '池子代币对符号（如 CAKE-BNB）';
COMMENT ON COLUMN pancakeswap_pools.pool_meta IS '池子类型（V2, V3, StableSwap, Infinity）';
COMMENT ON COLUMN pancakeswap_pools.tvl_usd IS '总锁仓价值（美元）';
COMMENT ON COLUMN pancakeswap_pools.apy IS '年化收益率（%）';
COMMENT ON COLUMN pancakeswap_pools.apy_base IS '基础年化收益率（交易手续费）';
COMMENT ON COLUMN pancakeswap_pools.apy_reward IS '奖励年化收益率（代币奖励）';
COMMENT ON COLUMN pancakeswap_pools.volume_usd_1d IS '24小时交易量（美元）';
COMMENT ON COLUMN pancakeswap_pools.volume_usd_7d IS '7天交易量（美元）';
COMMENT ON COLUMN pancakeswap_pools.reward_tokens IS '奖励代币地址数组';
COMMENT ON COLUMN pancakeswap_pools.underlying_tokens IS '底层代币地址数组';
COMMENT ON COLUMN pancakeswap_pools.stablecoin IS '是否为稳定币池';
COMMENT ON COLUMN pancakeswap_pools.il_risk IS '无常损失风险等级';
COMMENT ON COLUMN pancakeswap_pools.pool_url IS 'PancakeSwap 池子页面 URL';
COMMENT ON COLUMN pancakeswap_pools.data IS '完整的池子数据（JSONB格式）';
COMMENT ON COLUMN pancakeswap_pools.updated_at IS '最后更新时间';
COMMENT ON COLUMN pancakeswap_pools.created_at IS '创建时间';

-- 创建视图：高收益池子（APY > 10%，TVL > $100k）
CREATE OR REPLACE VIEW pancakeswap_top_yields AS
SELECT
  id,
  chain,
  symbol,
  pool_meta,
  tvl_usd,
  apy,
  apy_base,
  apy_reward,
  reward_tokens,
  stablecoin,
  pool_url,
  updated_at
FROM pancakeswap_pools
WHERE
  apy > 10
  AND tvl_usd > 100000
  AND updated_at > NOW() - INTERVAL '15 minutes' -- 只显示15分钟内更新的数据
ORDER BY apy DESC
LIMIT 50;

COMMENT ON VIEW pancakeswap_top_yields IS '高收益 PancakeSwap 池子视图（APY > 10%, TVL > $100k）';

-- 创建视图：稳定币池子
CREATE OR REPLACE VIEW pancakeswap_stable_pools AS
SELECT
  id,
  chain,
  symbol,
  pool_meta,
  tvl_usd,
  apy,
  apy_base,
  apy_reward,
  pool_url,
  updated_at
FROM pancakeswap_pools
WHERE
  stablecoin = true
  AND updated_at > NOW() - INTERVAL '15 minutes'
ORDER BY tvl_usd DESC
LIMIT 50;

COMMENT ON VIEW pancakeswap_stable_pools IS 'PancakeSwap 稳定币池子视图';

-- 创建视图：Farm 池子（有奖励代币的池子）
CREATE OR REPLACE VIEW pancakeswap_farms AS
SELECT
  id,
  chain,
  symbol,
  pool_meta,
  tvl_usd,
  apy,
  apy_base,
  apy_reward,
  reward_tokens,
  pool_url,
  updated_at
FROM pancakeswap_pools
WHERE
  reward_tokens IS NOT NULL
  AND array_length(reward_tokens, 1) > 0
  AND apy_reward > 0
  AND updated_at > NOW() - INTERVAL '15 minutes'
ORDER BY apy_reward DESC
LIMIT 100;

COMMENT ON VIEW pancakeswap_farms IS 'PancakeSwap Farm 池子视图（有奖励代币）';

-- 创建函数：清理过期缓存（超过1小时的数据）
CREATE OR REPLACE FUNCTION cleanup_old_pancakeswap_pools()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pancakeswap_pools
  WHERE updated_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_pancakeswap_pools IS '清理1小时前的 PancakeSwap 池子缓存数据';

-- 可选：创建定时任务自动清理过期数据（需要 pg_cron 扩展）
-- 如果你的 Supabase 项目启用了 pg_cron，可以取消下面的注释
-- SELECT cron.schedule(
--   'cleanup-pancakeswap-pools',
--   '0 * * * *', -- 每小时运行一次
--   'SELECT cleanup_old_pancakeswap_pools();'
-- );

-- 插入测试数据（可选，用于开发测试）
-- INSERT INTO pancakeswap_pools (
--   id, chain, symbol, pool_meta, tvl_usd, apy, apy_base, apy_reward,
--   underlying_tokens, stablecoin, pool_url, data
-- ) VALUES (
--   'test-pool-1',
--   'BSC',
--   'CAKE-BNB',
--   'V3',
--   5000000,
--   25.5,
--   5.5,
--   20.0,
--   ARRAY['0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'],
--   false,
--   'https://pancakeswap.finance/pools',
--   '{"test": true}'::jsonb
-- );
