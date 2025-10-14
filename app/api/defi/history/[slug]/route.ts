import { NextRequest, NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'

/**
 * GET /api/defi/history/[slug]
 * 获取协议的历史 TVL 数据
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { error: '缺少协议 slug 参数' },
        { status: 400 }
      )
    }

    // 获取协议历史数据
    const protocolData = await defillama.getProtocolTVLHistory(slug)

    // 提取主链的 TVL 历史数据（通常是总 TVL）
    let tvlHistory: { date: number; tvl: number; timestamp: number }[] = []

    // 尝试获取总 TVL 数据
    if (protocolData.chainTvls && protocolData.chainTvls.tvl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tvlData = protocolData.chainTvls.tvl as unknown as any[]
      if (Array.isArray(tvlData) && tvlData.length > 0 && typeof tvlData[0] === 'object') {
        tvlHistory = tvlData.map(item => ({
          date: item.date,
          tvl: item.totalLiquidityUSD,
          timestamp: item.date
        }))
      }
    }

    // 如果没有总 TVL，尝试获取第一条链的数据
    if (tvlHistory.length === 0 && protocolData.chainTvls) {
      const firstChainKey = Object.keys(protocolData.chainTvls).find(
        key => !key.includes('-') && protocolData.chainTvls[key]?.tvl
      )

      if (firstChainKey) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chainTvlData = protocolData.chainTvls[firstChainKey].tvl as unknown as any[]
        if (Array.isArray(chainTvlData) && chainTvlData.length > 0 && typeof chainTvlData[0] === 'object') {
          tvlHistory = chainTvlData.map(item => ({
            date: item.date,
            tvl: item.totalLiquidityUSD,
            timestamp: item.date
          }))
        }
      }
    }

    return NextResponse.json({
      name: protocolData.name,
      symbol: protocolData.symbol,
      tvlHistory,
      currentTVL: protocolData.tvl || 0,
      chains: protocolData.chains || []
    })
  } catch (error) {
    console.error('获取协议历史数据失败:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取历史数据失败'
      },
      { status: 500 }
    )
  }
}
