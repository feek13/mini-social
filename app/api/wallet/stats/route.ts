/**
 * 获取钱包统计数据
 * GET /api/wallet/stats?username=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'
import { createEtherscanClient, AccountModule } from '@/lib/etherscan'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { error: '请提供用户名' },
        { status: 400 }
      )
    }

    // 1. 获取用户资料
    const supabase = getSupabaseClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 2. 检查是否已验证钱包
    if (!profile.wallet_address) {
      return NextResponse.json(
        { error: '该用户未验证钱包' },
        { status: 400 }
      )
    }

    // 3. 检查缓存
    const cacheTimeout = 60 * 60 * 1000 // 1小时
    const lastUpdate = profile.reputation_updated_at
      ? new Date(profile.reputation_updated_at).getTime()
      : 0
    const now = Date.now()

    // 如果缓存未过期，直接返回数据库中的数据
    if (now - lastUpdate < cacheTimeout && profile.reputation_score) {
      return NextResponse.json({
        score: profile.reputation_score || 0,
        level: (profile.reputation_level || 'Bronze').toLowerCase(),
        updatedAt: profile.reputation_updated_at,
        walletAge: profile.wallet_age_days || 0,
        txCount: profile.on_chain_tx_count || 0,
        protocolCount: 0, // TODO: 从数据库获取
        ethBalance: profile.eth_balance
          ? (Number(profile.eth_balance) / 1e18).toString()
          : '0',
        dimensions: {
          walletAge: Math.min((profile.wallet_age_days || 0) / 365 * 20, 20),
          activity: Math.min((profile.on_chain_tx_count || 0) / 100 * 25, 25),
          defiParticipation: 0, // TODO: 计算 DeFi 参与度
          assetScale: Math.min(Number(profile.eth_balance || 0) / 1e18 / 10 * 15, 15),
          socialActivity: Math.min((profile.posts_count || 0) / 50 * 10, 10),
        },
      })
    }

    // 4. 获取链上数据（缓存已过期）
    try {
      const etherscanClient = createEtherscanClient(1) // Ethereum 主网
      const accountModule = new AccountModule(etherscanClient)

      const walletStats = await accountModule.getWalletStats(
        profile.wallet_address,
        {
          includeTokens: true,
          maxTxCount: 100,
        }
      )

      const protocolCount = walletStats.defiProtocols?.length || 0

      return NextResponse.json({
        score: profile.reputation_score || 0,
        level: (profile.reputation_level || 'Bronze').toLowerCase(),
        updatedAt: profile.reputation_updated_at,
        walletAge: walletStats.walletAgeDays || 0,
        txCount: walletStats.totalTxCount || 0,
        protocolCount,
        ethBalance: walletStats.ethBalanceFormatted.toString(),
        dimensions: {
          walletAge: Math.min((walletStats.walletAgeDays || 0) / 365 * 20, 20),
          activity: Math.min((walletStats.totalTxCount || 0) / 100 * 25, 25),
          defiParticipation: Math.min(protocolCount / 10 * 30, 30),
          assetScale: Math.min(walletStats.ethBalanceFormatted / 10 * 15, 15),
          socialActivity: Math.min((profile.posts_count || 0) / 50 * 10, 10),
        },
      })
    } catch (error) {
      console.error('[Wallet Stats API] 获取链上数据失败:', error)

      // 返回数据库缓存的数据
      return NextResponse.json({
        score: profile.reputation_score || 0,
        level: (profile.reputation_level || 'Bronze').toLowerCase(),
        updatedAt: profile.reputation_updated_at,
        walletAge: profile.wallet_age_days || 0,
        txCount: profile.on_chain_tx_count || 0,
        protocolCount: 0,
        ethBalance: profile.eth_balance
          ? (Number(profile.eth_balance) / 1e18).toString()
          : '0',
        dimensions: {
          walletAge: Math.min((profile.wallet_age_days || 0) / 365 * 20, 20),
          activity: Math.min((profile.on_chain_tx_count || 0) / 100 * 25, 25),
          defiParticipation: 0,
          assetScale: Math.min(Number(profile.eth_balance || 0) / 1e18 / 10 * 15, 15),
          socialActivity: Math.min((profile.posts_count || 0) / 50 * 10, 10),
        },
        error: '获取实时数据失败，返回缓存数据',
      })
    }
  } catch (error) {
    console.error('[Wallet Stats API] 未预期的错误:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
