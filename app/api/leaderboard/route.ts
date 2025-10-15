import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'

/**
 * 排行榜 API
 * GET /api/leaderboard
 *
 * 查询参数：
 * - level: 筛选等级 (bronze/silver/gold/diamond/legend)
 * - timeRange: 时间范围 (week/month/all)，默认 all
 * - page: 页码，从 1 开始，默认 1
 * - limit: 每页数量，默认 20，最大 100
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const searchParams = request.nextUrl.searchParams

    // 获取查询参数
    const level = searchParams.get('level')
    const timeRange = searchParams.get('timeRange') || 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    // 计算分页偏移量
    const offset = (page - 1) * limit

    // 计算时间范围的起始时间
    let timeRangeFilter: Date | null = null
    if (timeRange === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      timeRangeFilter = weekAgo
    } else if (timeRange === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      timeRangeFilter = monthAgo
    }

    // 构建查询
    let query = supabase
      .from('profiles')
      .select(`
        id,
        username,
        avatar_url,
        avatar_template,
        bio,
        wallet_address,
        reputation_score,
        reputation_level,
        reputation_updated_at,
        on_chain_tx_count,
        defi_protocol_count,
        wallet_age_days,
        eth_balance
      `)
      .not('wallet_address', 'is', null)
      .not('reputation_score', 'is', null)
      .order('reputation_score', { ascending: false })

    // 筛选等级
    if (level && ['bronze', 'silver', 'gold', 'diamond', 'legend'].includes(level)) {
      query = query.eq('reputation_level', level)
    }

    // 筛选时间范围（仅显示最近更新的）
    if (timeRangeFilter) {
      query = query.gte('reputation_updated_at', timeRangeFilter.toISOString())
    }

    // 获取总数（用于分页）
    let countQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('wallet_address', 'is', null)
      .not('reputation_score', 'is', null)

    // 应用相同的筛选条件
    if (level && ['bronze', 'silver', 'gold', 'diamond', 'legend'].includes(level)) {
      countQuery = countQuery.eq('reputation_level', level)
    }
    if (timeRangeFilter) {
      countQuery = countQuery.gte('reputation_updated_at', timeRangeFilter.toISOString())
    }

    const { count: totalCount } = await countQuery

    // 应用分页
    query = query.range(offset, offset + limit - 1)

    // 执行查询
    const { data: profiles, error } = await query

    if (error) {
      console.error('[Leaderboard API] 查询错误:', error)
      return NextResponse.json(
        { error: '获取排行榜失败' },
        { status: 500 }
      )
    }

    // 为每个用户计算排名（基于当前筛选条件）
    const leaderboard = profiles.map((profile, index) => ({
      rank: offset + index + 1,
      user: {
        id: profile.id,
        username: profile.username,
        avatarUrl: profile.avatar_url,
        avatarTemplate: profile.avatar_template,
        bio: profile.bio,
      },
      reputation: {
        score: profile.reputation_score,
        level: profile.reputation_level,
        updatedAt: profile.reputation_updated_at,
      },
      stats: {
        txCount: profile.on_chain_tx_count || 0,
        protocolCount: profile.defi_protocol_count || 0,
        walletAgeDays: profile.wallet_age_days || 0,
        ethBalance: profile.eth_balance || '0',
      },
    }))

    // 构建分页信息
    const totalPages = totalCount ? Math.ceil(totalCount / limit) : 0
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      leaderboard,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalCount: totalCount || 0,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        level: level || 'all',
        timeRange,
      },
    })
  } catch (error) {
    console.error('[Leaderboard API] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
