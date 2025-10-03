import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api' // import { createClient } from '@supabase/supabase-js'

// GET - 获取用户信息和动态
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
      .select('*')
      .eq('username', username)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 获取用户的所有动态（按时间倒序），包含评论计数
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (
          username,
          avatar_url,
          avatar_template
        ),
        comments(count)
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (postsError) {
      console.error('获取动态错误:', postsError)
      return NextResponse.json(
        { error: '获取动态失败' },
        { status: 500 }
      )
    }

    // 重命名 profiles 为 user，添加 comments_count
    const postsWithUser = posts?.map(post => ({
      ...post,
      user: post.profiles,
      profiles: undefined,
      comments_count: post.comments?.[0]?.count || 0,
      comments: undefined
    }))

    // 统计数据
    const postsCount = postsWithUser?.length || 0

    return NextResponse.json({
      profile,
      posts: postsWithUser || [],
      stats: {
        postsCount,
      },
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
