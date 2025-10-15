-- ============================================================
-- 钱包验证功能数据库迁移（分步执行版）
-- 请按顺序逐步执行每个步骤，遇到错误可以跳过继续下一步
-- ============================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 1: 添加 wallet_address 列
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE profiles ADD COLUMN wallet_address TEXT;

-- 如果上面报错 "column already exists"，忽略继续


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 2: 添加 wallet_verified_at 列
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE profiles ADD COLUMN wallet_verified_at TIMESTAMPTZ;

-- 如果上面报错 "column already exists"，忽略继续


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 3: 添加列注释
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMENT ON COLUMN profiles.wallet_address IS '已验证的钱包地址（存储为小写）';
COMMENT ON COLUMN profiles.wallet_verified_at IS '钱包地址验证时间';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 4: 创建普通索引
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX idx_profiles_wallet_address
ON profiles(wallet_address)
WHERE wallet_address IS NOT NULL;

-- 如果报错 "already exists"，忽略继续


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 5: 创建唯一索引（一个钱包只能绑定一个账户）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE UNIQUE INDEX idx_profiles_wallet_unique
ON profiles(lower(wallet_address))
WHERE wallet_address IS NOT NULL;

-- 如果报错 "already exists"，忽略继续


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 6: 创建钱包验证历史表
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE wallet_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  signature TEXT NOT NULL,
  message TEXT NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- 如果报错 "already exists"，忽略继续


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 7: 为历史表创建索引
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX idx_wallet_verifications_user_id
ON wallet_verifications(user_id);

CREATE INDEX idx_wallet_verifications_wallet_address
ON wallet_verifications(wallet_address);

-- 如果报错 "already exists"，忽略继续


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 8: 启用 RLS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE wallet_verifications ENABLE ROW LEVEL SECURITY;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 9: 创建 RLS 策略 - 查看权限
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE POLICY "Users can view their own verification history"
ON wallet_verifications
FOR SELECT
USING (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 10: 创建 RLS 策略 - 插入权限
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE POLICY "Users can insert their own verification records"
ON wallet_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 步骤 11: 添加表注释
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMENT ON TABLE wallet_verifications IS '钱包验证历史记录';
COMMENT ON COLUMN wallet_verifications.user_id IS '用户ID';
COMMENT ON COLUMN wallet_verifications.wallet_address IS '验证的钱包地址';
COMMENT ON COLUMN wallet_verifications.signature IS '签名数据';
COMMENT ON COLUMN wallet_verifications.message IS '签名消息';
COMMENT ON COLUMN wallet_verifications.verified_at IS '验证时间';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 完成！验证迁移结果
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('wallet_address', 'wallet_verified_at')
ORDER BY column_name;

-- 如果看到两行结果，说明迁移成功！
