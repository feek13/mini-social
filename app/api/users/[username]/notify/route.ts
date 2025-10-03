import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

// PATCH - 切换发文通知开关
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
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

    const { username } = await params

    // 查找目标用户
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 检查是否已关注
    const { data: existingFollow, error: checkError } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', targetUser.id)
      .single()

    if (checkError || !existingFollow) {
      return NextResponse.json(
        { error: '未关注该用户' },
        { status: 404 }
      )
    }

    // 获取请求体
    const body = await request.json()
    const { notifyOnPost } = body

    if (typeof notifyOnPost !== 'boolean') {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      )
    }

    // 更新通知设置
    const { error: updateError } = await supabase
      .from('follows')
      .update({ notify_on_post: notifyOnPost })
      .eq('follower_id', user.id)
      .eq('following_id', targetUser.id)

    if (updateError) {
      console.error('更新通知设置失败:', updateError)
      return NextResponse.json(
        { error: '设置失败，请重试' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      following: true,
      notifyOnPost,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
