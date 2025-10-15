import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

/**
 * 审核举报（管理员专用）
 * PATCH /api/admin/reports/[id]
 *
 * Request Body:
 * {
 *   status: 'resolved' | 'dismissed' | 'reviewing',
 *   resolution_note?: string,
 *   create_action?: {
 *     action_type: ModerationActionType,
 *     reason: string,
 *     ban_duration_days?: number
 *   }
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    const { status, resolution_note, create_action } = body

    // 4. 验证参数
    if (!status || !['resolved', 'dismissed', 'reviewing'].includes(status)) {
      return NextResponse.json({ error: '无效的状态' }, { status: 400 })
    }

    // 5. 获取举报信息
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: '举报不存在' }, { status: 404 })
    }

    // 6. 更新举报状态
    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        resolution_note: resolution_note || null,
      })
      .eq('id', id)
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(id, username, avatar_url),
        reviewer:profiles!reports_reviewed_by_fkey(id, username, avatar_url)
      `)
      .single()

    if (updateError) {
      console.error('[Admin Reports API] 更新举报错误:', updateError)
      return NextResponse.json({ error: '更新举报失败' }, { status: 500 })
    }

    // 7. 如果需要创建审核操作
    let moderationAction = null
    if (create_action && status === 'resolved') {
      const { action_type, reason, ban_duration_days } = create_action

      // 确定目标用户ID
      let target_user_id: string | null = null
      if (report.reported_user_id) {
        target_user_id = report.reported_user_id
      } else if (report.reported_post_id) {
        const { data: post } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', report.reported_post_id)
          .single()
        target_user_id = post?.user_id || null
      } else if (report.reported_comment_id) {
        const { data: comment } = await supabase
          .from('comments')
          .select('user_id')
          .eq('id', report.reported_comment_id)
          .single()
        target_user_id = comment?.user_id || null
      } else if (report.reported_message_id) {
        const { data: message } = await supabase
          .from('messages')
          .select('sender_id')
          .eq('id', report.reported_message_id)
          .single()
        target_user_id = message?.sender_id || null
      }

      if (!target_user_id) {
        return NextResponse.json({ error: '无法确定目标用户' }, { status: 400 })
      }

      // 创建审核操作
      const actionData: any = {
        moderator_id: user.id,
        target_user_id,
        target_post_id: report.reported_post_id,
        target_comment_id: report.reported_comment_id,
        action_type,
        reason,
        related_report_id: id,
      }

      // 计算封禁过期时间
      if (action_type === 'temporary_ban' && ban_duration_days) {
        actionData.ban_duration_days = ban_duration_days
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + ban_duration_days)
        actionData.ban_expires_at = expiresAt.toISOString()
      }

      const { data: action, error: actionError } = await supabase
        .from('moderation_actions')
        .insert(actionData)
        .select()
        .single()

      if (actionError) {
        console.error('[Admin Reports API] 创建审核操作错误:', actionError)
        return NextResponse.json({ error: '创建审核操作失败' }, { status: 500 })
      }

      moderationAction = action

      // 8. 如果是封禁操作，创建封禁记录
      if (action_type === 'temporary_ban' || action_type === 'permanent_ban') {
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

        await supabase.from('user_bans').insert(banData)
      }

      // 9. 如果是删除内容操作
      if (action_type === 'content_removal') {
        if (report.reported_post_id) {
          await supabase
            .from('posts')
            .delete()
            .eq('id', report.reported_post_id)
        } else if (report.reported_comment_id) {
          await supabase
            .from('comments')
            .delete()
            .eq('id', report.reported_comment_id)
        }
      }
    }

    return NextResponse.json({
      report: updatedReport,
      moderation_action: moderationAction,
    })
  } catch (error) {
    console.error('[Admin Reports API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
