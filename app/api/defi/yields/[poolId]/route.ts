import { NextRequest, NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama/client'

/**
 * GET /api/defi/yields/[poolId]
 * 获取单个池子的详细信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const { poolId } = await params

    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      )
    }

    // 解码 poolId（URL 编码）
    const decodedPoolId = decodeURIComponent(poolId)

    // 获取所有池子数据
    const pools = await defillama.getYields()

    // 查找匹配的池子
    const pool = pools.find(p => p.pool === decodedPoolId)

    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: pool
    })
  } catch (error) {
    console.error('Error fetching pool detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pool details' },
      { status: 500 }
    )
  }
}
