import { NextRequest } from 'next/server'
import { dexscreener } from '@/lib/dexscreener/client'
import type { DexPair } from '@/lib/dexscreener/types'
import { getSupabaseServiceClient } from '@/lib/supabase-api'

// 配置路由段
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET - DexScreener 实时交易对数据流 (Server-Sent Events)
 *
 * 提供 DEX 交易对的实时价格、交易量、流动性更新
 *
 * 查询参数：
 * - tokenAddress: 代币地址（必需）
 * - chain: 链（可选，如 'ethereum', 'bsc'）
 * - interval: 更新间隔毫秒数（可选，默认 1000，最小 500）
 *
 * 响应格式（SSE）：
 * event: update
 * data: { pairs: DexPair[], timestamp: number }
 *
 * event: error
 * data: { error: string, timestamp: number }
 *
 * 使用示例：
 * const eventSource = new EventSource('/api/defi/realtime/dex?tokenAddress=0x...')
 * eventSource.addEventListener('update', (e) => {
 *   const { pairs } = JSON.parse(e.data)
 *   console.log('Received update:', pairs)
 * })
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // 解析参数
  const tokenAddress = searchParams.get('tokenAddress')
  const chain = searchParams.get('chain') || undefined
  const interval = Math.max(500, parseInt(searchParams.get('interval') || '1000')) // 最小 500ms

  // 验证必需参数
  if (!tokenAddress) {
    return new Response(
      JSON.stringify({ error: 'tokenAddress 参数是必需的' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  console.log('='.repeat(60))
  console.log('[Realtime DEX] SSE 连接建立')
  console.log('参数:', { tokenAddress, chain, interval })

  // 创建 SSE 流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let intervalId: NodeJS.Timeout | null = null
      let isConnected = true
      let updateCount = 0
      let lastData: DexPair[] | null = null

      // 发送 SSE 消息
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendSSE = (event: string, data: any) => {
        if (!isConnected) return

        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          console.error('[Realtime DEX] SSE 发送失败:', error)
        }
      }

      // 发送初始连接消息
      sendSSE('connected', {
        message: 'Realtime DEX stream connected',
        tokenAddress,
        chain,
        interval,
        timestamp: Date.now()
      })

      // 获取 DEX 数据
      const fetchDexData = async () => {
        if (!isConnected) return

        try {
          // 根据参数选择不同的查询方法
          let pairs: DexPair[]

          if (chain) {
            // 按链和代币地址查询
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pairs = await dexscreener.getTokenPairs(chain as any, tokenAddress)
          } else {
            // 搜索所有链
            pairs = await dexscreener.searchPairs(tokenAddress)
          }

          updateCount++
          const updateTimestamp = Date.now()

          // 检查数据是否有变化（简单比较）
          const hasChanged = !lastData ||
            JSON.stringify(pairs) !== JSON.stringify(lastData)

          if (hasChanged || updateCount % 10 === 0) {
            // 数据有变化或每 10 次强制推送一次
            console.log(`[Realtime DEX] 推送更新 #${updateCount}: ${pairs.length} 个交易对`)

            sendSSE('update', {
              pairs,
              count: pairs.length,
              updateCount,
              hasChanged,
              timestamp: updateTimestamp
            })

            lastData = pairs

            // 记录日志（每 30 次更新记录一次）
            if (updateCount % 30 === 0) {
              logRealtimeUpdate('dex', pairs.length, 'success').catch(err => {
                console.error('[Realtime DEX] 日志写入失败:', err)
              })
            }
          }
        } catch (error) {
          console.error('[Realtime DEX] 更新失败:', error)

          sendSSE('error', {
            error: error instanceof Error ? error.message : '获取 DEX 数据失败',
            timestamp: Date.now()
          })

          // 记录错误日志
          await logRealtimeUpdate(
            'dex',
            0,
            'error',
            error instanceof Error ? error.message : '未知错误'
          )
        }
      }

      // 立即执行一次
      await fetchDexData()

      // 设置定时更新
      intervalId = setInterval(fetchDexData, interval)

      // 监听客户端断开
      request.signal.addEventListener('abort', () => {
        console.log(`[Realtime DEX] 客户端断开连接 (推送了 ${updateCount} 次更新)`)
        isConnected = false
        if (intervalId) {
          clearInterval(intervalId)
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
  dataType: 'dex' | 'protocols' | 'yields' | 'prices',
  recordsUpdated: number,
  status: 'success' | 'error',
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = getSupabaseServiceClient()

    // defi_realtime_logs 表的 data_type 字段只接受 'protocols', 'yields', 'prices'
    // 所以我们将 'dex' 映射为 'prices'
    const mappedDataType = dataType === 'dex' ? 'prices' : dataType

    const { error } = await supabase
      .from('defi_realtime_logs')
      .insert({
        data_type: mappedDataType,
        records_updated: recordsUpdated,
        source: 'dexscreener',
        status,
        error_message: errorMessage || null
      })

    if (error) {
      console.error('[Realtime DEX] 日志插入失败:', error)
    }
  } catch (error) {
    console.error('[Realtime DEX] 日志写入异常:', error)
  }
}
