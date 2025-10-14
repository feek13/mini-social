'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Protocol } from '@/lib/defillama/types'
import { searchProtocolsByAlias } from '@/lib/defi-aliases'

interface UseProtocolSearchOptions {
  debounceMs?: number // 防抖延迟（默认 300ms）
  minQueryLength?: number // 最小查询长度（默认 1）
  maxResults?: number // 最大结果数（默认 10）
  category?: string // 分类筛选
  chain?: string // 链筛选
}

interface UseProtocolSearchReturn {
  suggestions: Protocol[]
  loading: boolean
  error: string | null
  search: (query: string) => void
  clear: () => void
}

/**
 * 实时搜索协议 Hook
 * 支持防抖、别名匹配、缓存
 */
export function useProtocolSearch(options: UseProtocolSearchOptions = {}): UseProtocolSearchReturn {
  const {
    debounceMs = 300,
    minQueryLength = 1,
    maxResults = 10,
    category,
    chain
  } = options

  const [suggestions, setSuggestions] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const cacheRef = useRef<Map<string, Protocol[]>>(new Map())

  /**
   * 执行搜索
   */
  const performSearch = useCallback(async (query: string) => {
    if (query.length < minQueryLength) {
      setSuggestions([])
      setError(null)
      return
    }

    // 生成缓存键
    const cacheKey = `${query}|${category || ''}|${chain || ''}`

    // 检查缓存
    if (cacheRef.current.has(cacheKey)) {
      setSuggestions(cacheRef.current.get(cacheKey)!)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      // 步骤 1: 使用别名系统增强搜索
      const aliasSlugs = searchProtocolsByAlias(query)

      // 步骤 2: 调用 API 搜索
      const params = new URLSearchParams()
      params.append('search', query)
      params.append('limit', maxResults.toString())
      if (category) params.append('category', category)
      if (chain) params.append('chain', chain)

      const response = await fetch(`/api/defi/protocols?${params}`, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('搜索失败')
      }

      const data = await response.json()
      let results: Protocol[] = data.protocols || []

      // 步骤 3: 如果 API 返回结果较少，使用别名系统补充
      if (results.length < maxResults && aliasSlugs.length > 0) {
        // 获取别名匹配的协议详情
        const missingCount = maxResults - results.length
        const aliasResults: Protocol[] = []

        for (const slug of aliasSlugs.slice(0, missingCount)) {
          // 如果结果中已经包含该协议，跳过
          if (results.some(p => p.slug === slug)) continue

          // 尝试获取该协议的详情
          try {
            const detailResponse = await fetch(`/api/defi/protocols?search=${slug}&limit=1`, {
              signal: abortControllerRef.current.signal
            })

            if (detailResponse.ok) {
              const detailData = await detailResponse.json()
              if (detailData.protocols && detailData.protocols.length > 0) {
                aliasResults.push(detailData.protocols[0])
              }
            }
          } catch {
            // 忽略单个协议获取失败
          }

          if (aliasResults.length >= missingCount) break
        }

        // 合并结果（API 结果优先）
        results = [...results, ...aliasResults].slice(0, maxResults)
      }

      // 步骤 4: 根据别名匹配度重新排序
      if (aliasSlugs.length > 0) {
        results.sort((a, b) => {
          const aIndex = aliasSlugs.indexOf(a.slug)
          const bIndex = aliasSlugs.indexOf(b.slug)

          // 如果都在别名列表中，按别名顺序排序
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex
          }
          // 别名匹配的优先
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1

          // 都不在别名列表中，按 TVL 排序
          return (b.tvl || 0) - (a.tvl || 0)
        })
      }

      // 缓存结果
      cacheRef.current.set(cacheKey, results)

      // 限制缓存大小
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value
        if (firstKey) {
          cacheRef.current.delete(firstKey)
        }
      }

      setSuggestions(results)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // 请求被取消，忽略
        return
      }

      console.error('搜索协议失败:', err)
      setError(err instanceof Error ? err.message : '搜索失败')
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [minQueryLength, maxResults, category, chain])

  /**
   * 搜索（带防抖）
   */
  const search = useCallback((query: string) => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 空查询立即清空
    if (!query.trim()) {
      setSuggestions([])
      setError(null)
      setLoading(false)
      return
    }

    // 设置加载状态
    setLoading(true)

    // 防抖执行搜索
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query.trim())
    }, debounceMs)
  }, [debounceMs, performSearch])

  /**
   * 清空结果
   */
  const clear = useCallback(() => {
    setSuggestions([])
    setError(null)
    setLoading(false)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // 清理副作用
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    suggestions,
    loading,
    error,
    search,
    clear
  }
}
