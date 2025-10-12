import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase-api'
import { defillama } from '@/lib/defillama'
import { Protocol } from '@/lib/defillama/types'

// 配置路由段缓存
export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 小时重新验证缓存

/**
 * GET - 获取 DeFi 协议列表
 *
 * 查询参数：
 * - search: 搜索协议名称（可选）
 * - category: 按分类过滤（可选）
 * - chain: 按链过滤（可选）
 * - limit: 返回数量（默认 50）
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
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log('='.repeat(60))
    console.log('[DeFi Protocols API] 收到请求')
    console.log('参数:', { search, category, chain, limit })

    // 验证参数
    if (limit < 1 || limit > 1000) {
      console.error('❌ 无效的 limit 参数:', limit)
      return NextResponse.json(
        { error: '无效的 limit 参数，范围应在 1-1000 之间' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // 步骤 1: 尝试从缓存获取数据
    console.log('\n[步骤 1] 查询缓存数据...')
    let query = supabase
      .from('defi_protocols')
      .select('*')
      .gt('expires_at', new Date().toISOString())

    // 应用过滤条件
    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.ilike('protocol_name', `%${search}%`)
    }

    // chain 过滤需要在后处理（因为 chains 是 JSONB 数组）
    const { data: cachedProtocols, error: cacheError } = await query

    if (cacheError) {
      console.error('❌ 查询缓存失败:', cacheError)
      // 继续从 API 获取，不中断流程
    }

    // 检查缓存是否有效
    let validCachedProtocols = cachedProtocols || []

    // 如果指定了 chain，进行后过滤
    if (chain && validCachedProtocols.length > 0) {
      validCachedProtocols = validCachedProtocols.filter(p => {
        const chains = Array.isArray(p.chains) ? p.chains : []
        return chains.some((c: string) => c.toLowerCase() === chain.toLowerCase())
      })
    }

    if (validCachedProtocols.length > 0) {
      console.log(`✅ 找到 ${validCachedProtocols.length} 条有效缓存`)

      // 转换为 Protocol 类型并限制数量
      const protocols = validCachedProtocols
        .slice(0, limit)
        .map(p => convertCacheToProtocol(p))

      console.log(`📦 返回 ${protocols.length} 条缓存数据`)
      console.log('='.repeat(60))

      return NextResponse.json(
        {
          protocols,
          cached: true
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        }
      )
    }

    // 步骤 2: 缓存为空，从 DeFiLlama API 获取
    console.log('⚠️ 缓存为空或已过期，从 API 获取数据...')
    const startTime = Date.now()

    let protocols = await defillama.getProtocols()
    const duration = Date.now() - startTime

    console.log(`✅ 成功获取 ${protocols.length} 个协议 (${duration}ms)`)

    // 步骤 3: 应用过滤条件
    if (search) {
      const lowerSearch = search.toLowerCase()
      protocols = protocols.filter(p =>
        p.name.toLowerCase().includes(lowerSearch) ||
        p.slug.toLowerCase().includes(lowerSearch) ||
        p.symbol.toLowerCase().includes(lowerSearch)
      )
      console.log(`📝 搜索过滤后剩余 ${protocols.length} 个协议`)
    }

    if (category) {
      protocols = protocols.filter(p =>
        p.category.toLowerCase() === category.toLowerCase()
      )
      console.log(`📂 分类过滤后剩余 ${protocols.length} 个协议`)
    }

    if (chain) {
      protocols = protocols.filter(p =>
        p.chains.some(c => c.toLowerCase() === chain.toLowerCase())
      )
      console.log(`⛓️ 链过滤后剩余 ${protocols.length} 个协议`)
    }

    // 步骤 4: 缓存到数据库（异步执行，不阻塞响应）
    // 只缓存全量数据（无过滤条件时）
    if (!search && !category && !chain) {
      console.log('\n[步骤 4] 缓存数据到数据库（后台执行）...')
      cacheProtocolsToDatabase(protocols).catch(err => {
        console.error('❌ 缓存写入失败:', err)
      })
    } else {
      console.log('\n[跳过缓存] 有过滤条件，不写入缓存')
    }

    // 步骤 5: 返回结果（限制数量）
    const limitedProtocols = protocols.slice(0, limit)
    console.log(`📦 返回 ${limitedProtocols.length} 条 API 数据`)
    console.log('='.repeat(60))

    return NextResponse.json(
      {
        protocols: limitedProtocols,
        cached: false
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
 * 将数据库缓存转换为 Protocol 类型
 */
function convertCacheToProtocol(cache: any): Protocol {
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
