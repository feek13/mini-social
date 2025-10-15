/**
 * Web3 数据提供者 - 智能路由层
 * 整合 Alchemy, Ankr, CoinGecko 三个服务
 */

import type { EvmChain } from '@/types/database'
import type {
  Web3Provider,
  NativeBalance,
  TokenBalance,
  NFT,
  Transaction,
  TokenPrice,
  GetBalanceRequest,
  GetTokensRequest,
  GetNFTsRequest,
  GetTransactionsRequest,
  GetPricesRequest,
  WalletSnapshot,
  ChainSnapshot,
  Web3ProviderError,
} from './types'
import type { DataType } from './config'
import {
  getProvidersForDataType,
  getChainConfig,
  RATE_LIMITS,
  CACHE_CONFIGS,
} from './config'
import { alchemyClient } from './alchemy/client'
import { ankrClient } from './ankr/client'
import { coinGeckoClient } from './coingecko/client'
import { withRetry, isRetryableError } from './utils/retry'
import { getRateLimiter } from './utils/ratelimit'
import { memoryCache, generateCacheKey } from './cache'

/**
 * Web3 数据提供者主类
 */
export class Web3DataProvider {
  /**
   * 执行带缓存和限流的请求
   */
  private async executeWithCacheAndRateLimit<T>(
    dataType: DataType,
    cacheKey: string,
    provider: Web3Provider,
    fn: () => Promise<T>
  ): Promise<T> {
    // 1. 检查缓存
    const cacheConfig = CACHE_CONFIGS[dataType]
    if (cacheConfig.enabled) {
      const cached = memoryCache.get<T>(cacheKey, cacheConfig.ttl)
      if (cached) {
        console.log(`[Web3Provider] Cache hit: ${cacheKey}`)
        return cached
      }
    }

    // 2. 限流
    const rateLimiter = getRateLimiter(provider, RATE_LIMITS[provider])
    await rateLimiter.waitForToken()

    // 3. 执行请求（带重试）
    const result = await withRetry(fn)

    // 4. 缓存结果
    if (cacheConfig.enabled) {
      memoryCache.set(cacheKey, result, provider)
    }

    return result
  }

  /**
   * 获取原生代币余额
   */
  async getNativeBalance(request: GetBalanceRequest): Promise<NativeBalance> {
    const cacheKey = generateCacheKey('balance', {
      address: request.address,
      chain: request.chain,
    })

    // 获取优先服务商列表
    const providers = getProvidersForDataType('balance', request.chain)

    for (const provider of providers) {
      try {
        if (provider === 'alchemy' && alchemyClient.isChainSupported(request.chain)) {
          console.log(`[Web3Provider] Trying ${provider} for native balance on ${request.chain}`)
          return await this.executeWithCacheAndRateLimit(
            'balance',
            cacheKey,
            'alchemy',
            () => alchemyClient.getNativeBalance(request)
          )
        }

        if (provider === 'ankr' && ankrClient.isChainSupported(request.chain)) {
          console.log(`[Web3Provider] Trying ${provider} for native balance on ${request.chain}`)
          return await this.executeWithCacheAndRateLimit(
            'balance',
            cacheKey,
            'ankr',
            () => ankrClient.getNativeBalance(request)
          )
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[Web3Provider] ❌ ${provider} failed for ${request.chain}:`, errorMsg)
        // 继续尝试下一个服务商
      }
    }

    throw new Error(`Failed to get native balance for ${request.chain} from all providers: ${providers.join(', ')}`)
  }

  /**
   * 获取 ERC20 代币余额
   */
  async getTokenBalances(request: GetTokensRequest): Promise<TokenBalance[]> {
    const cacheKey = generateCacheKey('tokens', {
      address: request.address,
      chain: request.chain,
      includeNative: request.includeNative,
      excludeSpam: request.excludeSpam,
    })

    const providers = getProvidersForDataType('tokens', request.chain)

    for (const provider of providers) {
      try {
        if (provider === 'alchemy' && alchemyClient.isChainSupported(request.chain)) {
          console.log(`[Web3Provider] Trying ${provider} for token balances on ${request.chain}`)
          const tokens = await this.executeWithCacheAndRateLimit(
            'tokens',
            cacheKey,
            'alchemy',
            () => alchemyClient.getTokenBalances(request)
          )

          // 如果需要价格，从 Ankr 或 CoinGecko 获取
          if (request.includePrices) {
            console.log(`[Web3Provider] Enriching ${tokens.length} tokens with price data`)
            return await this.enrichTokenPrices(tokens, request.chain)
          }

          return tokens
        }

        if (provider === 'ankr' && ankrClient.isChainSupported(request.chain)) {
          console.log(`[Web3Provider] Trying ${provider} for token balances on ${request.chain}`)
          const tokens = await this.executeWithCacheAndRateLimit(
            'tokens',
            cacheKey,
            'ankr',
            () => ankrClient.getTokenBalances(request)
          )

          // Ankr 已包含价格数据
          console.log(`[Web3Provider] ✓ Got ${tokens.length} tokens from ${provider} (with prices)`)
          return tokens
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[Web3Provider] ❌ ${provider} failed for ${request.chain}:`, errorMsg)
      }
    }

    throw new Error(`Failed to get token balances for ${request.chain} from all providers: ${providers.join(', ')}`)
  }

  /**
   * 获取 NFT
   */
  async getNFTs(request: GetNFTsRequest): Promise<{ nfts: NFT[]; total: number }> {
    const cacheKey = generateCacheKey('nfts', {
      address: request.address,
      chain: request.chain,
      limit: request.limit,
      excludeSpam: request.excludeSpam,
    })

    const providers = getProvidersForDataType('nfts', request.chain)

    for (const provider of providers) {
      try {
        if (provider === 'alchemy' && alchemyClient.isChainSupported(request.chain)) {
          return await this.executeWithCacheAndRateLimit(
            'nfts',
            cacheKey,
            'alchemy',
            () => alchemyClient.getNFTs(request)
          )
        }

        if (provider === 'ankr' && ankrClient.isChainSupported(request.chain)) {
          return await this.executeWithCacheAndRateLimit(
            'nfts',
            cacheKey,
            'ankr',
            () => ankrClient.getNFTs(request)
          )
        }
      } catch (error) {
        console.error(`[Web3Provider] ${provider} failed:`, error)
      }
    }

    throw new Error(`Failed to get NFTs from all providers`)
  }

  /**
   * 获取交易历史
   */
  async getTransactions(
    request: GetTransactionsRequest
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const cacheKey = generateCacheKey('transactions', {
      address: request.address,
      chain: request.chain,
      limit: request.limit,
      fromBlock: request.fromBlock,
      toBlock: request.toBlock,
    })

    const providers = getProvidersForDataType('transactions', request.chain)

    for (const provider of providers) {
      try {
        if (provider === 'alchemy' && alchemyClient.isChainSupported(request.chain)) {
          return await this.executeWithCacheAndRateLimit(
            'transactions',
            cacheKey,
            'alchemy',
            () => alchemyClient.getTransactions(request)
          )
        }

        // Ankr 不支持交易历史
        if (provider === 'ankr') {
          continue
        }
      } catch (error) {
        console.error(`[Web3Provider] ${provider} failed:`, error)
      }
    }

    // 如果都失败，返回空数组而不是抛错
    console.warn(`[Web3Provider] Failed to get transactions, returning empty`)
    return { transactions: [], total: 0 }
  }

  /**
   * 获取代币价格
   */
  async getTokenPrices(request: GetPricesRequest): Promise<Record<string, TokenPrice>> {
    // 优化缓存键：避免 JSON.stringify，使用更高效的字符串拼接
    const tokenKeys = request.tokens
      .map((t) => `${t.chain}:${t.address.toLowerCase()}`)
      .sort()
      .join(',')
    const cacheKey = `prices:tokens=${tokenKeys}`

    // 价格总是使用 CoinGecko
    return await this.executeWithCacheAndRateLimit(
      'prices',
      cacheKey,
      'coingecko',
      () => coinGeckoClient.getTokenPrices(request)
    )
  }

  /**
   * 获取单个代币价格
   */
  async getTokenPrice(chain: EvmChain, address: string): Promise<TokenPrice | null> {
    const cacheKey = generateCacheKey('prices', {
      chain,
      address,
    })

    try {
      return await this.executeWithCacheAndRateLimit(
        'prices',
        cacheKey,
        'coingecko',
        () => coinGeckoClient.getTokenPrice(chain, address)
      )
    } catch (error) {
      console.error(`[Web3Provider] Failed to get token price:`, error)
      return null
    }
  }

  /**
   * 获取钱包完整快照（所有链的余额、代币、NFT）
   */
  async getWalletSnapshot(
    address: string,
    chains: EvmChain[] = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base']
  ): Promise<WalletSnapshot> {
    const chainSnapshots: ChainSnapshot[] = []

    // 并行获取所有链的数据
    const results = await Promise.allSettled(
      chains.map(async (chain) => {
        // 分别获取各项数据，即使某些失败也能继续
        let nativeBalance: NativeBalance | null = null
        let tokens: TokenBalance[] = []
        let nftsCount = 0

        // 获取原生余额（失败不影响其他数据）
        try {
          nativeBalance = await this.getNativeBalance({ address, chain })
        } catch (error) {
          console.error(`[Web3Provider] Failed to get native balance for ${chain}:`, error)
        }

        // 获取代币（失败不影响其他数据）
        try {
          tokens = await this.getTokenBalances({ address, chain, excludeSpam: true })
        } catch (error) {
          console.error(`[Web3Provider] Failed to get tokens for ${chain}:`, error)
        }

        // 获取 NFT 数量（失败不影响其他数据）
        try {
          const { total } = await this.getNFTs({
            address,
            chain,
            limit: 1,
            excludeSpam: true,
          })
          nftsCount = total
        } catch (error) {
          console.error(`[Web3Provider] Failed to get NFT count for ${chain}:`, error)
        }

        // 只有当至少有一项数据成功时才返回结果
        const hasData = nativeBalance || tokens.length > 0 || nftsCount > 0

        if (!hasData) {
          console.log(`[Web3Provider] No data found for ${chain}, skipping`)
          return null
        }

        // 计算链上总价值
        const nativeValue = nativeBalance?.balance_usd || 0
        const tokensValue = tokens.reduce((sum, token) => sum + (token.usd_value || 0), 0)
        const balanceUsd = nativeValue + tokensValue

        console.log(`[Web3Provider] ✓ ${chain}: ${tokens.length} tokens, ${nftsCount} NFTs, $${balanceUsd.toFixed(2)}`)

        return {
          chain,
          native_balance: nativeBalance || {
            chain,
            balance: '0',
            balance_formatted: '0',
            balance_usd: 0,
            symbol: 'ETH',
            decimals: 18,
          },
          tokens,
          nfts_count: nftsCount,
          balance_usd: balanceUsd,
        }
      })
    )

    // 过滤成功的结果
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        chainSnapshots.push(result.value)
      }
    })

    // 计算总价值
    const totalValueUsd = chainSnapshots.reduce((sum, snapshot) => sum + snapshot.balance_usd, 0)

    return {
      address,
      chains: chainSnapshots,
      total_chains: chainSnapshots.length,
      total_value_usd: totalValueUsd,
      updated_at: new Date().toISOString(),
    }
  }

  /**
   * 为代币添加价格信息
   */
  private async enrichTokenPrices(
    tokens: TokenBalance[],
    chain: EvmChain
  ): Promise<TokenBalance[]> {
    if (tokens.length === 0) {
      return tokens
    }

    try {
      const priceRequest: GetPricesRequest = {
        tokens: tokens.map((token) => ({
          address: token.token_address,
          chain,
        })),
      }

      const prices = await this.getTokenPrices(priceRequest)

      return tokens.map((token) => {
        const priceKey = `${chain}:${token.token_address.toLowerCase()}`
        const priceData = prices[priceKey]

        if (priceData) {
          const balance = parseFloat(token.balance_formatted)
          return {
            ...token,
            usd_price: priceData.usd_price,
            usd_value: balance * priceData.usd_price,
          }
        }

        return token
      })
    } catch (error) {
      console.error(`[Web3Provider] Failed to enrich token prices:`, error)
      return tokens
    }
  }
}

// 导出单例
export const web3Provider = new Web3DataProvider()
