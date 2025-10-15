import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

/**
 * 临时 API - 仅用于开发环境
 * 为第一个登录的用户添加管理员权限
 *
 * ⚠️ 生产环境请删除此文件或添加额外的安全验证
 */
export async function POST(request: NextRequest) {
  try {
    // 获取认证 token
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未提供认证信息' }, { status: 401 })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 检查是否已有管理员
    const { data: existingAdmins, error: checkError } = await supabase
      .from('admin_roles')
      .select('id')
      .limit(1)

    if (checkError) {
      console.error('[Init Admin] 检查现有管理员错误:', checkError)
      return NextResponse.json({ error: '数据库查询失败' }, { status: 500 })
    }

    // 如果已有管理员，拒绝创建（安全措施）
    if (existingAdmins && existingAdmins.length > 0) {
      return NextResponse.json(
        { error: '系统已有管理员，请联系现有管理员授权' },
        { status: 403 }
      )
    }

    // 创建第一个管理员
    const { data: adminRole, error: insertError } = await supabase
      .from('admin_roles')
      .insert({
        user_id: user.id,
        role: 'admin',
        is_active: true,
        granted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Init Admin] 创建管理员错误:', insertError)
      return NextResponse.json({ error: '创建管理员失败' }, { status: 500 })
    }

    console.log('[Init Admin] 成功创建第一个管理员:', user.email)

    return NextResponse.json({
      success: true,
      message: '成功成为管理员',
      admin: {
        user_id: user.id,
        role: 'admin',
      },
    })
  } catch (error) {
    console.error('[Init Admin] 错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '初始化管理员失败' },
      { status: 500 }
    )
  }
}
