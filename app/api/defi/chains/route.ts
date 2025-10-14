import { NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'

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
    const startTime = Date.now()

    const chains = await defillama.getChains()
    const duration = Date.now() - startTime

    // 按 TVL 降序排序
    const sortedChains = chains
      .filter(chain => chain.name && chain.tvl > 0)
      .sort((a, b) => b.tvl - a.tvl)

    console.log(`✅ 获取 ${sortedChains.length} 条链数据 (${duration}ms)`)

    return NextResponse.json({
      chains: sortedChains,
      total: sortedChains.length,
      timestamp: Date.now(),
    })
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
