import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'users' // 默认搜索用户
    const limit = parseInt(searchParams.get('limit') || '20')

    // 验证查询词
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: '搜索词至少需要 2 个字符' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    if (type === 'users') {
      // 搜索用户
      const { data: users, error: usersError, count } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, avatar_template, bio, created_at', { count: 'exact' })
        .or(`username.ilike.%${query}%,bio.ilike.%${query}%`)
        .order('username')
        .limit(limit)

      if (usersError) {
        console.error('Error searching users:', usersError)
        return NextResponse.json(
          { error: '搜索用户失败' },
          { status: 500 }
        )
      }

      // 按相关度排序（完全匹配 > 部分匹配）
      const sortedUsers = users?.sort((a, b) => {
        const aExact = a.username.toLowerCase() === query.toLowerCase()
        const bExact = b.username.toLowerCase() === query.toLowerCase()
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        return 0
      })

      return NextResponse.json({
        results: sortedUsers || [],
        total: count || 0,
        query,
        type: 'users',
      })
    } else if (type === 'posts') {
      // 搜索动态
      const { data: posts, error: postsError, count } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          images,
          likes_count,
          created_at,
          user:profiles!posts_user_id_fkey (
            id,
            username,
            avatar_url,
            avatar_template
          )
        `, { count: 'exact' })
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (postsError) {
        console.error('Error searching posts:', postsError)
        return NextResponse.json(
          { error: '搜索动态失败' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        results: posts || [],
        total: count || 0,
        query,
        type: 'posts',
      })
    } else {
      return NextResponse.json(
        { error: '无效的搜索类型' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: '搜索失败' },
      { status: 500 }
    )
  }
}
