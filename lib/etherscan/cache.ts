/**
 * Etherscan API 缓存策略
 * 使用 Supabase 作为缓存层，减少 API 调用
 */

import { getSupabaseClient } from '@/lib/supabase-api'
import type { CacheEntry } from './types'

// ============================================
// 缓存配置
// ============================================

const CACHE_DURATIONS = {
  GAS_PRICE: 2 * 60 * 1000, // 2 分钟
  BALANCE: 15 * 60 * 1000, // 15 分钟
  TRANSACTIONS: 30 * 60 * 1000, // 30 分钟
  TOKEN_INFO: 60 * 60 * 1000, // 1 小时
  DAILY_STATS: 24 * 60 * 60 * 1000, // 24 小时
} as const

export type CacheType = keyof typeof CACHE_DURATIONS

// ============================================
// 缓存键生成
// ============================================

export function generateCacheKey(
  type: string,
  params: Record<string, string | number | boolean>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  return `etherscan:${type}:${sortedParams}`
}

// ============================================
// 缓存读取
// ============================================

export async function getCachedData<T>(
  cacheKey: string
): Promise<T | null> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('etherscan_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey)
      .single()

    if (error || !data) {
      return null
    }

    // 检查是否过期
    const expiresAt = new Date(data.expires_at).getTime()
    if (Date.now() > expiresAt) {
      // 异步删除过期缓存，不阻塞
      supabase
        .from('etherscan_cache')
        .delete()
        .eq('cache_key', cacheKey)
        .then()

      return null
    }

    return data.data as T
  } catch (error) {
    console.error('[Etherscan Cache] 读取缓存失败:', error)
    return null
  }
}

// ============================================
// 缓存写入
// ============================================

export async function setCachedData<T>(
  cacheKey: string,
  data: T,
  duration: number
): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    const expiresAt = new Date(Date.now() + duration)

    const { error } = await supabase.from('etherscan_cache').upsert({
      cache_key: cacheKey,
      data: data as any,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[Etherscan Cache] 写入缓存失败:', error)
    }
  } catch (error) {
    console.error('[Etherscan Cache] 写入缓存异常:', error)
  }
}

// ============================================
// 缓存删除
// ============================================

export async function deleteCachedData(cacheKey: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()

    await supabase.from('etherscan_cache').delete().eq('cache_key', cacheKey)
  } catch (error) {
    console.error('[Etherscan Cache] 删除缓存失败:', error)
  }
}

// ============================================
// 批量删除缓存（按前缀）
// ============================================

export async function deleteCachedDataByPrefix(
  prefix: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient()

    await supabase
      .from('etherscan_cache')
      .delete()
      .like('cache_key', `${prefix}%`)
  } catch (error) {
    console.error('[Etherscan Cache] 批量删除缓存失败:', error)
  }
}

// ============================================
// 清理所有过期缓存
// ============================================

export async function cleanupExpiredCache(): Promise<void> {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase.rpc('cleanup_expired_etherscan_cache')

    if (error) {
      console.error('[Etherscan Cache] 清理过期缓存失败:', error)
    }
  } catch (error) {
    console.error('[Etherscan Cache] 清理过期缓存异常:', error)
  }
}

// ============================================
// 获取缓存统计
// ============================================

export async function getCacheStats(): Promise<{
  total: number
  expired: number
  active: number
}> {
  try {
    const supabase = getSupabaseClient()
    const now = new Date().toISOString()

    const [totalResult, expiredResult] = await Promise.all([
      supabase.from('etherscan_cache').select('cache_key', { count: 'exact' }),
      supabase
        .from('etherscan_cache')
        .select('cache_key', { count: 'exact' })
        .lt('expires_at', now),
    ])

    const total = totalResult.count || 0
    const expired = expiredResult.count || 0

    return {
      total,
      expired,
      active: total - expired,
    }
  } catch (error) {
    console.error('[Etherscan Cache] 获取缓存统计失败:', error)
    return { total: 0, expired: 0, active: 0 }
  }
}

// ============================================
// 通用缓存包装函数
// ============================================

export async function withCache<T>(
  cacheKey: string,
  duration: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // 尝试从缓存读取
  const cached = await getCachedData<T>(cacheKey)
  if (cached !== null) {
    return cached
  }

  // 缓存未命中，调用 fetcher
  const data = await fetcher()

  // 写入缓存（异步，不阻塞）
  setCachedData(cacheKey, data, duration).catch((error) => {
    console.error('[Etherscan Cache] 异步写入缓存失败:', error)
  })

  return data
}
