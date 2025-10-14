import { YieldPool } from './defillama/types'

/**
 * 产品分类类型
 */
export type PoolCategory = 'stablecoin' | 'single' | 'multi' | 'all'

/**
 * 排序选项
 */
export type SortOption = 'apy_desc' | 'apy_asc' | 'tvl_desc' | 'apy30d_desc'

/**
 * TVL 范围
 */
export type TvlRange = {
  label: string
  min: number
  max: number
}

/**
 * TVL 范围选项
 */
export const TVL_RANGES: TvlRange[] = [
  { label: '全部', min: 0, max: Infinity },
  { label: '$1M - $10M', min: 1_000_000, max: 10_000_000 },
  { label: '$10M - $100M', min: 10_000_000, max: 100_000_000 },
  { label: '$100M+', min: 100_000_000, max: Infinity },
]

/**
 * 协议 URL 映射
 */
export const PROTOCOL_URLS: Record<string, string> = {
  'Uniswap V3': 'https://app.uniswap.org/pools',
  'Uniswap V2': 'https://app.uniswap.org/pools',
  'Aave V3': 'https://app.aave.com/',
  'Aave V2': 'https://app.aave.com/',
  'Curve': 'https://curve.fi/',
  'Compound': 'https://app.compound.finance/',
  'Balancer': 'https://app.balancer.fi/',
  'SushiSwap': 'https://www.sushi.com/pool',
  'PancakeSwap': 'https://pancakeswap.finance/liquidity',
  'Yearn Finance': 'https://yearn.finance/',
  'Lido': 'https://lido.fi/',
  'Rocket Pool': 'https://rocketpool.net/',
  'MakerDAO': 'https://app.makerdao.com/',
  'Convex': 'https://www.convexfinance.com/',
}

/**
 * 将池子分类
 */
export function categorizePool(pool: YieldPool): PoolCategory {
  if (pool.stablecoin) return 'stablecoin'
  if (pool.exposure === 'single') return 'single'
  if (pool.exposure === 'multi') return 'multi'
  return 'all'
}

/**
 * 根据分类筛选池子
 */
export function filterByCategory(
  pools: YieldPool[],
  category: PoolCategory
): YieldPool[] {
  if (category === 'all') return pools
  return pools.filter((pool) => categorizePool(pool) === category)
}

/**
 * 根据 TVL 范围筛选
 */
export function filterByTVL(
  pools: YieldPool[],
  range: TvlRange
): YieldPool[] {
  return pools.filter(
    (pool) => pool.tvlUsd >= range.min && pool.tvlUsd < range.max
  )
}

/**
 * 根据链筛选
 */
export function filterByChain(
  pools: YieldPool[],
  chain: string
): YieldPool[] {
  if (!chain || chain === 'all') return pools
  return pools.filter((pool) => pool.chain.toLowerCase() === chain.toLowerCase())
}

/**
 * 根据 IL 风险筛选
 */
export function filterByRisk(
  pools: YieldPool[],
  risk: string
): YieldPool[] {
  if (!risk || risk === 'all') return pools
  return pools.filter((pool) => pool.ilRisk.toLowerCase() === risk.toLowerCase())
}

/**
 * 排序池子
 */
export function sortPools(
  pools: YieldPool[],
  sortBy: SortOption
): YieldPool[] {
  const sorted = [...pools]

  switch (sortBy) {
    case 'apy_desc':
      return sorted.sort((a, b) => b.apy - a.apy)
    case 'apy_asc':
      return sorted.sort((a, b) => a.apy - b.apy)
    case 'tvl_desc':
      return sorted.sort((a, b) => b.tvlUsd - a.tvlUsd)
    case 'apy30d_desc':
      return sorted.sort((a, b) => {
        const aAvg = a.apyMean30d ?? 0
        const bAvg = b.apyMean30d ?? 0
        return bAvg - aAvg
      })
    default:
      return sorted
  }
}

/**
 * 获取协议官网 URL
 */
export function getProtocolUrl(projectName: string): string {
  // 精确匹配
  if (PROTOCOL_URLS[projectName]) {
    return PROTOCOL_URLS[projectName]
  }

  // 模糊匹配（去掉版本号）
  const baseName = projectName.split(' ')[0]
  for (const [key, url] of Object.entries(PROTOCOL_URLS)) {
    if (key.startsWith(baseName)) {
      return url
    }
  }

  // 默认返回 DeFiLlama 协议页面
  const slug = projectName.toLowerCase().replace(/\s+/g, '-')
  return `https://defillama.com/protocol/${slug}`
}

/**
 * 获取分类标签
 */
export function getCategoryLabel(category: PoolCategory): string {
  switch (category) {
    case 'stablecoin':
      return '稳定币'
    case 'single':
      return '单币质押'
    case 'multi':
      return '流动性挖矿'
    case 'all':
      return '全部'
  }
}

/**
 * 获取分类描述
 */
export function getCategoryDescription(category: PoolCategory): string {
  switch (category) {
    case 'stablecoin':
      return '低风险稳定币理财产品'
    case 'single':
      return '单币质押，无 IL 风险'
    case 'multi':
      return '高收益 LP 挖矿，存在 IL 风险'
    case 'all':
      return '所有收益率产品'
  }
}

/**
 * 获取热门投资品（按 APY 排序，只返回稳定币或主流币）
 */
export function getHotProducts(pools: YieldPool[], limit: number = 5): YieldPool[] {
  const mainTokens = ['USDT', 'USDC', 'DAI', 'ETH', 'BTC', 'SOL', 'MATIC']

  return pools
    .filter((pool) => {
      // 只选择稳定币或主流单币
      if (pool.stablecoin) return true
      if (pool.exposure === 'single') {
        return mainTokens.some((token) =>
          pool.symbol.toUpperCase().includes(token)
        )
      }
      return false
    })
    .sort((a, b) => b.apy - a.apy)
    .slice(0, limit)
}

/**
 * 格式化搜索查询
 */
export function normalizeSearchQuery(query: string): string {
  return query.toLowerCase().trim()
}

/**
 * 搜索池子
 */
export function searchPools(pools: YieldPool[], query: string): YieldPool[] {
  if (!query) return pools

  const normalized = normalizeSearchQuery(query)

  return pools.filter((pool) => {
    const project = pool.project.toLowerCase()
    const symbol = pool.symbol.toLowerCase()
    const chain = pool.chain.toLowerCase()

    return (
      project.includes(normalized) ||
      symbol.includes(normalized) ||
      chain.includes(normalized)
    )
  })
}

/**
 * 获取唯一的链列表
 */
export function getUniqueChains(pools: YieldPool[]): string[] {
  const chains = new Set(pools.map((pool) => pool.chain))
  return Array.from(chains).sort()
}

/**
 * 链名称到 Network ID 映射
 */
export const CHAIN_NETWORK_IDS: Record<string, number> = {
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
  fantom: 250,
  celo: 42220,
  gnosis: 100,
  moonbeam: 1284,
  moonriver: 1285,
  harmony: 1666600000,
  linea: 59144,
  'polygon-zkevm': 1101,
  zkSync: 324,
  scroll: 534352,
}

/**
 * 链名称到 PancakeSwap URL 参数映射
 */
const PANCAKESWAP_CHAIN_PARAMS: Record<string, string> = {
  bsc: 'bsc',
  ethereum: 'eth',
  arbitrum: 'arb',
  polygon: 'polygon',
  'polygon-zkevm': 'polygonZkEVM',
  base: 'base',
  linea: 'linea',
  opbnb: 'opBNB',
  zksync: 'zkSync',
  scroll: 'scroll',
}

/**
 * 聚合相同代币对的池子（用于 PancakeSwap V2/V3 等多版本池子）
 * 将同一代币对的多个池子合并，汇总 TVL 并计算加权平均 APY
 */
export function aggregatePools(pools: YieldPool[]): YieldPool[] {
  // 按项目分组（只聚合 PancakeSwap）
  const pancakePools = pools.filter(p =>
    p.project.toLowerCase().includes('pancakeswap')
  )
  const otherPools = pools.filter(p =>
    !p.project.toLowerCase().includes('pancakeswap')
  )

  // 按 chain + symbol 分组
  const groups = new Map<string, YieldPool[]>()

  for (const pool of pancakePools) {
    // 使用 chain + symbol 作为分组键
    // symbol 已经包含了代币对信息（如 "CAKE-WBNB"）
    const key = `${pool.chain.toLowerCase()}:${pool.symbol.toLowerCase()}`

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(pool)
  }

  // 聚合每个组
  const aggregatedPools: YieldPool[] = []

  for (const [key, groupPools] of groups.entries()) {
    // 如果只有一个池子，不需要聚合
    if (groupPools.length === 1) {
      aggregatedPools.push(groupPools[0])
      continue
    }

    // 计算聚合数据
    const totalTvl = groupPools.reduce((sum, p) => sum + p.tvlUsd, 0)

    // 按 TVL 加权平均 APY
    const weightedApy = groupPools.reduce((sum, p) => {
      const weight = p.tvlUsd / totalTvl
      return sum + p.apy * weight
    }, 0)

    // 按 TVL 加权平均 Base APY
    const weightedApyBase = groupPools.reduce((sum, p) => {
      const weight = p.tvlUsd / totalTvl
      const apyBase = p.apyBase || 0
      return sum + apyBase * weight
    }, 0)

    // 按 TVL 加权平均 Reward APY
    const weightedApyReward = groupPools.reduce((sum, p) => {
      const weight = p.tvlUsd / totalTvl
      const apyReward = p.apyReward || 0
      return sum + apyReward * weight
    }, 0)

    // 计算 30 天平均 APY（如果有）
    const poolsWithMean = groupPools.filter(p => p.apyMean30d !== null)
    const weightedApyMean30d = poolsWithMean.length > 0
      ? poolsWithMean.reduce((sum, p) => {
          const weight = p.tvlUsd / totalTvl
          return sum + (p.apyMean30d || 0) * weight
        }, 0)
      : null

    // 使用 TVL 最大的池子作为基础
    const basePool = groupPools.reduce((max, p) =>
      p.tvlUsd > max.tvlUsd ? p : max
    )

    // 收集所有版本信息
    const versions = groupPools
      .map(p => {
        if (p.poolMeta) return p.poolMeta
        if (p.project.toLowerCase().includes('v3')) return 'V3'
        if (p.project.toLowerCase().includes('v2')) return 'V2'
        return null
      })
      .filter((v): v is string => v !== null)

    const uniqueVersions = Array.from(new Set(versions))

    // 创建聚合池子
    const aggregatedPool: YieldPool = {
      ...basePool,
      tvlUsd: totalTvl,
      apy: weightedApy,
      apyBase: weightedApyBase > 0 ? weightedApyBase : null,
      apyReward: weightedApyReward > 0 ? weightedApyReward : null,
      apyMean30d: weightedApyMean30d,
      // 添加聚合信息到 poolMeta
      poolMeta: uniqueVersions.length > 0
        ? `聚合 (${uniqueVersions.join(', ')})`
        : '聚合',
      // 使用第一个池子的 ID，但添加标记
      pool: `${basePool.pool}-aggregated-${groupPools.length}`,
    }

    aggregatedPools.push(aggregatedPool)
  }

  // 合并聚合后的 PancakeSwap 池子和其他池子
  return [...aggregatedPools, ...otherPools]
}

/**
 * 获取池子的投资链接（认购链接）
 */
export function getPoolInvestUrl(pool: YieldPool): string {
  const { project, chain, pool: poolId, underlyingTokens, symbol } = pool
  const projectLower = project.toLowerCase()
  const chainLower = chain.toLowerCase()

  // PancakeSwap
  if (projectLower.includes('pancakeswap')) {
    const chainParam = PANCAKESWAP_CHAIN_PARAMS[chainLower]

    // 如果有底层代币地址，构建精确的添加流动性链接
    if (underlyingTokens && underlyingTokens.length >= 2) {
      const [token0, token1] = underlyingTokens
      const baseUrl = 'https://pancakeswap.finance'

      // 构建查询参数
      const params = new URLSearchParams()
      if (chainParam && chainParam !== 'bsc') {
        params.append('chain', chainParam)
      }

      // V3 池子
      if (projectLower.includes('v3')) {
        params.append('v', '3')
      }

      const queryString = params.toString()
      return `${baseUrl}/add/${token0}/${token1}${queryString ? `?${queryString}` : ''}`
    }

    // 如果有链参数，使用链参数
    if (chainParam) {
      return `https://pancakeswap.finance/liquidity/pools?chain=${chainParam}`
    }

    return 'https://pancakeswap.finance/liquidity'
  }

  // Uniswap
  if (projectLower.includes('uniswap')) {
    return 'https://app.uniswap.org/pools'
  }

  // Aave
  if (projectLower.includes('aave')) {
    return 'https://app.aave.com/'
  }

  // Curve
  if (projectLower.includes('curve')) {
    return `https://curve.fi/#/${chainLower}/pools`
  }

  // Compound
  if (projectLower.includes('compound')) {
    return 'https://app.compound.finance/'
  }

  // Balancer
  if (projectLower.includes('balancer')) {
    return 'https://app.balancer.fi/#/pools'
  }

  // SushiSwap
  if (projectLower.includes('sushi')) {
    return 'https://www.sushi.com/pool'
  }

  // Yearn
  if (projectLower.includes('yearn')) {
    return 'https://yearn.finance/vaults'
  }

  // Lido
  if (projectLower.includes('lido')) {
    return 'https://lido.fi/'
  }

  // Rocket Pool
  if (projectLower.includes('rocket')) {
    return 'https://rocketpool.net/node-operators'
  }

  // Convex
  if (projectLower.includes('convex')) {
    return 'https://www.convexfinance.com/stake'
  }

  // 默认返回 DeFiLlama 池子页面
  return `https://defillama.com/yields/pool/${poolId}`
}
