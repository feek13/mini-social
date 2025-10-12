-- ================================================
-- DeFiLlama 数据缓存表迁移脚本
-- ================================================
-- 请在 Supabase SQL Editor 中运行此脚本
-- 路径: Supabase Dashboard > SQL Editor > New Query

-- ================================================
-- 1. 创建 defi_protocols 表（协议数据缓存）
-- ================================================
CREATE TABLE IF NOT EXISTS defi_protocols (
  protocol_slug TEXT PRIMARY KEY,
  protocol_name TEXT NOT NULL,
  logo TEXT,
  url TEXT,
  description TEXT,
  category TEXT,
  tvl NUMERIC,
  tvl_24h_change NUMERIC,
  tvl_7d_change NUMERIC,
  chains JSONB DEFAULT '[]'::jsonb,
  chain_tvls JSONB DEFAULT '{}'::jsonb,
  token_symbol TEXT,
  token_address TEXT,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS defi_protocols_category_idx ON defi_protocols(category);
CREATE INDEX IF NOT EXISTS defi_protocols_tvl_idx ON defi_protocols(tvl DESC);
CREATE INDEX IF NOT EXISTS defi_protocols_cached_at_idx ON defi_protocols(cached_at);
CREATE INDEX IF NOT EXISTS defi_protocols_expires_at_idx ON defi_protocols(expires_at);

-- 启用行级安全（RLS）
ALTER TABLE defi_protocols ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "DeFi protocols are viewable by everyone" ON defi_protocols;

-- 允许所有人读取协议数据
CREATE POLICY "DeFi protocols are viewable by everyone"
  ON defi_protocols FOR SELECT
  USING (true);

-- ================================================
-- 2. 创建 defi_yields 表（收益率数据）
-- ================================================
CREATE TABLE IF NOT EXISTS defi_yields (
  pool_id TEXT PRIMARY KEY,
  protocol TEXT NOT NULL,
  chain TEXT NOT NULL,
  symbol TEXT NOT NULL,
  apy NUMERIC,
  apy_base NUMERIC,
  apy_reward NUMERIC,
  tvl_usd NUMERIC,
  il_risk TEXT,
  exposure TEXT,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS defi_yields_protocol_idx ON defi_yields(protocol);
CREATE INDEX IF NOT EXISTS defi_yields_chain_idx ON defi_yields(chain);
CREATE INDEX IF NOT EXISTS defi_yields_apy_idx ON defi_yields(apy DESC);
CREATE INDEX IF NOT EXISTS defi_yields_tvl_idx ON defi_yields(tvl_usd DESC);
CREATE INDEX IF NOT EXISTS defi_yields_cached_at_idx ON defi_yields(cached_at);
CREATE INDEX IF NOT EXISTS defi_yields_expires_at_idx ON defi_yields(expires_at);

-- 启用行级安全（RLS）
ALTER TABLE defi_yields ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "DeFi yields are viewable by everyone" ON defi_yields;

-- 允许所有人读取收益率数据
CREATE POLICY "DeFi yields are viewable by everyone"
  ON defi_yields FOR SELECT
  USING (true);

-- ================================================
-- 3. 创建 defi_token_prices 表（代币价格缓存）
-- ================================================
CREATE TABLE IF NOT EXISTS defi_token_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chain TEXT NOT NULL,
  token_address TEXT NOT NULL,
  price_usd NUMERIC NOT NULL,
  symbol TEXT,
  decimals INTEGER,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '5 minutes',
  UNIQUE(chain, token_address)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS defi_token_prices_chain_address_idx ON defi_token_prices(chain, token_address);
CREATE INDEX IF NOT EXISTS defi_token_prices_symbol_idx ON defi_token_prices(symbol);
CREATE INDEX IF NOT EXISTS defi_token_prices_cached_at_idx ON defi_token_prices(cached_at);
CREATE INDEX IF NOT EXISTS defi_token_prices_expires_at_idx ON defi_token_prices(expires_at);

-- 启用行级安全（RLS）
ALTER TABLE defi_token_prices ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Token prices are viewable by everyone" ON defi_token_prices;

-- 允许所有人读取代币价格
CREATE POLICY "Token prices are viewable by everyone"
  ON defi_token_prices FOR SELECT
  USING (true);

-- ================================================
-- 4. 创建 post_defi_embeds 表（动态中嵌入的 DeFi 数据）
-- ================================================
CREATE TABLE IF NOT EXISTS post_defi_embeds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  embed_type TEXT NOT NULL CHECK (embed_type IN ('protocol', 'yield', 'token')),
  reference_id TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS post_defi_embeds_post_id_idx ON post_defi_embeds(post_id);
CREATE INDEX IF NOT EXISTS post_defi_embeds_type_idx ON post_defi_embeds(embed_type);
CREATE INDEX IF NOT EXISTS post_defi_embeds_reference_id_idx ON post_defi_embeds(reference_id);

-- 启用行级安全（RLS）
ALTER TABLE post_defi_embeds ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Post DeFi embeds are viewable by everyone" ON post_defi_embeds;
DROP POLICY IF EXISTS "Users can create embeds for own posts" ON post_defi_embeds;
DROP POLICY IF EXISTS "Users can delete embeds from own posts" ON post_defi_embeds;

-- 允许所有人读取嵌入数据
CREATE POLICY "Post DeFi embeds are viewable by everyone"
  ON post_defi_embeds FOR SELECT
  USING (true);

-- 用户可以为自己的动态添加 DeFi embed
CREATE POLICY "Users can create embeds for own posts"
  ON post_defi_embeds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_defi_embeds.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- 用户可以删除自己动态中的 DeFi embed
CREATE POLICY "Users can delete embeds from own posts"
  ON post_defi_embeds FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_defi_embeds.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- ================================================
-- 5. 创建清理过期缓存的函数（可选）
-- ================================================
CREATE OR REPLACE FUNCTION cleanup_expired_defi_cache()
RETURNS void AS $$
BEGIN
  -- 清理过期的协议数据
  DELETE FROM defi_protocols WHERE expires_at < NOW();

  -- 清理过期的收益率数据
  DELETE FROM defi_yields WHERE expires_at < NOW();

  -- 清理过期的代币价格
  DELETE FROM defi_token_prices WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 完成！
-- ================================================
-- DeFiLlama 缓存表设置完成。
--
-- 使用说明：
-- 1. Service role 可以通过 API 写入缓存数据（使用 service_role_key）
-- 2. 所有用户可以读取缓存数据
-- 3. 用户可以为自己的动态添加 DeFi embed
-- 4. 可以设置定时任务调用 cleanup_expired_defi_cache() 清理过期数据
