/**
 * 统一 DeFi 数据客户端
 *
 * 集成多个数据源，提供统一的接口和实时数据流：
 * - DeFiLlama: 协议、收益率、历史数据（主要数据源）
 * - DexScreener: 实时 DEX 交易对数据（数据增强）
 * - Binance WebSocket: 实时代币价格（已有实现）
 *
 * 特性：
 * - 智能缓存管理（Supabase + 内存）
 * - 实时数据订阅（SSE + WebSocket）
 * - 自动错误恢复
 * - 性能监控
 */

import { defillama } from '@/lib/defillama'
import { dexscreener } from '@/lib/dexscreener/client'
import type { Protocol, YieldPool, TokenPrice } from '@/lib/defillama/types'
import type { DexPair } from '@/lib/dexscreener/types'
import { PoolFilterBuilder } from './filters'

/**
 * 订阅选项
 */
export interface SubscriptionOptions {
  /** 更新间隔（毫秒），默认 2000ms */
  interval?: number
  /** 自动重连 */
  autoReconnect?: boolean
  /** 最大重试次数 */
  maxRetries?: number
}

/**
 * 订阅对象
 */
export interface Subscription {
  /** 取消订阅 */
  unsubscribe: () => void
  /** 订阅是否活跃 */
  isActive: () => boolean
}

/**
 * 协议查询选项
 */
export interface ProtocolQueryOptions {
  /** 按分类过滤 */
  category?: string
  /** 按链过滤 */
  chain?: string
  /** 最小 TVL */
  minTvl?: number
  /** 搜索关键词 */
  search?: string
  /** 限制数量 */
  limit?: number
  /** 排序方式 */
  sortBy?: 'tvl' | 'change_1d' | 'change_7d'
  /** 排序方向 */
  order?: 'asc' | 'desc'
}

/**
 * 收益率查询选项
 */
export interface YieldQueryOptions {
  /** 按协议过滤 */
  protocol?: string | string[]
  /** 按链过滤 */
  chain?: string | string[]
  /** 最小 APY */
  minApy?: number
  /** 最小 TVL */
  minTvl?: number
  /** 仅稳定币 */
  stablecoin?: boolean
  /** 仅 Farms */
  farmsOnly?: boolean
  /** 池子类型 */
  poolType?: string
  /** 限制数量 */
  limit?: number
  /** 排序方式 */
  sortBy?: 'tvl' | 'apy' | 'apyBase' | 'apyReward'
  /** 排序方向 */
  order?: 'asc' | 'desc'
}

/**
 * 增强的池子数据（结合 DexScreener）
 */
export interface EnrichedYieldPool extends YieldPool {
  /** DexScreener 实时数据 */
  dexData?: {
    /** 24h 价格变化 */
    priceChange24h?: number
    /** 24h 交易量（USD）*/
    volume24h?: number
    /** 实时价格 */
    priceUsd?: number
    /** 流动性（USD）*/
    liquidity?: number
    /** 最后更新时间 */
    lastUpdated?: Date
  }
}

/**
 * 实时更新回调
 */
export type UpdateCallback<T> = (data: T, error?: Error) => void

/**
 * 统一 DeFi 客户端
 */
class UnifiedDeFiClient {
  private protocolCache: Map<string, { data: Protocol[], timestamp: number }> = new Map()
  private yieldCache: Map<string, { data: YieldPool[], timestamp: number }> = new Map()
  private priceCache: Map<string, { price: number, timestamp: number }> = new Map()

  // 缓存过期时间（毫秒）
  private readonly PROTOCOL_CACHE_TTL = 5 * 60 * 1000 // 5 分钟
  private readonly YIELD_CACHE_TTL = 5 * 60 * 1000 // 5 分钟
  private readonly PRICE_CACHE_TTL = 30 * 1000 // 30 秒

  /**
   * 获取协议列表
   */
  async getProtocols(options: ProtocolQueryOptions = {}): Promise<Protocol[]> {
    const cacheKey = this.getProtocolCacheKey(options)
    const cached = this.protocolCache.get(cacheKey)

    // 检查缓存
    if (cached && Date.now() - cached.timestamp < this.PROTOCOL_CACHE_TTL) {
      console.log(`[UnifiedClient] 使用缓存的协议数据 (${cached.data.length} 个)`)
      return cached.data
    }

    console.log('[UnifiedClient] 从 DeFiLlama 获取协议数据...')
    const startTime = Date.now()

    // 从 DeFiLlama 获取数据
    let protocols = await defillama.getProtocols()
    const duration = Date.now() - startTime
    console.log(`[UnifiedClient] 获取到 ${protocols.length} 个协议 (${duration}ms)`)

    // 应用过滤条件
    if (options.category) {
      protocols = protocols.filter(p =>
        p.category?.toLowerCase() === options.category?.toLowerCase()
      )
    }

    if (options.chain) {
      protocols = protocols.filter(p =>
        p.chains?.some(c => c.toLowerCase() === options.chain?.toLowerCase())
      )
    }

    if (options.minTvl) {
      protocols = protocols.filter(p => p.tvl >= options.minTvl!)
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase()
      protocols = protocols.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.slug.toLowerCase().includes(searchLower)
      )
    }

    // 排序
    const sortBy = options.sortBy || 'tvl'
    const order = options.order || 'desc'
    protocols.sort((a, b) => {
      let aValue = 0
      let bValue = 0

      switch (sortBy) {
        case 'tvl':
          aValue = a.tvl || 0
          bValue = b.tvl || 0
          break
        case 'change_1d':
          aValue = a.change_1d || 0
          bValue = b.change_1d || 0
          break
        case 'change_7d':
          aValue = a.change_7d || 0
          bValue = b.change_7d || 0
          break
      }

      return order === 'desc' ? bValue - aValue : aValue - bValue
    })

    // 限制数量
    if (options.limit) {
      protocols = protocols.slice(0, options.limit)
    }

    // 更新缓存
    this.protocolCache.set(cacheKey, {
      data: protocols,
      timestamp: Date.now()
    })

    return protocols
  }

  /**
   * 获取收益率池子列表
   */
  async getYields(options: YieldQueryOptions = {}): Promise<YieldPool[]> {
    const cacheKey = this.getYieldCacheKey(options)
    const cached = this.yieldCache.get(cacheKey)

    // 检查缓存
    if (cached && Date.now() - cached.timestamp < this.YIELD_CACHE_TTL) {
      console.log(`[UnifiedClient] 使用缓存的收益率数据 (${cached.data.length} 个)`)
      return cached.data
    }

    console.log('[UnifiedClient] 从 DeFiLlama 获取收益率数据...')
    const startTime = Date.now()

    // 从 DeFiLlama 获取数据
    const allYields = await defillama.getYields()
    const duration = Date.now() - startTime
    console.log(`[UnifiedClient] 获取到 ${allYields.length} 个池子 (${duration}ms)`)

    // 使用 PoolFilterBuilder 进行过滤
    let builder = new PoolFilterBuilder(allYields)

    if (options.protocol) {
      builder = builder.filterByProtocol(options.protocol)
    }

    if (options.chain) {
      builder = builder.filterByChain(options.chain)
    }

    if (options.minTvl) {
      builder = builder.filterByTVL(options.minTvl)
    }

    if (options.minApy) {
      builder = builder.filterByAPY(options.minApy)
    }

    if (options.stablecoin) {
      builder = builder.filterStable()
    }

    if (options.farmsOnly) {
      builder = builder.filterFarms()
    }

    if (options.poolType) {
      builder = builder.filterByType(options.poolType)
    }

    // 排序
    const sortBy = options.sortBy || 'apy'
    const order = options.order || 'desc'
    builder = builder.sortBy(sortBy, order)

    // 限制数量
    if (options.limit) {
      builder = builder.limit(options.limit)
    }

    const pools = builder.build()

    // 更新缓存
    this.yieldCache.set(cacheKey, {
      data: pools,
      timestamp: Date.now()
    })

    return pools
  }

  /**
   * 获取代币价格
   */
  async getTokenPrice(chain: string, address: string): Promise<number> {
    const cacheKey = `${chain}:${address}`
    const cached = this.priceCache.get(cacheKey)

    // 检查缓存
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_TTL) {
      return cached.price
    }

    // 从 DeFiLlama 获取价格
    const priceData = await defillama.getTokenPrice(chain, address)
    const price = priceData.price

    // 更新缓存
    this.priceCache.set(cacheKey, {
      price,
      timestamp: Date.now()
    })

    return price
  }

  /**
   * 使用 DexScreener 数据增强池子信息
   */
  async enrichPoolWithDexData(pool: YieldPool): Promise<EnrichedYieldPool> {
    try {
      // 提取代币地址（假设在 underlyingTokens 中）
      if (!pool.underlyingTokens || pool.underlyingTokens.length === 0) {
        return pool as EnrichedYieldPool
      }

      // 搜索 DexScreener 数据
      const tokenAddress = pool.underlyingTokens[0]
      const pairs = await dexscreener.searchPairs(tokenAddress)

      if (pairs.length === 0) {
        return pool as EnrichedYieldPool
      }

      // 使用第一个匹配的交易对
      const pair = pairs[0]

      return {
        ...pool,
        dexData: {
          priceChange24h: pair.priceChange.h24,
          volume24h: pair.volume.h24,
          priceUsd: pair.priceUsd ? parseFloat(pair.priceUsd) : undefined,
          liquidity: pair.liquidity?.usd,
          lastUpdated: new Date()
        }
      }
    } catch (error) {
      console.error('[UnifiedClient] DexScreener 数据增强失败:', error)
      return pool as EnrichedYieldPool
    }
  }

  /**
   * 订阅协议实时更新
   */
  subscribeProtocolUpdates(
    callback: UpdateCallback<Protocol[]>,
    options: SubscriptionOptions & ProtocolQueryOptions = {}
  ): Subscription {
    const interval = options.interval || 2000
    let isActive = true
    let retries = 0
    const maxRetries = options.maxRetries || 3

    const fetchData = async () => {
      if (!isActive) return

      try {
        const protocols = await this.getProtocols(options)
        callback(protocols)
        retries = 0 // 重置重试计数
      } catch (error) {
        retries++
        console.error(`[UnifiedClient] 协议更新失败 (${retries}/${maxRetries}):`, error)

        if (retries >= maxRetries) {
          callback([], error as Error)
          if (!options.autoReconnect) {
            isActive = false
          }
        } else {
          callback([], error as Error)
        }
      }

      if (isActive) {
        setTimeout(fetchData, interval)
      }
    }

    // 立即执行一次
    fetchData()

    return {
      unsubscribe: () => {
        isActive = false
      },
      isActive: () => isActive
    }
  }

  /**
   * 订阅收益率实时更新
   */
  subscribeYieldUpdates(
    callback: UpdateCallback<YieldPool[]>,
    options: SubscriptionOptions & YieldQueryOptions = {}
  ): Subscription {
    const interval = options.interval || 2000
    let isActive = true
    let retries = 0
    const maxRetries = options.maxRetries || 3

    const fetchData = async () => {
      if (!isActive) return

      try {
        const yields = await this.getYields(options)
        callback(yields)
        retries = 0
      } catch (error) {
        retries++
        console.error(`[UnifiedClient] 收益率更新失败 (${retries}/${maxRetries}):`, error)

        if (retries >= maxRetries) {
          callback([], error as Error)
          if (!options.autoReconnect) {
            isActive = false
          }
        } else {
          callback([], error as Error)
        }
      }

      if (isActive) {
        setTimeout(fetchData, interval)
      }
    }

    // 立即执行一次
    fetchData()

    return {
      unsubscribe: () => {
        isActive = false
      },
      isActive: () => isActive
    }
  }

  /**
   * 订阅价格实时更新
   */
  subscribePriceUpdates(
    chain: string,
    address: string,
    callback: UpdateCallback<number>,
    options: SubscriptionOptions = {}
  ): Subscription {
    const interval = options.interval || 1000 // 价格更新更频繁
    let isActive = true
    let retries = 0
    const maxRetries = options.maxRetries || 3

    const fetchData = async () => {
      if (!isActive) return

      try {
        const price = await this.getTokenPrice(chain, address)
        callback(price)
        retries = 0
      } catch (error) {
        retries++
        console.error(`[UnifiedClient] 价格更新失败 (${retries}/${maxRetries}):`, error)

        if (retries >= maxRetries) {
          callback(0, error as Error)
          if (!options.autoReconnect) {
            isActive = false
          }
        } else {
          callback(0, error as Error)
        }
      }

      if (isActive) {
        setTimeout(fetchData, interval)
      }
    }

    // 立即执行一次
    fetchData()

    return {
      unsubscribe: () => {
        isActive = false
      },
      isActive: () => isActive
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    this.protocolCache.clear()
    this.yieldCache.clear()
    this.priceCache.clear()
    console.log('[UnifiedClient] 缓存已清除')
  }

  /**
   * 清除特定类型的缓存
   */
  clearCacheByType(type: 'protocols' | 'yields' | 'prices') {
    switch (type) {
      case 'protocols':
        this.protocolCache.clear()
        break
      case 'yields':
        this.yieldCache.clear()
        break
      case 'prices':
        this.priceCache.clear()
        break
    }
    console.log(`[UnifiedClient] ${type} 缓存已清除`)
  }

  /**
   * 生成协议缓存键
   */
  private getProtocolCacheKey(options: ProtocolQueryOptions): string {
    return JSON.stringify({
      category: options.category,
      chain: options.chain,
      minTvl: options.minTvl,
      search: options.search,
      limit: options.limit,
      sortBy: options.sortBy,
      order: options.order
    })
  }

  /**
   * 生成收益率缓存键
   */
  private getYieldCacheKey(options: YieldQueryOptions): string {
    return JSON.stringify({
      protocol: options.protocol,
      chain: options.chain,
      minApy: options.minApy,
      minTvl: options.minTvl,
      stablecoin: options.stablecoin,
      farmsOnly: options.farmsOnly,
      poolType: options.poolType,
      limit: options.limit,
      sortBy: options.sortBy,
      order: options.order
    })
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      protocols: {
        count: this.protocolCache.size,
        ttl: this.PROTOCOL_CACHE_TTL
      },
      yields: {
        count: this.yieldCache.size,
        ttl: this.YIELD_CACHE_TTL
      },
      prices: {
        count: this.priceCache.size,
        ttl: this.PRICE_CACHE_TTL
      }
    }
  }
}

// 导出单例实例
export const unifiedDefi = new UnifiedDeFiClient()

// 导出类型
export type { Protocol, YieldPool, TokenPrice }
