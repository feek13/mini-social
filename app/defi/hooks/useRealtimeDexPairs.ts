'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { DexPair } from '@/lib/dexscreener/types'

/**
 * 实时 DEX 交易对更新 Hook 选项
 */
export interface UseRealtimeDexPairsOptions {
  /** 代币地址（必需）*/
  tokenAddress: string
  /** 链（可选）*/
  chain?: string
  /** 更新间隔（毫秒），默认 1000ms */
  interval?: number
  /** 是否自动连接（默认 true）*/
  autoConnect?: boolean
  /** 错误重试次数（默认 3）*/
  maxRetries?: number
}

/**
 * 实时 DEX 交易对更新 Hook 返回值
 */
export interface UseRealtimeDexPairsResult {
  /** 交易对数据 */
  data: DexPair[]
  /** 是否正在加载 */
  loading: boolean
  /** 错误信息 */
  error: Error | null
  /** 是否已连接 */
  isConnected: boolean
  /** 是否为实时数据 */
  isRealtime: boolean
  /** 更新计数 */
  updateCount: number
  /** 数据是否有变化 */
  hasChanged: boolean
  /** 最后更新时间 */
  lastUpdate: Date | null
  /** 手动连接 */
  connect: () => void
  /** 断开连接 */
  disconnect: () => void
  /** 重新连接 */
  reconnect: () => void
}

/**
 * 实时 DEX 交易对更新 Hook
 *
 * 使用 Server-Sent Events (SSE) 接收 DexScreener 交易对的实时更新
 *
 * @example
 * ```tsx
 * const { data, loading, error, isRealtime, hasChanged } = useRealtimeDexPairs({
 *   tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
 *   chain: 'ethereum',
 *   interval: 1000,
 *   autoConnect: true
 * })
 *
 * if (loading) return <div>连接中...</div>
 * if (error) return <div>错误: {error.message}</div>
 *
 * return (
 *   <div>
 *     {isRealtime && <Badge>实时 {hasChanged && '⚡'}</Badge>}
 *     {data.map(pair => (
 *       <DexPairCard key={pair.pairAddress} pair={pair} />
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useRealtimeDexPairs(
  options: UseRealtimeDexPairsOptions
): UseRealtimeDexPairsResult {
  const [data, setData] = useState<DexPair[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRealtime, setIsRealtime] = useState(false)
  const [updateCount, setUpdateCount] = useState(0)
  const [hasChanged, setHasChanged] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)

  const {
    tokenAddress,
    chain,
    interval = 1000,
    autoConnect = true,
    maxRetries = 3
  } = options

  // 验证必需参数
  if (!tokenAddress) {
    throw new Error('tokenAddress 是必需参数')
  }

  /**
   * 构建 SSE URL
   */
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()

    params.append('tokenAddress', tokenAddress)
    if (chain) params.append('chain', chain)
    if (interval) params.append('interval', interval.toString())

    return `/api/defi/realtime/dex?${params.toString()}`
  }, [tokenAddress, chain, interval])

  /**
   * 连接到 SSE
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[useRealtimeDexPairs] 已有活跃连接，先断开')
      disconnect()
    }

    const url = buildUrl()
    console.log('[useRealtimeDexPairs] 连接到:', url)

    setLoading(true)
    setError(null)

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      // 连接成功
      eventSource.addEventListener('connected', (e) => {
        console.log('[useRealtimeDexPairs] SSE 连接成功')
        const data = JSON.parse(e.data)
        setIsConnected(true)
        setLoading(false)
        setIsRealtime(true)
        retryCountRef.current = 0
      })

      // 数据更新
      eventSource.addEventListener('update', (e) => {
        const { pairs, updateCount: count, hasChanged: changed, timestamp } = JSON.parse(e.data)
        console.log(`[useRealtimeDexPairs] 收到更新 #${count}:`, pairs.length, '个交易对', changed ? '(有变化)' : '')

        setData(pairs)
        setUpdateCount(count)
        setHasChanged(changed)
        setLastUpdate(new Date(timestamp))
        setLoading(false)
        setError(null)
      })

      // 错误
      eventSource.addEventListener('error', (e: Event) => {
        const messageEvent = e as MessageEvent
        const errorData = messageEvent.data ? JSON.parse(messageEvent.data) : null
        const errorMsg = errorData?.error || 'SSE 连接错误'
        console.error('[useRealtimeDexPairs] SSE 错误:', errorMsg)

        setError(new Error(errorMsg))
        setIsRealtime(false)
      })

      // 连接错误
      eventSource.onerror = (e) => {
        console.error('[useRealtimeDexPairs] 连接断开')
        setIsConnected(false)
        setIsRealtime(false)

        retryCountRef.current++

        if (retryCountRef.current >= maxRetries) {
          console.error(`[useRealtimeDexPairs] 重试次数已达上限 (${maxRetries})，停止重连`)
          setError(new Error(`连接失败，已重试 ${maxRetries} 次`))
          setLoading(false)
          disconnect()
        } else {
          console.log(`[useRealtimeDexPairs] 将在 3 秒后重试 (${retryCountRef.current}/${maxRetries})`)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnect()
          }, 3000)
        }
      }
    } catch (err) {
      console.error('[useRealtimeDexPairs] 创建 EventSource 失败:', err)
      setError(err instanceof Error ? err : new Error('创建连接失败'))
      setLoading(false)
    }
  }, [buildUrl, maxRetries])

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    console.log('[useRealtimeDexPairs] 断开连接')

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    setIsConnected(false)
    setIsRealtime(false)
  }, [])

  /**
   * 重新连接
   */
  const reconnect = useCallback(() => {
    console.log('[useRealtimeDexPairs] 重新连接')
    disconnect()
    setTimeout(() => {
      connect()
    }, 100)
  }, [disconnect, connect])

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  return {
    data,
    loading,
    error,
    isConnected,
    isRealtime,
    updateCount,
    hasChanged,
    lastUpdate,
    connect,
    disconnect,
    reconnect
  }
}
