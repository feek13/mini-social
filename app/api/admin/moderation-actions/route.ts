import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'
import type { ModerationActionType } from '@/types/database'

/**
 * 创建审核操作（管理员专用）
 * POST /api/admin/moderation-actions
 *
 * Request Body:
 * {
 *   target_user_id: string,
 *   target_post_id?: string,
 *   target_comment_id?: string,
 *   action_type: ModerationActionType,
 *   reason: string,
 *   related_report_id?: string,
 *   ban_duration_days?: number
 * }
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

    // 2. 检查管理员权限
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id })
    if (!isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 3. 解析请求体
    const body = await request.json()
    const {
      target_user_id,
      target_post_id,
      target_comment_id,
      action_type,
      reason,
      related_report_id,
      ban_duration_days,
    } = body

    // 4. 验证参数
    if (!target_user_id || !action_type || !reason) {
      return NextResponse.json({ error: '目标用户、操作类型和原因不能为空' }, { status: 400 })
    }

    // 5. 构建审核操作数据
    const actionData: any = {
      moderator_id: user.id,
      target_user_id,
      target_post_id: target_post_id || null,
      target_comment_id: target_comment_id || null,
      action_type,
      reason,
      related_report_id: related_report_id || null,
    }

    // 计算封禁过期时间
    if (action_type === 'temporary_ban') {
      if (!ban_duration_days || ban_duration_days <= 0) {
        return NextResponse.json({ error: '临时封禁必须指定天数' }, { status: 400 })
      }
      actionData.ban_duration_days = ban_duration_days
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + ban_duration_days)
      actionData.ban_expires_at = expiresAt.toISOString()
    }

    // 6. 创建审核操作
    const { data: action, error: createError } = await supabase
      .from('moderation_actions')
      .insert(actionData)
      .select(`
        *,
        moderator:profiles!moderation_actions_moderator_id_fkey(id, username, avatar_url),
        target_user:profiles!moderation_actions_target_user_id_fkey(id, username, avatar_url)
      `)
      .single()

    if (createError) {
      console.error('[Admin Moderation Actions API] 创建操作错误:', createError)
      return NextResponse.json({ error: '创建审核操作失败' }, { status: 500 })
    }

    // 7. 执行相应的副作用操作
    if (action_type === 'temporary_ban' || action_type === 'permanent_ban') {
      // 创建封禁记录
      const banData: any = {
        user_id: target_user_id,
        banned_by: user.id,
        reason,
        ban_type: action_type === 'permanent_ban' ? 'permanent' : 'temporary',
        is_active: true,
      }

      if (action_type === 'temporary_ban' && actionData.ban_expires_at) {
        banData.expires_at = actionData.ban_expires_at
      }

      const { error: banError } = await supabase.from('user_bans').insert(banData)
      if (banError) {
        console.error('[Admin Moderation Actions API] 创建封禁记录错误:', banError)
      }
    } else if (action_type === 'ban_lift') {
      // 解除封禁
      const { error: liftError } = await supabase
        .from('user_bans')
        .update({
          is_active: false,
          lifted_by: user.id,
          lifted_at: new Date().toISOString(),
          lift_reason: reason,
        })
        .eq('user_id', target_user_id)
        .eq('is_active', true)

      if (liftError) {
        console.error('[Admin Moderation Actions API] 解除封禁错误:', liftError)
      }
    } else if (action_type === 'content_removal') {
      // 删除内容
      if (target_post_id) {
        await supabase.from('posts').delete().eq('id', target_post_id)
      }
      if (target_comment_id) {
        await supabase.from('comments').delete().eq('id', target_comment_id)
      }
    }

    return NextResponse.json({ action })
  } catch (error) {
    console.error('[Admin Moderation Actions API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * 获取审核操作列表（管理员专用）
 * GET /api/admin/moderation-actions?target_user_id=xxx&action_type=xxx&page=1&limit=20
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

    // 3. 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const target_user_id = searchParams.get('target_user_id')
    const action_type = searchParams.get('action_type')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // 4. 构建查询
    let query = supabase
      .from('moderation_actions')
      .select(`
        *,
        moderator:profiles!moderation_actions_moderator_id_fkey(id, username, avatar_url),
        target_user:profiles!moderation_actions_target_user_id_fkey(id, username, avatar_url),
        target_post:posts(id, content),
        target_comment:comments(id, content)
      `, { count: 'exact' })

    if (target_user_id) {
      query = query.eq('target_user_id', target_user_id)
    }

    if (action_type) {
      query = query.eq('action_type', action_type)
    }

    // 5. 执行查询
    const { data: actions, error: queryError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (queryError) {
      console.error('[Admin Moderation Actions API] 查询错误:', queryError)
      return NextResponse.json({ error: '查询审核操作失败' }, { status: 500 })
    }

    return NextResponse.json({
      actions: actions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: count ? Math.ceil(count / limit) : 0,
      },
    })
  } catch (error) {
    console.error('[Admin Moderation Actions API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
