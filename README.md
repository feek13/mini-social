# MiniSocial - 迷你社交平台

一个功能完整的迷你社交平台，使用 Next.js 15 和 Supabase 构建，类似 Twitter 的核心体验。

## ✨ 功能特性

### 核心功能
- 🔐 **用户认证** - 注册、登录、个人资料管理
- 📝 **发布动态** - 支持文字发布（280字符限制）
- 🔄 **转发功能** - 转发他人动态并添加评论
- ❤️ **点赞系统** - 乐观更新，实时响应
- 💬 **评论系统** - 支持嵌套评论和回复
- 👥 **关注功能** - 关注/取关用户，特别关注通知

### 高级功能
- 🔔 **通知系统** - 点赞、评论、转发、关注、发文通知
- 🔍 **搜索功能** - 用户和动态搜索，实时搜索建议
- 🔥 **热门动态** - 基于热度算法的趋势内容
- #️⃣ **标签系统** - 话题标签支持，点击查看相关动态
- 📢 **提及功能** - @用户提及，自动补全建议
- 👤 **个人主页** - 展示用户信息、动态、统计数据
- 📊 **DeFi 数据浏览器** - 集成 DeFiLlama API，链上数据实时查询
  - 1000+ 协议数据（TVL、分类、链、24h变化）
  - 收益率池子（APY 查询、筛选、排序）
  - 代币价格（WebSocket 实时推送、历史价格、批量查询）
  - 数据可视化（交互式图表，支持多时间范围）
    - TVL 历史图表（7d/30d/90d/180d/1y/All）
    - APY 趋势分析（基础 + 奖励 APY）
    - 价格走势图（折线/面积/蜡烛图）
    - 响应式设计，完美支持移动端
  - 高级筛选（多维度筛选、自定义排序）

### 用户体验
- 🎨 **现代化 UI** - 简洁优雅的界面设计
- 📱 **响应式布局** - 完美适配手机、平板、桌面
- 🌈 **渐变头像** - 多种头像模板可选（DiceBear API）
- ⚡ **性能优化** - 骨架屏、乐观更新、懒加载
- 🎭 **页面动画** - Framer Motion 提供流畅过渡效果
- 🖼️ **图片查看器** - 支持图片预览和查看
- 🎯 **浮动按钮** - 快速发布入口

## 🛠 技术栈

### 前端
- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **动画**: Framer Motion
- **图标**: Lucide React
- **验证**: Zod
- **数据获取**: React Query (TanStack Query)
- **图表**: Recharts
- **工具**: Lodash, DOMPurify, React Intersection Observer
- **实时数据**: Binance WebSocket (价格推送)

### 后端
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **实时更新**: Supabase Realtime
- **存储**: Supabase Storage（预留）

### 部署
- **平台**: Vercel
- **CDN**: Vercel Edge Network
- **构建**: Turbopack

## 🚀 快速开始

### 环境要求

- Node.js 18.x 或更高版本
- npm / yarn / pnpm
- Supabase 账号

### 安装步骤

1. **克隆仓库**
```bash
git clone <your-repo-url>
cd mini-social
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

创建 `.env.local` 文件：
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # 可选
```

4. **设置 Supabase 数据库**

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

# 6. DeFi 数据缓存表（可选，用于 DeFi 功能）
supabase-migration-defillama.sql
```

5. **启动开发服务器**
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📦 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（使用 Turbopack） |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run test:defillama` | 测试 DeFiLlama API 客户端 (TypeScript) |
| `npm run test:defillama:full` | 完整集成测试（包含所有 API 端点） |
| `npm run test:defillama:quick` | 快速测试（bash 脚本） |
| `npm run test:frontend` | 前端 DeFi 功能测试 |

## 🌍 部署到 Vercel

### 方法一：通过 Vercel Dashboard（推荐）

1. 访问 [Vercel](https://vercel.com) 并登录
2. 点击 "Add New Project"
3. 导入你的 Git 仓库
4. 配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`（可选）
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

2. **环境变量检查**
   - 在 Vercel Dashboard 中验证环境变量
   - 重新部署以应用更改

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
│   │   ├── search/             # 搜索功能
│   │   ├── hashtags/           # 标签功能
│   │   ├── mentions/           # 提及功能
│   │   └── defi/               # DeFi 数据 API
│   │       ├── protocols/      # 协议数据
│   │       ├── yields/         # 收益率数据
│   │       ├── prices/         # 代币价格
│   │       └── chains/         # 链数据
│   ├── post/                   # 动态详情页
│   ├── profile/                # 个人主页
│   ├── search/                 # 搜索页面
│   ├── trending/               # 热门动态
│   ├── hashtag/                # 标签页面
│   ├── defi/                   # DeFi 数据浏览器
│   │   ├── page.tsx            # DeFi 主页（协议/收益率/价格）
│   │   └── protocol/[slug]/    # 协议详情页
│   ├── notifications/          # 通知页面
│   ├── providers/              # React Context
│   └── globals.css             # 全局样式
├── components/                   # React 组件
│   ├── PostCard.tsx            # 动态卡片
│   ├── PostForm.tsx            # 发布表单
│   ├── CommentList.tsx         # 评论列表
│   ├── Avatar.tsx              # 头像组件
│   ├── Navbar.tsx              # 导航栏
│   ├── SearchBar.tsx           # 搜索栏
│   ├── NotificationBell.tsx    # 通知铃铛
│   ├── FollowButton.tsx        # 关注按钮
│   ├── defi/                   # DeFi 组件
│   │   ├── ProtocolCard.tsx    # 协议卡片
│   │   ├── YieldCard.tsx       # 收益率卡片
│   │   ├── DeFiEmbedPicker.tsx # DeFi 嵌入选择器
│   │   ├── DeFiEmbedPreview.tsx# DeFi 嵌入预览
│   │   └── charts/             # 图表组件（基于 Recharts）
│   │       ├── TVLHistoryChart.tsx    # TVL 历史图表（支持多时间范围）
│   │       ├── APYHistoryChart.tsx    # APY 趋势图表
│   │       ├── PriceHistoryChart.tsx  # 价格历史图表（多图表类型）
│   │       └── MiniTrendChart.tsx     # 迷你趋势图（7d/30d）
│   └── ...                     # 更多组件
├── lib/                         # 工具函数和配置
│   ├── supabase.ts             # Supabase 客户端配置
│   ├── supabase-api.ts         # 服务端 Supabase 客户端
│   ├── utils.ts                # 通用工具函数
│   └── defillama/              # DeFiLlama API 客户端
│       ├── client.ts           # API 客户端
│       ├── types.ts            # 类型定义
│       └── README.md           # DeFi 客户端文档
├── types/                       # TypeScript 类型定义
│   └── database.ts             # 数据库类型
├── hooks/                       # 自定义 React Hooks
├── public/                      # 静态资源
└── supabase-*.sql              # 数据库脚本
```

## 🗄️ 数据库架构

### 主要数据表

| 表名 | 说明 |
|------|------|
| `profiles` | 用户资料（用户名、头像、简介等） |
| `posts` | 动态（内容、点赞数、评论数、转发） |
| `likes` | 点赞记录 |
| `comments` | 评论（支持嵌套） |
| `follows` | 关注关系 |
| `notifications` | 通知记录 |
| `hashtags` | 标签 |
| `post_hashtags` | 动态-标签关联 |
| `mentions` | 提及记录 |
| `defi_protocols` | DeFi 协议数据缓存（TVL、分类、链） |
| `defi_yields` | 收益率池子数据缓存 |
| `defi_token_prices` | 代币价格缓存（5分钟过期） |
| `post_defi_embeds` | 动态中嵌入的 DeFi 数据快照 |

### 关键特性

- **RLS 策略**: 所有表都启用行级安全
- **触发器**: 自动维护计数和通知
- **索引优化**: 提升查询性能
- **热度算法**: 基于互动和时间衰减

详细数据库结构请查看 SQL 脚本文件。

## 🔧 环境变量说明

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | ✅ 是 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | ✅ 是 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端密钥 | ⚠️ 可选 |

> **注意**: 以 `NEXT_PUBLIC_` 开头的变量会暴露到客户端，切勿在其中存储敏感信息。

## 💡 核心功能实现

### 认证系统
- 基于 Supabase Auth
- 使用 AuthProvider (React Context) 管理全局状态
- 自动 token 刷新和会话管理

### 通知系统
- 5 种通知类型：点赞、评论、转发、关注、发文
- 数据库触发器自动创建通知
- 实时未读计数更新

### 搜索功能
- PostgreSQL 全文搜索
- 用户名实时搜索建议
- 支持用户和动态搜索

### 热门动态
- 热度分数 = 点赞×2 + 评论×3 + 转发×4 - 时间衰减
- 数据库触发器自动更新
- 缓存优化

### DeFi 数据集成
- **DeFiLlama API**: 集成链上数据查询
- **协议查询**: 1000+ DeFi 协议（TVL、分类、链、24h变化）
- **收益率池子**: APY 查询、筛选、排序
- **代币价格**:
  - WebSocket 实时推送（Binance，毫秒级）
  - DeFiLlama 价格查询（历史价格、批量查询）
  - 自动价格更新（定时 10 秒或实时 WebSocket）
- **数据缓存**: Supabase 表缓存 API 响应（5分钟过期）
- **DeFi 嵌入**: 动态中嵌入协议/池子数据卡片
- **数据可视化**:
  - TVL 历史图表（时间范围：7d, 30d, 90d, 180d, 1y, All）
  - APY 趋势图（支持基础/奖励 APY 分解）
  - 价格历史图表（多种图表类型：折线、面积、蜡烛图）
  - 迷你趋势图（快速查看 7 天/30 天走势）
  - 响应式设计，完美支持桌面和移动端
  - 使用 Recharts 库，交互式 tooltip 和渐变效果
- **客户端使用**:
  ```typescript
  import { defillama } from '@/lib/defillama'

  // 获取协议数据
  const protocols = await defillama.getProtocols()

  // 获取代币价格
  const price = await defillama.getTokenPrice('ethereum', '0x...')

  // 获取收益率
  const yields = await defillama.getTopYields(10, 1000000)
  ```
- **测试**: `npm run test:defillama` / `npm run test:frontend`
- **文档**: `lib/defillama/README.md`

## ❓ 常见问题

### 部署后无法连接到 Supabase

**解决方案**:
1. 检查环境变量是否正确配置
2. 确认 Supabase 项目处于活跃状态
3. 验证是否运行了所有数据库脚本
4. 检查 Supabase 的 URL 配置中是否添加了部署域名

### 注册时提示 email rate limit

**原因**: Supabase 的安全限制

**解决方案**:
- 开发环境：在 Supabase Dashboard → Authentication → Email 中禁用 "Confirm email"
- 生产环境：等待限制解除或联系 Supabase 支持

### 构建失败

**检查清单**:
1. Node.js 版本 ≥ 18.x
2. 删除 `node_modules` 和 `.next` 后重新安装
3. 解决所有 TypeScript 类型错误
4. 确认环境变量已正确配置

### 热更新不工作

**解决方案**:
```bash
# 清除缓存并重启
rm -rf .next
npm run dev
```

### DeFi 图表不显示

**现象**: 访问 DeFi 协议详情页时，图表区域空白或显示 "No data"

**常见原因**:
1. 数据未正确加载
2. 图表组件渲染问题（已在最新版本修复）

**解决方案**:
1. 检查浏览器控制台是否有错误信息
2. 确认已运行 `supabase-migration-defillama.sql` 脚本
3. 验证 DeFiLlama API 可访问（运行 `npm run test:defillama`）
4. 清除缓存并重新构建：
   ```bash
   rm -rf .next
   npm run dev
   ```
5. 如果问题持续，参考 `CLAUDE.md` 中的 "Common Gotchas" 第 7 条

**注意**: 最新版本已修复 Recharts 在 Next.js 15 + Turbopack 环境下的渲染问题，图表现在可以正常显示。

## 🎯 性能优化

- ✅ 数据库索引优化
- ✅ 乐观更新减少等待
- ✅ 骨架屏提升感知性能
- ✅ Next.js 自动代码分割
- ✅ Turbopack 加速开发构建
- ✅ 图片懒加载
- ✅ API 路由缓存策略

## 🔒 安全措施

- ✅ Row Level Security (RLS) 全覆盖
- ✅ XSS 防护（DOMPurify）
- ✅ CSRF 保护
- ✅ 输入验证（Zod）
- ✅ SQL 注入防护（参数化查询）
- ✅ Rate limiting（Supabase 内置）

## 📚 相关文档

- [CLAUDE.md](./CLAUDE.md) - 开发指南和架构说明
- [NOTIFICATIONS-SETUP.md](./NOTIFICATIONS-SETUP.md) - 通知系统详解
- [README-NESTED-COMMENTS.md](./README-NESTED-COMMENTS.md) - 嵌套评论实现
- [OPTIMIZATION-REPORT.md](./OPTIMIZATION-REPORT.md) - 性能优化报告

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献步骤
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License

## 📞 联系方式

如有问题，请提交 Issue 或联系项目维护者。

---

**🚀 Happy Coding!**
