import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

// PATCH - 标记所有通知为已读
export async function PATCH(request: NextRequest) {
  try {
    // 从请求头获取 Authorization token
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    // 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 标记所有未读通知为已读
    const { error, count } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('标记已读错误:', error)
      return NextResponse.json(
        { error: '标记已读失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
