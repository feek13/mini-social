import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

// PATCH - 标记单条通知为已读
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 获取通知 ID
    const { id: notificationId } = await params

    if (!notificationId) {
      return NextResponse.json(
        { error: '通知 ID 无效' },
        { status: 400 }
      )
    }

    // 检查通知是否存在且属于当前用户
    const { data: notification, error: checkError } = await supabase
      .from('notifications')
      .select('recipient_id')
      .eq('id', notificationId)
      .single()

    if (checkError || !notification) {
      return NextResponse.json(
        { error: '通知不存在' },
        { status: 404 }
      )
    }

    if (notification.recipient_id !== user.id) {
      return NextResponse.json(
        { error: '无权限修改此通知' },
        { status: 403 }
      )
    }

    // 标记为已读
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (updateError) {
      console.error('标记已读错误:', updateError)
      return NextResponse.json(
        { error: '标记已读失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
