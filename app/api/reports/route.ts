import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'
import type { ReportType, ReportReason } from '@/types/database'

/**
 * 创建举报
 * POST /api/reports
 */
export async function POST(request: NextRequest) {
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

    // 2. 解析请求体
    const body = await request.json()
    const {
      report_type,
      reported_post_id,
      reported_comment_id,
      reported_user_id,
      reported_message_id,
      reason,
      description,
    } = body

    // 3. 验证参数
    if (!report_type || !reason) {
      return NextResponse.json({ error: '举报类型和原因不能为空' }, { status: 400 })
    }

    // 验证至少有一个被举报对象
    const hasTarget = reported_post_id || reported_comment_id || reported_user_id || reported_message_id
    if (!hasTarget) {
      return NextResponse.json({ error: '必须指定被举报对象' }, { status: 400 })
    }

    // 4. 检查是否已经举报过相同内容
    let duplicateCheck = supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('report_type', report_type)
      .eq('status', 'pending')

    if (reported_post_id) duplicateCheck = duplicateCheck.eq('reported_post_id', reported_post_id)
    if (reported_comment_id) duplicateCheck = duplicateCheck.eq('reported_comment_id', reported_comment_id)
    if (reported_user_id) duplicateCheck = duplicateCheck.eq('reported_user_id', reported_user_id)
    if (reported_message_id) duplicateCheck = duplicateCheck.eq('reported_message_id', reported_message_id)

    const { data: existingReport } = await duplicateCheck.single()

    if (existingReport) {
      return NextResponse.json({ error: '您已经举报过此内容' }, { status: 400 })
    }

    // 5. 创建举报记录
    const { data: report, error: createError } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        report_type,
        reported_post_id,
        reported_comment_id,
        reported_user_id,
        reported_message_id,
        reason,
        description,
        status: 'pending',
      })
      .select()
      .single()

    if (createError) {
      console.error('[Reports API] 创建举报错误:', createError)
      return NextResponse.json({ error: '创建举报失败' }, { status: 500 })
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('[Reports API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * 获取举报列表（管理员专用）
 * GET /api/reports?status=pending&type=post&page=1&limit=20
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

    // 2. 检查是否是管理员
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id })

    if (!isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 3. 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'pending'
    const type = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // 4. 构建查询
    let query = supabase
      .from('reports')
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(id, username, avatar_url),
        reviewer:profiles!reports_reviewed_by_fkey(id, username, avatar_url),
        reported_post:posts(id, content, user_id),
        reported_comment:comments(id, content, user_id),
        reported_user:profiles!reports_reported_user_id_fkey(id, username, avatar_url)
      `, { count: 'exact' })
      .eq('status', status)

    if (type) {
      query = query.eq('report_type', type)
    }

    // 5. 执行查询
    const { data: reports, error: queryError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (queryError) {
      console.error('[Reports API] 查询错误:', queryError)
      return NextResponse.json({ error: '查询举报列表失败' }, { status: 500 })
    }

    // 6. 获取统计信息
    const { data: summary } = await supabase
      .from('pending_reports_summary')
      .select('*')

    return NextResponse.json({
      reports: reports || [],
      summary: summary || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: count ? Math.ceil(count / limit) : 0,
      },
    })
  } catch (error) {
    console.error('[Reports API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
