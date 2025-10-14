# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MiniSocial 是一个类似 Twitter 的迷你社交平台，使用 Next.js 15 和 Supabase 构建。支持用户注册登录、发布动态、点赞评论、关注用户、通知系统等完整的社交功能。

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database & Auth**: Supabase (PostgreSQL)
- **Icons**: lucide-react
- **State Management**: React Context (AuthProvider)

## Commands

```bash
npm run dev                    # 启动开发服务器 (http://localhost:3000, 使用 Turbopack)
npm run build                  # 构建生产版本
npm run start                  # 启动生产服务器
npm run lint                   # 运行 ESLint 检查

# DeFi 集成测试
npm run test:defillama         # 测试 DeFiLlama API 客户端 (TypeScript)
npm run test:defillama:full    # 完整集成测试 (包含所有 API 端点)
npm run test:defillama:quick   # 快速测试 (bash 脚本)
npm run test:frontend          # 前端 DeFi 功能测试
npm run test:pancakeswap       # 测试 PancakeSwap 集成
```

## Environment Variables

必需的环境变量（在 `.env.local` 中配置）：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

可选环境变量（用于服务端 API，可绕过 RLS）：
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Architecture Overview

### Client-Side vs Server-Side Supabase

项目使用两种 Supabase 客户端模式：

1. **客户端** (`lib/supabase.ts`):
   - 单例模式，用于浏览器端组件
   - 启用 `persistSession` 和 `autoRefreshToken`
   - 自动处理认证状态

2. **服务端** (`lib/supabase-api.ts`):
   - `getSupabaseClient()`: 用于公开数据访问（匿名）
   - `getSupabaseClientWithAuth(token)`: 用于需要认证的 API 路由
   - 禁用 session 持久化，适合服务器环境

### Authentication Flow

1. **AuthProvider** (`app/providers/AuthProvider.tsx`):
   - 使用 React Context 提供全局认证状态
   - 管理 `user`（Supabase User 对象）和 `profile`（用户资料）
   - 超时保护机制（3秒），失败时使用 fallback username
   - 监听认证状态变化 (`onAuthStateChange`)

2. **使用方式**:
   ```tsx
   const { user, profile, loading, signOut } = useAuth()
   ```

### API Route Patterns

所有 API 路由遵循统一模式：

1. **认证验证**:
   ```ts
   const authHeader = request.headers.get('authorization')
   const accessToken = authHeader.replace('Bearer ', '')
   const supabase = getSupabaseClientWithAuth(accessToken)
   const { data: { user }, error } = await supabase.auth.getUser(accessToken)
   ```

2. **错误处理**:
   - 返回标准格式：`{ error: string }` + HTTP 状态码
   - 常见状态码：401 (未认证)、404 (未找到)、400 (请求错误)、500 (服务器错误)

3. **客户端调用示例**:
   ```ts
   const { data: { session } } = await supabase.auth.getSession()
   const response = await fetch('/api/...', {
     headers: {
       'Authorization': `Bearer ${session?.access_token}`,
     },
   })
   ```

### Database Schema

核心表结构：

- **profiles**: 用户资料（id, username, avatar_url, avatar_template, bio, location）
- **posts**: 动态（支持普通发文和转发，is_repost 字段）
- **likes**: 点赞记录（通过触发器自动更新 posts.likes_count）
- **comments**: 评论（通过触发器自动更新 posts.comments_count）
- **follows**: 关注关系（包含 notify_on_post 字段用于特别关注）
- **notifications**: 通知（类型：like, comment, repost, follow, new_post）
- **defi_protocols**: DeFi 协议数据缓存（TVL、分类、链数据等）
- **defi_yields**: 收益率池子数据缓存
- **defi_token_prices**: 代币价格缓存（5 分钟过期）
- **post_defi_embeds**: 动态中嵌入的 DeFi 数据快照
- **pancake_pools**: PancakeSwap 池子数据缓存
- **pancake_farms**: PancakeSwap Farm 数据缓存

### Database Triggers

数据库使用多个触发器自动维护数据一致性：

1. **点赞计数**: 自动更新 `posts.likes_count`
2. **评论计数**: 自动更新 `posts.comments_count`
3. **热度分数**: 自动计算和更新 `posts.hot_score`
4. **通知创建**: 点赞、评论、转发、关注时自动创建通知
5. **发文通知**: 用户发文时自动通知开启特别关注的粉丝

### Row Level Security (RLS)

所有表启用 RLS，策略示例：

- **profiles**: 所有人可读，用户只能更新自己的资料
- **posts**: 所有人可读，用户只能删除自己的动态
- **likes/comments**: 所有人可读，用户只能操作自己的记录
- **follows**: 所有人可读，用户只能管理自己的关注关系
- **notifications**: 用户只能查看自己的通知

## Key Features & Implementation

### 1. 动态发布与转发

- **发文**: `POST /api/posts` - 280 字符限制，支持图片（未来功能）
- **转发**: `POST /api/posts/[id]/repost` - 可添加转发评论
- **删除**: `DELETE /api/posts/[id]` - 仅作者可删除

转发数据结构：
```ts
{
  is_repost: true,
  original_post_id: string,
  repost_comment?: string
}
```

### 2. 点赞系统

- 使用乐观更新：UI 立即响应，后台同步
- 防止重复点赞：数据库约束 `UNIQUE(post_id, user_id)`
- 自动计数：触发器维护 `likes_count`

### 3. 关注与特别关注

- **关注**: `POST /api/users/[username]/follow`
- **取关**: `DELETE /api/users/[username]/follow`
- **通知开关**: `PATCH /api/users/[username]/notify` - 切换 `notify_on_post`
- **关注状态**: `GET /api/users/[username]/follow`

特别关注功能：
- `follows.notify_on_post` 字段控制是否接收发文通知
- 用户发文时触发器自动通知开启特别关注的粉丝

### 4. 通知系统

通知类型：
- `like`: 点赞通知
- `comment`: 评论通知
- `repost`: 转发通知
- `follow`: 关注通知
- `new_post`: 发文通知（特别关注）

API 端点：
- `GET /api/notifications` - 获取通知列表（支持分页和类型筛选）
- `GET /api/notifications/unread-count` - 获取未读数量
- `PATCH /api/notifications/[id]/read` - 标记单条已读
- `PATCH /api/notifications/mark-all-read` - 标记全部已读

### 5. 搜索功能

- `GET /api/search?q={query}&type={posts|users|all}` - 全文搜索
- `GET /api/search/suggestions?q={query}` - 搜索建议（用户名）
- 使用 PostgreSQL `ILIKE` 进行模糊匹配

### 6. 热门动态

- `GET /api/posts/trending` - 基于 `hot_score` 排序
- 热度分数 = 点赞数 × 2 + 评论数 × 3 + 转发数 × 4 - 时间衰减
- 触发器自动更新，无需手动计算

### 7. DeFi 数据集成

#### DeFiLlama 集成

项目集成了 DeFiLlama API，提供链上 DeFi 数据查询功能：

- **协议数据**: `lib/defillama/client.ts` - 获取协议列表、详情、搜索、按分类/链筛选
- **代币价格**: 实时价格、历史价格、批量查询（支持多链）
- **收益率数据**: 获取所有收益率池子、筛选高收益池子
- **链数据**: 获取所有链的 TVL 数据
- **数据缓存**: 使用 Supabase 表缓存 API 响应，减少外部请求
- **可视化组件**: `components/defi/charts/` - TVL 图表、趋势图等

DeFi 嵌入功能：
- `DeFiEmbedPicker` - 动态中选择并嵌入 DeFi 协议/池子数据
- `DeFiEmbedPreview` - 预览嵌入的 DeFi 数据卡片
- `ProtocolCard` / `YieldCard` - 协议和收益率展示卡片
- `TVLChart` / `MiniTrendChart` - 数据可视化图表（使用 Recharts）

客户端使用：
```typescript
import { defillama } from '@/lib/defillama'

// 获取协议列表
const protocols = await defillama.getProtocols()

// 获取代币价格
const price = await defillama.getTokenPrice('ethereum', '0x...')

// 获取收益率数据
const yields = await defillama.getTopYields(10, 1000000)
```

#### PancakeSwap 集成

项目集成了 PancakeSwap 特定功能，提供更详细的 DEX 数据：

- **PancakeSwap 客户端**: `lib/pancakeswap/client.ts` - 专门的 PancakeSwap API 集成
- **Pool 数据**: 获取流动性池子、Farm 数据、质押信息
- **API 端点**:
  - `GET /api/defi/pancakeswap/pools` - 获取 PancakeSwap 池子数据
  - `GET /api/defi/pancakeswap/farms` - 获取 Farm 信息
  - `GET /api/defi/pancakeswap/overview` - 获取总览数据
- **支持的链**: BSC、Ethereum、Arbitrum、Base、Polygon、zkSync、Linea
- **自动跳转**: 点击"认购"按钮自动跳转到 PancakeSwap 官网相应页面

客户端使用：
```typescript
import { pancakeswap } from '@/lib/pancakeswap'

// 获取池子数据
const pools = await pancakeswap.getPools('bsc')

// 获取 Farm 数据
const farms = await pancakeswap.getFarms()
```

测试：
- 运行 `npm run test:defillama` 测试 DeFiLlama API 集成
- 运行 `npm run test:pancakeswap` 测试 PancakeSwap 集成
- 运行 `npm run test:frontend` 测试前端 DeFi 组件
- 访问 `/defi` 查看 DeFi 数据页面
- 访问 `/api/test-defillama` 查看 API 端点示例

详细文档：
- `lib/defillama/README.md` - DeFiLlama 客户端文档
- `PANCAKESWAP_INTEGRATION.md` - PancakeSwap 集成说明

## Component Patterns

### 1. 客户端组件标记

所有需要状态、事件处理或使用 hooks 的组件必须添加 `'use client'`：

```tsx
'use client'

import { useState } from 'react'
// ...
```

### 2. 乐观更新模式

点赞、关注等操作使用乐观更新提升用户体验：

```tsx
// 1. 立即更新 UI
setIsLiked(true)
setLikesCount(prev => prev + 1)

// 2. 发送请求
const response = await fetch('/api/posts/[id]/like', { method: 'POST' })

// 3. 失败时回滚
if (!response.ok) {
  setIsLiked(false)
  setLikesCount(prev => prev - 1)
}
```

### 3. 加载状态

使用骨架屏而非 spinner 提升感知性能：

```tsx
{loading ? (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded"></div>
  </div>
) : (
  <ActualContent />
)}
```

### 4. 头像系统

使用 DiceBear API 生成渐变头像：

```tsx
<Avatar
  username={user.username}
  avatarUrl={user.avatar_url}
  avatarTemplate={user.avatar_template || 'micah'}
  size="md"
/>
```

模版选项：`micah`, `adventurer`, `avataaars`, `bottts`, `identicon` 等

## Type Safety

### Database Types

所有数据库类型定义在 `types/database.ts`：

```ts
export type Profile = { id: string; username: string; ... }
export type Post = { id: string; content: string; ... }
export type Comment = { ... }
export type Notification = { ... }
export type Follow = { ... }
```

### API Response Types

API 返回类型应与数据库类型一致，使用 TypeScript 严格模式确保类型安全。

## Common Patterns

### 获取当前用户

```tsx
const { user, profile } = useAuth()

if (!user) {
  return <LoginPrompt />
}
```

### 页面参数处理

```tsx
export default async function Page({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // ...
}
```

### 错误处理

```tsx
try {
  const response = await fetch('/api/...')
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || '操作失败')
  }

  // 成功处理
} catch (error) {
  console.error('错误:', error)
  alert(error instanceof Error ? error.message : '未知错误')
}
```

## Database Setup

首次部署需要在 Supabase SQL Editor 依次运行以下脚本：

1. `supabase-setup.sql` - 基础数据库结构、RLS 策略、触发器、索引
2. `supabase-notifications.sql` - 通知系统
3. `supabase-migration-add-nested-comments.sql` - 嵌套评论支持
4. `supabase-migration-fix-counts.sql` - 计数修复
5. `supabase-migration-hashtags-mentions.sql` - 标签和提及功能
6. `supabase-migration-defillama.sql` - DeFi 数据缓存表（可选）

## Performance Optimizations

1. **数据库索引**: 为常用查询字段创建索引（username, created_at 等）
2. **懒加载**: 动态列表使用分页加载
3. **缓存策略**: Next.js 自动缓存 API 路由
4. **乐观更新**: 减少等待时间，提升用户体验
5. **Turbopack**: 开发环境使用 Turbopack 提升构建速度

## Common Gotchas

1. **API 路由参数**: Next.js 15 中 `params` 是 Promise，需要 `await`
2. **Supabase 客户端**: 客户端和服务端使用不同的初始化方式
3. **RLS 策略**: 确保所有表都正确配置了 RLS，否则数据可能泄露
4. **触发器依赖**: 修改表结构前检查相关触发器
5. **环境变量**: 以 `NEXT_PUBLIC_` 开头的变量会暴露到客户端
6. **端口冲突**: 如果 3000 端口被占用，使用 `lsof -ti:3000 | xargs kill -9` 或 `pkill -f "next dev"` 清理进程
7. **Recharts 图表渲染**: 在 Next.js 15 + Turbopack 环境中，`ResponsiveContainer` 可能无法正确计算高度（内部 `.recharts-wrapper` 高度为 0px）。解决方案：移除 `ResponsiveContainer`，直接使用固定宽度的图表组件 + `overflow-x-auto` 实现响应式。参考：`components/defi/charts/TVLHistoryChart.tsx:153-197`
   ```tsx
   // ❌ 可能失败
   <ResponsiveContainer width="100%" height={400}>
     <AreaChart data={data}>...</AreaChart>
   </ResponsiveContainer>

   // ✅ 推荐
   <div className="w-full overflow-x-auto">
     <AreaChart width={1100} height={400} data={data}>...</AreaChart>
   </div>
   ```

## MCP Servers

项目配置了以下 MCP (Model Context Protocol) 服务器（见 `.mcp.json`）：

- **chrome-devtools**: 用于浏览器自动化和调试
- **context7**: 提供文档和上下文增强
- **mcp-deepwiki**: 深度文档搜索和分析

这些 MCP 服务器在开发时可通过 Claude Code 自动使用。

## Deployment Notes

部署到 Vercel 时：

1. 设置环境变量（至少需要 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
2. 在 Supabase 认证设置中添加 Vercel 域名到允许的重定向 URL
3. 确保数据库已运行 `supabase-setup.sql`
4. 首次部署后检查 API 路由是否正常工作
