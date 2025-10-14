/**
 * DeFi 数据过滤工具函数
 *
 * 替代独立的 PancakeSwap 客户端，使用通用的过滤逻辑
 */

import type { YieldPool } from '@/lib/defillama/types'

/**
 * PancakeSwap 相关的协议标识
 */
const PANCAKESWAP_PROJECTS = ['pancakeswap', 'pancakeswap-amm', 'pancakeswap-v3']

/**
 * 过滤 PancakeSwap 池子
 */
export function filterPancakeSwapPools(pools: YieldPool[]): YieldPool[] {
  return pools.filter(pool =>
    PANCAKESWAP_PROJECTS.includes(pool.project.toLowerCase())
  )
}

/**
 * 过滤特定协议的池子
 * 支持模糊搜索：输入 "pancake" 可以匹配 "pancakeswap-amm"
 */
export function filterPoolsByProtocol(
  pools: YieldPool[],
  protocol: string | string[]
): YieldPool[] {
  const protocols = Array.isArray(protocol) ? protocol : [protocol]
  const lowerProtocols = protocols.map(p => p.toLowerCase().trim())

  return pools.filter(pool => {
    const poolProject = pool.project.toLowerCase()
    // 支持模糊搜索：检查是否包含任意一个搜索词
    return lowerProtocols.some(searchTerm =>
      poolProject.includes(searchTerm) || searchTerm.includes(poolProject)
    )
  })
}

/**
 * 过滤特定链的池子
 */
export function filterPoolsByChain(
  pools: YieldPool[],
  chain: string | string[]
): YieldPool[] {
  const chains = Array.isArray(chain) ? chain : [chain]
  const lowerChains = chains.map(c => c.toLowerCase())

  return pools.filter(pool =>
    lowerChains.includes(pool.chain.toLowerCase())
  )
}

/**
 * 过滤有奖励代币的池子（Farm）
 */
export function filterFarms(pools: YieldPool[]): YieldPool[] {
  return pools.filter(pool =>
    pool.rewardTokens &&
    pool.rewardTokens.length > 0 &&
    pool.apyReward !== undefined &&
    pool.apyReward !== null &&
    pool.apyReward > 0
  )
}

/**
 * 过滤稳定币池子
 */
export function filterStablePools(pools: YieldPool[]): YieldPool[] {
  return pools.filter(pool => pool.stablecoin === true)
}

/**
 * 按 TVL 过滤
 */
export function filterPoolsByTVL(
  pools: YieldPool[],
  minTvl: number = 0,
  maxTvl: number = Infinity
): YieldPool[] {
  return pools.filter(pool =>
    pool.tvlUsd >= minTvl && pool.tvlUsd <= maxTvl
  )
}

/**
 * 按 APY 过滤
 */
export function filterPoolsByAPY(
  pools: YieldPool[],
  minApy: number = 0,
  maxApy: number = Infinity
): YieldPool[] {
  return pools.filter(pool =>
    pool.apy >= minApy && pool.apy <= maxApy
  )
}

/**
 * 按池子类型过滤（V2, V3, StableSwap）
 */
export function filterPoolsByType(
  pools: YieldPool[],
  poolType: string
): YieldPool[] {
  return pools.filter(pool => pool.poolMeta === poolType)
}

/**
 * 排序池子
 */
export function sortPools(
  pools: YieldPool[],
  sortBy: 'tvl' | 'apy' | 'apyBase' | 'apyReward' = 'tvl',
  order: 'asc' | 'desc' = 'desc'
): YieldPool[] {
  const sorted = [...pools].sort((a, b) => {
    let aValue = 0
    let bValue = 0

    switch (sortBy) {
      case 'tvl':
        aValue = a.tvlUsd
        bValue = b.tvlUsd
        break
      case 'apy':
        aValue = a.apy
        bValue = b.apy
        break
      case 'apyBase':
        aValue = a.apyBase || 0
        bValue = b.apyBase || 0
        break
      case 'apyReward':
        aValue = a.apyReward || 0
        bValue = b.apyReward || 0
        break
    }

    return order === 'desc' ? bValue - aValue : aValue - bValue
  })

  return sorted
}

/**
 * 链式过滤构建器
 *
 * @example
 * const pancakeBscPools = new PoolFilterBuilder(allPools)
 *   .filterByProtocol('pancakeswap')
 *   .filterByChain('BSC')
 *   .filterByTVL(100000)
 *   .sortBy('apy', 'desc')
 *   .limit(20)
 *   .build()
 */
export class PoolFilterBuilder {
  private pools: YieldPool[]

  constructor(pools: YieldPool[]) {
    this.pools = pools
  }

  filterByProtocol(protocol: string | string[]): this {
    this.pools = filterPoolsByProtocol(this.pools, protocol)
    return this
  }

  filterByChain(chain: string | string[]): this {
    this.pools = filterPoolsByChain(this.pools, chain)
    return this
  }

  filterByTVL(minTvl?: number, maxTvl?: number): this {
    this.pools = filterPoolsByTVL(this.pools, minTvl, maxTvl)
    return this
  }

  filterByAPY(minApy?: number, maxApy?: number): this {
    this.pools = filterPoolsByAPY(this.pools, minApy, maxApy)
    return this
  }

  filterFarms(): this {
    this.pools = filterFarms(this.pools)
    return this
  }

  filterStable(): this {
    this.pools = filterStablePools(this.pools)
    return this
  }

  filterByType(poolType: string): this {
    this.pools = filterPoolsByType(this.pools, poolType)
    return this
  }

  sortBy(
    sortBy: 'tvl' | 'apy' | 'apyBase' | 'apyReward' = 'tvl',
    order: 'asc' | 'desc' = 'desc'
  ): this {
    this.pools = sortPools(this.pools, sortBy, order)
    return this
  }

  limit(count: number): this {
    this.pools = this.pools.slice(0, count)
    return this
  }

  build(): YieldPool[] {
    return this.pools
  }
}

/**
 * 辅助函数：生成 PancakeSwap URL
 */
export function generatePancakeSwapUrl(pool: YieldPool): string {
  const baseUrl = 'https://pancakeswap.finance'

  // Farm（有奖励代币）
  if (pool.rewardTokens && pool.rewardTokens.length > 0) {
    return `${baseUrl}/farms`
  }

  // 流动性池
  if (pool.poolMeta === 'V3') {
    return `${baseUrl}/liquidity/pools`
  }

  return `${baseUrl}/liquidity/pools`
}

/**
 * 判断 Farm 类型
 */
export function determineFarmType(pool: YieldPool): 'LP' | 'Single' | 'StableLP' {
  if (pool.stablecoin) {
    return 'StableLP'
  }

  if (pool.underlyingTokens && pool.underlyingTokens.length === 1) {
    return 'Single'
  }

  return 'LP'
}

/**
 * 获取 PancakeSwap 统计信息
 */
export function getPancakeSwapStats(pools: YieldPool[]) {
  const pancakePools = filterPancakeSwapPools(pools)
  const farms = filterFarms(pancakePools)

  const totalTvl = pancakePools.reduce((sum, pool) => sum + pool.tvlUsd, 0)
  const averageApy = pancakePools.length > 0
    ? pancakePools.reduce((sum, pool) => sum + pool.apy, 0) / pancakePools.length
    : 0

  return {
    totalPools: pancakePools.length,
    totalFarms: farms.length,
    totalTvl,
    averageApy
  }
}
