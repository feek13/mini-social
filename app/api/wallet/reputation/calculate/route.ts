/**
 * 计算并更新用户声誉分数
 * POST /api/wallet/reputation/calculate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'
import { createEtherscanClient, AccountModule } from '@/lib/etherscan'
import { calculateReputation } from '@/lib/reputation'

export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户认证
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: '未提供认证信息' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { error: '认证失败，请重新登录' },
        { status: 401 }
      )
    }

    // 2. 获取用户资料
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '获取用户资料失败' },
        { status: 404 }
      )
    }

    // 3. 检查是否已验证钱包
    if (!profile.wallet_address) {
      return NextResponse.json(
        { error: '请先验证钱包地址' },
        { status: 400 }
      )
    }

    // 4. 获取社交统计数据
    const { data: postsCountData } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { data: followersCountData } = await supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', user.id)

    const socialStats = {
      postsCount: postsCountData?.length || 0,
      followersCount: followersCountData?.length || 0,
      likesCount: 0,
      commentsCount: 0,
      followingCount: 0,
      memberDays: 0,
    }

    // 5. 获取链上数据（使用 Etherscan）
    let walletStats
    try {
      const etherscanClient = createEtherscanClient(1) // Ethereum 主网
      const accountModule = new AccountModule(etherscanClient)

      walletStats = await accountModule.getWalletStats(
        profile.wallet_address,
        {
          includeTokens: true,
          maxTxCount: 100,
        }
      )
    } catch (error) {
      console.error('[Reputation API] 获取链上数据失败:', error)
      // 如果获取链上数据失败，使用空数据（仅计算社交分数）
      walletStats = undefined
    }

    // 6. 计算声誉分数
    const reputationScore = calculateReputation({
      walletStats,
      socialStats,
      skipWalletData: !walletStats,
    })

    // 7. 更新数据库
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        reputation_score: reputationScore.totalScore,
        reputation_level: reputationScore.level,
        reputation_updated_at: new Date().toISOString(),
        on_chain_tx_count: reputationScore.metadata.txCount,
        defi_protocol_count: reputationScore.metadata.protocolCount,
        wallet_age_days: reputationScore.metadata.walletAgeDays,
        eth_balance: walletStats?.ethBalance || null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Reputation API] 更新数据库失败:', updateError)
      return NextResponse.json(
        { error: '更新声誉分数失败' },
        { status: 500 }
      )
    }

    // 8. 记录历史
    await supabase.from('reputation_history').insert({
      user_id: user.id,
      score: reputationScore.totalScore,
      level: reputationScore.level,
      wallet_age_score: reputationScore.dimensions.walletAgeScore,
      activity_score: reputationScore.dimensions.activityScore,
      defi_score: reputationScore.dimensions.defiScore,
      asset_score: reputationScore.dimensions.assetScore,
      social_score: reputationScore.dimensions.socialScore,
      tx_count: reputationScore.metadata.txCount,
      protocol_count: reputationScore.metadata.protocolCount,
      wallet_age_days: reputationScore.metadata.walletAgeDays,
    })

    // 9. 返回结果
    return NextResponse.json({
      success: true,
      reputation: {
        score: reputationScore.totalScore,
        level: reputationScore.level,
        dimensions: reputationScore.dimensions,
        metadata: reputationScore.metadata,
      },
    })
  } catch (error) {
    console.error('[Reputation API] 未预期的错误:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
