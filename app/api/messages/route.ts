import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

/**
 * 发送消息
 * POST /api/messages
 *
 * Body:
 * {
 *   conversation_id: string
 *   content: string
 *   message_type?: 'text' | 'image' | 'file'
 *   media_url?: string
 *   media_type?: string
 *   media_size?: number
 *   reply_to_message_id?: string
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
      conversation_id,
      content,
      message_type = 'text',
      media_url,
      media_type,
      media_size,
      reply_to_message_id,
    } = body

    // 3. 验证参数
    if (!conversation_id) {
      return NextResponse.json(
        { error: '会话 ID 不能为空' },
        { status: 400 }
      )
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: '消息内容不能超过 5000 字符' },
        { status: 400 }
      )
    }

    // 4. 验证会话存在且用户是参与者
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, participant_ids')
      .eq('id', conversation_id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
      )
    }

    if (!conversation.participant_ids.includes(user.id)) {
      return NextResponse.json(
        { error: '无权在此会话中发送消息' },
        { status: 403 }
      )
    }

    // 5. 如果有回复引用，验证引用消息存在
    if (reply_to_message_id) {
      const { data: replyMessage, error: replyError } = await supabase
        .from('messages')
        .select('id, conversation_id')
        .eq('id', reply_to_message_id)
        .single()

      if (replyError || !replyMessage || replyMessage.conversation_id !== conversation_id) {
        return NextResponse.json(
          { error: '引用的消息不存在或不在当前会话中' },
          { status: 400 }
        )
      }
    }

    // 6. 创建消息（不包含关联查询）
    const { data: message, error: createError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_id: user.id,
        content: content.trim(),
        message_type,
        media_url,
        media_type,
        media_size,
        reply_to_message_id,
      })
      .select('*')
      .single()

    if (createError) {
      console.error('[Messages API] 创建消息错误:', createError)
      return NextResponse.json(
        { error: '发送消息失败' },
        { status: 500 }
      )
    }

    // 7. 单独获取发送者信息
    let sender = null
    if (message.sender_id) {
      const { data: senderData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, avatar_template, nft_avatar_url')
        .eq('id', message.sender_id)
        .single()
      sender = senderData
    }

    // 8. 单独获取回复消息信息
    let reply_to_message = null
    if (message.reply_to_message_id) {
      const { data: replyData } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('id', message.reply_to_message_id)
        .single()
      reply_to_message = replyData
    }

    return NextResponse.json({
      message: {
        ...message,
        sender,
        reply_to_message,
      }
    })
  } catch (error) {
    console.error('[Messages API] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

/**
 * 获取消息列表
 * GET /api/messages?conversationId={id}&page=1&limit=50
 *
 * Query:
 * - conversationId: 会话 ID（必需）
 * - page: 页码（默认 1）
 * - limit: 每页数量（默认 50，最大 100）
 * - before: 获取此消息 ID 之前的消息（用于加载更多）
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
    const conversationId = searchParams.get('conversationId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const before = searchParams.get('before') // message ID

    if (!conversationId) {
      return NextResponse.json(
        { error: '会话 ID 不能为空' },
        { status: 400 }
      )
    }

    // 3. 验证会话存在且用户是参与者
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, participant_ids')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
      )
    }

    if (!conversation.participant_ids.includes(user.id)) {
      return NextResponse.json(
        { error: '无权访问此会话的消息' },
        { status: 403 }
      )
    }

    // 4. 构建查询（不包含关联查询）
    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)

    // 如果提供了 before 参数，获取该消息之前的消息
    if (before) {
      const { data: beforeMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', before)
        .single()

      if (beforeMessage) {
        query = query.lt('created_at', beforeMessage.created_at)
      }
    }

    // 5. 执行查询（按时间倒序，最新的在前）
    const offset = (page - 1) * limit
    const { data: messages, error: queryError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (queryError) {
      console.error('[Messages API] 查询错误:', queryError)
      return NextResponse.json(
        { error: '查询消息失败' },
        { status: 500 }
      )
    }

    // 6. 为每条消息添加发送者和回复信息
    const enrichedMessages = await Promise.all(
      (messages || []).map(async (message) => {
        // 获取发送者信息
        let sender = null
        if (message.sender_id) {
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, avatar_template, nft_avatar_url')
            .eq('id', message.sender_id)
            .single()
          sender = senderData
        }

        // 获取回复消息信息
        let reply_to_message = null
        if (message.reply_to_message_id) {
          const { data: replyData } = await supabase
            .from('messages')
            .select('id, content, sender_id, created_at')
            .eq('id', message.reply_to_message_id)
            .single()
          reply_to_message = replyData
        }

        return {
          ...message,
          sender,
          reply_to_message,
        }
      })
    )

    // 7. 反转数组，使最早的消息在前（UI 中从上到下显示）
    const sortedMessages = enrichedMessages.reverse()

    return NextResponse.json({
      messages: sortedMessages,
      pagination: {
        page,
        limit,
        total: count || 0,
        has_more: count ? offset + limit < count : false,
      }
    })
  } catch (error) {
    console.error('[Messages API] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
