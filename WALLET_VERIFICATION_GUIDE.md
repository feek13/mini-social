# 钱包验证功能实施指南

## ✅ 已完成的功能

### 1. 数据库结构设计
- ✅ 更新 `Profile` 类型添加钱包相关字段
- ✅ 创建数据库迁移脚本 `supabase-migration-wallet-verification.sql`
- ✅ 创建钱包验证历史表用于审计

### 2. 后端 API 实现
- ✅ 签名验证工具 (`lib/wallet-verification.ts`)
  - 生成待签名消息
  - 验证 EIP-191 签名
  - 地址格式验证和规范化
- ✅ 钱包验证 API (`/api/wallet/verify`)
  - 验证用户签名
  - 绑定钱包到用户账户
  - 防止重复绑定
  - 记录验证历史
- ✅ 钱包解绑 API (`/api/wallet/unlink`)
  - 解除钱包绑定
  - 清除验证记录

### 3. 前端集成
- ✅ 钱包验证组件 (`components/WalletVerification.tsx`)
  - 显示连接的钱包地址
  - 请求用户签名验证
  - 显示绑定状态
  - 支持解绑操作
- ✅ 集成到编辑资料页面 (`app/profile/edit/page.tsx`)

## 🔄 待执行步骤

### 步骤 1: 运行数据库迁移

在 Supabase SQL Editor 中执行以下脚本：

```bash
# 打开 Supabase Dashboard
# 导航到 SQL Editor
# 运行 supabase-migration-wallet-verification.sql
```

迁移脚本会：
1. 添加 `wallet_address` 和 `wallet_verified_at` 字段到 `profiles` 表
2. 创建索引优化查询性能
3. 添加唯一约束（一个钱包只能绑定一个账户）
4. 创建 `wallet_verifications` 审计表
5. 配置 RLS 策略

### 步骤 2: 验证环境变量

确保 `.env.local` 包含：
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=688822107f2b0d2c3165c2f7100005cc
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🧪 测试流程

### 测试前准备

1. 确保数据库迁移已执行
2. 启动开发服务器：`npm run dev`
3. 准备一个支持的钱包（MetaMask、WalletConnect 等）

### 测试步骤

#### 1. 测试钱包连接
1. 访问 `http://localhost:3000`
2. 登录你的账户
3. 点击右上角"连接钱包"按钮
4. 选择钱包类型并连接
5. ✅ 验证：钱包成功连接，按钮显示钱包地址

#### 2. 测试钱包验证
1. 访问 `http://localhost:3000/profile/edit`
2. 滚动到页面底部"钱包验证"部分
3. 确认已连接钱包
4. 点击"验证并绑定钱包"按钮
5. 在钱包弹窗中签名消息（无 gas 费用）
6. ✅ 验证：显示"钱包验证成功"消息
7. ✅ 验证：页面刷新后显示已绑定的钱包地址

#### 3. 测试重复绑定保护
1. 使用另一个账户登录
2. 连接相同的钱包地址
3. 尝试验证钱包
4. ✅ 验证：显示错误"该钱包已被用户 XXX 绑定"

#### 4. 测试钱包解绑
1. 在编辑资料页面
2. 点击"解绑钱包"按钮
3. 确认操作
4. ✅ 验证：显示"钱包已成功解绑"
5. ✅ 验证：页面刷新后钱包验证区域恢复初始状态

#### 5. 测试数据库记录
1. 在 Supabase Dashboard 查看 `profiles` 表
2. ✅ 验证：`wallet_address` 字段正确填充（小写格式）
3. ✅ 验证：`wallet_verified_at` 时间戳正确
4. 查看 `wallet_verifications` 表
5. ✅ 验证：验证历史记录正确保存

## 🔍 故障排除

### 问题：签名验证失败
**原因**：签名格式不正确或消息不匹配
**解决**：
- 检查消息格式是否正确（使用 `generateVerificationMessage`）
- 确保使用 EIP-191 标准签名
- 查看浏览器控制台的详细错误信息

### 问题：数据库错误
**原因**：迁移未执行或 RLS 策略问题
**解决**：
- 确认 `supabase-migration-wallet-verification.sql` 已执行
- 检查 Supabase Dashboard 的 Logs 查看详细错误
- 验证 RLS 策略是否正确启用

### 问题：钱包连接但无法签名
**原因**：钱包权限或网络问题
**解决**：
- 检查钱包是否已解锁
- 确认网络连接正常
- 尝试刷新页面重新连接钱包

## 📊 技术架构

### 数据流
```
1. 用户点击"验证并绑定钱包"
   ↓
2. 生成待签名消息（包含地址、用户名、时间戳）
   ↓
3. 请求钱包签名（EIP-191 标准）
   ↓
4. 发送签名到后端 API
   ↓
5. 后端使用 viem 验证签名
   ↓
6. 验证通过后更新数据库
   ↓
7. 记录验证历史（审计）
   ↓
8. 返回成功响应
```

### 安全特性
- ✅ EIP-191 标准签名验证
- ✅ 防止重复绑定（唯一约束）
- ✅ 地址规范化（小写存储）
- ✅ 验证历史审计
- ✅ RLS 策略保护
- ✅ 会话超时保护（5 分钟）

## 🎯 下一步（未来功能）

1. **用户声誉评分系统**
   - 基于钱包历史活动计算声誉分
   - 集成 DeFi 协议参与度
   - 展示 NFT 持有情况

2. **钱包数据展示**
   - 在用户资料页显示验证徽章
   - 展示钱包持有的代币
   - 显示 DeFi 协议参与记录

3. **多钱包支持**
   - 允许用户绑定多个钱包
   - 主钱包和次要钱包概念
   - 钱包切换功能

## 📝 相关文件

### 后端
- `lib/wallet-verification.ts` - 签名验证工具
- `app/api/wallet/verify/route.ts` - 验证 API
- `app/api/wallet/unlink/route.ts` - 解绑 API

### 前端
- `components/WalletVerification.tsx` - 验证组件
- `app/profile/edit/page.tsx` - 集成页面
- `lib/wagmi.ts` - Web3 配置

### 数据库
- `supabase-migration-wallet-verification.sql` - 迁移脚本
- `types/database.ts` - TypeScript 类型定义

### 文档
- `WALLET_VERIFICATION_GUIDE.md` - 本文档
- `CLAUDE.md` - 项目总体说明

## ⚠️ 重要提示

1. **数据库迁移必须先执行**，否则应用会报错
2. **签名操作不会产生 gas 费用**，纯链下验证
3. **钱包地址存储为小写**，显示时使用 EIP-55 校验和格式
4. **一个钱包只能绑定一个账户**，防止身份冒用
5. **验证历史永久保存**，用于安全审计
