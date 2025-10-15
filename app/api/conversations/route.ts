import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

/**
 * 创建会话
 * POST /api/conversations
 *
 * Body:
 * {
 *   participant_ids: string[]         // 参与者 ID 列表
 *   conversation_type?: 'direct' | 'group'  // 默认 'direct'
 *   group_name?: string               // 群组名称（群聊时必需）
 *   group_avatar_url?: string         // 群组头像
 * }
 */
export async function POST(request: NextRequest) {
  try {
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

    // 2. 解析请求体
    const body = await request.json()
    const {
      participant_ids,
      conversation_type = 'direct',
      group_name,
      group_avatar_url,
    } = body

    // 3. 验证参数
    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return NextResponse.json(
        { error: '参与者列表不能为空' },
        { status: 400 }
      )
    }

    // 确保当前用户在参与者列表中
    if (!participant_ids.includes(user.id)) {
      participant_ids.push(user.id)
    }

    // 验证一对一会话
    if (conversation_type === 'direct') {
      if (participant_ids.length !== 2) {
        return NextResponse.json(
          { error: '一对一会话必须有且仅有 2 个参与者' },
          { status: 400 }
        )
      }

      // 检查一对一会话是否已存在
      const otherUserId = participant_ids.find(id => id !== user.id)

      if (!otherUserId) {
        return NextResponse.json(
          { error: '无法找到对方用户' },
          { status: 400 }
        )
      }

      // 先尝试查找现有会话（不包含关联查询）
      const { data: allConversations, error: findError } = await supabase
        .from('conversations')
        .select('id, participant_ids, conversation_type, group_name, group_avatar_url, last_message_at, last_message_content, last_message_sender_id, created_at, updated_at')
        .eq('conversation_type', 'direct')

      console.log('[Conversations API] 查询所有会话数量:', allConversations?.length || 0)

      if (findError) {
        console.error('[Conversations API] 查找会话错误:', {
          error: findError,
          message: findError.message,
          code: findError.code
        })
        return NextResponse.json(
          { error: `查找会话失败: ${findError.message}` },
          { status: 500 }
        )
      }

      // 手动筛选包含两个用户的会话
      const existingConv = allConversations?.find(conv => {
        const ids = conv.participant_ids || []
        return ids.length === 2 && ids.includes(user.id) && ids.includes(otherUserId)
      })

      console.log('[Conversations API] 查找结果:', {
        found: !!existingConv,
        existingId: existingConv?.id,
        participants: [user.id, otherUserId]
      })

      // 如果找到现有会话，返回
      if (existingConv) {
        console.log('[Conversations API] 找到现有会话:', existingConv.id)

        // 单独查询 last_message_sender 信息（如果存在）
        let last_message_sender = null
        if (existingConv.last_message_sender_id) {
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, avatar_template, nft_avatar_url')
            .eq('id', existingConv.last_message_sender_id)
            .single()

          last_message_sender = sender
        }

        return NextResponse.json({
          conversation: {
            ...existingConv,
            last_message_sender
          },
          is_new: false
        })
      }

      // 如果没有找到，继续创建新会话
      console.log('[Conversations API] 没有找到现有会话，将创建新会话')
    }

    // 验证群聊
    if (conversation_type === 'group') {
      if (!group_name || group_name.trim().length === 0) {
        return NextResponse.json(
          { error: '群聊必须提供群组名称' },
          { status: 400 }
        )
      }
      if (participant_ids.length < 2) {
        return NextResponse.json(
          { error: '群聊至少需要 2 个参与者' },
          { status: 400 }
        )
      }
    }

    // 4. 创建会话（不包含关联查询）
    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        participant_ids,
        conversation_type,
        group_name: conversation_type === 'group' ? group_name : null,
        group_avatar_url: conversation_type === 'group' ? group_avatar_url : null,
      })
      .select('id, participant_ids, conversation_type, group_name, group_avatar_url, last_message_at, last_message_content, last_message_sender_id, created_at, updated_at')
      .single()

    if (createError || !conversation) {
      console.error('[Conversations API] 创建会话错误:', createError)
      return NextResponse.json(
        { error: '创建会话失败' },
        { status: 500 }
      )
    }

    console.log('[Conversations API] 成功创建新会话:', conversation.id)

    return NextResponse.json({
      conversation: {
        ...conversation,
        last_message_sender: null  // 新会话没有消息发送者
      },
      is_new: true
    })
  } catch (error) {
    console.error('[Conversations API] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

/**
 * 获取会话列表
 * GET /api/conversations
 *
 * Query:
 * - page: 页码（默认 1）
 * - limit: 每页数量（默认 20，最大 100）
 */
export async function GET(request: NextRequest) {
  try {
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

    // 2. 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // 3. 查询会话列表（使用视图）
    const { data: conversations, error: queryError } = await supabase
      .from('conversation_list_view')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (queryError) {
      console.error('[Conversations API] 查询错误:', queryError)
      return NextResponse.json(
        { error: '查询会话列表失败' },
        { status: 500 }
      )
    }

    // 4. 获取总数
    const { count, error: countError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .contains('participant_ids', [user.id])

    if (countError) {
      console.error('[Conversations API] 计数错误:', countError)
    }

    // 5. 为每个会话添加其他参与者信息
    const conversationsWithParticipants = await Promise.all(
      (conversations || []).map(async (conversation) => {
        // 获取所有参与者信息
        const { data: participants } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, avatar_template, nft_avatar_url, bio')
          .in('id', conversation.participant_ids)

        // 如果是一对一会话，找出对方
        let other_participant = null
        if (conversation.conversation_type === 'direct' && participants) {
          other_participant = participants.find(p => p.id !== user.id) || null
        }

        return {
          ...conversation,
          participants: participants || [],
          other_participant,
        }
      })
    )

    // 6. 计算总未读数
    const totalUnread = conversationsWithParticipants.reduce(
      (sum, conv) => sum + (conv.unread_count || 0),
      0
    )

    return NextResponse.json({
      conversations: conversationsWithParticipants,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: count ? Math.ceil(count / limit) : 0,
      },
      total_unread: totalUnread,
    })
  } catch (error) {
    console.error('[Conversations API] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
