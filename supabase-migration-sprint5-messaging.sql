-- =====================================================
-- Sprint 5: 私信系统 - 数据库迁移脚本
-- =====================================================

-- 1. 创建会话表 (conversations)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 参与者（使用数组存储，方便扩展为群聊）
  participant_ids UUID[] NOT NULL,

  -- 会话类型：direct（一对一）或 group（群组）
  conversation_type TEXT NOT NULL DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group')),

  -- 群组相关字段
  group_name TEXT,
  group_avatar_url TEXT,

  -- 最后一条消息信息（方便列表展示）
  last_message_id UUID,
  last_message_content TEXT,
  last_message_sender_id UUID,
  last_message_at TIMESTAMPTZ,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 约束：一对一会话必须恰好2个参与者
  CONSTRAINT check_direct_conversation_participants
    CHECK (conversation_type != 'direct' OR array_length(participant_ids, 1) = 2)
);

-- 2. 创建消息表 (messages)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 所属会话
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

  -- 发送者
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 消息内容
  content TEXT NOT NULL,

  -- 消息类型：text（文本）、image（图片）、file（文件）
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),

  -- 媒体 URL（用于图片/文件）
  media_url TEXT,
  media_type TEXT, -- image/jpeg, image/png, application/pdf 等
  media_size BIGINT, -- 文件大小（字节）

  -- 已读状态追踪（JSON 格式：{ user_id: timestamp }）
  read_by JSONB DEFAULT '{}'::jsonb,

  -- 是否已删除
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

  -- 回复消息（引用）
  reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 创建会话成员关联表（用于未读消息计数等）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 未读消息数
  unread_count INTEGER NOT NULL DEFAULT 0,

  -- 最后已读消息 ID
  last_read_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,

  -- 是否静音
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,

  -- 是否置顶
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

  -- 加入时间
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 最后查看时间
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (conversation_id, user_id)
);

-- 4. 创建索引
-- =====================================================
-- 会话表索引
CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids
  ON public.conversations USING GIN (participant_ids);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON public.conversations (last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON public.conversations (updated_at DESC);

-- 消息表索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages (created_at DESC);

-- 会话成员表索引
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id
  ON public.conversation_members (user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_members_unread
  ON public.conversation_members (user_id, unread_count)
  WHERE unread_count > 0;

-- 5. 启用 Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- 6. RLS 策略 - conversations
-- =====================================================
-- 用户可以查看自己参与的会话
CREATE POLICY "Users can view their own conversations"
  ON public.conversations
  FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

-- 用户可以创建会话（自己必须是参与者）
CREATE POLICY "Users can create conversations they participate in"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- 用户可以更新自己参与的会话
CREATE POLICY "Users can update their own conversations"
  ON public.conversations
  FOR UPDATE
  USING (auth.uid() = ANY(participant_ids));

-- 7. RLS 策略 - messages
-- =====================================================
-- 用户可以查看所属会话的消息
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );

-- 用户可以发送消息（必须是会话参与者）
CREATE POLICY "Users can send messages in their conversations"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );

-- 用户可以更新自己的消息（标记已删除等）
CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- 8. RLS 策略 - conversation_members
-- =====================================================
-- 用户可以查看自己的会话成员记录
CREATE POLICY "Users can view their own conversation memberships"
  ON public.conversation_members
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以更新自己的会话成员记录
CREATE POLICY "Users can update their own conversation memberships"
  ON public.conversation_members
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 9. 触发器：自动更新 updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. 触发器：更新会话的最后消息信息
-- =====================================================
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新会话的最后消息信息
  UPDATE public.conversations
  SET
    last_message_id = NEW.id,
    last_message_content = NEW.content,
    last_message_sender_id = NEW.sender_id,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- 11. 触发器：自动增加未读消息计数
-- =====================================================
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- 为除发送者外的所有会话成员增加未读计数
  UPDATE public.conversation_members
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_unread_count
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_unread_count();

-- 12. 触发器：自动创建会话成员记录
-- =====================================================
CREATE OR REPLACE FUNCTION create_conversation_members()
RETURNS TRIGGER AS $$
DECLARE
  participant_id UUID;
BEGIN
  -- 为每个参与者创建会话成员记录
  FOREACH participant_id IN ARRAY NEW.participant_ids
  LOOP
    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (NEW.id, participant_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_conversation_members
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_members();

-- 13. 函数：查找或创建一对一会话
-- =====================================================
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(
  user1_id UUID,
  user2_id UUID
)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- 查找现有会话
  SELECT id INTO conversation_id
  FROM public.conversations
  WHERE conversation_type = 'direct'
    AND participant_ids @> ARRAY[user1_id, user2_id]
    AND participant_ids <@ ARRAY[user1_id, user2_id]
  LIMIT 1;

  -- 如果不存在，创建新会话
  IF conversation_id IS NULL THEN
    INSERT INTO public.conversations (participant_ids, conversation_type)
    VALUES (ARRAY[user1_id, user2_id], 'direct')
    RETURNING id INTO conversation_id;
  END IF;

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. 函数：标记会话已读
-- =====================================================
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- 重置未读计数
  UPDATE public.conversation_members
  SET
    unread_count = 0,
    last_seen_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. 视图：会话列表（带用户信息）
-- =====================================================
CREATE OR REPLACE VIEW conversation_list_view AS
SELECT
  c.id,
  c.conversation_type,
  c.group_name,
  c.group_avatar_url,
  c.participant_ids,
  c.last_message_content,
  c.last_message_at,
  c.created_at,
  c.updated_at,

  -- 发送者信息
  sender.id as last_message_sender_id,
  sender.username as last_message_sender_username,
  sender.avatar_url as last_message_sender_avatar_url,
  sender.avatar_template as last_message_sender_avatar_template,
  sender.nft_avatar_url as last_message_sender_nft_avatar_url,

  -- 当前用户的会话成员信息
  cm.unread_count,
  cm.is_muted,
  cm.is_pinned,
  cm.last_seen_at

FROM public.conversations c
LEFT JOIN public.profiles sender ON sender.id = c.last_message_sender_id
LEFT JOIN public.conversation_members cm ON cm.conversation_id = c.id
  AND cm.user_id = auth.uid()
WHERE auth.uid() = ANY(c.participant_ids);

-- =====================================================
-- 迁移完成！
--
-- 使用说明：
-- 1. 在 Supabase Dashboard > SQL Editor 执行此脚本
-- 2. 在 Supabase Dashboard > Database > Replication 启用 Realtime
--    - 启用 conversations 表
--    - 启用 messages 表
-- 3. 重启开发服务器
-- =====================================================
