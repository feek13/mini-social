#!/usr/bin/env tsx

/**
 * DeFiLlama 客户端测试脚本
 *
 * 运行方式:
 *   npx tsx scripts/test-defillama.ts
 *
 * 或者添加到 package.json scripts:
 *   "test:defillama": "tsx scripts/test-defillama.ts"
 */

import { defillama } from '../lib/defillama/client'

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
}

const results: TestResult[] = []

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now()

  try {
    log(`\n[测试] ${name}`, 'cyan')
    await testFn()
    const duration = Date.now() - startTime

    log(`✅ 通过 (${duration}ms)`, 'green')
    results.push({ name, passed: true, duration })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : '未知错误'

    log(`❌ 失败: ${errorMessage}`, 'red')
    results.push({ name, passed: false, duration, error: errorMessage })
  }
}

async function main() {
  log('='.repeat(60), 'blue')
  log('DeFiLlama 客户端测试', 'blue')
  log('='.repeat(60), 'blue')

  // 测试 1: 获取协议列表
  await runTest('获取协议列表 (前 10 个)', async () => {
    const protocols = await defillama.getProtocols()

    if (!protocols || protocols.length === 0) {
      throw new Error('未获取到协议数据')
    }

    log(`  共获取到 ${protocols.length} 个协议`, 'yellow')

    const top10 = protocols.slice(0, 10)
    log('  前 10 个协议:', 'yellow')
    top10.forEach((p, i) => {
      console.log(`    ${i + 1}. ${p.name} (${p.slug})`)
      console.log(`       TVL: $${p.tvl.toLocaleString()}`)
      console.log(`       分类: ${p.category}`)
      console.log(`       链: ${p.chains.join(', ')}`)
    })
  })

  // 测试 2: 获取 Aave 详情
  await runTest('获取 Aave 协议详情', async () => {
    const aave = await defillama.getProtocol('aave')

    if (!aave || !aave.name) {
      throw new Error('未获取到 Aave 详情')
    }

    // ProtocolDetail 的 tvl 是数组，取最后一个值作为当前 TVL
    const currentTvl = Array.isArray(aave.tvl) ? aave.tvl[aave.tvl.length - 1] : aave.tvl

    log(`  名称: ${aave.name}`, 'yellow')
    log(`  描述: ${aave.description}`, 'yellow')
    log(`  分类: ${aave.category}`, 'yellow')
    log(`  当前 TVL: $${currentTvl?.toLocaleString() || 'N/A'}`, 'yellow')
    log(`  URL: ${aave.url}`, 'yellow')
    log(`  支持的链: ${aave.chains.join(', ')}`, 'yellow')

    if (aave.currentChainTvls) {
      log('  各链 TVL:', 'yellow')
      Object.entries(aave.currentChainTvls)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([chain, tvl]) => {
          console.log(`    ${chain}: $${tvl.toLocaleString()}`)
        })
    }
  })

  // 测试 3: 获取 WETH 价格
  await runTest('获取 WETH 代币价格', async () => {
    const wethPrice = await defillama.getTokenPrice(
      'ethereum',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    )

    if (!wethPrice || !wethPrice.price) {
      throw new Error('未获取到 WETH 价格')
    }

    log(`  代币符号: ${wethPrice.symbol}`, 'yellow')
    log(`  价格: $${wethPrice.price}`, 'yellow')
    log(`  精度: ${wethPrice.decimals}`, 'yellow')
    log(`  置信度: ${wethPrice.confidence}`, 'yellow')
    log(`  时间戳: ${new Date(wethPrice.timestamp * 1000).toLocaleString()}`, 'yellow')
  })

  // 测试 4: 批量获取代币价格
  await runTest('批量获取代币价格 (DAI, USDC, USDT)', async () => {
    const prices = await defillama.getTokenPrices([
      { chain: 'ethereum', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' }, // DAI
      { chain: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }, // USDC
      { chain: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' }, // USDT
    ])

    if (!prices || Object.keys(prices).length === 0) {
      throw new Error('未获取到代币价格')
    }

    log(`  获取到 ${Object.keys(prices).length} 个代币价格:`, 'yellow')
    Object.entries(prices).forEach(([coin, price]) => {
      console.log(`    ${price.symbol}: $${price.price}`)
    })
  })

  // 测试 5: 搜索协议
  await runTest('搜索 Uniswap 协议', async () => {
    const searchResults = await defillama.searchProtocols('uniswap')

    if (!searchResults || searchResults.length === 0) {
      throw new Error('未找到匹配的协议')
    }

    log(`  找到 ${searchResults.length} 个匹配结果:`, 'yellow')
    searchResults.slice(0, 5).forEach((p, i) => {
      console.log(`    ${i + 1}. ${p.name} (${p.slug})`)
      console.log(`       TVL: $${p.tvl.toLocaleString()}`)
      console.log(`       分类: ${p.category}`)
    })
  })

  // 测试 6: 获取链数据
  await runTest('获取链 TVL 数据', async () => {
    const chains = await defillama.getChains()

    if (!chains || chains.length === 0) {
      throw new Error('未获取到链数据')
    }

    log(`  共获取到 ${chains.length} 条链数据`, 'yellow')

    const top5 = chains
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 5)

    log('  TVL 前 5 的链:', 'yellow')
    top5.forEach((c, i) => {
      console.log(`    ${i + 1}. ${c.name}`)
      console.log(`       TVL: $${c.tvl.toLocaleString()}`)
      console.log(`       代币: ${c.tokenSymbol || 'N/A'}`)
    })
  })

  // 测试 7: 获取高收益率池子
  await runTest('获取高收益率池子 (TVL > $1M)', async () => {
    const topYields = await defillama.getTopYields(5, 1000000)

    if (!topYields || topYields.length === 0) {
      throw new Error('未获取到收益率数据')
    }

    log(`  获取到 ${topYields.length} 个高收益池子:`, 'yellow')
    topYields.forEach((pool, i) => {
      console.log(`    ${i + 1}. ${pool.project} - ${pool.symbol}`)
      console.log(`       链: ${pool.chain}`)
      console.log(`       APY: ${pool.apy.toFixed(2)}%`)
      console.log(`       TVL: $${pool.tvlUsd.toLocaleString()}`)
      console.log(`       稳定币: ${pool.stablecoin ? '是' : '否'}`)
      console.log(`       IL 风险: ${pool.ilRisk}`)
    })
  })

  // 测试 8: 按分类获取协议
  await runTest('按分类获取 DEX 协议', async () => {
    // DeFiLlama API 使用 "Dexs" 而不是 "Dexes"
    const dexes = await defillama.getProtocolsByCategory('Dexs')

    if (!dexes || dexes.length === 0) {
      throw new Error('未获取到 DEX 协议')
    }

    log(`  找到 ${dexes.length} 个 DEX 协议`, 'yellow')

    const top5Dexes = dexes
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 5)

    log('  TVL 前 5 的 DEX:', 'yellow')
    top5Dexes.forEach((d, i) => {
      console.log(`    ${i + 1}. ${d.name}`)
      console.log(`       TVL: $${d.tvl.toLocaleString()}`)
    })
  })

  // 测试 9: 获取 TVL 排名
  await runTest('获取 TVL 前 5 的协议', async () => {
    const top5 = await defillama.getTopProtocols(5)

    if (!top5 || top5.length === 0) {
      throw new Error('未获取到协议排名')
    }

    log('  TVL 排名前 5:', 'yellow')
    top5.forEach((p, i) => {
      console.log(`    ${i + 1}. ${p.name}`)
      console.log(`       TVL: $${p.tvl.toLocaleString()}`)
      console.log(`       24h 变化: ${p.change_1d?.toFixed(2) || 'N/A'}%`)
    })
  })

  // 打印测试总结
  log('\n' + '='.repeat(60), 'blue')
  log('测试总结', 'blue')
  log('='.repeat(60), 'blue')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  log(`总测试数: ${results.length}`, 'cyan')
  log(`通过: ${passed} ✅`, passed === results.length ? 'green' : 'yellow')
  log(`失败: ${failed} ❌`, failed > 0 ? 'red' : 'green')
  log(`总耗时: ${totalDuration}ms`, 'cyan')

  if (failed > 0) {
    log('\n失败的测试:', 'red')
    results
      .filter(r => !r.passed)
      .forEach(r => {
        log(`  - ${r.name}: ${r.error}`, 'red')
      })
  }

  log('='.repeat(60), 'blue')

  // 退出码
  process.exit(failed > 0 ? 1 : 0)
}

// 运行测试
main().catch(error => {
  log(`\n致命错误: ${error}`, 'red')
  process.exit(1)
})
