import { NextRequest, NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'
import { PoolFilterBuilder, determineFarmType, generatePancakeSwapUrl } from '@/lib/defi/filters'

// 配置路由段缓存
export const dynamic = 'force-dynamic'
export const revalidate = 600 // 10 分钟重新验证缓存

/**
 * GET - 获取 PancakeSwap Farm 数据（有奖励代币的池子）
 *
 * ✅ 已优化：移除独立 PancakeSwap 客户端，使用 DeFiLlama + 过滤器
 *
 * 查询参数：
 * - chain: 按链过滤（可选，如 'bsc', 'ethereum', 'arbitrum'，默认 'bsc'）
 * - minTvl: 最低 TVL（可选，默认 0）
 * - minRewardApy: 最低奖励 APY（可选，默认 0）
 * - farmType: Farm 类型（可选，'LP' | 'Single' | 'StableLP'）
 * - limit: 返回数量（可选，默认 50）
 *
 * 响应格式：
 * {
 *   farms: YieldPool[],
 *   count: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chain = searchParams.get('chain') || 'bsc'
    const minTvl = parseFloat(searchParams.get('minTvl') || '0')
    const minRewardApy = parseFloat(searchParams.get('minRewardApy') || '0')
    const farmType = searchParams.get('farmType') as 'LP' | 'Single' | 'StableLP' | null
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log('='.repeat(60))
    console.log('[PancakeSwap Farms API] 收到请求')
    console.log('参数:', { chain, minTvl, minRewardApy, farmType, limit })

    // 验证参数
    if (limit < 1 || limit > 200) {
      console.error('❌ 无效的 limit 参数:', limit)
      return NextResponse.json(
        { error: '无效的 limit 参数，范围应在 1-200 之间' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // 使用 DeFiLlama + 过滤器获取 Farm 数据
    const allYields = await defillama.getYields()
    const duration = Date.now() - startTime
    console.log(`✅ 成功获取 ${allYields.length} 个收益率池子 (${duration}ms)`)

    // 使用 PoolFilterBuilder 进行链式过滤
    let farmBuilder = new PoolFilterBuilder(allYields)
      .filterByProtocol(['pancakeswap', 'pancakeswap-amm', 'pancakeswap-v3'])
      .filterByChain(chain)
      .filterFarms() // 只保留有奖励代币的池子

    // 应用筛选条件
    if (minTvl > 0) {
      farmBuilder = farmBuilder.filterByTVL(minTvl)
    }

    if (minRewardApy > 0) {
      // 按奖励 APY 过滤
      const builderResult = farmBuilder.build()
      const filtered = builderResult.filter(f =>
        f.apyReward !== undefined && f.apyReward !== null && f.apyReward >= minRewardApy
      )
      farmBuilder = new PoolFilterBuilder(filtered)
    }

    // 排序并限制数量
    let farms = farmBuilder
      .sortBy('apyReward', 'desc')
      .limit(limit)
      .build()

    console.log(`✅ 过滤后获得 ${farms.length} 个 PancakeSwap Farm`)

    // 应用 farmType 过滤（在 build 之后）
    if (farmType) {
      farms = farms.filter(f => determineFarmType(f) === farmType)
      console.log(`🌾 类型过滤后剩余 ${farms.length} 个 Farm`)
    }

    // 为每个 Farm 添加额外信息
    const farmsWithMeta = farms.map(farm => ({
      ...farm,
      farmType: determineFarmType(farm),
      rewardApy: farm.apyReward || 0,
      url: generatePancakeSwapUrl(farm)
    }))

    console.log(`📦 返回 ${farmsWithMeta.length} 条 Farm 数据`)
    console.log('='.repeat(60))

    return NextResponse.json(
      {
        farms: farmsWithMeta,
        count: farmsWithMeta.length
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      }
    )
  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取 PancakeSwap Farm 失败'
      },
      { status: 500 }
    )
  }
}
