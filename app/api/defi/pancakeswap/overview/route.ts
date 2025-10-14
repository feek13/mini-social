import { NextRequest, NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'
import { getPancakeSwapStats } from '@/lib/defi/filters'

// 配置路由段缓存
export const dynamic = 'force-dynamic'
export const revalidate = 900 // 15 分钟重新验证缓存

/**
 * GET - 获取 PancakeSwap 协议概览
 *
 * ✅ 已优化：移除独立 PancakeSwap 客户端，使用 DeFiLlama + 过滤器
 *
 * 响应格式：
 * {
 *   name: string,
 *   tvl: number,
 *   chains: string[],
 *   chainTvls: Record<string, number>,
 *   category: string,
 *   logo: string | null,
 *   url: string,
 *   change_1d: number | null,
 *   change_7d: number | null,
 *   stats: {
 *     totalPools: number,
 *     totalFarms: number,
 *     totalTvl: number,
 *     averageApy: number
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    console.log('='.repeat(60))
    console.log('[PancakeSwap API] 获取协议概览')

    const startTime = Date.now()

    // 获取 PancakeSwap 协议数据
    const protocol = await defillama.getProtocol('pancakeswap-amm')

    // 获取所有收益率数据用于统计
    const allYields = await defillama.getYields()
    const stats = getPancakeSwapStats(allYields)

    const duration = Date.now() - startTime

    // 提取 TVL 值
    let tvlValue = 0
    if (Array.isArray(protocol.tvl) && protocol.tvl.length > 0) {
      const lastTvl = protocol.tvl[protocol.tvl.length - 1]
      tvlValue = typeof lastTvl === 'number' && !isNaN(lastTvl) ? lastTvl : 0
    } else if (typeof protocol.tvl === 'number' && !isNaN(protocol.tvl)) {
      tvlValue = protocol.tvl
    }

    console.log(`✅ 成功获取 PancakeSwap 协议数据 (${duration}ms)`)
    console.log(`   TVL: $${tvlValue.toLocaleString()}`)
    console.log(`   Chains: ${protocol.chains.join(', ')}`)
    console.log(`   总池子: ${stats.totalPools}, 总 Farms: ${stats.totalFarms}`)
    console.log('='.repeat(60))

    return NextResponse.json(
      {
        name: protocol.name,
        tvl: tvlValue,
        chains: protocol.chains,
        chainTvls: protocol.currentChainTvls || {},
        category: protocol.category,
        logo: protocol.logo,
        url: protocol.url,
        change_1d: protocol.change_1d,
        change_7d: protocol.change_7d,
        stats
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        },
      }
    )
  } catch (error) {
    console.error('❌ 获取 PancakeSwap 协议概览失败:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取协议概览失败'
      },
      { status: 500 }
    )
  }
}
