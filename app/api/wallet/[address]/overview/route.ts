import { NextRequest, NextResponse } from 'next/server'
import { web3, ALL_CHAINS } from '@/lib/web3'
import { getSupabaseClient } from '@/lib/supabase-api'
import { RedisCache, generateRedisKey, CACHE_TTL } from '@/lib/redis'
import type { EvmChain } from '@/types/database'

// 验证以太坊地址格式
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// 格式化地址为 checksum 格式
function formatAddress(address: string): string {
  return address.toLowerCase()
}

/**
 * 获取钱包概览
 * GET /api/wallet/[address]/overview
 *
 * 聚合多链数据：
 * - 原生代币余额
 * - ERC20 代币
 * - NFT 数量
 * - 总资产价值（USD）
 * - 钱包标签
 * - 被追踪次数
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params

    // 1. 验证地址格式
    if (!isValidEthereumAddress(address)) {
      return NextResponse.json(
        { error: '无效的钱包地址格式' },
        { status: 400 }
      )
    }

    const formattedAddress = formatAddress(address)

    // 2. 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const chainsParam = searchParams.get('chains')
    const chains: EvmChain[] = chainsParam
      ? (chainsParam.split(',') as EvmChain[])
      : ALL_CHAINS

    // 3. 尝试从 Redis 缓存获取
    const redisCacheKey = generateRedisKey('wallet:overview', {
      address: formattedAddress,
      chains: chains.join(','),
    })

    const cachedData = await RedisCache.get<any>(redisCacheKey)
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: { ...cachedData, cached: true, cache_source: 'redis' },
      })
    }

    const supabase = getSupabaseClient()

    // 3. 检查是否有最近的快照缓存
    const { data: cachedSnapshot } = await supabase
      .from('wallet_snapshots')
      .select('*')
      .eq('wallet_address', formattedAddress)
      .eq('snapshot_type', 'full')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5 分钟内
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let snapshotData

    if (cachedSnapshot) {
      // 使用缓存数据
      snapshotData = cachedSnapshot.snapshot_data
    } else {
      // 获取新数据（使用新的 Web3 架构：Alchemy + Ankr + CoinGecko）
      const walletData = await web3.wallet.getSnapshot(address, chains)

      snapshotData = walletData

      // 保存到数据库
      const totalTokens = walletData.chains.reduce((sum, c) => sum + c.tokens.length, 0)
      const totalNfts = walletData.chains.reduce((sum, c) => sum + c.nfts_count, 0)

      await supabase.from('wallet_snapshots').insert({
        wallet_address: formattedAddress,
        snapshot_data: walletData,
        total_tokens: totalTokens,
        total_nfts: totalNfts,
        total_chains: walletData.total_chains,
        chains: walletData.chains.map((c) => c.chain),
        snapshot_type: 'full',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 小时过期
        metadata: {
          api_calls: chains.length * 3, // 每条链 3 个 API 调用
          cached: false,
        },
      })
    }

    // 4. 获取钱包标签
    const { data: labels } = await supabase
      .from('wallet_labels')
      .select('*')
      .eq('wallet_address', formattedAddress)

    // 5. 获取被追踪次数
    const { count: trackerCount } = await supabase
      .from('wallet_trackers')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_address', formattedAddress)

    // 6. 检查当前用户是否追踪了此钱包
    let isTrackedByMe = false
    const authHeader = request.headers.get('authorization')

    if (authHeader) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      })

      const { data: { user } } = await supabaseAuth.auth.getUser(
        authHeader.replace('Bearer ', '')
      )

      if (user) {
        const { data: tracker } = await supabase
          .from('wallet_trackers')
          .select('id')
          .eq('wallet_address', formattedAddress)
          .eq('user_id', user.id)
          .single()

        isTrackedByMe = !!tracker
      }
    }

    // 7. 计算总价值（从 snapshot 中获取）
    const totalValueUsd = snapshotData.total_value_usd || 0

    // 8. 构建响应
    const response = {
      wallet_address: formattedAddress,
      total_value_usd: totalValueUsd,
      chains: snapshotData.chains || [],
      labels: labels || [],
      tracker_count: trackerCount || 0,
      is_tracked_by_me: isTrackedByMe,
      last_updated: cachedSnapshot?.created_at || new Date().toISOString(),
      cached: !!cachedSnapshot,
      cache_source: cachedSnapshot ? 'supabase' : 'fresh',
      native_balance: snapshotData.chains?.[0]?.native_balance,
    }

    // 9. 存入 Redis 缓存（异步，不阻塞响应）
    RedisCache.set(redisCacheKey, response, CACHE_TTL.WALLET_OVERVIEW).catch((err) => {
      console.error('[Overview API] Redis cache failed:', err)
    })

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error('[Wallet Overview API] 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取钱包概览失败',
      },
      { status: 500 }
    )
  }
}
