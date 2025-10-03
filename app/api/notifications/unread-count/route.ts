import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

// GET - 获取未读通知数量
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

    // 获取未读数量
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('获取未读数量错误:', error)
      return NextResponse.json(
        { error: '获取未读数量失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      unreadCount: count || 0,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
