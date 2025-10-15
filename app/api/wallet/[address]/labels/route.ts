import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'
import { web3, isValidEthereumAddress, formatAddress } from '@/lib/web3'
import { generateWalletLabels } from '@/lib/wallet-labels'
import { RedisCache, generateRedisKey, CACHE_TTL } from '@/lib/redis'

/**
 * 生成或获取钱包标签
 * GET /api/wallet/[address]/labels
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params

    // 验证地址
    if (!isValidEthereumAddress(address)) {
      return NextResponse.json(
        { error: '无效的钱包地址格式' },
        { status: 400 }
      )
    }

    const formattedAddress = formatAddress(address)
    const chain = (request.nextUrl.searchParams.get('chain') || 'ethereum') as any

    // 1. 尝试从 Redis 缓存获取（最快）
    const redisCacheKey = generateRedisKey('wallet:labels', {
      address: formattedAddress,
      chain,
    })

    const cachedData = await RedisCache.get<any>(redisCacheKey)
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: { ...cachedData, cache_source: 'redis' },
      })
    }

    // 2. 检查 Supabase 是否已有标签（24小时内）
    const supabase = getSupabaseClient()
    const { data: existingLabels, error: fetchError } = await supabase
      .from('wallet_labels')
      .select('*')
      .eq('wallet_address', formattedAddress)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('[Wallet Labels API] 查询标签失败:', fetchError)
      return NextResponse.json(
        { error: '查询标签失败' },
        { status: 500 }
      )
    }

    // 如果有最近的标签，存入 Redis 并返回
    if (existingLabels && existingLabels.length > 0) {
      const responseData = {
        labels: existingLabels,
        cached: true,
        cache_source: 'supabase',
      }

      // 存入 Redis 缓存
      RedisCache.set(redisCacheKey, responseData, CACHE_TTL.WALLET_LABELS).catch((err) => {
        console.error('[Labels API] Redis cache failed:', err)
      })

      return NextResponse.json({
        success: true,
        data: responseData,
      })
    }

    // 3. 生成新标签 - 获取钱包数据（使用新的 Web3 架构：Alchemy + Ankr + CoinGecko）

    // 获取钱包概览数据
    const snapshot = await web3.wallet.getSnapshot(address, [chain])

    // 获取交易历史（带错误处理）
    let transactions: any[] = []
    try {
      const transactionsResponse = await web3.wallet.getTransactions(chain, address, { limit: 50 })
      // 新架构返回 { transactions: Transaction[], total: number }
      transactions = Array.isArray(transactionsResponse?.transactions)
        ? transactionsResponse.transactions
        : []
    } catch (error) {
      console.error('[Wallet Labels API] 获取交易历史失败:', error)
      // 继续处理，使用空数组
    }

    // 分析钱包数据
    const analysis = {
      totalValue: snapshot.total_value_usd || 0,
      tokensCount: snapshot.chains.reduce((sum, c) => sum + c.tokens.length, 0),
      nftsCount: snapshot.chains.reduce((sum, c) => sum + c.nfts_count, 0),
      activeChains: snapshot.chains.length,
      transactions,
      tokens: snapshot.chains.flatMap((c) => c.tokens),
    }

    // 生成标签
    const labels = generateWalletLabels(formattedAddress, analysis, chain)

    // 保存到数据库
    if (labels.length > 0) {
      const { error: insertError } = await supabase
        .from('wallet_labels')
        .insert(labels)

      if (insertError) {
        console.error('[Wallet Labels API] 保存标签失败:', insertError)
        // 不抛出错误，继续返回生成的标签
      }
    }

    // 重新查询保存后的标签（包含 ID 和时间戳）
    const { data: savedLabels } = await supabase
      .from('wallet_labels')
      .select('*')
      .eq('wallet_address', formattedAddress)
      .order('created_at', { ascending: false })
      .limit(20)

    const responseData = {
      labels: savedLabels || labels,
      cached: false,
      cache_source: 'fresh',
    }

    // 存入 Redis 缓存（异步，不阻塞响应）
    RedisCache.set(redisCacheKey, responseData, CACHE_TTL.WALLET_LABELS).catch((err) => {
      console.error('[Labels API] Redis cache failed:', err)
    })

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error('[Wallet Labels API] 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成标签失败',
      },
      { status: 500 }
    )
  }
}
