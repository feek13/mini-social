import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

// POST - 关注用户
export async function POST(
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

    // 不能关注自己
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: '不能关注自己' },
        { status: 400 }
      )
    }

    // 检查是否已关注
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', targetUser.id)
      .single()

    if (existingFollow) {
      return NextResponse.json(
        { error: '已经关注该用户' },
        { status: 409 }
      )
    }

    // 获取请求体（可选：立即开启通知）
    let notifyOnPost = false
    try {
      const body = await request.json()
      notifyOnPost = body.notifyOnPost || false
    } catch {
      // 如果没有请求体或解析失败，使用默认值
    }

    // 插入关注记录
    const { error: followError } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: targetUser.id,
        notify_on_post: notifyOnPost,
      })

    if (followError) {
      console.error('关注失败:', followError)
      return NextResponse.json(
        { error: '关注失败，请重试' },
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

// DELETE - 取消关注
export async function DELETE(
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

    // 删除关注记录
    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUser.id)

    if (deleteError) {
      console.error('取消关注失败:', deleteError)
      return NextResponse.json(
        { error: '取消关注失败，请重试' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      following: false,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// GET - 查询关注状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({
        following: false,
        notifyOnPost: false,
      })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    // 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({
        following: false,
        notifyOnPost: false,
      })
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

    // 查询关注状态
    const { data: follow } = await supabase
      .from('follows')
      .select('notify_on_post')
      .eq('follower_id', user.id)
      .eq('following_id', targetUser.id)
      .single()

    if (!follow) {
      return NextResponse.json({
        following: false,
        notifyOnPost: false,
      })
    }

    return NextResponse.json({
      following: true,
      notifyOnPost: follow.notify_on_post,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
