/**
 * DeFiLlama API 客户端使用示例
 *
 * 此文件仅供参考，不会在生产环境中运行
 * 展示了如何使用 DeFiLlama 客户端的各种功能
 */

import { defillama } from './client'

/**
 * 示例 1: 获取和展示 Top 10 协议
 */
export async function exampleGetTopProtocols() {
  console.log('=== Top 10 DeFi Protocols by TVL ===')

  try {
    const top10 = await defillama.getTopProtocols(10)

    top10.forEach((protocol, index) => {
      console.log(`${index + 1}. ${protocol.name}`)
      console.log(`   TVL: $${protocol.tvl.toLocaleString()}`)
      console.log(`   Category: ${protocol.category}`)
      console.log(`   Chains: ${protocol.chains.join(', ')}`)
      console.log(`   24h Change: ${protocol.change_1d?.toFixed(2)}%`)
      console.log('')
    })
  } catch (error) {
    console.error('获取协议列表失败:', error)
  }
}

/**
 * 示例 2: 搜索并获取特定协议详情
 */
export async function exampleSearchAndGetProtocol() {
  console.log('=== Search and Get Protocol Details ===')

  try {
    // 搜索 Aave 协议
    const results = await defillama.searchProtocols('aave')
    console.log(`找到 ${results.length} 个匹配的协议`)

    if (results.length > 0) {
      const protocol = results[0]
      console.log(`\n协议: ${protocol.name}`)

      // 获取详细信息
      const detail = await defillama.getProtocol(protocol.slug)
      console.log(`描述: ${detail.description}`)
      console.log(`URL: ${detail.url}`)
      console.log(`分类: ${detail.category}`)
      console.log(`总 TVL: $${detail.tvl.toLocaleString()}`)

      // 显示各链 TVL
      console.log('\n各链 TVL:')
      Object.entries(detail.currentChainTvls).forEach(([chain, tvl]) => {
        console.log(`  ${chain}: $${tvl.toLocaleString()}`)
      })
    }
  } catch (error) {
    console.error('搜索协议失败:', error)
  }
}

/**
 * 示例 3: 获取代币价格
 */
export async function exampleGetTokenPrices() {
  console.log('=== Token Prices ===')

  try {
    // 单个代币价格
    const daiPrice = await defillama.getTokenPrice(
      'ethereum',
      '0x6B175474E89094C44Da98b954EedeAC495271d0F' // DAI
    )
    console.log(`DAI 价格: $${daiPrice.price}`)
    console.log(`Symbol: ${daiPrice.symbol}`)
    console.log(`置信度: ${daiPrice.confidence}`)

    // 批量获取价格
    const tokens = [
      { chain: 'ethereum', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' }, // DAI
      { chain: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }, // USDC
      { chain: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' }, // USDT
    ]

    console.log('\n批量代币价格:')
    const prices = await defillama.getTokenPrices(tokens)

    Object.values(prices).forEach((price) => {
      console.log(`${price.symbol}: $${price.price}`)
    })
  } catch (error) {
    console.error('获取代币价格失败:', error)
  }
}

/**
 * 示例 4: 获取高收益率池子
 */
export async function exampleGetTopYields() {
  console.log('=== Top Yield Pools ===')

  try {
    // 获取 TVL > $1M 且 APY 最高的 10 个池子
    const topYields = await defillama.getTopYields(10, 1000000)

    topYields.forEach((pool, index) => {
      console.log(`${index + 1}. ${pool.project} - ${pool.symbol}`)
      console.log(`   Chain: ${pool.chain}`)
      console.log(`   APY: ${pool.apy.toFixed(2)}%`)
      console.log(`   APY Base: ${pool.apyBase?.toFixed(2)}%`)
      console.log(`   APY Reward: ${pool.apyReward?.toFixed(2)}%`)
      console.log(`   TVL: $${pool.tvlUsd.toLocaleString()}`)
      console.log(`   Stablecoin: ${pool.stablecoin ? 'Yes' : 'No'}`)
      console.log(`   IL Risk: ${pool.ilRisk}`)
      console.log('')
    })
  } catch (error) {
    console.error('获取收益率池子失败:', error)
  }
}

/**
 * 示例 5: 按分类和链过滤协议
 */
export async function exampleFilterProtocols() {
  console.log('=== Filter Protocols ===')

  try {
    // 获取所有 DEX
    const dexes = await defillama.getProtocolsByCategory('Dexes')
    console.log(`共有 ${dexes.length} 个 DEX 协议`)

    // 获取 Ethereum 上的协议
    const ethereumProtocols = await defillama.getProtocolsByChain('Ethereum')
    console.log(`\nEthereum 上有 ${ethereumProtocols.length} 个协议`)

    // 同时满足两个条件：Ethereum 上的 DEX
    const ethereumDexes = dexes.filter(dex =>
      dex.chains.some(chain => chain.toLowerCase() === 'ethereum')
    )
    console.log(`\nEthereum DEXes: ${ethereumDexes.length} 个`)

    // 显示前 5 个
    ethereumDexes.slice(0, 5).forEach(dex => {
      console.log(`- ${dex.name} (TVL: $${dex.tvl.toLocaleString()})`)
    })
  } catch (error) {
    console.error('过滤协议失败:', error)
  }
}

/**
 * 示例 6: 获取链数据
 */
export async function exampleGetChains() {
  console.log('=== Blockchain TVL Data ===')

  try {
    const chains = await defillama.getChains()

    // 按 TVL 排序
    const sortedChains = chains.sort((a, b) => b.tvl - a.tvl)

    console.log('Top 10 Chains by TVL:')
    sortedChains.slice(0, 10).forEach((chain, index) => {
      console.log(`${index + 1}. ${chain.name}`)
      console.log(`   TVL: $${chain.tvl.toLocaleString()}`)
      console.log(`   Token: ${chain.tokenSymbol || 'N/A'}`)
      console.log('')
    })
  } catch (error) {
    console.error('获取链数据失败:', error)
  }
}

/**
 * 示例 7: 历史价格查询
 */
export async function exampleHistoricalPrices() {
  console.log('=== Historical Token Prices ===')

  try {
    const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    const now = Math.floor(Date.now() / 1000)

    // 获取当前价格
    const currentPrice = await defillama.getTokenPrice('ethereum', daiAddress)
    console.log(`当前 DAI 价格: $${currentPrice.price}`)

    // 获取 7 天前的价格
    const sevenDaysAgo = now - 7 * 24 * 60 * 60
    const historicalPrice = await defillama.getHistoricalTokenPrice(
      'ethereum',
      daiAddress,
      sevenDaysAgo
    )
    console.log(`7 天前 DAI 价格: $${historicalPrice.price}`)

    // 计算变化
    const change = ((currentPrice.price - historicalPrice.price) / historicalPrice.price) * 100
    console.log(`7 日变化: ${change.toFixed(2)}%`)
  } catch (error) {
    console.error('获取历史价格失败:', error)
  }
}

/**
 * 运行所有示例（仅供测试）
 */
export async function runAllExamples() {
  await exampleGetTopProtocols()
  console.log('\n' + '='.repeat(50) + '\n')

  await exampleSearchAndGetProtocol()
  console.log('\n' + '='.repeat(50) + '\n')

  await exampleGetTokenPrices()
  console.log('\n' + '='.repeat(50) + '\n')

  await exampleGetTopYields()
  console.log('\n' + '='.repeat(50) + '\n')

  await exampleFilterProtocols()
  console.log('\n' + '='.repeat(50) + '\n')

  await exampleGetChains()
  console.log('\n' + '='.repeat(50) + '\n')

  await exampleHistoricalPrices()
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples().catch(console.error)
}
