import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

/**
 * 获取会话详情
 * GET /api/conversations/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. 验证认证
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json(
        { error: '认证失败' },
        { status: 401 }
      )
    }

    // 2. 查询会话详情（不包含关联查询）
    const { data: conversation, error: queryError } = await supabase
      .from('conversations')
      .select('id, participant_ids, conversation_type, group_name, group_avatar_url, last_message_at, last_message_content, last_message_sender_id, created_at, updated_at')
      .eq('id', id)
      .single()

    if (queryError || !conversation) {
      console.error('[Conversation Detail API] 查询会话错误:', queryError)
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
      )
    }

    // 单独查询 last_message_sender 信息（如果存在）
    let last_message_sender = null
    if (conversation.last_message_sender_id) {
      const { data: sender } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, avatar_template, nft_avatar_url')
        .eq('id', conversation.last_message_sender_id)
        .single()

      last_message_sender = sender
    }

    // 3. 验证权限（用户必须是参与者）
    if (!conversation.participant_ids.includes(user.id)) {
      return NextResponse.json(
        { error: '无权访问此会话' },
        { status: 403 }
      )
    }

    // 4. 获取所有参与者信息
    const { data: participants } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, avatar_template, nft_avatar_url, bio')
      .in('id', conversation.participant_ids)

    // 5. 获取当前用户的会话成员信息
    const { data: memberInfo } = await supabase
      .from('conversation_members')
      .select('*')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .single()

    // 6. 如果是一对一会话，找出对方
    let other_participant = null
    if (conversation.conversation_type === 'direct' && participants) {
      other_participant = participants.find(p => p.id !== user.id) || null
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        last_message_sender,
        participants: participants || [],
        other_participant,
        ...memberInfo, // 包含 unread_count, is_muted, is_pinned 等
      }
    })
  } catch (error) {
    console.error('[Conversation Detail API] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
