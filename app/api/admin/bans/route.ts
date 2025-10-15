import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

/**
 * 获取所有用户封禁记录
 * GET /api/admin/bans?status=active&page=1&limit=20
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
    const status = searchParams.get('status') // 'active' | 'expired' | 'lifted' | 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // 4. 构建查询
    let query = supabase
      .from('user_bans')
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
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // 筛选状态
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'expired') {
      query = query
        .eq('is_active', false)
        .not('expires_at', 'is', null)
        .lt('expires_at', new Date().toISOString())
    } else if (status === 'lifted') {
      query = query
        .eq('is_active', false)
        .or('expires_at.is.null,expires_at.gte.' + new Date().toISOString())
    }
    // 'all' 不添加筛选

    // 5. 分页
    query = query.range(offset, offset + limit - 1)

    const { data: bans, error: fetchError, count } = await query

    if (fetchError) {
      console.error('[Admin Bans API] 获取封禁列表错误:', fetchError)
      return NextResponse.json({ error: '获取封禁列表失败' }, { status: 500 })
    }

    // 6. 处理数据
    const processedBans = (bans || []).map((ban: any) => ({
      id: ban.id,
      user_id: ban.user_id,
      banned_by: ban.banned_by,
      reason: ban.reason,
      ban_type: ban.ban_type,
      expires_at: ban.expires_at,
      is_active: ban.is_active,
      created_at: ban.created_at,
      updated_at: ban.updated_at,
      user: {
        id: ban.user?.id || '',
        username: ban.user?.username || '未知用户',
        avatar_url: ban.user?.avatar_url,
        avatar_template: ban.user?.avatar_template,
      },
      admin: {
        id: ban.admin?.id || '',
        username: ban.admin?.username || '系统',
      },
    }))

    return NextResponse.json({
      bans: processedBans,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('[Admin Bans API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * 创建新的用户封禁
 * POST /api/admin/bans
 * Body: { user_id: string, reason: string, ban_type: 'temporary' | 'permanent', duration_hours?: number }
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
    const { user_id, reason, ban_type, duration_hours } = body

    if (!user_id || !reason || !ban_type) {
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 })
    }

    if (ban_type !== 'temporary' && ban_type !== 'permanent') {
      return NextResponse.json({ error: 'ban_type 必须是 temporary 或 permanent' }, { status: 400 })
    }

    if (ban_type === 'temporary' && !duration_hours) {
      return NextResponse.json({ error: '临时封禁必须指定 duration_hours' }, { status: 400 })
    }

    // 4. 检查用户是否存在
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user_id)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 5. 检查是否已有活跃封禁
    const { data: existingBan } = await supabase
      .from('user_bans')
      .select('id')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single()

    if (existingBan) {
      return NextResponse.json({ error: '该用户已被封禁' }, { status: 400 })
    }

    // 6. 计算过期时间
    let expires_at = null
    if (ban_type === 'temporary' && duration_hours) {
      const expiresDate = new Date()
      expiresDate.setHours(expiresDate.getHours() + duration_hours)
      expires_at = expiresDate.toISOString()
    }

    // 7. 创建封禁记录
    const { data: newBan, error: insertError } = await supabase
      .from('user_bans')
      .insert({
        user_id,
        banned_by: user.id,
        reason,
        ban_type,
        expires_at,
        is_active: true,
      })
      .select(`
        id,
        user_id,
        banned_by,
        reason,
        ban_type,
        expires_at,
        is_active,
        created_at,
        user:profiles!user_bans_user_id_fkey(id, username, avatar_url, avatar_template),
        admin:profiles!user_bans_banned_by_fkey(id, username)
      `)
      .single()

    if (insertError) {
      console.error('[Admin Bans API] 创建封禁错误:', insertError)
      return NextResponse.json({ error: '创建封禁失败' }, { status: 500 })
    }

    // 8. 记录审核操作
    await supabase.from('moderation_actions').insert({
      admin_id: user.id,
      action_type: 'ban_user',
      target_type: 'user',
      target_id: user_id,
      details: {
        reason,
        ban_type,
        duration_hours,
        expires_at,
      },
    })

    return NextResponse.json({
      success: true,
      ban: {
        id: newBan.id,
        user_id: newBan.user_id,
        banned_by: newBan.banned_by,
        reason: newBan.reason,
        ban_type: newBan.ban_type,
        expires_at: newBan.expires_at,
        is_active: newBan.is_active,
        created_at: newBan.created_at,
        user: {
          id: newBan.user?.id || '',
          username: newBan.user?.username || '未知用户',
          avatar_url: newBan.user?.avatar_url,
          avatar_template: newBan.user?.avatar_template,
        },
        admin: {
          id: newBan.admin?.id || '',
          username: newBan.admin?.username || '系统',
        },
      },
    })
  } catch (error) {
    console.error('[Admin Bans API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
