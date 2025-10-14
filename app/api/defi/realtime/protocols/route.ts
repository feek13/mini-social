import { NextRequest } from 'next/server'
import { unifiedDefi } from '@/lib/defi/unified-client'
import type { Protocol } from '@/lib/defillama/types'
import { getSupabaseServiceClient } from '@/lib/supabase-api'

// 配置路由段
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET - 协议实时更新流 (Server-Sent Events)
 *
 * 每 2 秒推送协议 TVL 更新
 *
 * 查询参数：
 * - category: 按分类过滤（可选，如 'Dexs', 'Lending'）
 * - chain: 按链过滤（可选，如 'Ethereum', 'BSC'）
 * - minTvl: 最小 TVL（可选，默认 0）
 * - limit: 返回数量（可选，默认 50）
 * - interval: 更新间隔毫秒数（可选，默认 2000，最小 1000）
 *
 * 响应格式（SSE）：
 * event: update
 * data: { protocols: Protocol[], timestamp: number }
 *
 * event: error
 * data: { error: string, timestamp: number }
 *
 * 使用示例：
 * const eventSource = new EventSource('/api/defi/realtime/protocols?minTvl=1000000000')
 * eventSource.addEventListener('update', (e) => {
 *   const { protocols } = JSON.parse(e.data)
 *   console.log('Received update:', protocols)
 * })
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // 解析参数
  const category = searchParams.get('category') || undefined
  const chain = searchParams.get('chain') || undefined
  const minTvl = parseFloat(searchParams.get('minTvl') || '0')
  const limit = parseInt(searchParams.get('limit') || '50')
  const interval = Math.max(1000, parseInt(searchParams.get('interval') || '2000')) // 最小 1 秒

  console.log('='.repeat(60))
  console.log('[Realtime Protocols] SSE 连接建立')
  console.log('参数:', { category, chain, minTvl, limit, interval })

  // 创建 SSE 流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let subscription: ReturnType<typeof unifiedDefi.subscribeProtocolUpdates> | null = null
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
          console.error('[Realtime Protocols] SSE 发送失败:', error)
        }
      }

      // 发送初始连接消息
      sendSSE('connected', {
        message: 'Realtime protocols stream connected',
        interval,
        timestamp: Date.now()
      })

      // 订阅协议更新
      subscription = unifiedDefi.subscribeProtocolUpdates(
        async (protocols: Protocol[], error?: Error) => {
          if (error) {
            console.error('[Realtime Protocols] 更新失败:', error)
            sendSSE('error', {
              error: error.message,
              timestamp: Date.now()
            })

            // 记录错误日志到数据库
            await logRealtimeUpdate('protocols', 0, 'error', error.message)
            return
          }

          updateCount++
          const updateTimestamp = Date.now()

          console.log(`[Realtime Protocols] 推送更新 #${updateCount}: ${protocols.length} 个协议`)

          // 发送更新事件
          sendSSE('update', {
            protocols,
            count: protocols.length,
            updateCount,
            timestamp: updateTimestamp
          })

          // 记录成功日志到数据库（异步执行）
          if (updateCount % 10 === 0) {
            // 每 10 次更新记录一次日志
            logRealtimeUpdate('protocols', protocols.length, 'success').catch(err => {
              console.error('[Realtime Protocols] 日志写入失败:', err)
            })
          }

          // 更新数据库中的 realtime 标记（后台执行）
          if (minTvl > 0) {
            updateProtocolRealtimeFlags(protocols).catch(err => {
              console.error('[Realtime Protocols] 标记更新失败:', err)
            })
          }
        },
        {
          category,
          chain,
          minTvl,
          limit,
          interval,
          autoReconnect: true,
          maxRetries: 3
        }
      )

      // 监听客户端断开
      request.signal.addEventListener('abort', () => {
        console.log(`[Realtime Protocols] 客户端断开连接 (推送了 ${updateCount} 次更新)`)
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
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
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
      console.error('[Realtime Protocols] 日志插入失败:', error)
    }
  } catch (error) {
    console.error('[Realtime Protocols] 日志写入异常:', error)
  }
}

/**
 * 更新协议的实时标记
 */
async function updateProtocolRealtimeFlags(protocols: Protocol[]): Promise<void> {
  try {
    const supabase = getSupabaseServiceClient()
    const now = new Date().toISOString()

    // 批量更新（仅更新已缓存的协议）
    for (const protocol of protocols) {
      await supabase
        .from('defi_protocols')
        .update({
          last_realtime_update: now,
          realtime_enabled: true
        })
        .eq('slug', protocol.slug)
    }
  } catch (error) {
    console.error('[Realtime Protocols] 标记更新异常:', error)
  }
}
