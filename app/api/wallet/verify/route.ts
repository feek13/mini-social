/**
 * 钱包验证 API
 * POST /api/wallet/verify
 *
 * 验证用户的钱包签名并将钱包地址绑定到用户账户
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'
import {
  verifyWalletSignature,
  normalizeAddress,
  isValidAddress,
} from '@/lib/wallet-verification'

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

    // 2. 解析请求体
    const body = await request.json()
    const { address, message, signature } = body

    // 3. 验证参数
    if (!address || !message || !signature) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    if (!isValidAddress(address)) {
      return NextResponse.json({ error: '钱包地址格式不正确' }, { status: 400 })
    }

    // 4. 验证签名
    const isValid = await verifyWalletSignature(address, message, signature)

    if (!isValid) {
      return NextResponse.json({ error: '签名验证失败' }, { status: 400 })
    }

    // 5. 规范化地址（转为小写）
    const normalizedAddress = normalizeAddress(address)

    // 6. 检查该钱包是否已被其他用户绑定
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, username, wallet_address')
      .eq('wallet_address', normalizedAddress)
      .neq('id', user.id)
      .maybeSingle()

    if (checkError) {
      console.error('检查钱包绑定状态失败:', checkError)
      return NextResponse.json({ error: '服务器错误' }, { status: 500 })
    }

    if (existingProfile) {
      return NextResponse.json(
        { error: `该钱包已被用户 ${existingProfile.username} 绑定` },
        { status: 409 }
      )
    }

    // 7. 更新用户 profile，绑定钱包地址
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        wallet_address: normalizedAddress,
        wallet_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('更新钱包地址失败:', updateError)
      return NextResponse.json({ error: '绑定钱包失败' }, { status: 500 })
    }

    // 8. （可选）记录验证历史
    const { error: historyError } = await supabase
      .from('wallet_verifications')
      .insert({
        user_id: user.id,
        wallet_address: normalizedAddress,
        signature,
        message,
      })

    if (historyError) {
      // 历史记录失败不影响主流程，仅记录错误
      console.error('记录验证历史失败:', historyError)
    }

    // 9. 返回成功响应
    return NextResponse.json({
      success: true,
      wallet_address: normalizedAddress,
      verified_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('钱包验证API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
