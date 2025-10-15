/**
 * Web3 集成测试脚本
 * 测试 Alchemy + Ankr + CoinGecko 多服务架构
 *
 * 运行: npx tsx test-web3-integration.ts
 */

import { web3 } from './lib/web3'
import type { EvmChain } from './types/database'

const TEST_ADDRESS = '0x1063bf0e728f8042533927cab626ca3ed96d56ea'
const TEST_CHAINS: EvmChain[] = ['ethereum', 'polygon', 'bsc']

async function testNativeBalance() {
  console.log('\n🧪 测试 1: 获取原生代币余额')
  console.log('='.repeat(60))

  for (const chain of TEST_CHAINS) {
    try {
      const balance = await web3.wallet.getNativeBalance(chain, TEST_ADDRESS)
      console.log(`✅ ${chain}:`)
      console.log(`   余额: ${balance.balance_formatted} ${balance.symbol}`)
      console.log(`   USD 价值: $${balance.balance_usd || 'N/A'}`)
    } catch (error) {
      console.error(`❌ ${chain}: ${error instanceof Error ? error.message : error}`)
    }
  }
}

async function testTokenBalances() {
  console.log('\n🧪 测试 2: 获取 ERC20 代币余额')
  console.log('='.repeat(60))

  try {
    const tokens = await web3.wallet.getTokens('ethereum', TEST_ADDRESS, {
      excludeSpam: true,
      includePrices: true,
    })

    console.log(`✅ 找到 ${tokens.length} 个代币:`)
    tokens.slice(0, 5).forEach((token) => {
      console.log(`   - ${token.token_symbol}: ${token.balance_formatted}`)
      if (token.usd_value) {
        console.log(`     价值: $${token.usd_value.toFixed(2)}`)
      }
    })
  } catch (error) {
    console.error(`❌ 错误: ${error instanceof Error ? error.message : error}`)
  }
}

async function testNFTs() {
  console.log('\n🧪 测试 3: 获取 NFT 资产')
  console.log('='.repeat(60))

  try {
    const { nfts, total } = await web3.wallet.getNFTs('ethereum', TEST_ADDRESS, {
      limit: 10,
      excludeSpam: true,
    })

    console.log(`✅ 找到 ${total} 个 NFT (显示前 ${nfts.length} 个):`)
    nfts.slice(0, 3).forEach((nft) => {
      console.log(`   - ${nft.name || 'Unnamed'} #${nft.token_id}`)
      console.log(`     合约: ${nft.contract_address}`)
      console.log(`     类型: ${nft.contract_type}`)
    })
  } catch (error) {
    console.error(`❌ 错误: ${error instanceof Error ? error.message : error}`)
  }
}

async function testTokenPrices() {
  console.log('\n🧪 测试 4: 获取代币价格 (CoinGecko)')
  console.log('='.repeat(60))

  const testTokens = [
    { chain: 'ethereum' as EvmChain, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' }, // WETH
    { chain: 'ethereum' as EvmChain, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }, // USDC
    { chain: 'polygon' as EvmChain, address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' },  // WMATIC
  ]

  try {
    const prices = await web3.price.getTokenPrices(testTokens)

    console.log(`✅ 获取了 ${Object.keys(prices).length} 个代币价格:`)
    Object.entries(prices).forEach(([key, priceData]) => {
      console.log(`   - ${key}:`)
      console.log(`     价格: $${priceData.usd_price}`)
      if (priceData.usd_price_24h_change) {
        console.log(`     24h 变化: ${priceData.usd_price_24h_change.toFixed(2)}%`)
      }
    })
  } catch (error) {
    console.error(`❌ 错误: ${error instanceof Error ? error.message : error}`)
  }
}

async function testWalletSnapshot() {
  console.log('\n🧪 测试 5: 获取钱包完整快照 (多链)')
  console.log('='.repeat(60))

  try {
    const snapshot = await web3.wallet.getSnapshot(TEST_ADDRESS, TEST_CHAINS)

    console.log(`✅ 钱包快照:`)
    console.log(`   地址: ${snapshot.address}`)
    console.log(`   总链数: ${snapshot.total_chains}`)
    console.log(`   总价值: $${snapshot.total_value_usd.toFixed(2)}`)
    console.log(`\n   各链详情:`)
    snapshot.chains.forEach((chainData) => {
      console.log(`   - ${chainData.chain}:`)
      console.log(`     代币数: ${chainData.tokens.length}`)
      console.log(`     NFT 数: ${chainData.nfts_count}`)
      console.log(`     价值: $${chainData.balance_usd.toFixed(2)}`)
    })
  } catch (error) {
    console.error(`❌ 错误: ${error instanceof Error ? error.message : error}`)
  }
}

async function testProviderFallback() {
  console.log('\n🧪 测试 6: 服务商故障转移')
  console.log('='.repeat(60))

  try {
    // 测试 BSC（Alchemy 不支持，会自动 fallback 到 Ankr）
    const balance = await web3.wallet.getNativeBalance('bsc', TEST_ADDRESS)
    console.log(`✅ BSC 余额获取成功 (通过 Ankr fallback):`)
    console.log(`   ${balance.balance_formatted} ${balance.symbol}`)
  } catch (error) {
    console.error(`❌ 错误: ${error instanceof Error ? error.message : error}`)
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 Web3 多服务架构集成测试')
  console.log('📦 服务: Alchemy + Ankr + CoinGecko')
  console.log('='.repeat(60))

  await testNativeBalance()
  await testTokenBalances()
  await testNFTs()
  await testTokenPrices()
  await testWalletSnapshot()
  await testProviderFallback()

  console.log('\n' + '='.repeat(60))
  console.log('✨ 测试完成!')
  console.log('='.repeat(60) + '\n')
}

// 运行测试
runAllTests().catch((error) => {
  console.error('测试失败:', error)
  process.exit(1)
})
