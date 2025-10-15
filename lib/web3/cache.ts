/**
 * 缓存层 - 内存缓存 + Supabase 持久化
 */

import type { CachedData, Web3Provider } from './types'

/**
 * 内存缓存
 */
class MemoryCache {
  private cache = new Map<string, CachedData<unknown>>()
  private maxSize = 1000 // 最多缓存 1000 条

  get<T>(key: string, ttl: number): T | null {
    const cached = this.cache.get(key)
    if (!cached) {
      return null
    }

    const now = Date.now()
    const age = (now - cached.timestamp) / 1000

    if (age > ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  set<T>(key: string, data: T, provider: Web3Provider): void {
    // LRU: 如果缓存满了，删除最旧的
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      provider,
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// 全局单例
export const memoryCache = new MemoryCache()

/**
 * 生成缓存键
 */
export function generateCacheKey(
  dataType: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const sortedParams = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return `${dataType}:${sortedParams}`
}

/**
 * Supabase 缓存表结构（需要创建此表）
 *
 * CREATE TABLE web3_cache (
 *   key TEXT PRIMARY KEY,
 *   data JSONB NOT NULL,
 *   provider TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   expires_at TIMESTAMPTZ NOT NULL
 * );
 *
 * CREATE INDEX idx_web3_cache_expires_at ON web3_cache(expires_at);
 */

/**
 * Supabase 持久化缓存（可选，暂未实现）
 *
 * 使用场景：
 * - NFT 数据（变化慢，可长期缓存）
 * - 协议信息（变化慢）
 * - 历史价格数据
 *
 * 不适合场景：
 * - 余额数据（变化快）
 * - 实时价格（变化快）
 */
export async function getFromSupabaseCache<T>(
  key: string,
  ttl: number
): Promise<T | null> {
  // TODO: 实现 Supabase 缓存读取
  // const { data, error } = await supabase
  //   .from('web3_cache')
  //   .select('data, created_at')
  //   .eq('key', key)
  //   .single()
  //
  // if (error || !data) return null
  //
  // const age = (Date.now() - new Date(data.created_at).getTime()) / 1000
  // if (age > ttl) return null
  //
  // return data.data as T

  return null
}

export async function setToSupabaseCache<T>(
  key: string,
  data: T,
  provider: Web3Provider,
  ttl: number
): Promise<void> {
  // TODO: 实现 Supabase 缓存写入
  // const expiresAt = new Date(Date.now() + ttl * 1000)
  //
  // await supabase.from('web3_cache').upsert({
  //   key,
  //   data: data as unknown as Json,
  //   provider,
  //   expires_at: expiresAt.toISOString(),
  // })
}
