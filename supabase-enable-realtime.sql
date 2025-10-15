-- =====================================================
-- 启用 Supabase Realtime - 通过 SQL 命令
-- =====================================================

-- 1. 将消息系统的表添加到 Realtime publication
-- =====================================================

-- 启用 conversations 表的 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- 启用 messages 表的 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 启用 conversation_members 表的 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;

-- =====================================================
-- 验证 Realtime 是否已启用
-- =====================================================

-- 查看 supabase_realtime publication 包含的表
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;

-- 应该看到输出包含：
-- public | conversations
-- public | conversation_members
-- public | messages

-- =====================================================
-- 完成！
--
-- 如果上面的查询显示了这三个表，说明 Realtime 已成功启用
-- 现在可以继续实现 API 路由和 UI 组件了
-- =====================================================
