# MiniSocial - Web3 社交平台

<div align="center">

一个功能完整的 Web3 社交平台，融合传统社交与链上身份验证、DeFi 数据、NFT 展示等 Web3 特性。

**[在线演示](#) | [功能文档](./CLAUDE.md) | [API 文档](#api-文档)**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)](https://supabase.com/)

</div>

---

## 🌟 核心特性

### 🔐 Web3 身份系统
- **钱包连接** - 通过 RainbowKit 支持 MetaMask、Coinbase Wallet 等
- **链上验证** - 签名验证钱包所有权，防止伪造
- **多链支持** - 支持 Ethereum、BSC、Polygon、Arbitrum 等主流链
- **NFT 头像** - 使用持有的 NFT 作为个人头像
- **钱包追踪** - 实时追踪关注钱包的资产变化和交易

### 🏆 声誉系统
- **多维度评分** - 基于钱包年龄、活跃度、DeFi 参与、资产规模等
- **5 级等级** - 🥉 Bronze → 🥈 Silver → 🥇 Gold → 💎 Diamond → 👑 Legend
- **链上数据验证** - 真实的区块链数据，无法伪造
- **声誉徽章** - 在动态、评论中展示用户等级
- **排行榜** - 全站声誉排名，激励用户提升链上活跃度

### 💬 社交功能
- **发布动态** - 支持文字、图片、链接预览（280 字符限制）
- **转发功能** - 转发他人动态并添加评论
- **互动系统** - 点赞、评论（支持嵌套）、提及 (@mention)
- **关注系统** - 关注用户，特别关注通知
- **私信功能** - Telegram 风格的私信界面，实时消息推送
- **热门动态** - 基于热度算法的趋势内容
- **标签系统** - #话题标签，点击查看相关动态
- **搜索功能** - 全文搜索用户和动态

### 📊 DeFi 数据浏览器
- **1000+ 协议** - 实时 TVL、分类、链分布、24h 变化
- **收益率查询** - APY/APR 数据，筛选高收益池子
- **代币价格** - WebSocket 实时价格推送（Binance）
- **历史图表** - TVL/APY/价格历史数据可视化（Recharts）
- **多时间范围** - 7d, 30d, 90d, 180d, 1y, All
- **DeFi 嵌入** - 动态中嵌入协议/池子数据卡片
- **PancakeSwap 集成** - 专属 Farm 和 Pool 数据
- **一键认购** - 直接跳转到 DeFi 协议页面

### 🔧 DeFi 工具
- **Gas 费监控** - 实时查看主流链的 Gas Price
- **钱包分析** - 分析钱包持仓、交易历史、DeFi 参与度
- **协议比较** - 多个 DeFi 协议的数据对比
- **收益计算器** - APY 收益计算和预测

### 🛡️ 内容审核系统
- **举报功能** - 用户可举报不当内容
- **管理后台** - 管理员审核举报、封禁用户
- **敏感词过滤** - 自动检测和过滤违规内容
- **封禁管理** - 临时或永久封禁违规用户
- **审核日志** - 完整的管理操作记录

### 🔔 通知系统
- **5 种通知类型** - 点赞、评论、转发、关注、发文
- **实时推送** - Supabase Realtime，无需刷新
- **未读计数** - 实时更新未读数量
- **通知筛选** - 按类型查看通知

---

## 🛠 技术栈

### 前端
- **框架**: Next.js 15 (App Router) + TypeScript
- **样式**: Tailwind CSS v4
- **状态管理**: React Context + React Query (TanStack Query)
- **动画**: Framer Motion
- **图表**: Recharts
- **Web3**: RainbowKit + Wagmi + Viem
- **工具库**: Lodash, DOMPurify, Zod

### 后端
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **实时功能**: Supabase Realtime
- **存储**: Supabase Storage（预留）
- **缓存**: Redis (Upstash)

### Web3 集成
- **钱包连接**: RainbowKit
- **区块链交互**: Wagmi + Viem
- **链上数据**: Alchemy SDK
- **NFT 数据**: Alchemy NFT API
- **DeFi 数据**: DeFiLlama API
- **价格数据**: CoinGecko + Binance WebSocket

### 部署
- **平台**: Vercel
- **构建**: Turbopack
- **CDN**: Vercel Edge Network

---

## 🚀 快速开始

### 环境要求
- Node.js 18.x 或更高版本
- npm / yarn / pnpm
- Supabase 账号
- Alchemy API Key（Web3 功能）

### 1. 克隆仓库
```bash
git clone <your-repo-url>
cd mini-social
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```env
# Supabase（必需）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Alchemy（Web3 功能必需）
NEXT_PUBLIC_ALCHEMY_API_KEY=your-alchemy-api-key

# Redis（可选，用于缓存）
UPSTASH_REDIS_URL=your-redis-url
UPSTASH_REDIS_TOKEN=your-redis-token

# 其他配置（可选）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

### 4. 设置数据库

依次在 Supabase SQL Editor 中运行以下脚本：

```bash
# 1. 基础数据库结构
supabase-setup.sql

# 2. 通知系统
supabase-notifications.sql

# 3. 嵌套评论支持
supabase-migration-add-nested-comments.sql

# 4. 计数修复
supabase-migration-fix-counts.sql

# 5. 标签和提及功能
supabase-migration-hashtags-mentions.sql

# 6. DeFi 数据缓存表
supabase-migration-defillama.sql

# 7. PancakeSwap 集成
supabase-migration-pancakeswap.sql

# 8. 钱包验证（任选一个版本）
supabase-migration-wallet-step-by-step.sql

# 9. 声誉系统
supabase-migration-reputation-system.sql

# 10. 私信系统
supabase-migration-sprint5-messaging.sql

# 11. 内容审核系统
supabase-migration-sprint6-moderation.sql

# 12. 钱包分析
supabase-migration-sprint7-wallet-analysis.sql

# 13. 启用实时功能
supabase-enable-realtime.sql
```

### 5. 启动开发服务器
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

---

## 📦 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（使用 Turbopack） |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run test:defillama` | 测试 DeFiLlama API 客户端 |
| `npm run test:defillama:full` | 完整集成测试 |
| `npm run test:defillama:quick` | 快速测试（bash） |
| `npm run test:frontend` | 前端 DeFi 功能测试 |
| `npm run test:pancakeswap` | 测试 PancakeSwap 集成 |
| `npm run test:web3` | 测试 Web3 集成 |

---

## 📁 项目结构

```
mini-social/
├── app/                          # Next.js App Router
│   ├── api/                     # API 路由
│   │   ├── auth/               # 认证相关
│   │   ├── posts/              # 动态相关
│   │   ├── comments/           # 评论相关
│   │   ├── users/              # 用户相关
│   │   ├── notifications/      # 通知相关
│   │   ├── messages/           # 私信相关
│   │   ├── search/             # 搜索功能
│   │   ├── wallet/             # 钱包相关
│   │   ├── admin/              # 管理功能
│   │   └── defi/               # DeFi 数据 API
│   ├── profile/[username]/     # 个人主页
│   ├── post/[postId]/          # 动态详情页
│   ├── messages/               # 私信页面
│   ├── wallet/                 # 钱包页面
│   ├── leaderboard/            # 排行榜
│   ├── defi/                   # DeFi 数据浏览器
│   ├── gas/                    # Gas 费监控
│   ├── admin/                  # 管理后台
│   └── ...
├── components/                  # React 组件
│   ├── PostCard.tsx            # 动态卡片
│   ├── CommentList.tsx         # 评论列表
│   ├── Avatar.tsx              # 头像组件
│   ├── WalletBadge.tsx         # 钱包验证徽章
│   ├── ReputationCard.tsx      # 声誉卡片
│   ├── messaging/              # 私信组件
│   ├── defi/                   # DeFi 组件
│   │   ├── charts/             # 图表组件（Recharts）
│   │   └── ...
│   └── ...
├── lib/                        # 工具函数和配置
│   ├── supabase.ts             # Supabase 客户端
│   ├── defillama/              # DeFiLlama 客户端
│   ├── pancakeswap/            # PancakeSwap 客户端
│   ├── reputation/             # 声誉算法
│   ├── etherscan/              # Etherscan 集成
│   └── web3/                   # Web3 工具（计划中）
├── types/                      # TypeScript 类型定义
└── supabase-*.sql              # 数据库迁移脚本
```

---

## 🗄️ 数据库架构

### 核心数据表

| 表名 | 说明 |
|------|------|
| `profiles` | 用户资料（用户名、头像、简介、钱包地址、声誉等） |
| `posts` | 动态（内容、点赞数、评论数、转发） |
| `likes` | 点赞记录 |
| `comments` | 评论（支持嵌套） |
| `follows` | 关注关系 |
| `notifications` | 通知记录 |
| `conversations` | 私信会话 |
| `messages` | 私信消息 |
| `wallet_verifications` | 钱包验证记录 |
| `reputation_history` | 声誉历史记录 |
| `reports` | 举报记录 |
| `banned_users` | 封禁用户 |
| `banned_words` | 敏感词列表 |
| `defi_protocols` | DeFi 协议数据缓存 |
| `defi_yields` | 收益率数据缓存 |
| `defi_token_prices` | 代币价格缓存 |
| `pancake_pools` | PancakeSwap 池子数据 |
| `pancake_farms` | PancakeSwap Farm 数据 |

### 关键特性
- ✅ **RLS 策略** - 所有表都启用行级安全
- ✅ **触发器** - 自动维护计数和通知
- ✅ **索引优化** - 提升查询性能
- ✅ **实时功能** - 私信和通知实时推送
- ✅ **数据缓存** - DeFi 数据缓存减少 API 调用

---

## 🎯 核心功能详解

### 1. 声誉系统

声誉评分基于多个维度，真实反映用户的链上活跃度：

| 维度 | 权重 | 最高分 | 评分标准 |
|------|------|--------|----------|
| 钱包年龄 | 20% | 20 分 | 基于首次交易时间 |
| 活跃度 | 25% | 25 分 | 交易数量和频率 |
| DeFi 参与 | 30% | 30 分 | 使用的 DeFi 协议数 |
| 资产规模 | 15% | 15 分 | ETH 余额和代币价值 |
| 社交活动 | 10% | 10 分 | 发文、点赞、评论数 |

**等级划分**:
- 🥉 Bronze (0-19 分)
- 🥈 Silver (20-39 分)
- 🥇 Gold (40-59 分)
- 💎 Diamond (60-79 分)
- 👑 Legend (80-100 分)

### 2. DeFi 数据集成

#### 数据来源
- **DeFiLlama API** - 协议 TVL、收益率、链数据
- **PancakeSwap API** - DEX 专属数据
- **CoinGecko API** - 代币价格
- **Binance WebSocket** - 实时价格推送

#### 可视化图表
- TVL 历史图表（Area Chart）
- APY 趋势图（Line Chart）
- 价格走势图（Candlestick Chart）
- 迷你趋势图（Sparkline）

### 3. 钱包验证流程

```typescript
1. 用户连接钱包（MetaMask）
2. 生成随机 nonce
3. 用户签名 nonce
4. 后端验证签名
5. 保存钱包地址到数据库
6. 获取链上数据（Etherscan/Alchemy）
7. 计算声誉分数
8. 展示钱包徽章和声誉卡片
```

### 4. 私信系统

- **Telegram 风格** - 左侧会话列表，右侧聊天窗口
- **实时推送** - Supabase Realtime，无需刷新
- **已读状态** - 消息已读/未读标记
- **响应式设计** - 移动端自动切换视图

---

## 🌍 部署到 Vercel

### 方法一：通过 Vercel Dashboard（推荐）

1. 访问 [Vercel](https://vercel.com) 并登录
2. 点击 "Add New Project"
3. 导入你的 Git 仓库
4. 配置环境变量（见上文）
5. 点击 "Deploy"

### 方法二：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel
```

### 部署后配置

1. **Supabase 设置**
   - 确保运行了所有数据库迁移脚本
   - 配置 Row Level Security (RLS) 策略
   - 在 Authentication → URL Configuration 中添加 Vercel 域名
   - 启用 Realtime（私信功能）

2. **环境变量检查**
   - 在 Vercel Dashboard 中验证环境变量
   - 重新部署以应用更改

3. **Alchemy 配置**
   - 确保 API Key 有效
   - 检查免费额度使用情况

---

## 🔧 环境变量说明

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | ✅ 是 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | ✅ 是 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端密钥 | ⚠️ 推荐 |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Alchemy API Key | ✅ 是 |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect 项目 ID | ⚠️ 推荐 |
| `UPSTASH_REDIS_URL` | Redis 缓存 URL | ⚪ 可选 |
| `UPSTASH_REDIS_TOKEN` | Redis 访问令牌 | ⚪ 可选 |

> **注意**: 以 `NEXT_PUBLIC_` 开头的变量会暴露到客户端，切勿在其中存储敏感信息。

---

## 💡 使用示例

### 连接钱包并验证

```typescript
import { useAccount, useSignMessage } from 'wagmi'
import { useAuth } from '@/app/providers/AuthProvider'

function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { signMessage } = useSignMessage()
  const { user } = useAuth()

  const handleVerify = async () => {
    // 1. 获取 nonce
    const nonce = await fetch('/api/wallet/nonce').then(r => r.json())

    // 2. 签名
    const signature = await signMessage({
      message: `Verify wallet: ${nonce}`
    })

    // 3. 验证
    await fetch('/api/wallet/verify', {
      method: 'POST',
      body: JSON.stringify({ address, signature, nonce })
    })
  }
}
```

### 查询 DeFi 数据

```typescript
import { defillama } from '@/lib/defillama'

// 获取协议列表
const protocols = await defillama.getProtocols()

// 获取协议详情
const protocol = await defillama.getProtocol('aave')

// 获取代币价格
const price = await defillama.getTokenPrice('ethereum', '0x...')

// 获取收益率数据
const yields = await defillama.getTopYields(10, 1000000)
```

### 发送私信

```typescript
import { supabase } from '@/lib/supabase'

// 1. 查找或创建会话
const { data: conversation } = await supabase
  .from('conversations')
  .insert({
    user1_id: currentUserId,
    user2_id: targetUserId
  })
  .select()
  .single()

// 2. 发送消息
await supabase
  .from('messages')
  .insert({
    conversation_id: conversation.id,
    sender_id: currentUserId,
    content: 'Hello!'
  })
```

---

## ❓ 常见问题

### 部署后无法连接到 Supabase

**解决方案**:
1. 检查环境变量是否正确配置
2. 确认 Supabase 项目处于活跃状态
3. 验证是否运行了所有数据库脚本
4. 检查 Supabase 的 URL 配置中是否添加了部署域名

### 钱包连接失败

**解决方案**:
1. 确保已安装 MetaMask 或其他钱包插件
2. 检查 Alchemy API Key 是否有效
3. 确认 WalletConnect Project ID 已配置
4. 查看浏览器控制台错误信息

### DeFi 图表不显示

**解决方案**:
1. 检查浏览器控制台是否有错误
2. 确认已运行 `supabase-migration-defillama.sql`
3. 验证 DeFiLlama API 可访问（运行 `npm run test:defillama`）
4. 清除缓存：`rm -rf .next && npm run dev`

### 私信功能不工作

**解决方案**:
1. 确认已运行 `supabase-migration-sprint5-messaging.sql`
2. 在 Supabase Dashboard 启用 Realtime
3. 运行 `supabase-enable-realtime.sql` 启用表级实时功能
4. 检查浏览器控制台 WebSocket 连接状态

---

## 🎯 性能优化

- ✅ **数据库索引** - 为常用查询字段创建索引
- ✅ **乐观更新** - 点赞、关注等操作立即响应
- ✅ **骨架屏** - 提升感知性能
- ✅ **Next.js 优化** - 自动代码分割和图片优化
- ✅ **Turbopack** - 加速开发构建
- ✅ **API 缓存** - Redis 缓存热点数据
- ✅ **懒加载** - 图片和组件按需加载
- ✅ **WebSocket** - 实时数据推送减少轮询

---

## 🔒 安全措施

- ✅ **Row Level Security (RLS)** - 数据库级别访问控制
- ✅ **XSS 防护** - DOMPurify 清理用户输入
- ✅ **CSRF 保护** - Supabase Auth 内置保护
- ✅ **输入验证** - Zod 验证所有表单输入
- ✅ **SQL 注入防护** - 参数化查询
- ✅ **Rate Limiting** - API 速率限制
- ✅ **内容审核** - 敏感词过滤和举报系统
- ✅ **签名验证** - 钱包签名验证防伪造

---

## 📚 相关文档

- [CLAUDE.md](./CLAUDE.md) - 开发指南和架构详解
- [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) - 项目路线图和进度
- [WEB3_SERVICES_ARCHITECTURE.md](./WEB3_SERVICES_ARCHITECTURE.md) - Web3 服务架构
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - 数据库设置指南
- [NOTIFICATIONS-SETUP.md](./NOTIFICATIONS-SETUP.md) - 通知系统详解
- [WALLET_VERIFICATION_GUIDE.md](./WALLET_VERIFICATION_GUIDE.md) - 钱包验证指南
- [lib/defillama/README.md](./lib/defillama/README.md) - DeFiLlama 客户端文档
- [PANCAKESWAP_INTEGRATION.md](./PANCAKESWAP_INTEGRATION.md) - PancakeSwap 集成说明

---

## 🛣️ 开发路线图

### ✅ 已完成
- [x] 核心社交功能（发文、点赞、评论、关注）
- [x] DeFi 数据集成（DeFiLlama、PancakeSwap）
- [x] 钱包验证与声誉系统
- [x] NFT 头像功能
- [x] 私信系统（Telegram 风格）
- [x] 内容审核系统
- [x] 排行榜
- [x] Gas 费监控

### 🔄 进行中
- [ ] 钱包追踪功能完善
- [ ] Web3 多服务集成（Alchemy + Covalent + Ankr）
- [ ] 移动端优化

### 📋 计划中
- [ ] 多链声誉聚合
- [ ] 链上动态（智能合约）
- [ ] 代币打赏功能
- [ ] 群组/频道功能
- [ ] DAO 治理
- [ ] 移动端 App

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献步骤
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

MIT License

---

## 📞 联系方式

如有问题或建议，请提交 Issue 或联系项目维护者。

---

<div align="center">

**🚀 Built with ❤️ using Next.js, Supabase & Web3**

[⬆ 回到顶部](#minisocial---web3-社交平台)

</div>
