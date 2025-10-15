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
 * 获取钱包的 NFT 资产
 * GET /api/wallet/[address]/nfts?chain=ethereum&limit=50
 *
 * 查询参数:
 * - chain: 链名称（ethereum, bsc, polygon 等）
 * - limit: 返回数量（默认 50）
 * - excludeSpam: 排除垃圾 NFT（默认 true）
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
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const excludeSpam = searchParams.get('excludeSpam') !== 'false'

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
    const redisCacheKey = generateRedisKey('wallet:nfts', {
      address: formattedAddress,
      chain,
      limit,
      excludeSpam,
    })

    const cachedData = await RedisCache.get<any>(redisCacheKey)
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: { ...cachedData, cached: true, cache_source: 'redis' },
      })
    }

    // 6. 获取 NFTs（使用新的 Web3 架构：Alchemy + Ankr）
    const result = await web3.wallet.getNFTs(chain, formattedAddress, {
      limit,
      excludeSpam,
    })

    // 7. 按集合分组统计
    const collectionStats: Record<
      string,
      { name: string; count: number }
    > = {}

    result.nfts.forEach((nft) => {
      const collectionName = nft.collection_name || nft.name || nft.contract_address
      if (!collectionStats[collectionName]) {
        collectionStats[collectionName] = {
          name: collectionName,
          count: 0,
        }
      }
      collectionStats[collectionName].count++
    })

    const responseData = {
      wallet_address: formattedAddress,
      chain,
      nfts: result.nfts,
      total: result.total,
      collections: Object.values(collectionStats),
      collections_count: Object.keys(collectionStats).length,
      excludeSpam,
      cache_source: 'fresh',
    }

    // 8. 存入 Redis 缓存（异步，不阻塞响应）
    RedisCache.set(redisCacheKey, responseData, CACHE_TTL.WALLET_NFTS).catch((err) => {
      console.error('[NFTs API] Redis cache failed:', err)
    })

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error('[Wallet NFTs API] 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取 NFT 资产失败',
      },
      { status: 500 }
    )
  }
}
