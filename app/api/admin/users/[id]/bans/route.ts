import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

/**
 * 创建用户封禁（管理员专用）
 * POST /api/admin/users/[id]/bans
 *
 * Request Body:
 * {
 *   reason: string,
 *   ban_type: 'temporary' | 'permanent',
 *   ban_duration_days?: number  // 临时封禁必填
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: target_user_id } = await params

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

    // 3. 防止自封
    if (target_user_id === user.id) {
      return NextResponse.json({ error: '不能封禁自己' }, { status: 400 })
    }

    // 4. 解析请求体
    const body = await request.json()
    const { reason, ban_type, ban_duration_days } = body

    // 5. 验证参数
    if (!reason || !ban_type) {
      return NextResponse.json({ error: '原因和封禁类型不能为空' }, { status: 400 })
    }

    if (ban_type === 'temporary') {
      if (!ban_duration_days || ban_duration_days <= 0) {
        return NextResponse.json({ error: '临时封禁必须指定天数' }, { status: 400 })
      }
    }

    // 6. 检查是否已经被封禁
    const { data: existingBan } = await supabase
      .from('user_bans')
      .select('id')
      .eq('user_id', target_user_id)
      .eq('is_active', true)
      .single()

    if (existingBan) {
      return NextResponse.json({ error: '该用户已被封禁' }, { status: 400 })
    }

    // 7. 构建封禁数据
    const banData: any = {
      user_id: target_user_id,
      banned_by: user.id,
      reason,
      ban_type,
      is_active: true,
    }

    if (ban_type === 'temporary' && ban_duration_days) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + ban_duration_days)
      banData.expires_at = expiresAt.toISOString()
    }

    // 8. 创建封禁记录
    const { data: ban, error: createError } = await supabase
      .from('user_bans')
      .insert(banData)
      .select(`
        *,
        user:profiles!user_bans_user_id_fkey(id, username, avatar_url),
        banned_by_user:profiles!user_bans_banned_by_fkey(id, username, avatar_url)
      `)
      .single()

    if (createError) {
      console.error('[Admin User Bans API] 创建封禁错误:', createError)
      return NextResponse.json({ error: '创建封禁失败' }, { status: 500 })
    }

    // 9. 同时创建审核操作记录
    const actionType = ban_type === 'permanent' ? 'permanent_ban' : 'temporary_ban'
    const actionData: any = {
      moderator_id: user.id,
      target_user_id,
      action_type: actionType,
      reason,
      ban_duration_days: ban_type === 'temporary' ? ban_duration_days : null,
      ban_expires_at: banData.expires_at || null,
    }

    await supabase.from('moderation_actions').insert(actionData)

    return NextResponse.json({ ban })
  } catch (error) {
    console.error('[Admin User Bans API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * 获取用户封禁历史（管理员专用）
 * GET /api/admin/users/[id]/bans
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: target_user_id } = await params

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

    // 2. 检查权限（管理员或用户自己）
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id })
    if (!isAdmin && user.id !== target_user_id) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 3. 获取封禁历史
    const { data: bans, error: queryError } = await supabase
      .from('user_bans')
      .select(`
        *,
        user:profiles!user_bans_user_id_fkey(id, username, avatar_url),
        banned_by_user:profiles!user_bans_banned_by_fkey(id, username, avatar_url),
        lifted_by_user:profiles!user_bans_lifted_by_fkey(id, username, avatar_url)
      `)
      .eq('user_id', target_user_id)
      .order('banned_at', { ascending: false })

    if (queryError) {
      console.error('[Admin User Bans API] 查询错误:', queryError)
      return NextResponse.json({ error: '查询封禁历史失败' }, { status: 500 })
    }

    // 4. 检查当前是否被封禁
    const { data: isBanned } = await supabase.rpc('is_user_banned', { user_id: target_user_id })

    return NextResponse.json({
      bans: bans || [],
      is_currently_banned: isBanned || false,
    })
  } catch (error) {
    console.error('[Admin User Bans API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * 解除用户封禁（管理员专用）
 * DELETE /api/admin/users/[id]/bans
 *
 * Request Body:
 * {
 *   lift_reason: string
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: target_user_id } = await params

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
    const { lift_reason } = body

    if (!lift_reason) {
      return NextResponse.json({ error: '解除原因不能为空' }, { status: 400 })
    }

    // 4. 检查是否存在活跃的封禁
    const { data: activeBan } = await supabase
      .from('user_bans')
      .select('id')
      .eq('user_id', target_user_id)
      .eq('is_active', true)
      .single()

    if (!activeBan) {
      return NextResponse.json({ error: '该用户没有活跃的封禁' }, { status: 400 })
    }

    // 5. 解除封禁
    const { data: updatedBan, error: updateError } = await supabase
      .from('user_bans')
      .update({
        is_active: false,
        lifted_by: user.id,
        lifted_at: new Date().toISOString(),
        lift_reason,
      })
      .eq('user_id', target_user_id)
      .eq('is_active', true)
      .select(`
        *,
        user:profiles!user_bans_user_id_fkey(id, username, avatar_url),
        lifted_by_user:profiles!user_bans_lifted_by_fkey(id, username, avatar_url)
      `)
      .single()

    if (updateError) {
      console.error('[Admin User Bans API] 解除封禁错误:', updateError)
      return NextResponse.json({ error: '解除封禁失败' }, { status: 500 })
    }

    // 6. 创建审核操作记录
    await supabase.from('moderation_actions').insert({
      moderator_id: user.id,
      target_user_id,
      action_type: 'ban_lift',
      reason: lift_reason,
    })

    return NextResponse.json({ ban: updatedBan })
  } catch (error) {
    console.error('[Admin User Bans API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
