/**
 * Upstash Redis 客户端
 * 用于分布式缓存，提升 API 响应速度
 */

import { Redis } from '@upstash/redis'

// 创建 Redis 客户端
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * 缓存辅助函数
 */
export class RedisCache {
  /**
   * 从缓存获取数据
   * @param key 缓存键
   * @returns 缓存的数据或 null
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get<T>(key)
      if (data) {
        console.log(`[Redis] ✓ Cache hit: ${key}`)
        return data
      }
      console.log(`[Redis] ✗ Cache miss: ${key}`)
      return null
    } catch (error) {
      console.error(`[Redis] Error getting key ${key}:`, error)
      return null
    }
  }

  /**
   * 设置缓存数据（带过期时间）
   * @param key 缓存键
   * @param value 要缓存的数据
   * @param ttlSeconds 过期时间（秒），默认 5 分钟
   */
  static async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, value)
      console.log(`[Redis] ✓ Cached: ${key} (TTL: ${ttlSeconds}s)`)
    } catch (error) {
      console.error(`[Redis] Error setting key ${key}:`, error)
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  static async delete(key: string): Promise<void> {
    try {
      await redis.del(key)
      console.log(`[Redis] ✓ Deleted: ${key}`)
    } catch (error) {
      console.error(`[Redis] Error deleting key ${key}:`, error)
    }
  }

  /**
   * 删除匹配的缓存键（通配符）
   * @param pattern 键匹配模式，如 "wallet:0x123*"
   */
  static async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
        console.log(`[Redis] ✓ Deleted ${keys.length} keys matching: ${pattern}`)
      }
    } catch (error) {
      console.error(`[Redis] Error deleting pattern ${pattern}:`, error)
    }
  }

  /**
   * 获取或设置缓存（常用模式）
   * @param key 缓存键
   * @param fetcher 数据获取函数
   * @param ttlSeconds 过期时间（秒）
   * @returns 缓存或新获取的数据
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<{ data: T; cached: boolean }> {
    // 尝试从缓存获取
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return { data: cached, cached: true }
    }

    // 缓存未命中，获取新数据
    const data = await fetcher()

    // 存入缓存
    await this.set(key, data, ttlSeconds)

    return { data, cached: false }
  }
}

/**
 * 生成缓存键
 */
export function generateRedisKey(prefix: string, params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).sort()
  const keyParts = sortedKeys.map((key) => `${key}=${params[key]}`)
  return `${prefix}:${keyParts.join(':')}`
}

/**
 * 缓存 TTL 配置（秒）
 */
export const CACHE_TTL = {
  // 钱包数据
  WALLET_OVERVIEW: 300,      // 5 分钟 - 钱包概览
  WALLET_TOKENS: 180,        // 3 分钟 - 代币列表
  WALLET_NFTS: 600,          // 10 分钟 - NFT 列表
  WALLET_TRANSACTIONS: 300,  // 5 分钟 - 交易历史
  WALLET_LABELS: 1800,       // 30 分钟 - 钱包标签

  // DeFi 数据
  DEFI_PROTOCOLS: 600,       // 10 分钟 - 协议列表
  DEFI_YIELDS: 300,          // 5 分钟 - 收益率数据
  DEFI_CHAINS: 1800,         // 30 分钟 - 链列表（变化很少）
  DEFI_PRICES: 60,           // 1 分钟 - 代币价格
  DEFI_PROTOCOL_DETAIL: 600, // 10 分钟 - 协议详情
  DEFI_POOL_DETAIL: 300,     // 5 分钟 - 池子详情

  // 代币价格
  TOKEN_PRICE: 60,           // 1 分钟 - 代币价格
} as const
