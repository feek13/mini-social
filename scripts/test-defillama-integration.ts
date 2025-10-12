#!/usr/bin/env ts-node
/**
 * DeFiLlama Integration Test Suite
 *
 * 全面测试 DeFiLlama API 集成的所有功能
 *
 * 使用方法:
 *   npx ts-node scripts/test-defillama-integration.ts
 */

const BASE_URL = 'http://localhost:3000'

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

// 测试结果统计
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
}

// 测试结果详情
const failedTests: Array<{ name: string; error: string }> = []

/**
 * 打印带颜色的消息
 */
function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

/**
 * 打印测试标题
 */
function printHeader(title: string) {
  const line = '='.repeat(60)
  log(`\n${line}`, 'cyan')
  log(`  ${title}`, 'bright')
  log(`${line}`, 'cyan')
}

/**
 * 打印子标题
 */
function printSubHeader(title: string) {
  log(`\n--- ${title} ---`, 'blue')
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 测试断言
 */
class TestAssert {
  constructor(private testName: string) {}

  assertTrue(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(`断言失败: ${message}`)
    }
  }

  assertFalse(condition: boolean, message: string) {
    this.assertTrue(!condition, message)
  }

  assertEqual(actual: any, expected: any, message: string) {
    if (actual !== expected) {
      throw new Error(`${message}\n  期望: ${expected}\n  实际: ${actual}`)
    }
  }

  assertNotNull(value: any, message: string) {
    if (value === null || value === undefined) {
      throw new Error(`${message} (值为 ${value})`)
    }
  }

  assertArrayLength(arr: any[], expectedLength: number, message: string) {
    if (!Array.isArray(arr)) {
      throw new Error(`${message} (不是数组)`)
    }
    if (arr.length !== expectedLength) {
      throw new Error(
        `${message}\n  期望长度: ${expectedLength}\n  实际长度: ${arr.length}`
      )
    }
  }

  assertArrayMinLength(arr: any[], minLength: number, message: string) {
    if (!Array.isArray(arr)) {
      throw new Error(`${message} (不是数组)`)
    }
    if (arr.length < minLength) {
      throw new Error(
        `${message}\n  最小长度: ${minLength}\n  实际长度: ${arr.length}`
      )
    }
  }

  assertArrayMaxLength(arr: any[], maxLength: number, message: string) {
    if (!Array.isArray(arr)) {
      throw new Error(`${message} (不是数组)`)
    }
    if (arr.length > maxLength) {
      throw new Error(
        `${message}\n  最大长度: ${maxLength}\n  实际长度: ${arr.length}`
      )
    }
  }

  assertObjectHasKey(obj: any, key: string, message: string) {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error(`${message} (不是对象)`)
    }
    if (!(key in obj)) {
      throw new Error(`${message} (缺少键: ${key})`)
    }
  }

  assertGreaterThan(actual: number, expected: number, message: string) {
    if (actual <= expected) {
      throw new Error(
        `${message}\n  应大于: ${expected}\n  实际: ${actual}`
      )
    }
  }

  assertLessThan(actual: number, expected: number, message: string) {
    if (actual >= expected) {
      throw new Error(
        `${message}\n  应小于: ${expected}\n  实际: ${actual}`
      )
    }
  }

  assertInRange(value: number, min: number, max: number, message: string) {
    if (value < min || value > max) {
      throw new Error(
        `${message}\n  范围: [${min}, ${max}]\n  实际: ${value}`
      )
    }
  }

  assertMatchRegex(value: string, regex: RegExp, message: string) {
    if (!regex.test(value)) {
      throw new Error(`${message}\n  正则: ${regex}\n  值: ${value}`)
    }
  }

  assertResponseOk(response: Response, message: string) {
    if (!response.ok) {
      throw new Error(
        `${message}\n  状态码: ${response.status} ${response.statusText}`
      )
    }
  }
}

/**
 * 运行单个测试
 */
async function runTest(
  name: string,
  testFn: (assert: TestAssert) => Promise<void>
): Promise<boolean> {
  stats.total++
  const assert = new TestAssert(name)

  try {
    await testFn(assert)
    log(`  ✅ ${name}`, 'green')
    stats.passed++
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log(`  ❌ ${name}`, 'red')
    log(`     ${errorMessage}`, 'red')
    stats.failed++
    failedTests.push({ name, error: errorMessage })
    return false
  }
}

/**
 * 阶段 1: 测试协议列表 API
 */
async function testProtocolsAPI() {
  printHeader('阶段 3.1: 测试协议列表 API (/api/defi/protocols)')

  // 测试 1: 基本请求
  await runTest('1.1 基本请求 - 无参数', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/protocols`)
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertObjectHasKey(data, 'protocols', '响应缺少 protocols 字段')
    assert.assertArrayMinLength(data.protocols, 1, '协议列表为空')

    // 检查第一个协议的数据结构
    const protocol = data.protocols[0]
    assert.assertObjectHasKey(protocol, 'name', '协议缺少 name 字段')
    assert.assertObjectHasKey(protocol, 'slug', '协议缺少 slug 字段')
    assert.assertObjectHasKey(protocol, 'tvl', '协议缺少 tvl 字段')
    assert.assertObjectHasKey(protocol, 'category', '协议缺少 category 字段')

    log(`     返回 ${data.protocols.length} 个协议`, 'cyan')
    log(`     第一个协议: ${protocol.name} (TVL: $${protocol.tvl?.toLocaleString() || 'N/A'})`, 'cyan')
  })

  // 测试 2: 限制数量
  await runTest('1.2 限制数量 - limit=10', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/protocols?limit=10`)
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertArrayMaxLength(data.protocols, 10, '返回数量超过限制')

    log(`     返回 ${data.protocols.length} 个协议`, 'cyan')
  })

  // 测试 3: 搜索功能
  await runTest('1.3 搜索功能 - search=aave', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/protocols?search=aave`)
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertArrayMinLength(data.protocols, 1, '搜索结果为空')

    // 验证所有结果都包含 "aave"（不区分大小写）
    const allMatch = data.protocols.every((p: any) =>
      (p.name?.toLowerCase() || '').includes('aave') ||
      (p.slug?.toLowerCase() || '').includes('aave')
    )
    assert.assertTrue(allMatch, '搜索结果包含不匹配的协议')

    log(`     找到 ${data.protocols.length} 个匹配的协议`, 'cyan')
    log(`     协议: ${data.protocols.map((p: any) => p.name).join(', ')}`, 'cyan')
  })

  // 测试 4: 分类过滤
  await runTest('1.4 分类过滤 - category=Dexes', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/protocols?category=Dexes&limit=5`)
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertArrayMinLength(data.protocols, 1, '过滤结果为空')

    // 验证所有结果都是 DEX
    const allMatch = data.protocols.every((p: any) => p.category === 'Dexes')
    assert.assertTrue(allMatch, '过滤结果包含非 DEX 协议')

    log(`     找到 ${data.protocols.length} 个 DEX 协议`, 'cyan')
  })

  // 测试 5: 链过滤
  await runTest('1.5 链过滤 - chain=Ethereum', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/protocols?chain=Ethereum&limit=5`)
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertArrayMinLength(data.protocols, 1, '过滤结果为空')

    // 验证所有结果都包含以太坊
    const allMatch = data.protocols.every((p: any) =>
      p.chains?.includes('Ethereum')
    )
    assert.assertTrue(allMatch, '过滤结果包含非以太坊协议')

    log(`     找到 ${data.protocols.length} 个以太坊协议`, 'cyan')
  })

  // 测试 6: 缓存验证
  await runTest('1.6 缓存验证 - 两次请求', async (assert) => {
    // 第一次请求
    const response1 = await fetch(`${BASE_URL}/api/defi/protocols?limit=5`)
    assert.assertResponseOk(response1, '第一次请求失败')
    const data1 = await response1.json()
    const isCached1 = data1.cached || false

    // 等待一小段时间
    await sleep(100)

    // 第二次请求
    const response2 = await fetch(`${BASE_URL}/api/defi/protocols?limit=5`)
    assert.assertResponseOk(response2, '第二次请求失败')
    const data2 = await response2.json()

    // 验证数据一致性
    assert.assertEqual(
      data1.protocols.length,
      data2.protocols.length,
      '两次请求返回的数据量不一致'
    )

    log(`     第一次请求: cached=${isCached1}`, 'cyan')
    log(`     第二次请求: cached=${data2.cached || false}`, 'cyan')
  })
}

/**
 * 阶段 2: 测试协议详情 API
 */
async function testProtocolDetailAPI() {
  printHeader('阶段 3.2: 测试协议详情 API (/api/defi/protocols/[slug])')

  // 测试 1: 有效协议
  await runTest('2.1 获取 Aave 详情', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/protocols/aave`)
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertObjectHasKey(data, 'name', '响应缺少 name 字段')
    assert.assertObjectHasKey(data, 'tvl', '响应缺少 tvl 字段')
    assert.assertObjectHasKey(data, 'chainTvls', '响应缺少 chainTvls 字段')

    log(`     协议: ${data.name}`, 'cyan')
    log(`     TVL: $${data.tvl?.toLocaleString() || 'N/A'}`, 'cyan')
    log(`     链数量: ${Object.keys(data.chainTvls || {}).length}`, 'cyan')
  })

  // 测试 2: 无效协议
  await runTest('2.2 无效协议 - 404 错误', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/protocols/invalid-protocol-xyz-123`)
    assert.assertEqual(response.status, 404, '应返回 404 状态码')

    const data = await response.json()
    assert.assertObjectHasKey(data, 'error', '错误响应缺少 error 字段')

    log(`     错误消息: ${data.error}`, 'cyan')
  })

  // 测试 3: Uniswap 详情
  await runTest('2.3 获取 Uniswap 详情', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/protocols/uniswap`)
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertObjectHasKey(data, 'name', '响应缺少 name 字段')
    assert.assertObjectHasKey(data, 'category', '响应缺少 category 字段')
    assert.assertEqual(data.category, 'Dexes', '分类应为 Dexes')

    log(`     协议: ${data.name}`, 'cyan')
    log(`     分类: ${data.category}`, 'cyan')
  })
}

/**
 * 阶段 3: 测试收益率 API
 */
async function testYieldsAPI() {
  printHeader('阶段 3.3: 测试收益率 API (/api/defi/yields)')

  // 测试 1: 基本请求
  await runTest('3.1 基本请求 - 无参数', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/yields?limit=10`)
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertObjectHasKey(data, 'pools', '响应缺少 pools 字段')
    assert.assertArrayMinLength(data.pools, 1, '池子列表为空')

    // 检查第一个池子的数据结构
    const pool = data.pools[0]
    assert.assertObjectHasKey(pool, 'chain', '池子缺少 chain 字段')
    assert.assertObjectHasKey(pool, 'project', '池子缺少 project 字段')
    assert.assertObjectHasKey(pool, 'apy', '池子缺少 apy 字段')
    assert.assertObjectHasKey(pool, 'tvlUsd', '池子缺少 tvlUsd 字段')

    log(`     返回 ${data.pools.length} 个池子`, 'cyan')
    log(`     第一个池子: ${pool.project} (APY: ${pool.apy?.toFixed(2)}%)`, 'cyan')
  })

  // 测试 2: 链过滤
  await runTest('3.2 链过滤 - chain=Ethereum', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/yields?chain=Ethereum&limit=10`)
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertArrayMinLength(data.pools, 1, '过滤结果为空')

    // 验证所有结果都是以太坊
    const allMatch = data.pools.every((p: any) => p.chain === 'Ethereum')
    assert.assertTrue(allMatch, '过滤结果包含非以太坊池子')

    log(`     找到 ${data.pools.length} 个以太坊池子`, 'cyan')
  })

  // 测试 3: 协议过滤
  await runTest('3.3 协议过滤 - protocol=aave', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/yields?protocol=aave&limit=10`)
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertArrayMinLength(data.pools, 1, '过滤结果为空')

    // 验证所有结果都是 Aave
    const allMatch = data.pools.every((p: any) =>
      p.project?.toLowerCase().includes('aave')
    )
    assert.assertTrue(allMatch, '过滤结果包含非 Aave 池子')

    log(`     找到 ${data.pools.length} 个 Aave 池子`, 'cyan')
  })

  // 测试 4: 最低 APY 过滤
  await runTest('3.4 最低 APY 过滤 - minApy=10', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/yields?minApy=10&limit=10`)
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertArrayMinLength(data.pools, 1, '过滤结果为空')

    // 验证所有结果的 APY >= 10
    const allMatch = data.pools.every((p: any) => (p.apy || 0) >= 10)
    assert.assertTrue(allMatch, '过滤结果包含低于 10% 的池子')

    log(`     找到 ${data.pools.length} 个高收益池子`, 'cyan')
    log(`     最高 APY: ${Math.max(...data.pools.map((p: any) => p.apy || 0)).toFixed(2)}%`, 'cyan')
  })

  // 测试 5: 组合过滤
  await runTest('3.5 组合过滤 - chain=Ethereum&protocol=aave&minApy=1', async (assert) => {
    const response = await fetch(
      `${BASE_URL}/api/defi/yields?chain=Ethereum&protocol=aave&minApy=1&limit=5`
    )
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    // 可能为空，所以不强制要求有结果
    if (data.pools.length > 0) {
      const pool = data.pools[0]
      assert.assertEqual(pool.chain, 'Ethereum', '链不匹配')
      assert.assertGreaterThan(pool.apy || 0, 1, 'APY 不满足条件')
    }

    log(`     找到 ${data.pools.length} 个匹配的池子`, 'cyan')
  })
}

/**
 * 阶段 4: 测试代币价格 API
 */
async function testPricesAPI() {
  printHeader('阶段 3.4: 测试代币价格 API (/api/defi/prices)')

  // 测试 1: 单个代币 - WETH
  await runTest('4.1 单个代币 - WETH', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens: [
          { chain: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' }
        ]
      })
    })
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertObjectHasKey(data, 'prices', '响应缺少 prices 字段')

    const key = 'ethereum:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    assert.assertObjectHasKey(data.prices, key, `缺少 ${key} 的价格`)

    const price = data.prices[key]
    assert.assertObjectHasKey(price, 'price', '价格数据缺少 price 字段')
    assert.assertObjectHasKey(price, 'symbol', '价格数据缺少 symbol 字段')
    assert.assertGreaterThan(price.price, 0, '价格应大于 0')

    log(`     ${price.symbol}: $${price.price?.toLocaleString()}`, 'cyan')
  })

  // 测试 2: 多个代币
  await runTest('4.2 多个代币 - WETH, USDC, WMATIC', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens: [
          { chain: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' }, // WETH
          { chain: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }, // USDC
          { chain: 'polygon', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' }  // WMATIC
        ]
      })
    })
    assert.assertResponseOk(response, '请求失败')

    const data = await response.json()
    assert.assertEqual(Object.keys(data.prices).length, 3, '应返回 3 个代币的价格')

    // 验证 USDC 价格接近 $1
    const usdcKey = 'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const usdcPrice = data.prices[usdcKey]?.price || 0
    assert.assertInRange(usdcPrice, 0.99, 1.01, 'USDC 价格应接近 $1')

    log(`     返回 ${Object.keys(data.prices).length} 个代币价格`, 'cyan')
    Object.entries(data.prices).forEach(([key, value]: [string, any]) => {
      log(`       ${value.symbol}: $${value.price?.toLocaleString()}`, 'cyan')
    })
  })

  // 测试 3: 无效地址
  await runTest('4.3 无效地址 - 错误处理', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens: [
          { chain: 'ethereum', address: 'invalid-address' }
        ]
      })
    })

    // API 可能返回 200 但价格为空，或返回错误状态码
    const data = await response.json()
    // 不强制要求错误处理，只验证响应格式
    assert.assertObjectHasKey(data, 'prices', '响应缺少 prices 字段')

    log(`     无效地址处理: ${JSON.stringify(data).substring(0, 100)}...`, 'cyan')
  })

  // 测试 4: 空请求
  await runTest('4.4 空请求 - 参数验证', async (assert) => {
    const response = await fetch(`${BASE_URL}/api/defi/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens: [] })
    })

    assert.assertEqual(response.status, 400, '应返回 400 状态码')

    const data = await response.json()
    assert.assertObjectHasKey(data, 'error', '错误响应缺少 error 字段')

    log(`     错误消息: ${data.error}`, 'cyan')
  })
}

/**
 * 阶段 5: 性能和缓存测试
 */
async function testCachePerformance() {
  printHeader('阶段 4: 缓存机制和性能测试')

  // 测试 1: 协议列表缓存性能
  await runTest('5.1 协议列表缓存性能', async (assert) => {
    // 第一次请求（可能来自 API）
    const start1 = Date.now()
    const response1 = await fetch(`${BASE_URL}/api/defi/protocols?limit=100`)
    const time1 = Date.now() - start1
    assert.assertResponseOk(response1, '第一次请求失败')
    await response1.json()

    await sleep(100)

    // 第二次请求（应来自缓存）
    const start2 = Date.now()
    const response2 = await fetch(`${BASE_URL}/api/defi/protocols?limit=100`)
    const time2 = Date.now() - start2
    assert.assertResponseOk(response2, '第二次请求失败')
    const data2 = await response2.json()

    log(`     第一次请求: ${time1}ms`, 'cyan')
    log(`     第二次请求: ${time2}ms (cached=${data2.cached || false})`, 'cyan')

    if (data2.cached) {
      // 缓存请求应该更快
      log(`     性能提升: ${((1 - time2 / time1) * 100).toFixed(1)}%`, 'green')
    }
  })

  // 测试 2: 收益率缓存性能
  await runTest('5.2 收益率缓存性能', async (assert) => {
    const start1 = Date.now()
    const response1 = await fetch(`${BASE_URL}/api/defi/yields?limit=50`)
    const time1 = Date.now() - start1
    assert.assertResponseOk(response1, '第一次请求失败')
    await response1.json()

    await sleep(100)

    const start2 = Date.now()
    const response2 = await fetch(`${BASE_URL}/api/defi/yields?limit=50`)
    const time2 = Date.now() - start2
    assert.assertResponseOk(response2, '第二次请求失败')
    const data2 = await response2.json()

    log(`     第一次请求: ${time1}ms`, 'cyan')
    log(`     第二次请求: ${time2}ms (cached=${data2.cached || false})`, 'cyan')

    if (data2.cached) {
      log(`     性能提升: ${((1 - time2 / time1) * 100).toFixed(1)}%`, 'green')
    }
  })

  // 测试 3: 并发请求
  await runTest('5.3 并发请求处理', async (assert) => {
    const promises = [
      fetch(`${BASE_URL}/api/defi/protocols?limit=10`),
      fetch(`${BASE_URL}/api/defi/yields?limit=10`),
      fetch(`${BASE_URL}/api/defi/protocols/aave`),
    ]

    const start = Date.now()
    const responses = await Promise.all(promises)
    const time = Date.now() - start

    responses.forEach((response, index) => {
      assert.assertResponseOk(response, `请求 ${index + 1} 失败`)
    })

    log(`     并发 3 个请求: ${time}ms`, 'cyan')
  })
}

/**
 * 打印测试总结
 */
function printSummary() {
  const line = '='.repeat(60)
  log(`\n${line}`, 'cyan')
  log('  测试总结', 'bright')
  log(`${line}`, 'cyan')

  log(`\n总计: ${stats.total} 个测试`, 'bright')
  log(`✅ 通过: ${stats.passed} 个`, 'green')
  log(`❌ 失败: ${stats.failed} 个`, stats.failed > 0 ? 'red' : 'green')

  if (stats.failed > 0) {
    log(`\n失败的测试:`, 'red')
    failedTests.forEach((test, index) => {
      log(`\n${index + 1}. ${test.name}`, 'red')
      log(`   ${test.error}`, 'yellow')
    })
  }

  const passRate = ((stats.passed / stats.total) * 100).toFixed(1)
  log(`\n通过率: ${passRate}%`, passRate === '100.0' ? 'green' : 'yellow')

  if (stats.failed === 0) {
    log(`\n🎉 所有测试通过！`, 'green')
  } else {
    log(`\n⚠️  有 ${stats.failed} 个测试失败，请检查并修复`, 'yellow')
  }

  log(`\n${line}\n`, 'cyan')
}

/**
 * 主函数
 */
async function main() {
  log('\n🚀 开始 DeFiLlama 集成测试\n', 'bright')
  log(`测试目标: ${BASE_URL}`, 'cyan')
  log(`开始时间: ${new Date().toLocaleString()}\n`, 'cyan')

  try {
    // 运行所有测试阶段
    await testProtocolsAPI()
    await testProtocolDetailAPI()
    await testYieldsAPI()
    await testPricesAPI()
    await testCachePerformance()

    // 打印总结
    printSummary()

    // 退出码
    process.exit(stats.failed > 0 ? 1 : 0)
  } catch (error) {
    log(`\n❌ 测试执行出错: ${error}`, 'red')
    process.exit(1)
  }
}

// 运行测试
main()
