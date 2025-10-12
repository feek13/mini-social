import { NextRequest, NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'

/**
 * GET /api/defi/chains
 *
 * 获取所有区块链的 TVL 信息
 *
 * @returns {Chain[]} 区块链列表
 */
export async function GET(request: NextRequest) {
  try {
    const chains = await defillama.getChains()

    // 按 TVL 降序排序
    const sortedChains = chains
      .filter(chain => chain.name && chain.tvl > 0)
      .sort((a, b) => b.tvl - a.tvl)

    return NextResponse.json({
      chains: sortedChains,
      total: sortedChains.length,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('获取链列表失败:', error)

    return NextResponse.json(
      {
        error: '获取链列表失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
