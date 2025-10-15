/**
 * Gas Oracle API 路由
 * GET /api/etherscan/gas/oracle
 * 返回实时 Gas 价格
 */

import { NextRequest, NextResponse } from 'next/server'
import { etherscan } from '@/lib/etherscan'
import { createGasTracker } from '@/lib/etherscan/gas'

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const chainId = parseInt(searchParams.get('chainId') || '1')

    // 切换到指定链
    if (chainId !== 1) {
      etherscan.switchChain(chainId as any)
    }

    // 创建 Gas Tracker
    const gasTracker = createGasTracker(etherscan)

    // 获取实时 Gas 价格
    const gasPrice = await gasTracker.getGasOracle()

    // 获取 Gas 价格等级
    const level = gasTracker.getGasPriceLevel(gasPrice.propose)

    // 返回数据
    return NextResponse.json({
      success: true,
      data: {
        ...gasPrice,
        level,
        chainId,
      },
    })
  } catch (error) {
    console.error('[API] Gas Oracle 错误:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch gas price',
      },
      { status: 500 }
    )
  }
}
