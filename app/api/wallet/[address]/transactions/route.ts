import { NextRequest, NextResponse } from 'next/server'
import { web3, isValidEthereumAddress, formatAddress, isProviderSupported } from '@/lib/web3'
import { RedisCache, generateRedisKey, CACHE_TTL } from '@/lib/redis'
import type { EvmChain } from '@/types/database'

// 检查链是否被任何 provider 支持
function isChainSupported(chain: EvmChain): boolean {
  return isProviderSupported('alchemy', chain) || isProviderSupported('ankr', chain)
}

/**
 * 获取钱包的交易历史
 * GET /api/wallet/[address]/transactions?chain=ethereum&limit=25
 *
 * 查询参数:
 * - chain: 链名称（ethereum, bsc, polygon 等）
 * - limit: 返回数量（默认 25）
 * - fromBlock: 起始区块
 * - toBlock: 结束区块
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params

    // 1. 验证地址格式
    if (!isValidEthereumAddress(address)) {
      return NextResponse.json(
        { error: '无效的钱包地址格式' },
        { status: 400 }
      )
    }

    const formattedAddress = formatAddress(address)

    // 2. 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const chain = (searchParams.get('chain') || 'ethereum') as EvmChain
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const fromBlock = searchParams.get('fromBlock')
    const toBlock = searchParams.get('toBlock')

    // 3. 验证链是否支持
    if (!isChainSupported(chain)) {
      return NextResponse.json(
        { error: `不支持的链: ${chain}` },
        { status: 400 }
      )
    }

    // 4. 验证 limit
    if (limit < 1 || limit > 500) {
      return NextResponse.json(
        { error: 'limit 必须在 1-500 之间' },
        { status: 400 }
      )
    }

    // 5. 尝试从 Redis 缓存获取
    const redisCacheKey = generateRedisKey('wallet:transactions', {
      address: formattedAddress,
      chain,
      limit,
      fromBlock: fromBlock || 'latest',
      toBlock: toBlock || 'latest',
    })

    const cachedData = await RedisCache.get<any>(redisCacheKey)
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: { ...cachedData, cached: true, cache_source: 'redis' },
      })
    }

    // 6. 获取交易历史（使用新的 Web3 架构：Alchemy）
    const { transactions, total } = await web3.wallet.getTransactions(chain, formattedAddress, {
      limit,
      fromBlock: fromBlock ? parseInt(fromBlock, 10) : undefined,
      toBlock: toBlock ? parseInt(toBlock, 10) : undefined,
    })

    // 7. 统计交易数据
    let totalIncoming = 0
    let totalOutgoing = 0
    let successCount = 0
    let failedCount = 0

    transactions.forEach((tx) => {
      const isIncoming = tx.to_address?.toLowerCase() === formattedAddress.toLowerCase()

      if (isIncoming) {
        totalIncoming++
      } else {
        totalOutgoing++
      }

      // Alchemy 的交易状态可能不同，需要适配
      if (tx.status === 'success' || tx.status === undefined) {
        successCount++
      } else {
        failedCount++
      }
    })

    const responseData = {
      wallet_address: formattedAddress,
      chain,
      transactions,
      total,
      stats: {
        total_incoming: totalIncoming,
        total_outgoing: totalOutgoing,
        success_count: successCount,
        failed_count: failedCount,
      },
      cache_source: 'fresh',
    }

    // 8. 存入 Redis 缓存（异步，不阻塞响应）
    RedisCache.set(redisCacheKey, responseData, CACHE_TTL.WALLET_TRANSACTIONS).catch((err) => {
      console.error('[Transactions API] Redis cache failed:', err)
    })

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error('[Wallet Transactions API] 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取交易历史失败',
      },
      { status: 500 }
    )
  }
}
