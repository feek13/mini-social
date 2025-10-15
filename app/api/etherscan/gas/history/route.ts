/**
 * Gas 历史数据 API 路由
 * GET /api/etherscan/gas/history?days=7
 * 返回过去 N 天的平均 Gas 价格
 */

import { NextRequest, NextResponse } from 'next/server'
import { etherscan } from '@/lib/etherscan'
import { createGasTracker } from '@/lib/etherscan/gas'

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const chainId = parseInt(searchParams.get('chainId') || '1')
    const days = parseInt(searchParams.get('days') || '7')

    // 验证参数
    if (days < 1 || days > 365) {
      return NextResponse.json(
        {
          success: false,
          error: 'Days must be between 1 and 365',
        },
        { status: 400 }
      )
    }

    // 切换到指定链
    if (chainId !== 1) {
      etherscan.switchChain(chainId as any)
    }

    // 创建 Gas Tracker
    const gasTracker = createGasTracker(etherscan)

    // 获取历史数据
    const history = await gasTracker.getRecentGasPrices(days)

    return NextResponse.json({
      success: true,
      data: {
        chainId,
        days,
        history,
      },
    })
  } catch (error) {
    console.error('[API] Gas History 错误:', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch gas history',
      },
      { status: 500 }
    )
  }
}
