# Sprint 7-10 实现规划

本文档提供了 Sprint 7-10 的详细实现规划，包括数据库设计、API端点、UI组件和技术实现细节。

---

## Sprint 7: 数据分析系统

### 目标
构建全面的数据分析系统，追踪用户行为、内容表现和平台指标。

### 1. 数据库设计

#### 1.1 用户活动日志表
```sql
CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL, -- 'post_create', 'like', 'comment', 'follow', 'login'
  target_type TEXT, -- 'post', 'user', 'comment'
  target_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_action_type ON user_activity_logs(action_type);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
```

#### 1.2 内容统计表
```sql
CREATE TABLE content_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  views_count INTEGER DEFAULT 0,
  unique_views_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id)
);

CREATE INDEX idx_content_stats_views ON content_stats(views_count DESC);
CREATE INDEX idx_content_stats_shares ON content_stats(shares_count DESC);
```

#### 1.3 平台统计汇总表
```sql
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. API 端点

#### 2.1 用户活动分析
- `GET /api/analytics/user/:userId` - 获取用户活跃度数据
- `GET /api/analytics/user/:userId/engagement` - 获取用户互动数据

#### 2.2 内容分析
- `GET /api/analytics/content/trending` - 获取热门内容
- `GET /api/analytics/content/:postId` - 获取单个内容详细统计

#### 2.3 平台总览
- `GET /api/analytics/overview` - 获取平台总览数据
- `GET /api/analytics/daily` - 获取每日统计数据

### 3. UI 组件

#### 3.1 Analytics Dashboard 页面
```typescript
// app/admin/analytics/page.tsx
- 展示关键指标 (KPIs)
- 用户增长图表
- 内容发布趋势
- 用户活跃度热力图
```

#### 3.2 图表组件
```typescript
// components/analytics/
- UserGrowthChart.tsx
- ContentTrendChart.tsx
- EngagementHeatmap.tsx
- TopContentList.tsx
```

### 4. 实现细节

#### 4.1 数据收集
- 使用中间件追踪页面访问
- 在API路由中记录用户操作
- 使用 PostHog 或 Mixpanel 进行事件追踪

#### 4.2 数据聚合
- 定时任务（Supabase Edge Functions）汇总每日数据
- 使用 PostgreSQL 物化视图优化查询性能

#### 4.3 可视化
- 使用 Recharts 或 Chart.js 创建图表
- 实时更新（WebSocket）关键指标

---

## Sprint 8: 性能优化

### 目标
提升应用性能、减少加载时间、优化资源使用。

### 1. 代码分割和懒加载

#### 1.1 路由级代码分割
```typescript
// 使用 Next.js 动态导入
const DynamicComponent = dynamic(() => import('@/components/Heavy'), {
  loading: () => <Skeleton />,
  ssr: false
})
```

#### 1.2 组件懒加载
```typescript
// 按需加载重型组件
const RichTextEditor = lazy(() => import('@/components/RichTextEditor'))
const VideoPlayer = lazy(() => import('@/components/VideoPlayer'))
```

### 2. 图片优化

#### 2.1 使用 Next.js Image 组件
```typescript
import Image from 'next/image'

<Image
  src={imageUrl}
  alt="..."
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

#### 2.2 CDN 集成
- 配置 Cloudflare Images 或 Vercel Image Optimization
- 自动压缩和格式转换（WebP）

### 3. 数据库优化

#### 3.1 索引优化
```sql
-- 添加复合索引
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at DESC);
```

#### 3.2 查询优化
- 使用 EXPLAIN ANALYZE 分析慢查询
- 添加适当的 WHERE 和 LIMIT 子句
- 使用连接池（Supabase Pooler）

#### 3.3 缓存策略
```typescript
// 使用 Next.js 缓存
export const revalidate = 60 // 60秒缓存

// 使用 Redis 缓存热点数据
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)
```

### 4. 前端优化

#### 4.1 虚拟滚动
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

// 大列表虚拟滚动
const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100,
})
```

#### 4.2 防抖和节流
```typescript
import { debounce } from 'lodash'

const handleSearch = debounce((query) => {
  fetchSearchResults(query)
}, 300)
```

### 5. 性能监控

#### 5.1 集成 Vercel Analytics
```typescript
// 添加到 app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

#### 5.2 Core Web Vitals 追踪
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)

---

## Sprint 9: 移动端优化

### 目标
优化移动端体验，添加 PWA 支持，实现推送通知。

### 1. PWA 配置

#### 1.1 manifest.json
```json
{
  "name": "MiniSocial",
  "short_name": "MiniSocial",
  "description": "社交平台",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### 1.2 Service Worker
```typescript
// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/styles.css',
        '/script.js',
      ])
    })
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})
```

### 2. 移动端手势

#### 2.1 下拉刷新
```typescript
import { usePullToRefresh } from 'use-pull-to-refresh'

const { isRefreshing, pullPosition } = usePullToRefresh({
  onRefresh: async () => {
    await fetchNewData()
  }
})
```

#### 2.2 滑动操作
```typescript
import { useSwipeable } from 'react-swipeable'

const handlers = useSwipeable({
  onSwipedLeft: () => console.log('Swiped left'),
  onSwipedRight: () => console.log('Swiped right'),
})

<div {...handlers}>Swipeable content</div>
```

### 3. 推送通知

#### 3.1 请求通知权限
```typescript
async function requestNotificationPermission() {
  const permission = await Notification.requestPermission()
  if (permission === 'granted') {
    // 订阅推送服务
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY
    })
    // 发送订阅信息到服务器
    await saveSubscription(subscription)
  }
}
```

#### 3.2 发送推送通知（服务端）
```typescript
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

await webpush.sendNotification(subscription, JSON.stringify({
  title: '新消息',
  body: '您收到了一条新消息',
  icon: '/icon-192.png',
  badge: '/badge-72.png'
}))
```

### 4. 触摸优化

#### 4.1 提升触摸响应
```css
/* 移除点击延迟 */
* {
  touch-action: manipulation;
}

/* 优化滚动性能 */
.scroll-container {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

#### 4.2 触摸反馈
```typescript
<button
  className="active:scale-95 transition-transform"
  onTouchStart={() => setPressed(true)}
  onTouchEnd={() => setPressed(false)}
>
  按钮
</button>
```

---

## Sprint 10: 国际化

### 目标
实现多语言支持，本地化日期和数字格式。

### 1. i18n 配置

#### 1.1 安装 next-intl
```bash
npm install next-intl
```

#### 1.2 配置路由
```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['en', 'zh', 'ja'],
  defaultLocale: 'zh'
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
```

### 2. 翻译文件

#### 2.1 创建语言文件
```typescript
// messages/zh.json
{
  "common": {
    "login": "登录",
    "logout": "登出",
    "submit": "提交"
  },
  "post": {
    "create": "发布动态",
    "like": "点赞",
    "comment": "评论"
  }
}

// messages/en.json
{
  "common": {
    "login": "Login",
    "logout": "Logout",
    "submit": "Submit"
  },
  "post": {
    "create": "Create Post",
    "like": "Like",
    "comment": "Comment"
  }
}
```

### 3. 使用翻译

#### 3.1 在组件中使用
```typescript
import { useTranslations } from 'next-intl'

export default function LoginButton() {
  const t = useTranslations('common')

  return <button>{t('login')}</button>
}
```

#### 3.2 动态翻译
```typescript
const t = useTranslations('post')

<button>{t('like', { count: likeCount })}</button>
// 英文: "5 likes"
// 中文: "5 个赞"
```

### 4. 本地化

#### 4.1 日期格式化
```typescript
import { useFormatter } from 'next-intl'

const format = useFormatter()

// 相对时间
format.relativeTime(date)
// "2 hours ago" / "2小时前"

// 完整日期
format.dateTime(date, {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})
// "January 15, 2025" / "2025年1月15日"
```

#### 4.2 数字格式化
```typescript
const format = useFormatter()

// 数字
format.number(1234.56)
// "1,234.56" (en) / "1,234.56" (zh)

// 货币
format.number(1234, {
  style: 'currency',
  currency: 'USD'
})
// "$1,234.00" (en) / "$1,234.00" (zh)
```

### 5. 语言切换

#### 5.1 语言切换器组件
```typescript
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLanguage = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
  }

  return (
    <select value={locale} onChange={(e) => switchLanguage(e.target.value)}>
      <option value="zh">中文</option>
      <option value="en">English</option>
      <option value="ja">日本語</option>
    </select>
  )
}
```

### 6. RTL 支持

#### 6.1 检测文本方向
```typescript
const locale = useLocale()
const isRTL = ['ar', 'he'].includes(locale)

<div dir={isRTL ? 'rtl' : 'ltr'}>
  {content}
</div>
```

#### 6.2 RTL 样式
```css
/* 使用逻辑属性 */
.card {
  margin-inline-start: 1rem; /* 自动处理 RTL */
  padding-inline: 1rem;
}
```

---

## 实施优先级

### 高优先级
1. **Sprint 8: 性能优化** - 影响用户体验的核心问题
   - 图片懒加载
   - 代码分割
   - 数据库索引

2. **Sprint 9: 移动端优化** - 移动用户占比高
   - 响应式设计改进
   - 触摸优化
   - PWA 基础功能

### 中优先级
3. **Sprint 7: 数据分析** - 产品决策支持
   - 基础统计功能
   - Dashboard 总览
   - 用户行为追踪

4. **Sprint 10: 国际化** - 市场扩展需求
   - 核心页面翻译
   - 日期/数字本地化

### 实施时间估算
- Sprint 7: 1-2周
- Sprint 8: 1-2周
- Sprint 9: 1周
- Sprint 10: 1周

### 资源需求
- 前端开发: 2人
- 后端开发: 1人
- 设计师: 0.5人（UI优化）
- QA: 1人（测试）

---

## 成功指标

### Sprint 7
- 数据收集覆盖率 > 90%
- Dashboard 响应时间 < 2秒
- 数据准确率 > 99%

### Sprint 8
- 首屏加载时间减少 50%
- Lighthouse 分数 > 90
- 数据库查询时间减少 30%

### Sprint 9
- PWA 安装率 > 10%
- 移动端跳出率降低 20%
- 推送通知订阅率 > 30%

### Sprint 10
- 支持 3+ 语言
- 国际用户增长 > 20%
- 翻译覆盖率 > 95%

---

## 参考资源

### Sprint 7
- [PostHog Analytics](https://posthog.com/)
- [Recharts 文档](https://recharts.org/)
- [PostgreSQL 性能优化](https://www.postgresql.org/docs/current/performance-tips.html)

### Sprint 8
- [Next.js 性能优化](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Web.dev 性能指南](https://web.dev/performance/)
- [Vercel Analytics](https://vercel.com/docs/analytics)

### Sprint 9
- [PWA 指南](https://web.dev/progressive-web-apps/)
- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)

### Sprint 10
- [next-intl 文档](https://next-intl-docs.vercel.app/)
- [i18next](https://www.i18next.com/)
- [CLDR](http://cldr.unicode.org/)
