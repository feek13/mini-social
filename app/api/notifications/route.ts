import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'
import type { Notification, NotificationType } from '@/types/database'

// GET - 获取通知列表
export async function GET(request: NextRequest) {
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

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'all'
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // 构建查询
    let query = supabase
      .from('notifications')
      .select(`
        *,
        sender:sender_id (
          id,
          username,
          avatar_url,
          avatar_template
        ),
        post:post_id (
          id,
          content,
          user_id
        ),
        comment:comment_id (
          id,
          content
        )
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })

    // 类型筛选
    if (type !== 'all') {
      query = query.eq('type', type as NotificationType)
    }

    // 只显示未读
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    // 分页
    query = query.range(offset, offset + limit - 1)

    const { data: notifications, error: notificationsError } = await query

    if (notificationsError) {
      console.error('获取通知错误:', notificationsError)
      return NextResponse.json(
        { error: '获取通知失败' },
        { status: 500 }
      )
    }

    // 获取未读数量
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    if (countError) {
      console.error('获取未读数量错误:', countError)
    }

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
      page,
      hasMore: notifications && notifications.length === limit,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
