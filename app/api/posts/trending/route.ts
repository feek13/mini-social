import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'

// 配置路由段缓存
export const dynamic = 'force-dynamic'
export const revalidate = 300 // 5分钟重新验证缓存

// 时间范围映射（以小时为单位）
const TIME_RANGES = {
  today: 24,      // 1 天
  week: 168,      // 7 天
  month: 720,     // 30 天
} as const

type TimeRange = keyof typeof TIME_RANGES

// 计算起始时间
function getStartTime(range: TimeRange): string {
  const now = new Date()
  const hoursAgo = TIME_RANGES[range]
  const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
  return startTime.toISOString()
}

// GET - 获取热门动态列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const range = (searchParams.get('range') || 'today') as TimeRange
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 验证参数
    if (!TIME_RANGES[range]) {
      return NextResponse.json(
        { error: '无效的时间范围参数' },
        { status: 400 }
      )
    }

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: '无效的分页参数' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()
    const offset = (page - 1) * limit
    const startTime = getStartTime(range)

    // 获取热门动态，使用数据库中的 hot_score 字段，并统计评论数
    const { data: posts, error } = await supabase
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
      .gte('created_at', startTime)
      .order('hot_score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('获取热门动态错误:', error)
      return NextResponse.json(
        { error: '获取热门动态失败' },
        { status: 500 }
      )
    }

    // 检查是否还有更多数据
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startTime)

    const hasMore = count ? offset + limit < count : false

    // 重命名 profiles 为 user，添加 comments_count
    const postsWithUser = posts?.map(post => ({
      ...post,
      user: post.profiles,
      profiles: undefined,
      comments_count: post.comments?.[0]?.count || 0,
      comments: undefined
    }))

    return NextResponse.json(
      {
        posts: postsWithUser || [],
        page,
        limit,
        hasMore,
        total: count || 0
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
