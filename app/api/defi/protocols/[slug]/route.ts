import { NextRequest, NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'
import { ProtocolDetail } from '@/lib/defillama/types'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

// 添加内存缓存
const cache = new Map<string, { data: ProtocolDetail; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params

    // 检查内存缓存
    const cached = cache.get(slug)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[Cache Hit] 从内存缓存返回: ${slug}`)
      return NextResponse.json(
        { protocol: cached.data },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'X-Cache': 'HIT'
          }
        }
      )
    }

    console.log(`[API] 获取协议: ${slug}`)
    const startTime = Date.now()

    const protocol = await defillama.getProtocol(slug)

    const duration = Date.now() - startTime
    console.log(`✅ 获取成功 (${duration}ms)`)

    // 存入内存缓存
    cache.set(slug, { data: protocol, timestamp: Date.now() })

    // 清理过期缓存
    if (cache.size > 100) {
      const now = Date.now()
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key)
        }
      }
    }

    return NextResponse.json(
      { protocol },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'MISS'
        }
      }
    )
  } catch (error) {
    console.error('[API Error]:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取协议详情失败'
      },
      {
        status: error instanceof Error && error.message.includes('不存在') ? 404 : 500,
        headers: {
          'Cache-Control': 'no-cache'
        }
      }
    )
  }
}
