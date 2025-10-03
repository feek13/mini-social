import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

// GET - 获取当前用户的所有点赞
export async function GET(request: NextRequest) {
  try {
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

    // 获取用户的所有点赞
    const { data: likes, error } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('获取点赞列表错误:', error)
      return NextResponse.json(
        { error: '获取点赞列表失败' },
        { status: 500 }
      )
    }

    const likedPostIds = likes?.map((like) => like.post_id) || []

    return NextResponse.json({
      likedPostIds,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
