import { NextRequest, NextResponse } from 'next/server'
import { web3, isProviderSupported } from '@/lib/web3'
import { RedisCache, generateRedisKey, CACHE_TTL } from '@/lib/redis'
import type { EvmChain } from '@/types/database'

// 验证以太坊地址格式
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// 格式化地址
function formatAddress(address: string): string {
  return address.toLowerCase()
}

// 检查链是否被任何 provider 支持
function isChainSupported(chain: EvmChain): boolean {
  return isProviderSupported('alchemy', chain) || isProviderSupported('ankr', chain)
}

/**
 * 获取钱包的代币余额
 * GET /api/wallet/[address]/tokens?chain=ethereum
 *
 * 查询参数:
 * - chain: 链名称（ethereum, bsc, polygon 等）
 * - excludeSpam: 排除垃圾代币（默认 true）
 * - excludeUnverified: 排除未验证合约（默认 true）
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
    const excludeSpam = searchParams.get('excludeSpam') !== 'false'
    const excludeUnverified = searchParams.get('excludeUnverified') !== 'false'

    // 3. 验证链是否支持
    if (!isChainSupported(chain)) {
      return NextResponse.json(
        { error: `不支持的链: ${chain}` },
        { status: 400 }
      )
    }

    // 4. 尝试从 Redis 缓存获取
    const redisCacheKey = generateRedisKey('wallet:tokens', {
      address: formattedAddress,
      chain,
      excludeSpam,
    })

    const cachedData = await RedisCache.get<any>(redisCacheKey)
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: { ...cachedData, cached: true, cache_source: 'redis' },
      })
    }

    // 5. 获取代币余额（使用新的 Web3 架构：Alchemy + Ankr + CoinGecko）
    const tokens = await web3.wallet.getTokens(chain, formattedAddress, {
      excludeSpam,
      includePrices: true, // 包含价格信息
    })

    // 6. 按余额价值排序（如果有 usd_value）
    const sortedTokens = tokens.sort((a, b) => {
      const aValue = a.usd_value || 0
      const bValue = b.usd_value || 0
      return bValue - aValue
    })

    const responseData = {
      wallet_address: formattedAddress,
      chain,
      tokens: sortedTokens,
      total_tokens: sortedTokens.length,
      excludeSpam,
      excludeUnverified,
      cache_source: 'fresh',
    }

    // 7. 存入 Redis 缓存（异步，不阻塞响应）
    RedisCache.set(redisCacheKey, responseData, CACHE_TTL.WALLET_TOKENS).catch((err) => {
      console.error('[Tokens API] Redis cache failed:', err)
    })

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error('[Wallet Tokens API] 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取代币余额失败',
      },
      { status: 500 }
    )
  }
}
