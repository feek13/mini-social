# Sprint 5: 私信系统 - 设置指南

## ✅ 阶段 1 完成：数据库设计

### 已完成的工作：

1. **数据库迁移脚本**: `supabase-migration-sprint5-messaging.sql`
   - ✅ 创建了 3 个核心表
   - ✅ 设置了 RLS 策略
   - ✅ 添加了索引优化
   - ✅ 创建了触发器（自动更新、未读计数等）
   - ✅ 创建了视图和函数

2. **TypeScript 类型定义**: `types/database.ts`
   - ✅ Conversation (会话)
   - ✅ Message (消息)
   - ✅ ConversationMember (会话成员)
   - ✅ Realtime 事件类型

### 数据库表结构：

#### 1. `conversations` - 会话表
```sql
- id (UUID)
- participant_ids (UUID[])          # 参与者列表（支持群聊）
- conversation_type (TEXT)          # direct/group
- last_message_* (多个字段)         # 最后消息信息
- created_at, updated_at
```

#### 2. `messages` - 消息表
```sql
- id (UUID)
- conversation_id (UUID)
- sender_id (UUID)
- content (TEXT)
- message_type (TEXT)               # text/image/file
- media_url, media_type, media_size
- read_by (JSONB)                   # 已读状态
- reply_to_message_id (UUID)        # 回复引用
- created_at, updated_at
```

#### 3. `conversation_members` - 会话成员表
```sql
- conversation_id (UUID)
- user_id (UUID)
- unread_count (INTEGER)            # 未读消息数
- is_muted, is_pinned (BOOLEAN)
- last_read_message_id (UUID)
- joined_at, last_seen_at
```

### 关键功能：

1. **自动化触发器**
   - 新消息自动更新会话的最后消息信息
   - 自动增加未读消息计数
   - 自动创建会话成员记录

2. **RLS 安全策略**
   - 用户只能查看和操作自己参与的会话
   - 用户只能发送到自己参与的会话
   - 用户只能更新自己发送的消息

3. **实用函数**
   - `get_or_create_direct_conversation()` - 查找或创建一对一会话
   - `mark_conversation_as_read()` - 标记会话已读

---

## 🚀 阶段 2：启用 Supabase Realtime

### 需要你手动完成的步骤：

#### 步骤 1: 运行数据库迁移
1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **SQL Editor**
4. 复制 `supabase-migration-sprint5-messaging.sql` 的内容
5. 粘贴并点击 **Run** 执行

#### 步骤 2: 启用 Realtime
1. 在 Supabase Dashboard 中
2. 进入 **Database** → **Replication**
3. 找到以下表并启用 Realtime：
   - ✅ `conversations`
   - ✅ `messages`
   - ✅ `conversation_members`

4. 对每个表，勾选以下事件：
   - ✅ `INSERT`
   - ✅ `UPDATE`
   - ✅ `DELETE`

#### 步骤 3: 验证配置
运行以下 SQL 验证表是否创建成功：
```sql
-- 检查表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('conversations', 'messages', 'conversation_members');

-- 检查 RLS 是否启用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'conversation_members');
```

---

## 📋 下一步计划

### 阶段 3: API 路由实现
- `POST /api/conversations` - 创建会话
- `GET /api/conversations` - 获取会话列表
- `GET /api/conversations/[id]` - 获取会话详情
- `POST /api/messages` - 发送消息
- `GET /api/messages?conversationId=xxx` - 获取消息历史
- `PATCH /api/conversations/[id]/read` - 标记已读

### 阶段 4: UI 组件
- ConversationList - 会话列表
- ChatWindow - 聊天窗口
- MessageInput - 消息输入框
- MessageBubble - 消息气泡
- TypingIndicator - 打字指示器

### 阶段 5: Realtime 集成
- 实时接收新消息
- 实时更新未读计数
- 打字指示器
- 在线状态

---

## 🎯 预期效果

完成后，用户将能够：
1. ✅ 创建一对一私信会话
2. ✅ 实时收发消息（无需刷新）
3. ✅ 查看未读消息计数
4. ✅ 看到对方是否在线/正在输入
5. ✅ 回复特定消息
6. ✅ 发送图片和文件（后期）
7. ✅ 创建群聊（后期）

---

## 🔧 技术特性

- **零额外成本**: 使用 Supabase 免费额度
- **实时同步**: 基于 WebSocket 的 Realtime
- **类型安全**: 完整的 TypeScript 类型定义
- **安全性**: RLS 策略保护数据
- **性能优化**: 索引优化查询速度

---

## ⚠️ 注意事项

1. **Realtime 配额**
   - 免费版：500 并发连接
   - 超额：$10/1000 峰值连接

2. **消息存储**
   - 免费版：500MB 数据库存储
   - 考虑定期清理旧消息

3. **测试建议**
   - 使用多个浏览器测试实时功能
   - 测试未读计数更新
   - 测试 RLS 安全性

---

**完成阶段 2 后，告诉我继续实现 API 路由！** 🚀
