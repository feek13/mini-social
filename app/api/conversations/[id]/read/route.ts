import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

/**
 * 标记会话已读
 * PATCH /api/conversations/[id]/read
 */
export async function PATCH(
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

    // 2. 验证会话存在且用户是参与者
    const { data: conversation, error: queryError } = await supabase
      .from('conversations')
      .select('id, participant_ids')
      .eq('id', id)
      .single()

    if (queryError || !conversation) {
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
      )
    }

    if (!conversation.participant_ids.includes(user.id)) {
      return NextResponse.json(
        { error: '无权访问此会话' },
        { status: 403 }
      )
    }

    // 3. 调用函数标记已读
    const { error: markReadError } = await supabase.rpc(
      'mark_conversation_as_read',
      {
        p_conversation_id: id,
        p_user_id: user.id,
      }
    )

    if (markReadError) {
      console.error('[Mark Read API] 错误:', markReadError)
      return NextResponse.json(
        { error: '标记已读失败' },
        { status: 500 }
      )
    }

    // 4. 返回更新后的未读计数
    const { data: memberInfo } = await supabase
      .from('conversation_members')
      .select('unread_count')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      unread_count: memberInfo?.unread_count || 0,
    })
  } catch (error) {
    console.error('[Mark Read API] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
