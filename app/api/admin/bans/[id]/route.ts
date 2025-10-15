import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

/**
 * 解除用户封禁
 * PATCH /api/admin/bans/[id]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

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

    // 3. 检查封禁是否存在
    const { data: existingBan, error: fetchError } = await supabase
      .from('user_bans')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingBan) {
      return NextResponse.json({ error: '封禁记录不存在' }, { status: 404 })
    }

    if (!existingBan.is_active) {
      return NextResponse.json({ error: '该封禁已失效' }, { status: 400 })
    }

    // 4. 解除封禁
    const { data: updatedBan, error: updateError } = await supabase
      .from('user_bans')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        id,
        user_id,
        banned_by,
        reason,
        ban_type,
        expires_at,
        is_active,
        created_at,
        updated_at,
        user:profiles!user_bans_user_id_fkey(id, username, avatar_url, avatar_template),
        admin:profiles!user_bans_banned_by_fkey(id, username)
      `)
      .single()

    if (updateError) {
      console.error('[Admin Bans API] 解除封禁错误:', updateError)
      return NextResponse.json({ error: '解除封禁失败' }, { status: 500 })
    }

    // 5. 记录审核操作
    await supabase.from('moderation_actions').insert({
      admin_id: user.id,
      action_type: 'unban_user',
      target_type: 'user',
      target_id: existingBan.user_id,
      details: {
        ban_id: id,
        original_reason: existingBan.reason,
        original_ban_type: existingBan.ban_type,
      },
    })

    return NextResponse.json({
      success: true,
      ban: {
        id: updatedBan.id,
        user_id: updatedBan.user_id,
        banned_by: updatedBan.banned_by,
        reason: updatedBan.reason,
        ban_type: updatedBan.ban_type,
        expires_at: updatedBan.expires_at,
        is_active: updatedBan.is_active,
        created_at: updatedBan.created_at,
        updated_at: updatedBan.updated_at,
        user: {
          id: updatedBan.user?.id || '',
          username: updatedBan.user?.username || '未知用户',
          avatar_url: updatedBan.user?.avatar_url,
          avatar_template: updatedBan.user?.avatar_template,
        },
        admin: {
          id: updatedBan.admin?.id || '',
          username: updatedBan.admin?.username || '系统',
        },
      },
    })
  } catch (error) {
    console.error('[Admin Bans API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * 删除封禁记录
 * DELETE /api/admin/bans/[id]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

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

    // 3. 检查封禁是否存在
    const { data: existingBan, error: fetchError } = await supabase
      .from('user_bans')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingBan) {
      return NextResponse.json({ error: '封禁记录不存在' }, { status: 404 })
    }

    // 4. 删除封禁记录
    const { error: deleteError } = await supabase
      .from('user_bans')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[Admin Bans API] 删除封禁错误:', deleteError)
      return NextResponse.json({ error: '删除封禁失败' }, { status: 500 })
    }

    // 5. 记录审核操作
    await supabase.from('moderation_actions').insert({
      admin_id: user.id,
      action_type: 'delete_ban',
      target_type: 'user',
      target_id: existingBan.user_id,
      details: {
        ban_id: id,
        reason: existingBan.reason,
        ban_type: existingBan.ban_type,
      },
    })

    return NextResponse.json({
      success: true,
      message: '封禁记录已删除',
    })
  } catch (error) {
    console.error('[Admin Bans API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
