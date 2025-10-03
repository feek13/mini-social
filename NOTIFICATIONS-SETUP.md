# 通知系统设置指南

本文档介绍如何在 Mini Social 中设置和使用通知系统。

## 📋 功能概览

通知系统包含以下功能：

✅ **实时未读数量显示** - 导航栏中的通知图标显示未读数量徽章
✅ **通知下拉菜单** - 快速预览最近 10 条通知
✅ **通知列表页面** - 查看完整的通知历史
✅ **通知类型筛选** - 按点赞、评论、转发、关注筛选
✅ **标记已读功能** - 单条或全部标记为已读
✅ **自动创建通知** - 点赞和评论时自动通知相关用户
✅ **轮询更新** - 每 30 秒自动检查新通知

## 🗄️ 数据库设置

### 1. 在 Supabase 中运行 SQL

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 创建新查询
4. 复制并运行 `supabase-notifications.sql` 文件内容

该脚本将：
- 创建 `notification_type` 枚举类型
- 创建 `notifications` 表
- 创建优化查询的索引
- 设置 RLS（Row Level Security）策略
- 创建自动触发器（点赞/评论时自动创建通知）

### 2. 验证数据库设置

运行以下查询验证表是否创建成功：

```sql
-- 检查表结构
SELECT * FROM information_schema.tables WHERE table_name = 'notifications';

-- 检查索引
SELECT * FROM pg_indexes WHERE tablename = 'notifications';

-- 检查触发器
SELECT * FROM information_schema.triggers WHERE event_object_table = 'likes' OR event_object_table = 'comments';
```

## 🎨 前端组件

### 通知图标组件 (NotificationBell)

位置: `components/NotificationBell.tsx`

**功能：**
- 显示通知图标和未读数量徽章
- 点击打开下拉菜单
- 每 30 秒轮询检查新通知
- 有新通知时震动动画

**使用：**
```tsx
import NotificationBell from '@/components/NotificationBell'

// 在导航栏中使用
<NotificationBell />

// 按钮样式
<NotificationBell variant="button" />
```

### 通知下拉菜单 (NotificationDropdown)

位置: `components/NotificationDropdown.tsx`

**功能：**
- 显示最近 10 条通知
- 区分已读/未读状态
- 点击通知跳转到相关内容
- 标记全部已读按钮

### 通知列表页面

位置: `app/notifications/page.tsx`

**功能：**
- 显示所有通知（分页）
- 按类型筛选（全部/点赞/评论/转发/关注）
- 按日期分组（今天/昨天/本周/更早）
- 加载更多通知
- 标记已读/删除通知

访问地址: `/notifications`

## 🔌 API 端点

### GET /api/notifications

获取通知列表

**查询参数：**
- `type`: 通知类型 (all, like, comment, repost, follow)
- `unreadOnly`: 只显示未读 (true/false)
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 20)

**返回：**
```json
{
  "notifications": [...],
  "unreadCount": 5,
  "page": 1,
  "hasMore": true
}
```

### GET /api/notifications/unread-count

获取未读通知数量

**返回：**
```json
{
  "unreadCount": 5
}
```

### PATCH /api/notifications/[id]/read

标记单条通知为已读

**返回：**
```json
{
  "success": true
}
```

### PATCH /api/notifications/mark-all-read

标记所有通知为已读

**返回：**
```json
{
  "success": true,
  "count": 10
}
```

### DELETE /api/notifications/[id]

删除通知

**返回：**
```json
{
  "success": true
}
```

## 🔐 权限和安全

### Row Level Security (RLS)

所有通知查询都受 RLS 保护：

1. **读取权限**：用户只能查看自己收到的通知
2. **更新权限**：用户只能更新自己的通知（标记已读）
3. **创建权限**：任何登录用户都可以创建通知（发送给其他用户）
4. **删除权限**：用户只能删除自己的通知

### 自动触发器

系统会自动创建以下通知：

1. **点赞通知**：
   - 当用户 A 点赞用户 B 的动态时
   - 自动通知用户 B
   - 用户取消点赞时自动删除通知

2. **评论通知**：
   - 当用户 A 评论用户 B 的动态时
   - 自动通知用户 B
   - 评论被删除时自动删除通知

3. **避免自我通知**：
   - 用户点赞或评论自己的动态不会创建通知

## 📊 性能优化

### 数据库索引

创建了以下索引优化查询性能：

```sql
-- 主查询索引（按接收者和创建时间）
CREATE INDEX notifications_recipient_created_idx
  ON notifications(recipient_id, created_at DESC);

-- 未读通知查询索引
CREATE INDEX notifications_recipient_unread_idx
  ON notifications(recipient_id, is_read, created_at DESC);

-- 通知类型筛选索引
CREATE INDEX notifications_recipient_type_idx
  ON notifications(recipient_id, type, created_at DESC);
```

### 轮询策略

- 未读数量每 30 秒轮询一次
- 避免频繁请求造成服务器压力
- 可根据需求调整轮询间隔

### 分页加载

- 通知列表页面支持分页
- 每页加载 20 条
- 支持"加载更多"无限滚动

## 🎯 使用示例

### 在代码中手动创建通知

如果需要手动创建通知（例如关注功能），可以直接插入数据库：

```typescript
import { supabase } from '@/lib/supabase'

async function createFollowNotification(followerId: string, followedId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: followedId,
      sender_id: followerId,
      type: 'follow',
    })

  if (error) {
    console.error('创建通知失败:', error)
  }
}
```

### 监听实时通知（可选升级）

如果需要实时推送而不是轮询，可以使用 Supabase Realtime：

```typescript
import { supabase } from '@/lib/supabase'

// 订阅新通知
const subscription = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${userId}`,
    },
    (payload) => {
      console.log('新通知:', payload.new)
      // 更新 UI
    }
  )
  .subscribe()

// 取消订阅
subscription.unsubscribe()
```

## 🎨 UI/UX 特性

### 通知图标动画

- **震动动画**：有新通知时图标震动
- **徽章动画**：未读数量变化时缩放动画
- **颜色变化**：有未读时图标变为蓝色

### 通知项样式

- **未读标记**：蓝色圆点 + 浅蓝背景
- **已读样式**：灰色文字，白色背景
- **hover效果**：悬停时背景变色

### 时间显示

- 刚刚（< 1分钟）
- X分钟前（< 1小时）
- X小时前（< 24小时）
- 昨天
- X天前（< 7天）
- 具体日期（> 7天）

## 🐛 故障排查

### 通知未显示

1. 检查数据库表是否创建：
```sql
SELECT * FROM notifications LIMIT 1;
```

2. 检查触发器是否运行：
```sql
SELECT * FROM information_schema.triggers
WHERE event_object_table IN ('likes', 'comments');
```

3. 检查 RLS 策略：
```sql
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

### 未读数量不更新

1. 检查浏览器控制台是否有错误
2. 确认用户已登录且 token 有效
3. 检查 API 端点返回是否正常

### 点击通知无反应

1. 检查相关动态或评论是否存在
2. 确认路由配置正确
3. 查看浏览器控制台错误信息

## 🚀 未来优化建议

1. **WebSocket 实时推送**：替代轮询，实现真正的实时通知
2. **推送通知**：集成浏览器推送 API
3. **邮件通知**：重要通知发送邮件提醒
4. **通知聚合**：相似通知合并显示（如"A、B、C 点赞了你的动态"）
5. **通知设置**：允许用户自定义通知偏好
6. **已读/未读批量操作**：更灵活的管理功能

## 📝 总结

通知系统已完整集成到 Mini Social，包括：

- ✅ 数据库表和触发器
- ✅ API 路由
- ✅ 前端组件
- ✅ 页面集成
- ✅ 权限控制
- ✅ 性能优化

现在只需在 Supabase 中运行 SQL 脚本，系统即可正常工作！
