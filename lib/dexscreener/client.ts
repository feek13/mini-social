/**
 * DexScreener API 客户端
 *
 * API 文档: https://docs.dexscreener.com/api/reference
 *
 * 免费 API 限制:
 * - Token 相关端点: 60 requests/minute
 * - Pair/DEX 端点: 300 requests/minute
 */

import {
  ChainId,
  DexPair,
  DexSearchResponse,
  TokenBoost,
  TokenBoostsResponse,
  TokenProfile,
  TokenProfilesResponse,
  DexScreenerFilters,
  isDexScreenerError,
} from './types'

/**
 * API 基础 URL
 */
const API_BASE_URL = 'https://api.dexscreener.com'

/**
 * 默认请求配置
 */
const DEFAULT_FETCH_OPTIONS: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
}

/**
 * 通用 fetch 包装器，带错误处理
 */
async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...DEFAULT_FETCH_OPTIONS,
      ...options,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (isDexScreenerError(data)) {
      throw new Error(data.message || data.error)
    }

    return data as T
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络请求失败')
  }
}

/**
 * DexScreener API 客户端类
 */
export class DexScreenerClient {
  /**
   * 获取特定代币的所有交易对
   *
   * @param chainId - 链 ID（如 'ethereum', 'bsc', 'polygon'）
   * @param tokenAddress - 代币合约地址
   * @returns 交易对列表
   * @example
   * ```ts
   * const pairs = await client.getTokenPairs('ethereum', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
   * ```
   */
  async getTokenPairs(
    chainId: ChainId,
    tokenAddress: string
  ): Promise<DexPair[]> {
    const url = `${API_BASE_URL}/token-pairs/v1/${chainId}/${tokenAddress}`
    const response = await fetchWithErrorHandling<DexSearchResponse>(url)
    return response.pairs || []
  }

  /**
   * 获取特定交易对的详细信息
   *
   * @param chainId - 链 ID
   * @param pairAddresses - 交易对地址（支持多个，逗号分隔）
   * @returns 交易对详情
   * @example
   * ```ts
   * const pair = await client.getPairDetails('ethereum', '0x...')
   * ```
   */
  async getPairDetails(
    chainId: ChainId,
    pairAddresses: string | string[]
  ): Promise<DexPair[]> {
    const addresses = Array.isArray(pairAddresses)
      ? pairAddresses.join(',')
      : pairAddresses

    const url = `${API_BASE_URL}/latest/dex/pairs/${chainId}/${addresses}`
    const response = await fetchWithErrorHandling<DexSearchResponse>(url)
    return response.pairs || []
  }

  /**
   * 搜索交易对
   *
   * @param query - 搜索查询（代币名称、符号或地址）
   * @returns 匹配的交易对列表
   * @example
   * ```ts
   * const results = await client.searchPairs('WETH USDC')
   * ```
   */
  async searchPairs(query: string): Promise<DexPair[]> {
    const url = `${API_BASE_URL}/latest/dex/search?q=${encodeURIComponent(query)}`
    const response = await fetchWithErrorHandling<DexSearchResponse>(url)
    return response.pairs || []
  }

  /**
   * 获取最新推广的代币
   *
   * @returns 推广代币列表
   * @example
   * ```ts
   * const boosted = await client.getLatestBoostedTokens()
   * ```
   */
  async getLatestBoostedTokens(): Promise<TokenBoost[]> {
    const url = `${API_BASE_URL}/token-boosts/latest/v1`
    const response = await fetchWithErrorHandling<TokenBoostsResponse>(url)
    return Object.values(response)
  }

  /**
   * 获取推广最多的代币
   *
   * @returns 热门推广代币列表
   * @example
   * ```ts
   * const top = await client.getTopBoostedTokens()
   * ```
   */
  async getTopBoostedTokens(): Promise<TokenBoost[]> {
    const url = `${API_BASE_URL}/token-boosts/top/v1`
    const response = await fetchWithErrorHandling<TokenBoostsResponse>(url)
    return Object.values(response)
  }

  /**
   * 获取最新的代币资料
   *
   * @returns 代币资料列表
   * @example
   * ```ts
   * const profiles = await client.getLatestTokenProfiles()
   * ```
   */
  async getLatestTokenProfiles(): Promise<TokenProfile[]> {
    const url = `${API_BASE_URL}/token-profiles/latest/v1`
    const response = await fetchWithErrorHandling<TokenProfilesResponse>(url)
    return Object.values(response)
  }

  /**
   * 按筛选条件过滤交易对
   *
   * @param pairs - 交易对列表
   * @param filters - 筛选条件
   * @returns 过滤后的交易对列表
   */
  filterPairs(pairs: DexPair[], filters: DexScreenerFilters): DexPair[] {
    return pairs.filter(pair => {
      // 流动性筛选
      if (filters.minLiquidity && (!pair.liquidity?.usd || pair.liquidity.usd < filters.minLiquidity)) {
        return false
      }

      // 24h 成交量筛选
      if (filters.minVolume24h && pair.volume.h24 < filters.minVolume24h) {
        return false
      }

      // 市值筛选
      if (filters.minMarketCap && (!pair.marketCap || pair.marketCap < filters.minMarketCap)) {
        return false
      }

      // 24h 价格变化筛选
      if (filters.minPriceChange24h && pair.priceChange.h24 < filters.minPriceChange24h) {
        return false
      }

      if (filters.maxPriceChange24h && pair.priceChange.h24 > filters.maxPriceChange24h) {
        return false
      }

      // 交易笔数筛选
      if (filters.minTxns24h) {
        const totalTxns = pair.txns.h24.buys + pair.txns.h24.sells
        if (totalTxns < filters.minTxns24h) {
          return false
        }
      }

      // 只显示 Boosted 代币
      if (filters.boostedOnly && (!pair.boosts || pair.boosts.active === 0)) {
        return false
      }

      return true
    })
  }

  /**
   * 获取热门交易对（按24h成交量排序）
   *
   * @param chainId - 链 ID
   * @param limit - 返回数量
   * @returns 热门交易对列表
   * @example
   * ```ts
   * const trending = await client.getTrendingPairs('ethereum', 10)
   * ```
   */
  async getTrendingPairs(
    chainId: ChainId,
    limit: number = 10
  ): Promise<DexPair[]> {
    // DexScreener 没有直接的 trending API
    // 我们可以通过搜索热门代币来模拟
    const query = chainId === 'ethereum' ? 'WETH' : 'WBNB'
    const pairs = await this.searchPairs(query)

    // 按24h成交量排序
    return pairs
      .sort((a, b) => b.volume.h24 - a.volume.h24)
      .slice(0, limit)
  }

  /**
   * 批量获取多个代币的交易对
   *
   * @param requests - 代币请求列表
   * @returns 交易对映射
   * @example
   * ```ts
   * const pairs = await client.getBatchTokenPairs([
   *   { chainId: 'ethereum', tokenAddress: '0x...' },
   *   { chainId: 'bsc', tokenAddress: '0x...' }
   * ])
   * ```
   */
  async getBatchTokenPairs(
    requests: Array<{ chainId: ChainId; tokenAddress: string }>
  ): Promise<Record<string, DexPair[]>> {
    const results = await Promise.all(
      requests.map(async ({ chainId, tokenAddress }) => {
        const pairs = await this.getTokenPairs(chainId, tokenAddress)
        return { key: `${chainId}:${tokenAddress}`, pairs }
      })
    )

    return results.reduce((acc, { key, pairs }) => {
      acc[key] = pairs
      return acc
    }, {} as Record<string, DexPair[]>)
  }

  /**
   * 计算交易对的 APY（基于交易费用）
   *
   * 注意：这是一个估算值，假设交易费用为0.3%
   *
   * @param pair - 交易对
   * @returns 年化收益率（APY）
   */
  calculateEstimatedAPY(pair: DexPair): number {
    if (!pair.liquidity?.usd || pair.liquidity.usd === 0) {
      return 0
    }

    // 假设交易费用为 0.3%（Uniswap V2 标准）
    const tradingFeeRate = 0.003

    // 24h 交易费用 = 24h 成交量 × 费率
    const dailyFees = pair.volume.h24 * tradingFeeRate

    // 年化收益率 = (日交易费用 / 流动性) × 365
    const apy = (dailyFees / pair.liquidity.usd) * 365 * 100

    return apy
  }
}

/**
 * 默认导出单例实例
 */
export const dexscreener = new DexScreenerClient()

/**
 * 导出类型
 */
export type {
  ChainId,
  DexPair,
  DexSearchResponse,
  TokenBoost,
  TokenProfile,
  DexScreenerFilters,
}
