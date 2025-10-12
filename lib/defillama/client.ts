/**
 * DeFiLlama API 客户端
 *
 * 提供统一的接口访问 DeFiLlama 的各种数据 API
 * 包括协议信息、链数据、代币价格、收益率池子等
 */

import {
  Protocol,
  ProtocolDetail,
  Chain,
  TokenPrice,
  TokenIdentifier,
  TokenPricesResponse,
  YieldPool,
  ApiError,
  isApiError
} from './types'

/**
 * DeFiLlama API 基础 URL
 */
const API_BASE_URL = 'https://api.llama.fi'
const COINS_API_URL = 'https://coins.llama.fi'
const YIELDS_API_URL = 'https://yields.llama.fi'

/**
 * API 请求配置
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
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}`,
        message: response.statusText,
      }))

      throw new Error(
        isApiError(errorData)
          ? errorData.message || errorData.error
          : `请求失败: ${response.status}`
      )
    }

    const data = await response.json()

    if (isApiError(data)) {
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
 * DeFiLlama API 客户端类
 */
export class DeFiLlamaClient {
  /**
   * 获取所有协议列表
   *
   * @returns 协议列表数组
   * @example
   * ```ts
   * const protocols = await client.getProtocols()
   * console.log(`共有 ${protocols.length} 个协议`)
   * ```
   */
  async getProtocols(): Promise<Protocol[]> {
    return fetchWithErrorHandling<Protocol[]>(
      `${API_BASE_URL}/protocols`
    )
  }

  /**
   * 获取单个协议的详细信息
   *
   * @param slug - 协议的唯一标识符（slug）
   * @returns 协议详细信息
   * @throws 如果协议不存在
   * @example
   * ```ts
   * const protocol = await client.getProtocol('aave')
   * console.log(`${protocol.name} TVL: $${protocol.tvl}`)
   * ```
   */
  async getProtocol(slug: string): Promise<ProtocolDetail> {
    return fetchWithErrorHandling<ProtocolDetail>(
      `${API_BASE_URL}/protocol/${slug}`
    )
  }

  /**
   * 获取所有链的 TVL 信息
   *
   * @returns 链信息数组
   * @example
   * ```ts
   * const chains = await client.getChains()
   * const ethereumChain = chains.find(c => c.name === 'Ethereum')
   * ```
   */
  async getChains(): Promise<Chain[]> {
    return fetchWithErrorHandling<Chain[]>(
      `${API_BASE_URL}/chains`
    )
  }

  /**
   * 获取单个代币的当前价格
   *
   * @param chain - 区块链名称（如 'ethereum', 'bsc', 'polygon'）
   * @param address - 代币合约地址
   * @returns 代币价格信息
   * @throws 如果代币不存在或无法获取价格
   * @example
   * ```ts
   * const price = await client.getTokenPrice('ethereum', '0x...')
   * console.log(`价格: $${price.price}`)
   * ```
   */
  async getTokenPrice(
    chain: string,
    address: string
  ): Promise<TokenPrice> {
    const coin = `${chain}:${address}`
    const response = await fetchWithErrorHandling<TokenPricesResponse>(
      `${COINS_API_URL}/prices/current/${coin}`
    )

    const priceData = response.coins[coin]
    if (!priceData) {
      throw new Error(`无法获取代币价格: ${coin}`)
    }

    return priceData
  }

  /**
   * 批量获取多个代币的当前价格
   *
   * @param tokens - 代币标识符数组
   * @returns 代币价格映射（key 为 "chain:address" 格式）
   * @example
   * ```ts
   * const prices = await client.getTokenPrices([
   *   { chain: 'ethereum', address: '0x...' },
   *   { chain: 'bsc', address: '0x...' }
   * ])
   * ```
   */
  async getTokenPrices(
    tokens: TokenIdentifier[]
  ): Promise<Record<string, TokenPrice>> {
    const coins = tokens.map(t => `${t.chain}:${t.address}`).join(',')
    const response = await fetchWithErrorHandling<TokenPricesResponse>(
      `${COINS_API_URL}/prices/current/${coins}`
    )

    return response.coins
  }

  /**
   * 获取历史代币价格（指定时间戳）
   *
   * @param chain - 区块链名称
   * @param address - 代币合约地址
   * @param timestamp - Unix 时间戳（秒）
   * @returns 代币价格信息
   * @example
   * ```ts
   * const yesterday = Math.floor(Date.now() / 1000) - 86400
   * const price = await client.getHistoricalTokenPrice('ethereum', '0x...', yesterday)
   * ```
   */
  async getHistoricalTokenPrice(
    chain: string,
    address: string,
    timestamp: number
  ): Promise<TokenPrice> {
    const coin = `${chain}:${address}`
    const response = await fetchWithErrorHandling<TokenPricesResponse>(
      `${COINS_API_URL}/prices/historical/${timestamp}/${coin}`
    )

    const priceData = response.coins[coin]
    if (!priceData) {
      throw new Error(`无法获取历史价格: ${coin}`)
    }

    return priceData
  }

  /**
   * 获取所有收益率池子信息
   *
   * @returns 收益率池子数组
   * @example
   * ```ts
   * const pools = await client.getYields()
   * const highApy = pools.filter(p => p.apy > 10)
   * ```
   */
  async getYields(): Promise<YieldPool[]> {
    const response = await fetchWithErrorHandling<{ status: string; data: YieldPool[] }>(
      `${YIELDS_API_URL}/pools`
    )
    return response.data
  }

  /**
   * 搜索协议（前端过滤）
   *
   * @param query - 搜索关键词
   * @returns 匹配的协议列表
   * @example
   * ```ts
   * const results = await client.searchProtocols('uniswap')
   * ```
   */
  async searchProtocols(query: string): Promise<Protocol[]> {
    const protocols = await this.getProtocols()
    const lowerQuery = query.toLowerCase()

    return protocols.filter(protocol =>
      protocol.name.toLowerCase().includes(lowerQuery) ||
      protocol.slug.toLowerCase().includes(lowerQuery) ||
      protocol.symbol.toLowerCase().includes(lowerQuery) ||
      protocol.category.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 按分类获取协议
   *
   * @param category - 分类名称（如 'Dexes', 'Lending', 'Yield'）
   * @returns 该分类下的协议列表
   * @example
   * ```ts
   * const dexes = await client.getProtocolsByCategory('Dexes')
   * ```
   */
  async getProtocolsByCategory(category: string): Promise<Protocol[]> {
    const protocols = await this.getProtocols()
    return protocols.filter(
      protocol => protocol.category.toLowerCase() === category.toLowerCase()
    )
  }

  /**
   * 按链获取协议
   *
   * @param chain - 链名称（如 'Ethereum', 'BSC', 'Polygon'）
   * @returns 该链上的协议列表
   * @example
   * ```ts
   * const ethereumProtocols = await client.getProtocolsByChain('Ethereum')
   * ```
   */
  async getProtocolsByChain(chain: string): Promise<Protocol[]> {
    const protocols = await this.getProtocols()
    return protocols.filter(protocol =>
      protocol.chains.some(c => c.toLowerCase() === chain.toLowerCase())
    )
  }

  /**
   * 获取 TVL 排名前 N 的协议
   *
   * @param limit - 返回数量，默认 10
   * @returns 按 TVL 排序的协议列表
   * @example
   * ```ts
   * const top10 = await client.getTopProtocols(10)
   * ```
   */
  async getTopProtocols(limit: number = 10): Promise<Protocol[]> {
    const protocols = await this.getProtocols()
    return protocols
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, limit)
  }

  /**
   * 获取收益率最高的池子
   *
   * @param limit - 返回数量，默认 10
   * @param minTvl - 最小 TVL 过滤（美元），默认 100000
   * @returns 按 APY 排序的池子列表
   * @example
   * ```ts
   * const topYields = await client.getTopYields(10, 1000000)
   * ```
   */
  async getTopYields(
    limit: number = 10,
    minTvl: number = 100000
  ): Promise<YieldPool[]> {
    const pools = await this.getYields()
    return pools
      .filter(pool => pool.tvlUsd >= minTvl && !pool.outlier)
      .sort((a, b) => b.apy - a.apy)
      .slice(0, limit)
  }
}

/**
 * 默认导出单例实例
 */
export const defillama = new DeFiLlamaClient()

/**
 * 导出类型（便于外部使用）
 */
export type {
  Protocol,
  ProtocolDetail,
  Chain,
  TokenPrice,
  TokenIdentifier,
  TokenPricesResponse,
  YieldPool,
  ApiError
}
