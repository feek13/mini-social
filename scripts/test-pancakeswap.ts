#!/usr/bin/env tsx

/**
 * PancakeSwap Integration Test Script
 *
 * Tests all PancakeSwap APIs and client methods to ensure proper functionality
 *
 * Usage: npm run test:pancakeswap
 *
 * NOTE: This script is currently disabled as the PancakeSwap client has been
 * replaced with DeFiLlama API + filter-based approach
 */

// import { pancakeswap } from '../lib/pancakeswap'

console.log('This test script is currently disabled. PancakeSwap integration now uses DeFiLlama API.')
console.log('Please use the API endpoints directly for testing:')
console.log('  - /api/defi/pancakeswap/pools')
console.log('  - /api/defi/pancakeswap/farms')
console.log('  - /api/defi/pancakeswap/overview')
process.exit(0)

/* eslint-disable */
/* Temporarily disabled
const pancakeswap: any = null

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function section(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, colors.bright + colors.cyan)
  console.log('='.repeat(60) + '\n')
}

function success(message: string) {
  log(`✅ ${message}`, colors.green)
}

function error(message: string) {
  log(`❌ ${message}`, colors.red)
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.blue)
}

function warn(message: string) {
  log(`⚠️  ${message}`, colors.yellow)
}

async function testProtocolOverview() {
  section('Test 1: Protocol Overview')

  try {
    const protocol = await pancakeswap.getProtocol()

    info(`Protocol: ${protocol.name}`)

    // Handle TVL being NaN or invalid
    const tvl = Number(protocol.tvl) || 0
    if (tvl > 0) {
      info(`TVL: $${(tvl / 1e9).toFixed(2)}B`)
    } else {
      warn(`TVL data unavailable or invalid`)
    }

    info(`Chains: ${protocol.chains.length} (${protocol.chains.slice(0, 3).join(', ')}...)`)
    info(`Category: ${protocol.category}`)

    if (protocol.change_1d !== null && protocol.change_1d !== undefined && !isNaN(protocol.change_1d)) {
      info(`24h Change: ${protocol.change_1d >= 0 ? '+' : ''}${protocol.change_1d.toFixed(2)}%`)
    }

    if (protocol.change_7d !== null && protocol.change_7d !== undefined && !isNaN(protocol.change_7d)) {
      info(`7d Change: ${protocol.change_7d >= 0 ? '+' : ''}${protocol.change_7d.toFixed(2)}%`)
    }

    // Validate data structure
    if (!protocol.name || !Array.isArray(protocol.chains)) {
      throw new Error('Invalid protocol data structure')
    }

    success('Protocol overview test passed')
    return true
  } catch (err) {
    error(`Protocol overview test failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

async function testPoolsList() {
  section('Test 2: Pools List (Basic)')

  try {
    const pools = await pancakeswap.getPools({
      limit: 10,
      minTvl: 100000
    })

    info(`Retrieved ${pools.length} pools`)

    if (pools.length > 0) {
      const pool = pools[0]
      info(`Top Pool: ${pool.symbol} on ${pool.chain}`)
      info(`  TVL: $${(pool.tvlUsd / 1e6).toFixed(2)}M`)
      info(`  APY: ${pool.apy.toFixed(2)}%`)
      if (pool.apyBase) info(`  Base APY: ${pool.apyBase.toFixed(2)}%`)
      if (pool.apyReward) info(`  Reward APY: ${pool.apyReward.toFixed(2)}%`)
      info(`  Pool Type: ${pool.poolMeta || 'N/A'}`)
      info(`  Stablecoin: ${pool.stablecoin ? 'Yes' : 'No'}`)
    }

    // Validate data structure
    if (!Array.isArray(pools)) {
      throw new Error('Pools should be an array')
    }

    if (pools.length > 0 && (!pools[0].symbol || typeof pools[0].tvlUsd !== 'number')) {
      throw new Error('Invalid pool data structure')
    }

    success('Pools list test passed')
    return true
  } catch (err) {
    error(`Pools list test failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

async function testPoolsFiltering() {
  section('Test 3: Pools Filtering by Chain')

  try {
    const bscPools = await pancakeswap.getPools({
      chain: 'bsc',
      limit: 5,
      minTvl: 500000
    })

    info(`Retrieved ${bscPools.length} BSC pools (minTvl: $500k)`)

    // Validate all pools are from BSC
    const allBsc = bscPools.every(p => p.chain.toLowerCase() === 'bsc')
    if (!allBsc) {
      throw new Error('Chain filter not working correctly')
    }

    // Validate TVL filter
    const allAboveMinTvl = bscPools.every(p => p.tvlUsd >= 500000)
    if (!allAboveMinTvl) {
      throw new Error('TVL filter not working correctly')
    }

    bscPools.forEach((pool, idx) => {
      info(`${idx + 1}. ${pool.symbol} - $${(pool.tvlUsd / 1e6).toFixed(2)}M TVL, ${pool.apy.toFixed(2)}% APY`)
    })

    success('Pools filtering test passed')
    return true
  } catch (err) {
    error(`Pools filtering test failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

async function testFarms() {
  section('Test 4: Farms (Pools with Rewards)')

  try {
    const farms = await pancakeswap.getFarms('bsc')

    info(`Retrieved ${farms.length} BSC farms`)

    if (farms.length > 0) {
      const farm = farms[0]
      info(`Top Farm: ${farm.symbol}`)
      info(`  TVL: $${(farm.tvlUsd / 1e6).toFixed(2)}M`)
      info(`  Total APY: ${farm.apy.toFixed(2)}%`)
      info(`  Reward APY: ${farm.rewardApy.toFixed(2)}%`)
      info(`  Farm Type: ${farm.farmType}`)
      if (farm.rewardTokens) {
        info(`  Reward Tokens: ${farm.rewardTokens.join(', ')}`)
      }
    }

    // Validate farms have reward APY
    if (farms.length > 0 && typeof farms[0].rewardApy !== 'number') {
      throw new Error('Farms should have rewardApy field')
    }

    success('Farms test passed')
    return true
  } catch (err) {
    error(`Farms test failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

async function testTopYields() {
  section('Test 5: Top Yields')

  try {
    const topYields = await pancakeswap.getTopYields(1000000, 10)

    info(`Retrieved ${topYields.length} top yield pools (minTvl: $1M)`)

    if (topYields.length > 0) {
      info('\nTop 5 by APY:')
      topYields.slice(0, 5).forEach((pool, idx) => {
        info(`${idx + 1}. ${pool.symbol} - ${pool.apy.toFixed(2)}% APY on ${pool.chain}`)
      })
    }

    // Validate sorting (APY descending)
    for (let i = 1; i < topYields.length; i++) {
      if (topYields[i].apy > topYields[i - 1].apy) {
        throw new Error('Top yields not properly sorted by APY')
      }
    }

    success('Top yields test passed')
    return true
  } catch (err) {
    error(`Top yields test failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

async function testStablePools() {
  section('Test 6: Stable Pools')

  try {
    const stablePools = await pancakeswap.getStablePools(5)

    info(`Retrieved ${stablePools.length} stable pools`)

    if (stablePools.length > 0) {
      stablePools.forEach((pool, idx) => {
        info(`${idx + 1}. ${pool.symbol} - ${pool.apy.toFixed(2)}% APY on ${pool.chain}`)
      })
    }

    // Validate all are stablecoin pools
    const allStable = stablePools.every(p => p.stablecoin === true)
    if (!allStable) {
      throw new Error('Not all pools are stablecoin pools')
    }

    success('Stable pools test passed')
    return true
  } catch (err) {
    error(`Stable pools test failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

async function testPoolsByType() {
  section('Test 7: Pools by Type')

  try {
    const v3Pools = await pancakeswap.getPoolsByType('V3', 5)

    info(`Retrieved ${v3Pools.length} V3 pools`)

    if (v3Pools.length > 0) {
      v3Pools.forEach((pool, idx) => {
        info(`${idx + 1}. ${pool.symbol} - ${pool.poolMeta} - ${pool.apy.toFixed(2)}% APY`)
      })
    }

    // Validate pool type
    const allV3 = v3Pools.every(p => p.poolMeta === 'V3')
    if (!allV3) {
      warn('Some pools do not have V3 pool meta (might be expected)')
    }

    success('Pools by type test passed')
    return true
  } catch (err) {
    error(`Pools by type test failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

async function testStats() {
  section('Test 8: Stats Aggregation')

  try {
    const stats = await pancakeswap.getStats()

    info(`Total Pools: ${stats.totalPools}`)

    // Handle TVL being NaN or invalid
    const totalTvl = Number(stats.totalTvl) || 0
    if (totalTvl > 0) {
      info(`Total TVL: $${(totalTvl / 1e9).toFixed(2)}B`)
    } else {
      warn(`Total TVL data unavailable`)
    }

    const avgApy = Number(stats.averageApy) || 0
    info(`Average APY: ${avgApy.toFixed(2)}%`)

    if (stats.totalPools === 0) {
      throw new Error('Stats show zero pools')
    }

    success('Stats aggregation test passed')
    return true
  } catch (err) {
    error(`Stats aggregation test failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

async function testAPIEndpoints() {
  section('Test 9: API Endpoints')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  try {
    // Test with timeout
    const fetchWithTimeout = async (url: string, timeout = 10000) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeoutId)
        return response
      } catch (err) {
        clearTimeout(timeoutId)
        throw err
      }
    }

    // Test overview endpoint
    info('Testing /api/defi/pancakeswap/overview...')
    const overviewRes = await fetchWithTimeout(`${baseUrl}/api/defi/pancakeswap/overview`)
    if (!overviewRes.ok) {
      throw new Error(`Overview API returned ${overviewRes.status}`)
    }
    const overviewData = await overviewRes.json()
    const tvl = Number(overviewData.tvl) || 0
    if (tvl > 0) {
      info(`  ✓ Overview API works (TVL: $${(tvl / 1e9).toFixed(2)}B)`)
    } else {
      info(`  ✓ Overview API works`)
    }

    // Test pools endpoint
    info('Testing /api/defi/pancakeswap/pools...')
    const poolsRes = await fetchWithTimeout(`${baseUrl}/api/defi/pancakeswap/pools?chain=bsc&limit=5`)
    if (!poolsRes.ok) {
      throw new Error(`Pools API returned ${poolsRes.status}`)
    }
    const poolsData = await poolsRes.json()
    info(`  ✓ Pools API works (${poolsData.count} pools)`)

    // Test farms endpoint
    info('Testing /api/defi/pancakeswap/farms...')
    const farmsRes = await fetchWithTimeout(`${baseUrl}/api/defi/pancakeswap/farms?chain=bsc&limit=5`)
    if (!farmsRes.ok) {
      throw new Error(`Farms API returned ${farmsRes.status}`)
    }
    const farmsData = await farmsRes.json()
    info(`  ✓ Farms API works (${farmsData.count} farms)`)

    success('API endpoints test passed')
    return true
  } catch (err) {
    if (err instanceof Error && (err.message.includes('fetch') || err.name === 'AbortError')) {
      warn('API endpoints test skipped (dev server not running or timeout)')
      return true
    }
    error(`API endpoints test failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

async function runAllTests() {
  console.clear()
  log('\n🥞 PancakeSwap Integration Test Suite\n', colors.bright + colors.cyan)

  const startTime = Date.now()
  const results: boolean[] = []

  results.push(await testProtocolOverview())
  results.push(await testPoolsList())
  results.push(await testPoolsFiltering())
  results.push(await testFarms())
  results.push(await testTopYields())
  results.push(await testStablePools())
  results.push(await testPoolsByType())
  results.push(await testStats())
  results.push(await testAPIEndpoints())

  const duration = Date.now() - startTime
  const passed = results.filter(r => r).length
  const failed = results.length - passed

  section('Test Summary')
  log(`Total Tests: ${results.length}`, colors.bright)
  log(`Passed: ${passed}`, colors.green)
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green)
  log(`Duration: ${(duration / 1000).toFixed(2)}s`, colors.blue)

  if (failed === 0) {
    log('\n🎉 All tests passed!', colors.bright + colors.green)
    process.exit(0)
  } else {
    log('\n❌ Some tests failed', colors.bright + colors.red)
    process.exit(1)
  }
}

// Run tests
runAllTests().catch(err => {
  error(`Fatal error: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
*/