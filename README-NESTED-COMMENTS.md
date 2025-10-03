# 嵌套评论功能部署指南

## 功能说明

实现了完整的无限嵌套评论系统：
- ✅ 评论可以被回复
- ✅ 回复可以再次被回复（无限层级）
- ✅ 每层都是独立的详情页
- ✅ 自动 @ 被回复的用户
- ✅ 自动跟踪嵌套深度和回复数

## 部署步骤

### 1. 更新数据库 Schema

**重要：** 必须先运行数据库迁移，否则功能无法工作！

#### 方法一：如果是新数据库
在 Supabase Dashboard → SQL Editor 中运行：
```bash
supabase-setup.sql
```

#### 方法二：如果是现有数据库（推荐）
在 Supabase Dashboard → SQL Editor 中运行：
```bash
supabase-migration-add-nested-comments.sql
```

### 2. 验证数据库更新

运行以下 SQL 检查字段是否存在：

```sql
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'comments'
ORDER BY ordinal_position;
```

应该看到以下字段：
- ✅ `id` (uuid)
- ✅ `post_id` (uuid)
- ✅ `user_id` (uuid)
- ✅ `parent_comment_id` (uuid) ← 新增
- ✅ `content` (text)
- ✅ `depth` (integer) ← 新增
- ✅ `reply_count` (integer) ← 新增
- ✅ `created_at` (timestamp)

### 3. 验证触发器

检查触发器是否存在：

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'update_reply_count_trigger';
```

应该看到触发器已创建。

### 4. 测试嵌套评论

1. 在任意动态下发表评论
2. 点击评论右下角的"回复"按钮
3. 进入评论详情页，输入框会自动填充 `@username `
4. 发布回复
5. 再次点击该回复的"回复"按钮
6. 重复以上步骤，验证无限嵌套

## 功能架构

### 路由结构
```
/post/[postId]                          # 动态详情页
└── /comment/[commentId]                # 一级评论详情
    └── /comment/[nestedCommentId]      # 二级评论详情
        └── /comment/[...]              # 无限嵌套...
```

### 数据结构
```typescript
Comment {
  id: string
  post_id: string
  user_id: string
  parent_comment_id?: string  // null = 顶层评论
  content: string
  depth: number               // 0, 1, 2, 3...
  reply_count: number         // 该评论的回复数
  created_at: string
}
```

### 关键文件

#### 前端
- `app/post/[postId]/comment/[commentId]/page.tsx` - 评论详情页（服务端）
- `app/post/[postId]/comment/[commentId]/CommentDetailClient.tsx` - 评论详情页（客户端）
- `components/CommentInput.tsx` - 评论输入框（支持预填充）
- `components/PostCommentList.tsx` - 评论列表（带嵌套链接）

#### 后端
- `app/api/comments/[id]/replies/route.ts` - 获取回复列表和创建回复

#### 数据库
- `supabase-setup.sql` - 完整的数据库设置（新项目）
- `supabase-migration-add-nested-comments.sql` - 迁移脚本（现有项目）

## 常见问题

### Q: 点击"回复"没反应？
A: 检查数据库是否已运行迁移脚本，确保 `parent_comment_id`、`depth`、`reply_count` 字段存在。

### Q: 回复数不更新？
A: 检查触发器 `update_reply_count_trigger` 是否已创建并启用。

### Q: 评论详情页 404？
A: 确保路由文件存在于 `app/post/[postId]/comment/[commentId]/` 目录。

### Q: 输入框没有自动填充 @username？
A: 检查 `CommentInput` 组件是否传入了 `initialValue` 属性。

## 技术细节

### 自动更新 reply_count
数据库触发器会在插入或删除评论时自动更新父评论的 `reply_count`：

```sql
CREATE TRIGGER update_reply_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reply_count();
```

### 深度计算
创建回复时自动计算深度：

```typescript
depth: parentComment.depth + 1
```

### 无限嵌套路由
Next.js 动态路由自动支持：

```
/post/abc/comment/123       # 一级
/post/abc/comment/456       # 二级（456 是 123 的回复）
/post/abc/comment/789       # 三级（789 是 456 的回复）
```

## 更新日志

### 2025-01-03
- ✅ 添加嵌套评论数据库字段
- ✅ 创建评论详情页面
- ✅ 实现无限嵌套路由
- ✅ 添加自动 @ 功能
- ✅ 创建数据库触发器自动更新回复数
