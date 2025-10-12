import { NextRequest, NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'
import { TokenIdentifier } from '@/lib/defillama/types'

// 配置路由段缓存
export const dynamic = 'force-dynamic'
export const revalidate = 300 // 5 分钟重新验证缓存

/**
 * POST - 批量获取代币价格
 *
 * Body 格式：
 * {
 *   tokens: [
 *     { chain: 'ethereum', address: '0x...' },
 *     { chain: 'bsc', address: '0x...' }
 *   ]
 * }
 *
 * 响应格式：
 * {
 *   prices: {
 *     'ethereum:0x...': { price, symbol, decimals, timestamp, confidence },
 *     'bsc:0x...': { price, symbol, decimals, timestamp, confidence }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('='.repeat(60))
    console.log('[DeFi Prices API] 收到请求')

    // 步骤 1: 获取并解析请求体
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('❌ 无法解析 JSON:', error)
      return NextResponse.json(
        { error: '无效的 JSON 格式' },
        { status: 400 }
      )
    }

    const { tokens } = body

    // 步骤 2: 验证 tokens 参数
    if (!tokens) {
      console.error('❌ 缺少 tokens 参数')
      return NextResponse.json(
        { error: '缺少 tokens 参数' },
        { status: 400 }
      )
    }

    if (!Array.isArray(tokens)) {
      console.error('❌ tokens 必须是数组')
      return NextResponse.json(
        { error: 'tokens 必须是数组' },
        { status: 400 }
      )
    }

    if (tokens.length === 0) {
      console.error('❌ tokens 数组不能为空')
      return NextResponse.json(
        { error: 'tokens 数组不能为空' },
        { status: 400 }
      )
    }

    if (tokens.length > 50) {
      console.error('❌ 超过最大数量限制:', tokens.length)
      return NextResponse.json(
        { error: `一次最多查询 50 个代币，当前请求 ${tokens.length} 个` },
        { status: 400 }
      )
    }

    // 步骤 3: 验证每个 token 的格式
    const validationErrors: string[] = []
    const validTokens: TokenIdentifier[] = []

    tokens.forEach((token, index) => {
      if (typeof token !== 'object' || token === null) {
        validationErrors.push(`tokens[${index}]: 必须是对象`)
        return
      }

      const { chain, address } = token

      if (!chain || typeof chain !== 'string' || chain.trim() === '') {
        validationErrors.push(`tokens[${index}]: chain 必须是非空字符串`)
        return
      }

      if (!address || typeof address !== 'string' || address.trim() === '') {
        validationErrors.push(`tokens[${index}]: address 必须是非空字符串`)
        return
      }

      // 简单验证地址格式（以 0x 开头的十六进制字符串）
      if (!/^0x[a-fA-F0-9]+$/.test(address.trim())) {
        validationErrors.push(`tokens[${index}]: address 格式无效（应为 0x 开头的十六进制字符串）`)
        return
      }

      validTokens.push({
        chain: chain.trim().toLowerCase(),
        address: address.trim().toLowerCase()
      })
    })

    if (validationErrors.length > 0) {
      console.error('❌ 验证错误:', validationErrors)
      return NextResponse.json(
        {
          error: '代币参数验证失败',
          details: validationErrors
        },
        { status: 400 }
      )
    }

    console.log(`✅ 验证通过，查询 ${validTokens.length} 个代币`)
    console.log('代币列表:')
    validTokens.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.chain}:${t.address.substring(0, 10)}...`)
    })

    // 步骤 4: 调用 DeFiLlama API 获取价格
    console.log('\n[获取价格] 从 DeFiLlama API 获取...')
    const startTime = Date.now()

    let prices
    try {
      prices = await defillama.getTokenPrices(validTokens)
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ 获取价格失败 (${duration}ms):`, error)

      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : '获取代币价格失败'
        },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    const priceCount = Object.keys(prices).length

    console.log(`✅ 成功获取 ${priceCount} 个代币价格 (${duration}ms)`)

    // 步骤 5: 打印价格信息（用于调试）
    if (priceCount > 0) {
      console.log('\n价格信息:')
      Object.entries(prices).slice(0, 5).forEach(([coin, data]) => {
        console.log(`  ${coin}: $${data.price} (${data.symbol})`)
      })
      if (priceCount > 5) {
        console.log(`  ... 以及其他 ${priceCount - 5} 个代币`)
      }
    }

    // 步骤 6: 检查是否有缺失的代币价格
    const requestedCoins = validTokens.map(t => `${t.chain}:${t.address}`)
    const returnedCoins = Object.keys(prices)
    const missingCoins = requestedCoins.filter(coin => !returnedCoins.includes(coin))

    if (missingCoins.length > 0) {
      console.warn(`⚠️ 有 ${missingCoins.length} 个代币未返回价格:`)
      missingCoins.slice(0, 3).forEach(coin => {
        console.warn(`  - ${coin}`)
      })
      if (missingCoins.length > 3) {
        console.warn(`  ... 以及其他 ${missingCoins.length - 3} 个`)
      }
    }

    console.log('='.repeat(60))

    return NextResponse.json(
      {
        prices,
        count: priceCount,
        requested: validTokens.length,
        missing: missingCoins.length > 0 ? missingCoins : undefined
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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
