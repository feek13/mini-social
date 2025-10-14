import { NextRequest } from 'next/server'
import { unifiedDefi } from '@/lib/defi/unified-client'
import type { YieldPool } from '@/lib/defillama/types'
import { getSupabaseServiceClient } from '@/lib/supabase-api'

// 配置路由段
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET - 收益率实时更新流 (Server-Sent Events)
 *
 * 每 2 秒推送收益率池子更新
 *
 * 查询参数：
 * - protocol: 按协议过滤（可选，如 'aave-v3', 'uniswap-v3'）
 * - chain: 按链过滤（可选，如 'Ethereum', 'BSC'）
 * - minApy: 最小 APY（可选，默认 0）
 * - minTvl: 最小 TVL（可选，默认 0）
 * - stablecoin: 仅稳定币池（可选，'true' | 'false'）
 * - farmsOnly: 仅 Farms（可选，'true' | 'false'）
 * - limit: 返回数量（可选，默认 50）
 * - interval: 更新间隔毫秒数（可选，默认 2000，最小 1000）
 *
 * 响应格式（SSE）：
 * event: update
 * data: { yields: YieldPool[], timestamp: number }
 *
 * event: error
 * data: { error: string, timestamp: number }
 *
 * 使用示例：
 * const eventSource = new EventSource('/api/defi/realtime/yields?protocol=aave-v3&chain=Ethereum')
 * eventSource.addEventListener('update', (e) => {
 *   const { yields } = JSON.parse(e.data)
 *   console.log('Received update:', yields)
 * })
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // 解析参数
  const protocol = searchParams.get('protocol') || undefined
  const chain = searchParams.get('chain') || undefined
  const minApy = parseFloat(searchParams.get('minApy') || '0')
  const minTvl = parseFloat(searchParams.get('minTvl') || '0')
  const stablecoin = searchParams.get('stablecoin') === 'true' ? true : undefined
  const farmsOnly = searchParams.get('farmsOnly') === 'true' ? true : undefined
  const limit = parseInt(searchParams.get('limit') || '50')
  const interval = Math.max(1000, parseInt(searchParams.get('interval') || '2000'))

  console.log('='.repeat(60))
  console.log('[Realtime Yields] SSE 连接建立')
  console.log('参数:', { protocol, chain, minApy, minTvl, stablecoin, farmsOnly, limit, interval })

  // 创建 SSE 流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let subscription: ReturnType<typeof unifiedDefi.subscribeYieldUpdates> | null = null
      let isConnected = true
      let updateCount = 0

      // 发送 SSE 消息
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendSSE = (event: string, data: any) => {
        if (!isConnected) return

        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          console.error('[Realtime Yields] SSE 发送失败:', error)
        }
      }

      // 发送初始连接消息
      sendSSE('connected', {
        message: 'Realtime yields stream connected',
        interval,
        timestamp: Date.now()
      })

      // 订阅收益率更新
      subscription = unifiedDefi.subscribeYieldUpdates(
        async (yields: YieldPool[], error?: Error) => {
          if (error) {
            console.error('[Realtime Yields] 更新失败:', error)
            sendSSE('error', {
              error: error.message,
              timestamp: Date.now()
            })

            // 记录错误日志到数据库
            await logRealtimeUpdate('yields', 0, 'error', error.message)
            return
          }

          updateCount++
          const updateTimestamp = Date.now()

          console.log(`[Realtime Yields] 推送更新 #${updateCount}: ${yields.length} 个池子`)

          // 发送更新事件
          sendSSE('update', {
            yields,
            count: yields.length,
            updateCount,
            timestamp: updateTimestamp
          })

          // 记录成功日志到数据库（每 10 次更新记录一次）
          if (updateCount % 10 === 0) {
            logRealtimeUpdate('yields', yields.length, 'success').catch(err => {
              console.error('[Realtime Yields] 日志写入失败:', err)
            })
          }

          // 更新数据库中的实时标记（后台执行）
          updateYieldRealtimeFlags(yields).catch(err => {
            console.error('[Realtime Yields] 标记更新失败:', err)
          })
        },
        {
          protocol,
          chain,
          minApy,
          minTvl,
          stablecoin,
          farmsOnly,
          limit,
          interval,
          autoReconnect: true,
          maxRetries: 3
        }
      )

      // 监听客户端断开
      request.signal.addEventListener('abort', () => {
        console.log(`[Realtime Yields] 客户端断开连接 (推送了 ${updateCount} 次更新)`)
        isConnected = false
        if (subscription) {
          subscription.unsubscribe()
        }
        controller.close()
      })
    }
  })

  // 返回 SSE 响应
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

/**
 * 记录实时更新日志到数据库
 */
async function logRealtimeUpdate(
  dataType: 'protocols' | 'yields' | 'prices',
  recordsUpdated: number,
  status: 'success' | 'error',
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = getSupabaseServiceClient()

    const { error } = await supabase
      .from('defi_realtime_logs')
      .insert({
        data_type: dataType,
        records_updated: recordsUpdated,
        source: 'unified-client',
        status,
        error_message: errorMessage || null
      })

    if (error) {
      console.error('[Realtime Yields] 日志插入失败:', error)
    }
  } catch (error) {
    console.error('[Realtime Yields] 日志写入异常:', error)
  }
}

/**
 * 更新收益率池子的实时标记
 */
async function updateYieldRealtimeFlags(yields: YieldPool[]): Promise<void> {
  try {
    const supabase = getSupabaseServiceClient()
    const now = new Date().toISOString()

    // 批量更新（仅更新已缓存的池子）
    for (const yieldPool of yields) {
      await supabase
        .from('defi_yields')
        .update({
          last_realtime_update: now,
          is_realtime: true,
          realtime_source: 'defillama'
        })
        .eq('pool_id', yieldPool.pool)
    }
  } catch (error) {
    console.error('[Realtime Yields] 标记更新异常:', error)
  }
}
