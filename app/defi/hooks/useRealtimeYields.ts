'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { YieldPool } from '@/lib/defillama/types'

/**
 * 实时收益率更新 Hook 选项
 */
export interface UseRealtimeYieldsOptions {
  /** 按协议过滤 */
  protocol?: string
  /** 按链过滤 */
  chain?: string
  /** 最小 APY */
  minApy?: number
  /** 最小 TVL */
  minTvl?: number
  /** 仅稳定币池 */
  stablecoin?: boolean
  /** 仅 Farms */
  farmsOnly?: boolean
  /** 限制数量 */
  limit?: number
  /** 更新间隔（毫秒）*/
  interval?: number
  /** 是否自动连接（默认 true）*/
  autoConnect?: boolean
  /** 错误重试次数（默认 3）*/
  maxRetries?: number
}

/**
 * 实时收益率更新 Hook 返回值
 */
export interface UseRealtimeYieldsResult {
  /** 收益率池子数据 */
  data: YieldPool[]
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
 * 实时收益率更新 Hook
 *
 * 使用 Server-Sent Events (SSE) 接收收益率池子的实时更新
 *
 * @example
 * ```tsx
 * const { data, loading, error, isRealtime } = useRealtimeYields({
 *   protocol: 'aave-v3',
 *   chain: 'Ethereum',
 *   minApy: 5,
 *   interval: 2000,
 *   autoConnect: true
 * })
 *
 * if (loading) return <div>连接中...</div>
 * if (error) return <div>错误: {error.message}</div>
 *
 * return (
 *   <div>
 *     {isRealtime && <Badge>实时</Badge>}
 *     {data.map(pool => (
 *       <YieldCard key={pool.pool} pool={pool} />
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useRealtimeYields(
  options: UseRealtimeYieldsOptions = {}
): UseRealtimeYieldsResult {
  const [data, setData] = useState<YieldPool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRealtime, setIsRealtime] = useState(false)
  const [updateCount, setUpdateCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)

  const {
    protocol,
    chain,
    minApy,
    minTvl,
    stablecoin,
    farmsOnly,
    limit,
    interval = 2000,
    autoConnect = true,
    maxRetries = 3
  } = options

  /**
   * 构建 SSE URL
   */
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()

    if (protocol) params.append('protocol', protocol)
    if (chain) params.append('chain', chain)
    if (minApy) params.append('minApy', minApy.toString())
    if (minTvl) params.append('minTvl', minTvl.toString())
    if (stablecoin !== undefined) params.append('stablecoin', stablecoin.toString())
    if (farmsOnly !== undefined) params.append('farmsOnly', farmsOnly.toString())
    if (limit) params.append('limit', limit.toString())
    if (interval) params.append('interval', interval.toString())

    return `/api/defi/realtime/yields?${params.toString()}`
  }, [protocol, chain, minApy, minTvl, stablecoin, farmsOnly, limit, interval])

  /**
   * 连接到 SSE
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[useRealtimeYields] 已有活跃连接，先断开')
      disconnect()
    }

    const url = buildUrl()
    console.log('[useRealtimeYields] 连接到:', url)

    setLoading(true)
    setError(null)

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      // 连接成功
      eventSource.addEventListener('connected', (e) => {
        console.log('[useRealtimeYields] SSE 连接成功')
        const data = JSON.parse(e.data)
        setIsConnected(true)
        setLoading(false)
        setIsRealtime(true)
        retryCountRef.current = 0
      })

      // 数据更新
      eventSource.addEventListener('update', (e) => {
        const { yields, updateCount: count, timestamp } = JSON.parse(e.data)
        console.log(`[useRealtimeYields] 收到更新 #${count}:`, yields.length, '个池子')

        setData(yields)
        setUpdateCount(count)
        setLastUpdate(new Date(timestamp))
        setLoading(false)
        setError(null)
      })

      // 错误
      eventSource.addEventListener('error', (e: Event) => {
        const messageEvent = e as MessageEvent
        const errorData = messageEvent.data ? JSON.parse(messageEvent.data) : null
        const errorMsg = errorData?.error || 'SSE 连接错误'
        console.error('[useRealtimeYields] SSE 错误:', errorMsg)

        setError(new Error(errorMsg))
        setIsRealtime(false)
      })

      // 连接错误
      eventSource.onerror = (e) => {
        console.error('[useRealtimeYields] 连接断开')
        setIsConnected(false)
        setIsRealtime(false)

        retryCountRef.current++

        if (retryCountRef.current >= maxRetries) {
          console.error(`[useRealtimeYields] 重试次数已达上限 (${maxRetries})，停止重连`)
          setError(new Error(`连接失败，已重试 ${maxRetries} 次`))
          setLoading(false)
          disconnect()
        } else {
          console.log(`[useRealtimeYields] 将在 3 秒后重试 (${retryCountRef.current}/${maxRetries})`)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnect()
          }, 3000)
        }
      }
    } catch (err) {
      console.error('[useRealtimeYields] 创建 EventSource 失败:', err)
      setError(err instanceof Error ? err : new Error('创建连接失败'))
      setLoading(false)
    }
  }, [buildUrl, maxRetries])

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    console.log('[useRealtimeYields] 断开连接')

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
    console.log('[useRealtimeYields] 重新连接')
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
    lastUpdate,
    connect,
    disconnect,
    reconnect
  }
}
