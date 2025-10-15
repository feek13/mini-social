# Sprint 4A 准备清单

开始 Sprint 4A（Web3 社交声誉系统）前，请按以下步骤准备：

---

## ✅ 第一步：运行数据库迁移

在 Supabase Dashboard 的 SQL Editor 中执行：

```bash
supabase-migration-sprint4.sql
```

**预期结果：**
- ✅ `Sprint 4A migration completed successfully!`
- ✅ 显示 3 个新字段：`nft_avatar_url`, `nft_contract_address`, `nft_token_id`

---

## ✅ 第二步：注册 Alchemy API（用于 NFT 数据）

### 为什么需要 Alchemy？
- NFT 头像功能需要获取用户拥有的 NFT
- Alchemy 提供免费的 NFT API（每秒 5 个请求）

### 注册步骤：

1. **访问** https://www.alchemy.com/
2. **点击 "Start Building"**
3. **注册账号**（Google/GitHub/Email 都可以）
4. **创建新应用**：
   - Name: `MiniSocial NFT`
   - Chain: `Ethereum`
   - Network: `Mainnet`
5. **获取 API Key**：
   - 点击应用进入详情页
   - 点击 "VIEW KEY"
   - 复制 API Key

### 配置环境变量

在 `.env.local` 中添加：

```env
# 已有的配置
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# ✨ 新增：Alchemy API Key（用于 NFT 功能）
NEXT_PUBLIC_ALCHEMY_API_KEY=your-alchemy-api-key
```

⚠️ **注意**：由于变量以 `NEXT_PUBLIC_` 开头，它会暴露到客户端。Alchemy 的免费版本限制请求频率，生产环境建议使用服务端 API。

---

## ✅ 第三步：检查依赖包（已全部安装 ✅）

运行以下命令确认依赖完整：

```bash
npm list recharts wagmi viem @rainbow-me/rainbowkit
```

**预期输出：**
```
mini-social@0.1.0 /Users/hxt/vibecode/mini-social
├── recharts@3.2.1
├── wagmi@2.18.0
├── viem@2.38.2
└── @rainbow-me/rainbowkit@2.2.9
```

✅ 所有依赖已安装，无需额外操作。

---

## ✅ 第四步：重启开发服务器

在 `.env.local` 添加新变量后，需要重启开发服务器：

```bash
# 停止当前服务器（Ctrl + C）
# 然后重新启动
npm run dev
```

**验证环境变量：**
在浏览器控制台运行：
```javascript
console.log(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY)
```

应该输出你的 API Key。

---

## 📋 准备完成检查表

开始开发前，请确认：

- [ ] ✅ 数据库迁移已执行（3 个 NFT 字段已添加）
- [ ] ✅ Alchemy API Key 已获取
- [ ] ✅ `.env.local` 已配置 `NEXT_PUBLIC_ALCHEMY_API_KEY`
- [ ] ✅ 开发服务器已重启
- [ ] ✅ 环境变量在浏览器控制台可访问

---

## 🚀 下一步

完成上述准备后，告诉我，我将开始：

1. **阶段 1**：PostCard 和 CommentCard 集成 WalletBadge（45 分钟）
2. **阶段 2**：创建 ReputationModal 详情弹窗（1 小时）
3. **阶段 3**：创建排行榜 API（30 分钟）
4. **阶段 4**：创建排行榜页面（1 小时）
5. **阶段 5**：NFT 头像功能（2 小时）
6. **阶段 6**：测试和优化（30 分钟）

---

## 💡 可选：Alchemy 替代方案

如果 Alchemy 注册有问题，可以使用以下替代方案：

### 方案 1：Moralis API
- 网站：https://moralis.io/
- 同样提供免费 NFT API
- 配置：`NEXT_PUBLIC_MORALIS_API_KEY=xxx`

### 方案 2：暂时跳过 NFT 功能
- 可以先完成阶段 1-4（声誉社交化功能）
- 稍后再添加 NFT 头像（阶段 5）

---

## ❓ 常见问题

### Q1: Alchemy 免费版本够用吗？
**A**: 完全够用。免费版提供：
- 每秒 5 个请求
- 每月 300M 计算单元
- 足够个人项目和小型应用使用

### Q2: 为什么不使用服务端 API？
**A**: Sprint 4A 为了快速开发，使用客户端 API。生产环境建议改为：
```typescript
// app/api/nft/owned/route.ts
const alchemyKey = process.env.ALCHEMY_API_KEY // 不带 NEXT_PUBLIC_
```

### Q3: 数据库迁移失败怎么办？
**A**: 检查 Supabase Dashboard 是否有错误提示。常见问题：
- 字段已存在：正常，迁移脚本有 `IF NOT EXISTS` 检查
- 权限问题：确保使用的是 service_role 权限

---

## 📞 需要帮助？

如果准备过程遇到任何问题，立即告诉我！我会帮你解决。

准备完成后，说 **"准备好了"** 或 **"开始开发"**，我立即开始 Sprint 4A 的实施。
