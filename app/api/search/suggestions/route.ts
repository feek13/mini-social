import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    // 验证查询词
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: '搜索词至少需要 2 个字符' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // 搜索用户（前 5 个）
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, avatar_template, bio')
      .or(`username.ilike.%${query}%,bio.ilike.%${query}%`)
      .order('username')
      .limit(5)

    if (usersError) {
      console.error('Error fetching user suggestions:', usersError)
    }

    // 搜索动态内容关键词（获取前 3 个匹配的动态作为关键词建议）
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('content')
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(3)

    if (postsError) {
      console.error('Error fetching post suggestions:', postsError)
    }

    // 提取关键词（取前 3 个动态的关键词片段）
    const keywords = posts
      ? posts.map(post => {
          const content = post.content
          const index = content.toLowerCase().indexOf(query.toLowerCase())
          if (index !== -1) {
            // 提取包含关键词的片段（前后各 20 个字符）
            const start = Math.max(0, index - 20)
            const end = Math.min(content.length, index + query.length + 20)
            let snippet = content.substring(start, end).trim()
            if (start > 0) snippet = '...' + snippet
            if (end < content.length) snippet = snippet + '...'
            return snippet
          }
          return content.substring(0, 50) + '...'
        })
      : []

    return NextResponse.json({
      users: users || [],
      keywords,
    })
  } catch (error) {
    console.error('Search suggestions error:', error)
    return NextResponse.json(
      { error: '搜索建议失败' },
      { status: 500 }
    )
  }
}
