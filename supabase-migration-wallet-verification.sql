-- ============================================================
-- 钱包验证功能数据库迁移
-- 添加钱包地址验证相关字段
-- ============================================================

-- 1. 添加钱包验证字段到 profiles 表
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS wallet_address TEXT,
ADD COLUMN IF NOT EXISTS wallet_verified_at TIMESTAMPTZ;

-- 2. 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address
ON profiles(wallet_address)
WHERE wallet_address IS NOT NULL;

-- 3. 添加唯一约束：一个钱包地址只能绑定一个账户
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wallet_unique
ON profiles(LOWER(wallet_address))
WHERE wallet_address IS NOT NULL;

-- 4. 添加注释
COMMENT ON COLUMN profiles.wallet_address IS '已验证的钱包地址（存储为小写，EIP-55校验和格式显示）';
COMMENT ON COLUMN profiles.wallet_verified_at IS '钱包地址验证时间';

-- 5. 更新 RLS 策略（确保用户可以更新自己的钱包信息）
-- 用户可以更新自己的 wallet_address 和 wallet_verified_at
-- 注意：这里假设已有的 profiles 更新策略允许用户更新自己的记录
-- 如果需要更细粒度的控制，可以创建专门的策略

-- 6. 创建钱包验证历史表（可选，用于审计）
CREATE TABLE IF NOT EXISTS wallet_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  signature TEXT NOT NULL,
  message TEXT NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW(),

  -- 索引
  CONSTRAINT wallet_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 为钱包验证历史表创建索引
CREATE INDEX IF NOT EXISTS idx_wallet_verifications_user_id
ON wallet_verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_verifications_wallet_address
ON wallet_verifications(wallet_address);

-- 启用 RLS
ALTER TABLE wallet_verifications ENABLE ROW LEVEL SECURITY;

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

-- 添加注释
COMMENT ON TABLE wallet_verifications IS '钱包验证历史记录（用于审计和安全追踪）';
COMMENT ON COLUMN wallet_verifications.user_id IS '用户ID';
COMMENT ON COLUMN wallet_verifications.wallet_address IS '验证的钱包地址';
COMMENT ON COLUMN wallet_verifications.signature IS '签名数据';
COMMENT ON COLUMN wallet_verifications.message IS '签名消息';
COMMENT ON COLUMN wallet_verifications.verified_at IS '验证时间';
