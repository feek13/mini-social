import { NextRequest, NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'

// 配置路由段缓存
export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 小时重新验证缓存

/**
 * GET - 获取单个协议详情
 *
 * 路径参数：
 * - slug: 协议的唯一标识符（如 'aave', 'uniswap'）
 *
 * 响应格式：
 * {
 *   protocol: ProtocolDetail
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 获取路径参数
    const { slug } = await params

    console.log('='.repeat(60))
    console.log('[DeFi Protocol Detail API] 收到请求')
    console.log('协议 slug:', slug)

    // 验证参数
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      console.error('❌ 无效的 slug 参数:', slug)
      return NextResponse.json(
        { error: '无效的协议标识符' },
        { status: 400 }
      )
    }

    // 从 DeFiLlama API 获取协议详情
    console.log('\n[获取数据] 从 DeFiLlama API 获取协议详情...')
    const startTime = Date.now()

    let protocol
    try {
      protocol = await defillama.getProtocol(slug)
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ 获取协议失败 (${duration}ms):`, error)

      // 判断是否为 404 错误（不存在的协议）
      // DeFiLlama API 对不存在的协议可能返回 "Bad Request" 或 404
      if (error instanceof Error &&
          (error.message.includes('404') ||
           error.message.includes('not found') ||
           error.message.includes('不存在') ||
           error.message.includes('Bad Request'))) {
        return NextResponse.json(
          { error: `协议 "${slug}" 不存在` },
          { status: 404 }
        )
      }

      // 其他错误返回 500
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '获取协议详情失败' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    console.log(`✅ 成功获取协议详情 (${duration}ms)`)
    console.log('协议信息:')
    console.log(`  名称: ${protocol.name}`)
    console.log(`  分类: ${protocol.category}`)
    console.log(`  TVL: $${protocol.currentChainTvls ?
      Object.values(protocol.currentChainTvls).reduce((sum, val) => sum + val, 0).toLocaleString() :
      'N/A'}`)
    console.log(`  支持的链: ${protocol.chains.join(', ').substring(0, 100)}...`)
    console.log(`  TVL 历史数据点: ${Array.isArray(protocol.tvl) ? protocol.tvl.length : 0}`)

    console.log('='.repeat(60))

    return NextResponse.json(
      {
        protocol
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    )
  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '服务器错误'
      },
      { status: 500 }
    )
  }
}
