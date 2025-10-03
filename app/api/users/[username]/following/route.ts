import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'

// GET - 获取关注列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const supabase = getSupabaseClient()

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

    // 获取关注总数
    const { count, error: countError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', targetUser.id)

    if (countError) {
      console.error('获取关注数错误:', countError)
    }

    // 获取关注列表
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select(`
        following_id,
        notify_on_post,
        created_at,
        following:profiles!follows_following_id_fkey(
          id,
          username,
          avatar_url,
          avatar_template,
          bio
        )
      `)
      .eq('follower_id', targetUser.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (followsError) {
      console.error('获取关注列表错误:', followsError)
      return NextResponse.json(
        { error: '获取关注列表失败' },
        { status: 500 }
      )
    }

    // 提取关注信息和通知状态
    const following = follows?.map((f) => f.following).filter(Boolean) || []
    const notifyStatuses: { [userId: string]: boolean } = {}

    follows?.forEach((f) => {
      if (f.following) {
        notifyStatuses[f.following.id] = f.notify_on_post
      }
    })

    return NextResponse.json({
      following,
      notifyStatuses,
      total: count || 0,
      page,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
