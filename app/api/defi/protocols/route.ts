import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase-api'
import { unifiedDefi } from '@/lib/defi/unified-client'
import type { Protocol } from '@/lib/defillama/types'

// 配置路由段缓存
export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 小时重新验证缓存

/**
 * GET - 获取 DeFi 协议列表
 *
 * ✅ 已优化：使用 UnifiedDeFiClient（内置智能缓存 + 过滤）
 *
 * 查询参数：
 * - search: 搜索协议名称（可选）
 * - category: 按分类过滤（可选）
 * - chain: 按链过滤（可选）
 * - minTvl: 最小 TVL（可选）
 * - limit: 返回数量（默认 50）
 * - sortBy: 排序方式（可选，tvl | change_1d | change_7d）
 * - order: 排序方向（可选，asc | desc）
 *
 * 响应格式：
 * {
 *   protocols: Protocol[],
 *   cached: boolean
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const category = searchParams.get('category') || undefined
    const chain = searchParams.get('chain') || undefined
    const minTvl = searchParams.get('minTvl') ? parseFloat(searchParams.get('minTvl')!) : undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const sortBy = searchParams.get('sortBy') as 'tvl' | 'change_1d' | 'change_7d' || undefined
    const order = searchParams.get('order') as 'asc' | 'desc' || undefined

    console.log('='.repeat(60))
    console.log('[DeFi Protocols API] 收到请求')
    console.log('参数:', { search, category, chain, minTvl, limit, sortBy, order })

    // 验证参数
    if (limit < 1 || limit > 1000) {
      console.error('❌ 无效的 limit 参数:', limit)
      return NextResponse.json(
        { error: '无效的 limit 参数，范围应在 1-1000 之间' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // 使用统一 DeFi 客户端（自动处理缓存和过滤）
    const protocols = await unifiedDefi.getProtocols({
      search,
      category,
      chain,
      minTvl,
      limit,
      sortBy,
      order
    })

    const duration = Date.now() - startTime
    console.log(`✅ 获取 ${protocols.length} 个协议 (${duration}ms)`)

    // 后台缓存到数据库（仅全量数据）
    if (!search && !category && !chain && !minTvl) {
      console.log('💾 后台缓存协议数据到数据库...')
      cacheProtocolsToDatabase(protocols).catch(err => {
        console.error('❌ 缓存写入失败:', err)
      })
    }

    console.log(`📦 返回 ${protocols.length} 条数据`)
    console.log('='.repeat(60))

    return NextResponse.json(
      {
        protocols,
        cached: false // UnifiedClient 内部使用内存缓存
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
        error: error instanceof Error ? error.message : '获取协议列表失败'
      },
      { status: 500 }
    )
  }
}

/**
 * 将 Protocol 数据缓存到数据库
 */
async function cacheProtocolsToDatabase(protocols: Protocol[]) {
  try {
    // 使用 service role 客户端绕过 RLS
    const supabase = getSupabaseServiceClient()

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000) // 1 小时后过期

    const cacheData = protocols.map(p => ({
      protocol_slug: p.slug,
      protocol_name: p.name,
      logo: p.logo,
      url: p.url,
      description: p.description,
      category: p.category,
      tvl: p.tvl,
      tvl_24h_change: p.change_1d,
      tvl_7d_change: p.change_7d,
      chains: p.chains,
      chain_tvls: p.chainTvls,
      token_symbol: p.symbol,
      token_address: p.address,
      cached_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    }))

    // 使用 upsert 批量插入/更新
    const { error } = await supabase
      .from('defi_protocols')
      .upsert(cacheData, {
        onConflict: 'protocol_slug',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('❌ 缓存写入失败:', error)
    } else {
      console.log(`✅ 成功缓存 ${cacheData.length} 条协议数据`)
    }
  } catch (error) {
    console.error('❌ 缓存写入异常:', error)
  }
}

/**
 * 数据库缓存类型
 */
interface ProtocolCache {
  protocol_slug: string
  protocol_name: string
  token_address: string | null
  token_symbol: string | null
  url: string | null
  description: string | null
  chains: string[]
  logo: string | null
  category: string | null
  tvl: number
  chain_tvls: Record<string, number>
  tvl_24h_change: number | null
  tvl_7d_change: number | null
}

/**
 * 将数据库缓存转换为 Protocol 类型
 */
function convertCacheToProtocol(cache: ProtocolCache): Protocol {
  return {
    id: cache.protocol_slug,
    name: cache.protocol_name,
    address: cache.token_address || null,
    symbol: cache.token_symbol || '-',
    url: cache.url || '',
    description: cache.description || '',
    chain: Array.isArray(cache.chains) && cache.chains.length > 0 ? cache.chains[0] : 'Unknown',
    logo: cache.logo || null,
    audits: '',
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: cache.category || 'Other',
    chains: Array.isArray(cache.chains) ? cache.chains : [],
    module: '',
    twitter: null,
    forkedFrom: [],
    oracles: [],
    listedAt: 0,
    slug: cache.protocol_slug,
    tvl: Number(cache.tvl) || 0,
    chainTvls: cache.chain_tvls || {},
    change_1h: null,
    change_1d: cache.tvl_24h_change ? Number(cache.tvl_24h_change) : null,
    change_7d: cache.tvl_7d_change ? Number(cache.tvl_7d_change) : null,
    staking: 0,
    fdv: null,
    mcap: null
  }
}
