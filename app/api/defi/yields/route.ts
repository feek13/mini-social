import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase-api'
import { unifiedDefi } from '@/lib/defi/unified-client'
import type { YieldPool } from '@/lib/defillama/types'
import { aggregatePools } from '@/lib/defi-utils'

// 配置路由段缓存
export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 分钟重新验证缓存

/**
 * GET - 获取 DeFi 收益率池子列表
 *
 * ✅ 已优化：使用 UnifiedDeFiClient（内置智能缓存 + 过滤）
 *
 * 查询参数：
 * - category: 产品分类（可选，stablecoin | single | multi | all）
 * - chain: 按链过滤（可选，如 'Ethereum', 'Arbitrum'）
 * - protocol: 按协议过滤（可选，如 'aave-v3', 'uniswap-v3'）
 * - minApy: 最低 APY（可选，默认 0）
 * - minTvl: 最低 TVL（可选，默认 0）
 * - stablecoin: 仅稳定币池（可选，'true' | 'false'）
 * - farmsOnly: 仅 Farms（可选，'true' | 'false'）
 * - sortBy: 排序方式（可选，apy | tvl | apyBase | apyReward）
 * - order: 排序方向（可选，asc | desc）
 * - limit: 返回数量（可选，默认 20）
 *
 * 响应格式：
 * {
 *   pools: YieldPool[],
 *   cached: boolean
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const chain = searchParams.get('chain') || undefined
    const protocol = searchParams.get('protocol') || undefined
    const minApy = parseFloat(searchParams.get('minApy') || '0')
    const minTvl = parseFloat(searchParams.get('minTvl') || '0')
    const stablecoinParam = searchParams.get('stablecoin')
    const farmsOnlyParam = searchParams.get('farmsOnly')
    const sortBy = searchParams.get('sortBy') as 'apy' | 'tvl' | 'apyBase' | 'apyReward' || 'apy'
    const order = searchParams.get('order') as 'asc' | 'desc' || 'desc'
    const limit = parseInt(searchParams.get('limit') || '20')

    console.log('='.repeat(60))
    console.log('[DeFi Yields API] 收到请求')
    console.log('参数:', { category, chain, protocol, minApy, minTvl, stablecoinParam, farmsOnlyParam, sortBy, order, limit })

    // 验证参数
    if (isNaN(minApy) || minApy < 0) {
      console.error('❌ 无效的 minApy 参数:', minApy)
      return NextResponse.json(
        { error: '无效的 minApy 参数，必须为非负数' },
        { status: 400 }
      )
    }

    if (limit < 1 || limit > 500) {
      console.error('❌ 无效的 limit 参数:', limit)
      return NextResponse.json(
        { error: '无效的 limit 参数，范围应在 1-500 之间' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // 处理产品分类
    let stablecoin: boolean | undefined
    if (category === 'stablecoin') {
      stablecoin = true
    } else if (stablecoinParam === 'true') {
      stablecoin = true
    } else if (stablecoinParam === 'false') {
      stablecoin = false
    }

    const farmsOnly = farmsOnlyParam === 'true'

    // 使用统一 DeFi 客户端（自动处理缓存和过滤）
    let pools = await unifiedDefi.getYields({
      protocol,
      chain,
      minApy,
      minTvl,
      stablecoin,
      farmsOnly,
      limit: limit * 2, // 获取更多数据用于聚合
      sortBy,
      order
    })

    const duration = Date.now() - startTime
    console.log(`✅ 获取 ${pools.length} 个收益率池子 (${duration}ms)`)

    // 应用额外的分类过滤（category 参数）
    if (category === 'single') {
      pools = pools.filter(p => p.exposure === 'single')
      console.log(`📂 单资产过滤后剩余 ${pools.length} 个池子`)
    } else if (category === 'multi') {
      pools = pools.filter(p => p.exposure === 'multi')
      console.log(`📂 多资产过滤后剩余 ${pools.length} 个池子`)
    }

    // 聚合 PancakeSwap 池子
    console.log(`\n🔗 聚合 PancakeSwap 池子...`)
    const beforeAggregation = pools.length
    pools = aggregatePools(pools)
    console.log(`   聚合后: ${beforeAggregation} -> ${pools.length} 个池子`)

    // 后台缓存到数据库（仅全量数据）
    if (!chain && !protocol && minApy === 0 && !stablecoin) {
      console.log('💾 后台缓存收益率数据到数据库...')
      cacheYieldsToDatabase(pools).catch(err => {
        console.error('❌ 缓存写入失败:', err)
      })
    }

    // 限制返回数量
    const limitedPools = pools.slice(0, limit)
    console.log(`📦 返回 ${limitedPools.length} 条数据`)
    console.log('='.repeat(60))

    return NextResponse.json(
      {
        pools: limitedPools,
        cached: false // UnifiedClient 内部使用内存缓存
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    )
  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取收益率池子失败'
      },
      { status: 500 }
    )
  }
}

/**
 * 将 YieldPool 数据缓存到数据库
 */
async function cacheYieldsToDatabase(pools: YieldPool[]) {
  try {
    // 使用 service role 客户端绕过 RLS
    const supabase = getSupabaseServiceClient()

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000) // 30 分钟后过期

    const cacheData = pools.map(p => ({
      pool_id: p.pool,
      protocol: p.project,
      chain: p.chain,
      symbol: p.symbol,
      apy: p.apy,
      apy_base: p.apyBase,
      apy_reward: p.apyReward,
      tvl_usd: p.tvlUsd,
      il_risk: p.ilRisk,
      exposure: p.exposure,
      cached_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    }))

    // 使用 upsert 批量插入/更新
    const { error } = await supabase
      .from('defi_yields')
      .upsert(cacheData, {
        onConflict: 'pool_id',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('❌ 缓存写入失败:', error)
    } else {
      console.log(`✅ 成功缓存 ${cacheData.length} 条收益率数据`)
    }
  } catch (error) {
    console.error('❌ 缓存写入异常:', error)
  }
}

/**
 * 数据库缓存类型
 */
interface YieldCache {
  pool_id: string
  protocol: string
  chain: string
  symbol: string
  tvl_usd: number
  apy_base: number | null
  apy_reward: number | null
  apy: number
  il_risk: string | null
  exposure: string | null
}

/**
 * 将数据库缓存转换为 YieldPool 类型
 */
function convertCacheToYieldPool(cache: YieldCache): YieldPool {
  return {
    chain: cache.chain,
    project: cache.protocol,
    symbol: cache.symbol,
    tvlUsd: Number(cache.tvl_usd) || 0,
    apyBase: cache.apy_base ? Number(cache.apy_base) : null,
    apyReward: cache.apy_reward ? Number(cache.apy_reward) : null,
    apy: Number(cache.apy) || 0,
    rewardTokens: null,
    pool: cache.pool_id,
    apyPct1D: null,
    apyPct7D: null,
    apyPct30D: null,
    stablecoin: false,
    ilRisk: cache.il_risk || 'unknown',
    exposure: cache.exposure || 'single',
    predictions: null,
    poolMeta: null,
    mu: null,
    sigma: null,
    count: null,
    outlier: false,
    underlyingTokens: null,
    il7d: null,
    apyBase7d: null,
    apyMean30d: null,
    volumeUsd1d: null,
    volumeUsd7d: null,
    apyBaseInception: null
  }
}
