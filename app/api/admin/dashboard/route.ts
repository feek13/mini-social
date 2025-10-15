import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

/**
 * 获取管理员仪表板统计数据
 * GET /api/admin/dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证认证
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 2. 检查管理员权限
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id })
    if (!isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 3. 并行获取各项统计数据
    const [
      pendingReportsResult,
      reviewingReportsResult,
      resolvedReportsResult,
      dismissedReportsResult,
      totalReportsResult,
      totalBansResult,
      activeBansResult,
      totalModerationActionsResult,
      recentReportsResult,
    ] = await Promise.all([
      // 待处理举报数
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // 审核中举报数
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'reviewing'),

      // 已解决举报数
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'resolved'),

      // 已驳回举报数
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'dismissed'),

      // 总举报数
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true }),

      // 总封禁数
      supabase
        .from('user_bans')
        .select('id', { count: 'exact', head: true }),

      // 当前活跃封禁数
      supabase
        .from('user_bans')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),

      // 总审核操作数
      supabase
        .from('moderation_actions')
        .select('id', { count: 'exact', head: true }),

      // 最近的举报
      supabase
        .from('reports')
        .select(`
          id,
          report_type,
          reason,
          status,
          created_at,
          reporter:profiles!reports_reporter_id_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    // 4. 处理最近举报数据
    const recentReports = (recentReportsResult.data || []).map((report: any) => ({
      id: report.id,
      report_type: report.report_type,
      reason: report.reason,
      status: report.status,
      created_at: report.created_at,
      reporter: {
        username: report.reporter?.username || '未知用户',
      },
    }))

    // 5. 构建响应（匹配前端期望的数据结构）
    return NextResponse.json({
      totalReports: totalReportsResult.count || 0,
      pendingReports: pendingReportsResult.count || 0,
      reviewingReports: reviewingReportsResult.count || 0,
      resolvedReports: resolvedReportsResult.count || 0,
      dismissedReports: dismissedReportsResult.count || 0,
      totalBans: totalBansResult.count || 0,
      activeBans: activeBansResult.count || 0,
      totalModerationActions: totalModerationActionsResult.count || 0,
      recentReports,
    })
  } catch (error) {
    console.error('[Admin Dashboard API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

