import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase-api'
import { defillama } from '@/lib/defillama'
import { YieldPool } from '@/lib/defillama/types'

// 配置路由段缓存
export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 分钟重新验证缓存

/**
 * GET - 获取 DeFi 收益率池子列表
 *
 * 查询参数：
 * - chain: 按链过滤（可选，如 'Ethereum', 'Arbitrum'）
 * - protocol: 按协议过滤（可选，如 'aave-v3', 'uniswap-v3'）
 * - minApy: 最低 APY（可选，默认 0）
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
    const chain = searchParams.get('chain') || undefined
    const protocol = searchParams.get('protocol') || undefined
    const minApy = parseFloat(searchParams.get('minApy') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')

    console.log('='.repeat(60))
    console.log('[DeFi Yields API] 收到请求')
    console.log('参数:', { chain, protocol, minApy, limit })

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

    const supabase = getSupabaseClient()

    // 步骤 1: 尝试从缓存获取数据
    console.log('\n[步骤 1] 查询缓存数据...')
    let query = supabase
      .from('defi_yields')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .gte('apy', minApy)
      .order('apy', { ascending: false })

    // 应用过滤条件
    if (chain) {
      query = query.ilike('chain', chain)
    }

    if (protocol) {
      query = query.ilike('protocol', protocol)
    }

    const { data: cachedYields, error: cacheError } = await query.limit(limit)

    if (cacheError) {
      console.error('❌ 查询缓存失败:', cacheError)
      // 继续从 API 获取，不中断流程
    }

    // 检查缓存是否有效（需要有足够的数据）
    const validCachedYields = cachedYields || []

    // 如果缓存有数据且满足 limit 要求，或者没有过滤条件时有任何数据
    if (validCachedYields.length >= Math.min(limit, 10) ||
        (validCachedYields.length > 0 && !chain && !protocol && minApy === 0)) {
      console.log(`✅ 找到 ${validCachedYields.length} 条有效缓存`)

      // 转换为 YieldPool 类型
      const pools = validCachedYields.map(y => convertCacheToYieldPool(y))

      console.log(`📦 返回 ${pools.length} 条缓存数据`)
      console.log('='.repeat(60))

      return NextResponse.json(
        {
          pools,
          cached: true
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
          },
        }
      )
    }

    // 步骤 2: 缓存为空或不足，从 DeFiLlama API 获取
    console.log('⚠️ 缓存为空或数据不足，从 API 获取数据...')
    const startTime = Date.now()

    let pools = await defillama.getYields()
    const duration = Date.now() - startTime

    console.log(`✅ 成功获取 ${pools.length} 个收益率池子 (${duration}ms)`)

    // 步骤 3: 应用过滤条件
    if (chain) {
      pools = pools.filter(p =>
        p.chain.toLowerCase() === chain.toLowerCase()
      )
      console.log(`⛓️ 链过滤后剩余 ${pools.length} 个池子`)
    }

    if (protocol) {
      pools = pools.filter(p =>
        p.project.toLowerCase().includes(protocol.toLowerCase())
      )
      console.log(`🔧 协议过滤后剩余 ${pools.length} 个池子`)
    }

    if (minApy > 0) {
      pools = pools.filter(p => p.apy >= minApy)
      console.log(`📈 APY 过滤后剩余 ${pools.length} 个池子`)
    }

    // 步骤 4: 按 APY 降序排序
    pools.sort((a, b) => b.apy - a.apy)

    // 步骤 5: 缓存到数据库（异步执行，不阻塞响应）
    // 只缓存全量数据（无过滤条件时）
    if (!chain && !protocol && minApy === 0) {
      console.log('\n[步骤 5] 缓存数据到数据库（后台执行）...')
      cacheYieldsToDatabase(pools).catch(err => {
        console.error('❌ 缓存写入失败:', err)
      })
    } else {
      console.log('\n[跳过缓存] 有过滤条件，不写入缓存')
    }

    // 步骤 6: 返回结果（限制数量）
    const limitedPools = pools.slice(0, limit)
    console.log(`📦 返回 ${limitedPools.length} 条 API 数据`)
    console.log('='.repeat(60))

    return NextResponse.json(
      {
        pools: limitedPools,
        cached: false
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
