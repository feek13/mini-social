import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'

// GET - 获取用户统计数据
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = getSupabaseClient()
    const { username } = await params

    if (!username) {
      return NextResponse.json(
        { error: '用户名无效' },
        { status: 400 }
      )
    }

    // 获取用户信息
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, created_at')
      .eq('username', username)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 统计动态数
    const { count: postsCount, error: postsError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)

    if (postsError) {
      console.error('统计动态数错误:', postsError)
      return NextResponse.json(
        { error: '统计失败' },
        { status: 500 }
      )
    }

    // 统计获赞总数（所有动态的点赞数总和）
    const { data: likesData, error: likesError } = await supabase
      .from('posts')
      .select('likes_count')
      .eq('user_id', profile.id)

    if (likesError) {
      console.error('统计点赞数错误:', likesError)
      return NextResponse.json(
        { error: '统计失败' },
        { status: 500 }
      )
    }

    const likesCount = likesData?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0

    // 统计评论数（该用户动态收到的评论）
    // 首先获取该用户的所有动态ID
    const { data: userPosts, error: userPostsError } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', profile.id)

    if (userPostsError) {
      console.error('获取用户动态错误:', userPostsError)
      return NextResponse.json(
        { error: '统计失败' },
        { status: 500 }
      )
    }

    const postIds = userPosts?.map(post => post.id) || []

    let commentsCount = 0
    if (postIds.length > 0) {
      const { count, error: commentsError } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds)

      if (commentsError) {
        console.error('统计评论数错误:', commentsError)
        return NextResponse.json(
          { error: '统计失败' },
          { status: 500 }
        )
      }

      commentsCount = count || 0
    }

    // 统计粉丝数
    const { count: followersCount, error: followersError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id)

    if (followersError) {
      console.error('统计粉丝数错误:', followersError)
    }

    // 统计关注数
    const { count: followingCount, error: followingError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id)

    if (followingError) {
      console.error('统计关注数错误:', followingError)
    }

    // 计算加入天数
    const createdAt = new Date(profile.created_at)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - createdAt.getTime())
    const memberDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      postsCount: postsCount || 0,
      likesCount,
      commentsCount,
      followersCount: followersCount || 0,
      followingCount: followingCount || 0,
      memberDays,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
