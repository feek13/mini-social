import { NextRequest, NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params

    console.log(`[Protocol Detail API] 获取协议: ${slug}`)

    const protocol = await defillama.getProtocol(slug)

    console.log(`✅ 成功获取协议 ${protocol.name}`)

    return NextResponse.json(
      { protocol },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    )
  } catch (error) {
    console.error('[Protocol Detail API] 错误:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取协议详情失败'
      },
      { status: error instanceof Error && error.message.includes('不存在') ? 404 : 500 }
    )
  }
}
