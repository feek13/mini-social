-- ============================================================
-- 钱包验证功能数据库迁移（修复版）
-- 添加钱包地址验证相关字段
-- ============================================================

-- 步骤 1: 添加钱包验证字段到 profiles 表
DO $$
BEGIN
  -- 添加 wallet_address 列
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN wallet_address TEXT;
  END IF;

  -- 添加 wallet_verified_at 列
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'wallet_verified_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN wallet_verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- 步骤 2: 添加注释
COMMENT ON COLUMN profiles.wallet_address IS '已验证的钱包地址（存储为小写，EIP-55校验和格式显示）';
COMMENT ON COLUMN profiles.wallet_verified_at IS '钱包地址验证时间';

-- 步骤 3: 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address
ON profiles(wallet_address)
WHERE wallet_address IS NOT NULL;

-- 步骤 4: 添加唯一约束：一个钱包地址只能绑定一个账户
-- 使用小写函数确保不区分大小写
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wallet_unique
ON profiles(LOWER(wallet_address))
WHERE wallet_address IS NOT NULL;

-- 步骤 5: 创建钱包验证历史表（用于审计）
CREATE TABLE IF NOT EXISTS wallet_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  signature TEXT NOT NULL,
  message TEXT NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- 步骤 6: 添加外键约束（如果表已存在，先删除再创建）
DO $$
BEGIN
  -- 删除旧的外键约束（如果存在）
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'wallet_verifications_user_id_fkey'
  ) THEN
    ALTER TABLE wallet_verifications DROP CONSTRAINT wallet_verifications_user_id_fkey;
  END IF;

  -- 创建新的外键约束
  ALTER TABLE wallet_verifications
  ADD CONSTRAINT wallet_verifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- 步骤 7: 为钱包验证历史表创建索引
CREATE INDEX IF NOT EXISTS idx_wallet_verifications_user_id
ON wallet_verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_verifications_wallet_address
ON wallet_verifications(wallet_address);

-- 步骤 8: 启用 RLS
ALTER TABLE wallet_verifications ENABLE ROW LEVEL SECURITY;

-- 步骤 9: 创建 RLS 策略
DO $$
BEGIN
  -- 删除旧策略（如果存在）
  DROP POLICY IF EXISTS "Users can view their own verification history" ON wallet_verifications;
  DROP POLICY IF EXISTS "Users can insert their own verification records" ON wallet_verifications;

  -- 创建新策略
END $$;

-- RLS 策略：用户只能查看自己的验证历史
CREATE POLICY "Users can view their own verification history"
ON wallet_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- RLS 策略：用户可以插入自己的验证记录
CREATE POLICY "Users can insert their own verification records"
ON wallet_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 步骤 10: 添加表注释
COMMENT ON TABLE wallet_verifications IS '钱包验证历史记录（用于审计和安全追踪）';
COMMENT ON COLUMN wallet_verifications.user_id IS '用户ID';
COMMENT ON COLUMN wallet_verifications.wallet_address IS '验证的钱包地址';
COMMENT ON COLUMN wallet_verifications.signature IS '签名数据';
COMMENT ON COLUMN wallet_verifications.message IS '签名消息';
COMMENT ON COLUMN wallet_verifications.verified_at IS '验证时间';

-- 完成
SELECT 'Migration completed successfully!' AS status;
