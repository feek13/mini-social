import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'
import { isValidEthereumAddress, formatAddress } from '@/lib/moralis'
import type { CreateWalletTrackerRequest } from '@/types/database'

/**
 * 获取用户追踪的钱包列表
 * GET /api/wallet/trackers
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 2. 获取用户追踪的钱包列表
    const { data: trackers, error } = await supabase
      .from('wallet_trackers')
      .select('*')
      .eq('user_id', user.id)
      .order('tracked_at', { ascending: false })

    if (error) {
      console.error('[Wallet Trackers API] 查询错误:', error)
      return NextResponse.json({ error: '获取追踪列表失败' }, { status: 500 })
    }

    // 3. 获取每个钱包的最新快照
    const trackersWithSnapshots = await Promise.all(
      (trackers || []).map(async (tracker) => {
        const { data: snapshot } = await supabase
          .from('wallet_snapshots')
          .select('total_value_usd, total_tokens, total_nfts, chains, created_at')
          .eq('wallet_address', tracker.wallet_address)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // 获取标签
        const { data: labels } = await supabase
          .from('wallet_labels')
          .select('*')
          .eq('wallet_address', tracker.wallet_address)

        return {
          ...tracker,
          latest_snapshot: snapshot,
          labels: labels || [],
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: trackersWithSnapshots,
    })
  } catch (error) {
    console.error('[Wallet Trackers API] 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    )
  }
}

/**
 * 创建新的钱包追踪
 * POST /api/wallet/trackers
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 2. 解析请求体
    const body: CreateWalletTrackerRequest = await request.json()
    const { wallet_address, nickname, notes, notification_enabled = true } = body

    // 3. 验证钱包地址
    if (!isValidEthereumAddress(wallet_address)) {
      return NextResponse.json(
        { error: '无效的钱包地址格式' },
        { status: 400 }
      )
    }

    const formattedAddress = formatAddress(wallet_address)

    // 4. 检查是否已经追踪
    const { data: existingTracker } = await supabase
      .from('wallet_trackers')
      .select('id')
      .eq('user_id', user.id)
      .eq('wallet_address', formattedAddress)
      .single()

    if (existingTracker) {
      return NextResponse.json(
        { error: '您已经追踪了该钱包' },
        { status: 409 }
      )
    }

    // 5. 创建追踪记录
    const { data: newTracker, error: insertError } = await supabase
      .from('wallet_trackers')
      .insert([
        {
          user_id: user.id,
          wallet_address: formattedAddress,
          nickname,
          notes,
          notification_enabled,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error('[Wallet Trackers API] 插入错误:', insertError)
      return NextResponse.json(
        { error: '创建追踪失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: '追踪成功',
        data: newTracker,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Wallet Trackers API] 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    )
  }
}
