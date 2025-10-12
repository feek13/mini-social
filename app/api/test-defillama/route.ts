import { NextResponse } from 'next/server'
import { defillama } from '@/lib/defillama'

/**
 * DeFiLlama 客户端测试 API
 *
 * 访问: http://localhost:3000/api/test-defillama
 *
 * 此 API 用于验证 DeFiLlama 客户端的各项功能
 */
export async function GET() {
  const results: {
    success: boolean
    tests: Array<{
      name: string
      status: 'success' | 'error'
      data?: unknown
      error?: string
      duration?: number
    }>
    summary: {
      total: number
      passed: number
      failed: number
      totalDuration: number
    }
  } = {
    success: true,
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      totalDuration: 0
    }
  }

  console.log('='.repeat(60))
  console.log('开始测试 DeFiLlama 客户端')
  console.log('='.repeat(60))

  // 测试 1: 获取协议列表
  try {
    console.log('\n[测试 1] 获取前 10 个协议...')
    const startTime = Date.now()

    const protocols = await defillama.getProtocols()
    const top10 = protocols.slice(0, 10).map(p => ({
      name: p.name,
      slug: p.slug,
      tvl: p.tvl,
      category: p.category,
      chains: p.chains
    }))

    const duration = Date.now() - startTime

    console.log(`✅ 成功获取 ${protocols.length} 个协议 (${duration}ms)`)
    console.log('前 10 个协议:')
    top10.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} - TVL: $${p.tvl.toLocaleString()}`)
    })

    results.tests.push({
      name: '获取协议列表',
      status: 'success',
      data: {
        total: protocols.length,
        top10
      },
      duration
    })
    results.summary.passed++
  } catch (error) {
    console.error('❌ 测试失败:', error)
    results.tests.push({
      name: '获取协议列表',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    })
    results.summary.failed++
    results.success = false
  }

  // 测试 2: 获取 Aave 详情
  try {
    console.log('\n[测试 2] 获取 Aave 协议详情...')
    const startTime = Date.now()

    const aave = await defillama.getProtocol('aave')
    const duration = Date.now() - startTime

    console.log(`✅ 成功获取 Aave 详情 (${duration}ms)`)
    console.log(`  名称: ${aave.name}`)
    console.log(`  描述: ${aave.description}`)
    console.log(`  分类: ${aave.category}`)
    console.log(`  TVL: $${aave.tvl.toLocaleString()}`)
    console.log(`  支持的链: ${aave.chains.join(', ')}`)

    results.tests.push({
      name: '获取 Aave 详情',
      status: 'success',
      data: {
        id: aave.id,
        name: aave.name,
        category: aave.category,
        tvl: aave.tvl,
        chains: aave.chains,
        url: aave.url,
        description: aave.description.substring(0, 100) + '...'
      },
      duration
    })
    results.summary.passed++
  } catch (error) {
    console.error('❌ 测试失败:', error)
    results.tests.push({
      name: '获取 Aave 详情',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    })
    results.summary.failed++
    results.success = false
  }

  // 测试 3: 获取 WETH 价格
  try {
    console.log('\n[测试 3] 获取 WETH 代币价格...')
    const startTime = Date.now()

    const wethPrice = await defillama.getTokenPrice(
      'ethereum',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    )
    const duration = Date.now() - startTime

    console.log(`✅ 成功获取 WETH 价格 (${duration}ms)`)
    console.log(`  代币: ${wethPrice.symbol}`)
    console.log(`  价格: $${wethPrice.price}`)
    console.log(`  精度: ${wethPrice.decimals}`)
    console.log(`  置信度: ${wethPrice.confidence}`)

    results.tests.push({
      name: '获取 WETH 价格',
      status: 'success',
      data: {
        symbol: wethPrice.symbol,
        price: wethPrice.price,
        decimals: wethPrice.decimals,
        confidence: wethPrice.confidence
      },
      duration
    })
    results.summary.passed++
  } catch (error) {
    console.error('❌ 测试失败:', error)
    results.tests.push({
      name: '获取 WETH 价格',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    })
    results.summary.failed++
    results.success = false
  }

  // 测试 4: 搜索 Uniswap
  try {
    console.log('\n[测试 4] 搜索 Uniswap 协议...')
    const startTime = Date.now()

    const searchResults = await defillama.searchProtocols('uniswap')
    const duration = Date.now() - startTime

    console.log(`✅ 找到 ${searchResults.length} 个匹配结果 (${duration}ms)`)
    searchResults.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.slug}) - TVL: $${p.tvl.toLocaleString()}`)
    })

    results.tests.push({
      name: '搜索 Uniswap',
      status: 'success',
      data: {
        count: searchResults.length,
        results: searchResults.slice(0, 5).map(p => ({
          name: p.name,
          slug: p.slug,
          tvl: p.tvl,
          category: p.category
        }))
      },
      duration
    })
    results.summary.passed++
  } catch (error) {
    console.error('❌ 测试失败:', error)
    results.tests.push({
      name: '搜索 Uniswap',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    })
    results.summary.failed++
    results.success = false
  }

  // 测试 5: 获取链数据
  try {
    console.log('\n[测试 5] 获取链 TVL 数据...')
    const startTime = Date.now()

    const chains = await defillama.getChains()
    const top5Chains = chains
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        tvl: c.tvl,
        tokenSymbol: c.tokenSymbol
      }))

    const duration = Date.now() - startTime

    console.log(`✅ 成功获取 ${chains.length} 条链数据 (${duration}ms)`)
    console.log('TVL 前 5 的链:')
    top5Chains.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} - TVL: $${c.tvl.toLocaleString()}`)
    })

    results.tests.push({
      name: '获取链数据',
      status: 'success',
      data: {
        total: chains.length,
        top5: top5Chains
      },
      duration
    })
    results.summary.passed++
  } catch (error) {
    console.error('❌ 测试失败:', error)
    results.tests.push({
      name: '获取链数据',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    })
    results.summary.failed++
    results.success = false
  }

  // 测试 6: 获取高收益率池子
  try {
    console.log('\n[测试 6] 获取高收益率池子...')
    const startTime = Date.now()

    const topYields = await defillama.getTopYields(5, 1000000)
    const duration = Date.now() - startTime

    console.log(`✅ 成功获取高收益率池子 (${duration}ms)`)
    console.log('前 5 个高收益池子:')
    topYields.forEach((pool, i) => {
      console.log(`  ${i + 1}. ${pool.project} - ${pool.symbol}`)
      console.log(`     APY: ${pool.apy.toFixed(2)}%, TVL: $${pool.tvlUsd.toLocaleString()}`)
    })

    results.tests.push({
      name: '获取高收益率池子',
      status: 'success',
      data: {
        pools: topYields.map(p => ({
          project: p.project,
          symbol: p.symbol,
          chain: p.chain,
          apy: p.apy,
          tvlUsd: p.tvlUsd,
          stablecoin: p.stablecoin
        }))
      },
      duration
    })
    results.summary.passed++
  } catch (error) {
    console.error('❌ 测试失败:', error)
    results.tests.push({
      name: '获取高收益率池子',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    })
    results.summary.failed++
    results.success = false
  }

  // 计算总耗时
  results.summary.total = results.tests.length
  results.summary.totalDuration = results.tests.reduce(
    (sum, test) => sum + (test.duration || 0),
    0
  )

  // 打印测试总结
  console.log('\n' + '='.repeat(60))
  console.log('测试总结')
  console.log('='.repeat(60))
  console.log(`总测试数: ${results.summary.total}`)
  console.log(`通过: ${results.summary.passed} ✅`)
  console.log(`失败: ${results.summary.failed} ❌`)
  console.log(`总耗时: ${results.summary.totalDuration}ms`)
  console.log('='.repeat(60))

  return NextResponse.json(results, {
    status: results.success ? 200 : 500,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}
