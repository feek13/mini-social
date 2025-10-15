/**
 * 解绑钱包 API
 * POST /api/wallet/unlink
 *
 * 解除用户账户与钱包地址的绑定
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

export async function POST(request: NextRequest) {
  try {
    // 1. 获取认证信息
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    // 验证用户身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 })
    }

    // 2. 获取当前绑定的钱包地址
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('获取用户资料失败:', profileError)
      return NextResponse.json({ error: '服务器错误' }, { status: 500 })
    }

    if (!profile.wallet_address) {
      return NextResponse.json({ error: '当前未绑定钱包' }, { status: 400 })
    }

    // 3. 解绑钱包
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        wallet_address: null,
        wallet_verified_at: null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('解绑钱包失败:', updateError)
      return NextResponse.json({ error: '解绑钱包失败' }, { status: 500 })
    }

    // 4. 返回成功响应
    return NextResponse.json({
      success: true,
      message: '钱包已成功解绑',
    })
  } catch (error) {
    console.error('解绑钱包API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
