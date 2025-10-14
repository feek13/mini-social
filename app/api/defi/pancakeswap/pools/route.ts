import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase-api'
import { defillama } from '@/lib/defillama'
import { PoolFilterBuilder, generatePancakeSwapUrl } from '@/lib/defi/filters'
import type { YieldPool } from '@/lib/defillama/types'

// 配置路由段缓存
export const dynamic = 'force-dynamic'
export const revalidate = 300 // 5 分钟重新验证缓存

/**
 * GET - 获取 PancakeSwap 池子列表
 *
 * ✅ 已优化：移除独立 PancakeSwap 客户端，使用 DeFiLlama + 过滤器
 *
 * 查询参数：
 * - chain: 按链过滤（可选，如 'bsc', 'ethereum', 'arbitrum'）
 * - minTvl: 最低 TVL（可选，默认 0）
 * - minApy: 最低 APY（可选，默认 0）
 * - poolMeta: 池子类型（可选，'V2' | 'V3' | 'StableSwap' | 'Infinity'）
 * - stablecoin: 仅稳定币池（可选，'true' | 'false'）
 * - limit: 返回数量（可选，默认 50）
 *
 * 响应格式：
 * {
 *   pools: YieldPool[],
 *   cached: boolean,
 *   count: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chain = searchParams.get('chain') || undefined
    const minTvl = parseFloat(searchParams.get('minTvl') || '0')
    const minApy = parseFloat(searchParams.get('minApy') || '0')
    const poolMeta = searchParams.get('poolMeta') || undefined
    const stablecoinFilter = searchParams.get('stablecoin')
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log('='.repeat(60))
    console.log('[PancakeSwap Pools API] 收到请求')
    console.log('参数:', { chain, minTvl, minApy, poolMeta, stablecoinFilter, limit })

    // 验证参数
    if (limit < 1 || limit > 200) {
      console.error('❌ 无效的 limit 参数:', limit)
      return NextResponse.json(
        { error: '无效的 limit 参数，范围应在 1-200 之间' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // 步骤 1: 尝试从缓存获取数据
    console.log('\n[步骤 1] 查询缓存数据...')
    let query = supabase
      .from('pancakeswap_pools')
      .select('*')
      .gt('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5分钟内的数据
      .gte('tvl_usd', minTvl)
      .gte('apy', minApy)
      .order('tvl_usd', { ascending: false })

    // 应用过滤条件
    if (chain) {
      query = query.ilike('chain', chain)
    }

    if (poolMeta) {
      query = query.eq('pool_meta', poolMeta)
    }

    if (stablecoinFilter === 'true') {
      query = query.eq('stablecoin', true)
    } else if (stablecoinFilter === 'false') {
      query = query.eq('stablecoin', false)
    }

    const { data: cachedPools, error: cacheError } = await query.limit(limit)

    if (cacheError) {
      console.error('❌ 查询缓存失败:', cacheError)
      // 继续从 API 获取，不中断流程
    }

    // 检查缓存是否有效
    const validCachedPools = cachedPools || []

    if (validCachedPools.length >= Math.min(limit, 10)) {
      console.log(`✅ 找到 ${validCachedPools.length} 条有效缓存`)

      // 转换为 YieldPool 类型
      const pools = validCachedPools.map(p => convertCacheToPool(p))

      console.log(`📦 返回 ${pools.length} 条缓存数据`)
      console.log('='.repeat(60))

      return NextResponse.json(
        {
          pools,
          cached: true,
          count: pools.length
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      )
    }

    // 步骤 2: 缓存为空或不足，从 API 获取
    console.log('⚠️ 缓存为空或数据不足，从 API 获取数据...')
    const startTime = Date.now()

    // 使用 DeFiLlama + 过滤器（替代独立的 PancakeSwap 客户端）
    const allYields = await defillama.getYields()
    const duration = Date.now() - startTime
    console.log(`✅ 成功获取 ${allYields.length} 个收益率池子 (${duration}ms)`)

    // 使用 PoolFilterBuilder 进行链式过滤
    let poolBuilder = new PoolFilterBuilder(allYields)
      .filterByProtocol(['pancakeswap', 'pancakeswap-amm', 'pancakeswap-v3'])

    // 应用筛选条件
    if (chain) {
      poolBuilder = poolBuilder.filterByChain(chain)
    }

    if (minTvl > 0) {
      poolBuilder = poolBuilder.filterByTVL(minTvl)
    }

    if (minApy > 0) {
      poolBuilder = poolBuilder.filterByAPY(minApy)
    }

    if (poolMeta) {
      poolBuilder = poolBuilder.filterByType(poolMeta)
    }

    if (stablecoinFilter === 'true') {
      poolBuilder = poolBuilder.filterStable()
    }

    // 排序并限制数量
    const pools = poolBuilder
      .sortBy('tvl', 'desc')
      .limit(limit * 2) // 获取更多数据以便缓存
      .build()

    console.log(`✅ 过滤后获得 ${pools.length} 个 PancakeSwap 池子`)

    // 为每个池子添加 URL
    const poolsWithUrls = pools.map(pool => ({
      ...pool,
      url: generatePancakeSwapUrl(pool)
    }))

    // 步骤 3: 缓存到数据库（异步执行）
    // 只缓存全量数据（无过滤条件时）
    if (!chain && !poolMeta && minTvl === 0 && minApy === 0) {
      console.log('\n[步骤 3] 缓存数据到数据库（后台执行）...')
      cachePoolsToDatabase(poolsWithUrls).catch(err => {
        console.error('❌ 缓存写入失败:', err)
      })
    } else {
      console.log('\n[跳过缓存] 有过滤条件，不写入缓存')
    }

    // 步骤 4: 返回结果（限制数量）
    const limitedPools = poolsWithUrls.slice(0, limit)
    console.log(`📦 返回 ${limitedPools.length} 条 API 数据`)
    console.log('='.repeat(60))

    return NextResponse.json(
      {
        pools: limitedPools,
        cached: false,
        count: limitedPools.length
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取 PancakeSwap 池子失败'
      },
      { status: 500 }
    )
  }
}

/**
 * 将 PancakeSwap 池子数据缓存到数据库
 */
async function cachePoolsToDatabase(pools: (YieldPool & { url?: string })[]) {
  try {
    // 使用 service role 客户端绕过 RLS
    const supabase = getSupabaseServiceClient()

    const cacheData = pools.map(p => ({
      id: p.pool,
      chain: p.chain,
      symbol: p.symbol,
      pool_meta: p.poolMeta || null,
      tvl_usd: p.tvlUsd,
      apy: p.apy,
      apy_base: p.apyBase,
      apy_reward: p.apyReward,
      volume_usd_1d: null, // DeFiLlama 不提供此字段
      volume_usd_7d: null,
      reward_tokens: p.rewardTokens,
      underlying_tokens: p.underlyingTokens,
      stablecoin: p.stablecoin || false,
      il_risk: p.ilRisk || null,
      pool_url: p.url || null,
      data: p // 完整数据存为 JSONB
    }))

    // 使用 upsert 批量插入/更新
    const { error } = await supabase
      .from('pancakeswap_pools')
      .upsert(cacheData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('❌ 缓存写入失败:', error)
    } else {
      console.log(`✅ 成功缓存 ${cacheData.length} 条 PancakeSwap 池子数据`)
    }
  } catch (error) {
    console.error('❌ 缓存写入异常:', error)
  }
}

/**
 * 数据库缓存类型
 */
interface PoolCache {
  id: string
  chain: string
  symbol: string
  pool_meta: string | null
  tvl_usd: number
  apy: number
  apy_base: number | null
  apy_reward: number | null
  volume_usd_1d: number | null
  volume_usd_7d: number | null
  reward_tokens: string[] | null
  underlying_tokens: string[] | null
  stablecoin: boolean
  il_risk: string | null
  pool_url: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any // JSONB
}

/**
 * 将数据库缓存转换为 YieldPool 类型
 */
function convertCacheToPool(cache: PoolCache): YieldPool & { url?: string } {
  // 如果有完整的 data，直接使用
  if (cache.data && typeof cache.data === 'object') {
    return {
      ...cache.data,
      url: cache.pool_url || cache.data.url
    }
  }

  // 否则从缓存字段构建
  return {
    pool: cache.id,
    chain: cache.chain,
    project: 'pancakeswap',
    symbol: cache.symbol,
    tvlUsd: Number(cache.tvl_usd) || 0,
    apyBase: cache.apy_base ? Number(cache.apy_base) : null,
    apyReward: cache.apy_reward ? Number(cache.apy_reward) : null,
    apy: Number(cache.apy) || 0,
    rewardTokens: cache.reward_tokens || null,
    underlyingTokens: cache.underlying_tokens || null,
    poolMeta: cache.pool_meta || null,
    stablecoin: cache.stablecoin,
    ilRisk: cache.il_risk || 'unknown',
    exposure: 'multi',
    // 添加缺失的必需字段
    apyPct1D: null,
    apyPct7D: null,
    apyPct30D: null,
    predictions: null,
    mu: null,
    sigma: null,
    count: null,
    outlier: false,
    il7d: null,
    apyBase7d: null,
    apyMean30d: null,
    volumeUsd1d: cache.volume_usd_1d || null,
    volumeUsd7d: cache.volume_usd_7d || null,
    apyBaseInception: null,
    url: cache.pool_url || undefined,
  }
}
