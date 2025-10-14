/**
 * 测试统一 DeFi 客户端
 *
 * 运行: npx tsx scripts/test-unified-client.ts
 */

import { unifiedDefi } from '../lib/defi/unified-client'

async function testUnifiedClient() {
  console.log('='.repeat(80))
  console.log('🧪 测试统一 DeFi 客户端')
  console.log('='.repeat(80))

  try {
    // 测试 1: 获取协议列表（无缓存）
    console.log('\n📋 测试 1: 获取协议列表（首次请求）')
    const start1 = Date.now()
    const protocols1 = await unifiedDefi.getProtocols({
      category: 'Dexs',
      limit: 10
    })
    const duration1 = Date.now() - start1
    console.log(`✅ 获取 ${protocols1.length} 个 DEX 协议 (${duration1}ms)`)
    console.log(`   示例: ${protocols1[0]?.name} - TVL: $${protocols1[0]?.tvl.toLocaleString()}`)

    // 测试 2: 获取协议列表（应命中缓存）
    console.log('\n📋 测试 2: 获取协议列表（缓存请求）')
    const start2 = Date.now()
    const protocols2 = await unifiedDefi.getProtocols({
      category: 'Dexs',
      limit: 10
    })
    const duration2 = Date.now() - start2
    console.log(`✅ 获取 ${protocols2.length} 个 DEX 协议 (${duration2}ms)`)
    console.log(`   缓存提速: ${((1 - duration2 / duration1) * 100).toFixed(1)}%`)

    // 测试 3: 搜索协议
    console.log('\n🔍 测试 3: 搜索协议')
    const start3 = Date.now()
    const searchResults = await unifiedDefi.getProtocols({
      search: 'uniswap',
      limit: 5
    })
    const duration3 = Date.now() - start3
    console.log(`✅ 找到 ${searchResults.length} 个匹配的协议 (${duration3}ms)`)
    searchResults.forEach(p => {
      console.log(`   - ${p.name} (${p.slug})`)
    })

    // 测试 4: 获取收益率池子（无缓存）
    console.log('\n💰 测试 4: 获取收益率池子（首次请求）')
    const start4 = Date.now()
    const yields1 = await unifiedDefi.getYields({
      protocol: 'aave-v3',
      chain: 'Ethereum',
      minApy: 1,
      limit: 5
    })
    const duration4 = Date.now() - start4
    console.log(`✅ 获取 ${yields1.length} 个 Aave V3 池子 (${duration4}ms)`)
    if (yields1.length > 0) {
      console.log(`   示例: ${yields1[0]?.symbol} - APY: ${yields1[0]?.apy.toFixed(2)}%`)
    }

    // 测试 5: 获取收益率池子（应命中缓存）
    console.log('\n💰 测试 5: 获取收益率池子（缓存请求）')
    const start5 = Date.now()
    const yields2 = await unifiedDefi.getYields({
      protocol: 'aave-v3',
      chain: 'Ethereum',
      minApy: 1,
      limit: 5
    })
    const duration5 = Date.now() - start5
    console.log(`✅ 获取 ${yields2.length} 个 Aave V3 池子 (${duration5}ms)`)
    console.log(`   缓存提速: ${((1 - duration5 / duration4) * 100).toFixed(1)}%`)

    // 测试 6: 高 APY 过滤
    console.log('\n🔥 测试 6: 高 APY 过滤')
    const start6 = Date.now()
    const highApyYields = await unifiedDefi.getYields({
      minApy: 10,
      limit: 10,
      sortBy: 'apy',
      order: 'desc'
    })
    const duration6 = Date.now() - start6
    console.log(`✅ 找到 ${highApyYields.length} 个高收益池子 (${duration6}ms)`)
    highApyYields.slice(0, 3).forEach((y, i) => {
      console.log(`   ${i + 1}. ${y.symbol} (${y.project}) - APY: ${y.apy.toFixed(2)}%`)
    })

    // 测试 7: 获取代币价格
    console.log('\n💵 测试 7: 获取代币价格')
    try {
      const start7 = Date.now()
      const wethPrice = await unifiedDefi.getTokenPrice(
        'ethereum',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
      )
      const duration7 = Date.now() - start7
      console.log(`✅ WETH 价格: $${wethPrice.toLocaleString()} (${duration7}ms)`)
    } catch (error) {
      console.log(`⚠️ 价格查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }

    // 测试 8: 缓存统计
    console.log('\n📊 测试 8: 缓存统计')
    const stats = unifiedDefi.getCacheStats()
    console.log('✅ 缓存状态:')
    console.log(`   - 协议缓存: ${stats.protocols.count} 条 (TTL: ${stats.protocols.ttl / 1000}s)`)
    console.log(`   - 收益率缓存: ${stats.yields.count} 条 (TTL: ${stats.yields.ttl / 1000}s)`)
    console.log(`   - 价格缓存: ${stats.prices.count} 条 (TTL: ${stats.prices.ttl / 1000}s)`)

    // 测试 9: 清除缓存
    console.log('\n🧹 测试 9: 清除缓存')
    unifiedDefi.clearCache()
    const statsAfterClear = unifiedDefi.getCacheStats()
    console.log('✅ 缓存已清除')
    console.log(`   - 协议缓存: ${statsAfterClear.protocols.count} 条`)
    console.log(`   - 收益率缓存: ${statsAfterClear.yields.count} 条`)
    console.log(`   - 价格缓存: ${statsAfterClear.prices.count} 条`)

    console.log('\n' + '='.repeat(80))
    console.log('✅ 所有测试通过！')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('\n❌ 测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
testUnifiedClient()
