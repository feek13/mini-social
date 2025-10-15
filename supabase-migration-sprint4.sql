-- ============================================================
-- Sprint 4A: Web3 社交声誉系统数据库迁移
-- 添加 NFT 头像支持
-- ============================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 1: 添加 NFT 头像相关字段到 profiles 表
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
BEGIN
  -- NFT 头像图片 URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'nft_avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN nft_avatar_url TEXT;
  END IF;

  -- NFT 合约地址
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'nft_contract_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN nft_contract_address TEXT;
  END IF;

  -- NFT Token ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'nft_token_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN nft_token_id TEXT;
  END IF;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 2: 添加字段注释
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMENT ON COLUMN profiles.nft_avatar_url IS 'NFT 头像图片 URL';
COMMENT ON COLUMN profiles.nft_contract_address IS 'NFT 合约地址（Ethereum 主网）';
COMMENT ON COLUMN profiles.nft_token_id IS 'NFT Token ID';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 3: 创建索引（可选，用于查询优化）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX IF NOT EXISTS idx_profiles_nft_contract
ON profiles(nft_contract_address)
WHERE nft_contract_address IS NOT NULL;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 完成！
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT 'Sprint 4A migration completed successfully!' AS status;

-- 验证新字段
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'nft_avatar_url',
    'nft_contract_address',
    'nft_token_id'
  )
ORDER BY column_name;
