import { NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'
import { RedisCache, CACHE_TTL } from '@/lib/redis'

/**
 * GET /api/defi/chains
 *
 * 获取所有区块链的 TVL 信息
 *
 * ✅ 已优化：使用 DeFiLlama（chains 数据暂无需统一客户端）
 * 注：chains API 不需要过滤和缓存，直接使用 DeFiLlama
 *
 * @returns {Chain[]} 区块链列表
 */
export async function GET() {
  try {
    console.log('[DeFi Chains API] 获取链列表...')

    // 尝试从 Redis 缓存获取
    const redisCacheKey = 'defi:chains:all'
    const cachedData = await RedisCache.get<any>(redisCacheKey)
    if (cachedData) {
      console.log('✅ Redis 缓存命中')
      return NextResponse.json({
        ...cachedData,
        cached: true,
        cache_source: 'redis',
      })
    }

    const startTime = Date.now()
    const chains = await defillama.getChains()
    const duration = Date.now() - startTime

    // 按 TVL 降序排序
    const sortedChains = chains
      .filter(chain => chain.name && chain.tvl > 0)
      .sort((a, b) => b.tvl - a.tvl)

    console.log(`✅ 获取 ${sortedChains.length} 条链数据 (${duration}ms)`)

    const responseData = {
      chains: sortedChains,
      total: sortedChains.length,
      timestamp: Date.now(),
      cache_source: 'fresh',
    }

    // 存入 Redis 缓存（异步，不阻塞响应）
    RedisCache.set(redisCacheKey, responseData, CACHE_TTL.DEFI_CHAINS).catch((err) => {
      console.error('[Chains API] Redis cache failed:', err)
    })

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('❌ 获取链列表失败:', error)

    return NextResponse.json(
      {
        error: '获取链列表失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
