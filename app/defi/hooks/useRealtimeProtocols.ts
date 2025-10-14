'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Protocol } from '@/lib/defillama/types'

/**
 * 实时协议更新 Hook 选项
 */
export interface UseRealtimeProtocolsOptions {
  /** 按分类过滤 */
  category?: string
  /** 按链过滤 */
  chain?: string
  /** 最小 TVL */
  minTvl?: number
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
 * 实时协议更新 Hook 返回值
 */
export interface UseRealtimeProtocolsResult {
  /** 协议数据 */
  data: Protocol[]
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
 * 实时协议更新 Hook
 *
 * 使用 Server-Sent Events (SSE) 接收协议的实时更新
 *
 * @example
 * ```tsx
 * const { data, loading, error, isRealtime } = useRealtimeProtocols({
 *   minTvl: 1000000000, // 只显示 TVL > $1B 的协议
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
 *     {data.map(protocol => (
 *       <ProtocolCard key={protocol.slug} protocol={protocol} />
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useRealtimeProtocols(
  options: UseRealtimeProtocolsOptions = {}
): UseRealtimeProtocolsResult {
  const [data, setData] = useState<Protocol[]>([])
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
    category,
    chain,
    minTvl,
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

    if (category) params.append('category', category)
    if (chain) params.append('chain', chain)
    if (minTvl) params.append('minTvl', minTvl.toString())
    if (limit) params.append('limit', limit.toString())
    if (interval) params.append('interval', interval.toString())

    return `/api/defi/realtime/protocols?${params.toString()}`
  }, [category, chain, minTvl, limit, interval])

  /**
   * 连接到 SSE
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[useRealtimeProtocols] 已有活跃连接，先断开')
      disconnect()
    }

    const url = buildUrl()
    console.log('[useRealtimeProtocols] 连接到:', url)

    setLoading(true)
    setError(null)

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      // 连接成功
      eventSource.addEventListener('connected', (e) => {
        console.log('[useRealtimeProtocols] SSE 连接成功')
        const data = JSON.parse(e.data)
        setIsConnected(true)
        setLoading(false)
        setIsRealtime(true)
        retryCountRef.current = 0
      })

      // 数据更新
      eventSource.addEventListener('update', (e) => {
        const { protocols, updateCount: count, timestamp } = JSON.parse(e.data)
        console.log(`[useRealtimeProtocols] 收到更新 #${count}:`, protocols.length, '个协议')

        setData(protocols)
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
        console.error('[useRealtimeProtocols] SSE 错误:', errorMsg)

        setError(new Error(errorMsg))
        setIsRealtime(false)
      })

      // 连接错误（EventSource 默认会自动重连）
      eventSource.onerror = (e) => {
        console.error('[useRealtimeProtocols] 连接断开')
        setIsConnected(false)
        setIsRealtime(false)

        retryCountRef.current++

        if (retryCountRef.current >= maxRetries) {
          console.error(`[useRealtimeProtocols] 重试次数已达上限 (${maxRetries})，停止重连`)
          setError(new Error(`连接失败，已重试 ${maxRetries} 次`))
          setLoading(false)
          disconnect()
        } else {
          console.log(`[useRealtimeProtocols] 将在 3 秒后重试 (${retryCountRef.current}/${maxRetries})`)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnect()
          }, 3000)
        }
      }
    } catch (err) {
      console.error('[useRealtimeProtocols] 创建 EventSource 失败:', err)
      setError(err instanceof Error ? err : new Error('创建连接失败'))
      setLoading(false)
    }
  }, [buildUrl, maxRetries])

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    console.log('[useRealtimeProtocols] 断开连接')

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
    console.log('[useRealtimeProtocols] 重新连接')
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
