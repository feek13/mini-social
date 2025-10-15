/**
 * CoinGecko API 客户端
 * 文档: https://www.coingecko.com/en/api/documentation
 * 免费版限制: 10-50 请求/分钟
 */

import type { EvmChain } from '@/types/database'
import type { TokenPrice, GetPricesRequest, Web3ProviderError } from '../types'

// 链映射到 CoinGecko asset_platform_id
const CHAIN_TO_PLATFORM: Record<EvmChain, string> = {
  ethereum: 'ethereum',
  polygon: 'polygon-pos',
  bsc: 'binance-smart-chain',
  arbitrum: 'arbitrum-one',
  optimism: 'optimistic-ethereum',
  base: 'base',
  avalanche: 'avalanche',
  fantom: 'fantom',
  cronos: 'cronos',
  gnosis: 'xdai',
  linea: 'linea',
  zksync: 'zksync',
}

interface CoinGeckoTokenPriceResponse {
  [contractAddress: string]: {
    usd?: number
    usd_24h_change?: number
    usd_market_cap?: number
    usd_24h_vol?: number
    last_updated_at?: number
  }
}

/**
 * CoinGecko 客户端类
 */
export class CoinGeckoClient {
  private baseURL: string
  private apiKey?: string
  private requestQueue: Array<() => Promise<unknown>> = []
  private processing = false
  private lastRequestTime = 0
  private minRequestInterval = 2000  // 2秒（30 req/min = 0.5 req/s）

  constructor(apiKey?: string, baseURL = 'https://api.coingecko.com/api/v3') {
    this.baseURL = baseURL
    this.apiKey = apiKey

    if (!apiKey) {
      console.log('[CoinGecko] Using free API (rate limited)')
    }
  }

  /**
   * 限流请求队列
   */
  private async throttledRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  /**
   * 处理请求队列
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) {
      return
    }

    this.processing = true

    while (this.requestQueue.length > 0) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime

      // 如果距离上次请求时间太短，等待
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
        )
      }

      const request = this.requestQueue.shift()
      if (request) {
        this.lastRequestTime = Date.now()
        await request()
      }
    }

    this.processing = false
  }

  /**
   * 通用 API 请求方法
   */
  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`)

    // 添加查询参数
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    // Pro API 使用 API key
    const headers: HeadersInit = {
      'Accept': 'application/json',
    }

    if (this.apiKey) {
      headers['x-cg-pro-api-key'] = this.apiKey
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        next: { revalidate: 300 },  // 缓存 5 分钟
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      return response.json()
    } catch (error) {
      throw new Error(
        `CoinGecko API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * 获取单个代币价格
   */
  async getTokenPrice(
    chain: EvmChain,
    contractAddress: string
  ): Promise<TokenPrice | null> {
    try {
      const platform = CHAIN_TO_PLATFORM[chain]
      if (!platform) {
        console.warn(`[CoinGecko] Unsupported chain: ${chain}`)
        return null
      }

      const data = await this.throttledRequest(() =>
        this.request<CoinGeckoTokenPriceResponse>('/simple/token_price/' + platform, {
          contract_addresses: contractAddress.toLowerCase(),
          vs_currencies: 'usd',
          include_24hr_change: 'true',
          include_market_cap: 'true',
          include_24hr_vol: 'true',
          include_last_updated_at: 'true',
        })
      )

      const priceData = data[contractAddress.toLowerCase()]
      if (!priceData || !priceData.usd) {
        return null
      }

      return {
        token_address: contractAddress,
        chain,
        usd_price: priceData.usd,
        usd_price_24h_change: priceData.usd_24h_change,
        usd_market_cap: priceData.usd_market_cap,
        usd_24h_volume: priceData.usd_24h_vol,
        last_updated: new Date((priceData.last_updated_at || Date.now() / 1000) * 1000).toISOString(),
      }
    } catch (error) {
      console.error(`[CoinGecko] Failed to get price for ${contractAddress}:`, error)
      return null
    }
  }

  /**
   * 批量获取代币价格
   */
  async getTokenPrices(request: GetPricesRequest): Promise<Record<string, TokenPrice>> {
    const pricesByChain: Record<string, string[]> = {}

    // 按链分组
    request.tokens.forEach(({ chain, address }) => {
      if (!pricesByChain[chain]) {
        pricesByChain[chain] = []
      }
      pricesByChain[chain].push(address.toLowerCase())
    })

    const results: Record<string, TokenPrice> = {}

    // 每个链单独请求
    await Promise.all(
      Object.entries(pricesByChain).map(async ([chain, addresses]) => {
        const platform = CHAIN_TO_PLATFORM[chain as EvmChain]
        if (!platform) {
          console.warn(`[CoinGecko] Unsupported chain: ${chain}`)
          return
        }

        // CoinGecko 限制：每次最多查询 100 个地址
        const batchSize = 100
        for (let i = 0; i < addresses.length; i += batchSize) {
          const batch = addresses.slice(i, i + batchSize)

          try {
            const data = await this.throttledRequest(() =>
              this.request<CoinGeckoTokenPriceResponse>('/simple/token_price/' + platform, {
                contract_addresses: batch.join(','),
                vs_currencies: 'usd',
                include_24hr_change: 'true',
                include_market_cap: 'true',
                include_24hr_vol: 'true',
                include_last_updated_at: 'true',
              })
            )

            // 处理结果
            Object.entries(data).forEach(([address, priceData]) => {
              if (priceData.usd) {
                const key = `${chain}:${address}`
                results[key] = {
                  token_address: address,
                  chain: chain as EvmChain,
                  usd_price: priceData.usd,
                  usd_price_24h_change: priceData.usd_24h_change,
                  usd_market_cap: priceData.usd_market_cap,
                  usd_24h_volume: priceData.usd_24h_vol,
                  last_updated: new Date((priceData.last_updated_at || Date.now() / 1000) * 1000).toISOString(),
                }
              }
            })
          } catch (error) {
            console.error(`[CoinGecko] Failed to get prices for batch in ${chain}:`, error)
          }
        }
      })
    )

    return results
  }

  /**
   * 获取原生代币价格
   */
  async getNativeTokenPrice(chain: EvmChain): Promise<number | null> {
    try {
      // 原生代币的 CoinGecko ID
      const nativeTokenIds: Record<EvmChain, string> = {
        ethereum: 'ethereum',
        polygon: 'matic-network',
        bsc: 'binancecoin',
        arbitrum: 'ethereum',
        optimism: 'ethereum',
        base: 'ethereum',
        avalanche: 'avalanche-2',
        fantom: 'fantom',
        cronos: 'crypto-com-chain',
        gnosis: 'xdai',
        linea: 'ethereum',
        zksync: 'ethereum',
      }

      const coinId = nativeTokenIds[chain]
      if (!coinId) {
        return null
      }

      const data = await this.throttledRequest(() =>
        this.request<Record<string, { usd: number }>>('/simple/price', {
          ids: coinId,
          vs_currencies: 'usd',
        })
      )

      return data[coinId]?.usd || null
    } catch (error) {
      console.error(`[CoinGecko] Failed to get native token price for ${chain}:`, error)
      return null
    }
  }
}

// 导出单例
export const coinGeckoClient = new CoinGeckoClient(
  process.env.COINGECKO_API_KEY
)
