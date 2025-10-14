/**
 * DeFi 协议别名映射
 * 用于支持多种搜索关键词找到同一个协议
 */

export interface ProtocolAlias {
  slug: string // DeFiLlama 官方 slug
  displayName: string // 显示名称
  aliases: string[] // 别名列表（小写）
  category?: string // 分类
}

/**
 * 热门协议别名配置
 */
export const PROTOCOL_ALIASES: ProtocolAlias[] = [
  // DEX
  {
    slug: 'uniswap',
    displayName: 'Uniswap',
    aliases: ['uni', 'uniswap v2', 'uniswap v3', 'uniswap v4'],
    category: 'Dexes'
  },
  {
    slug: 'pancakeswap',
    displayName: 'PancakeSwap',
    aliases: ['pancake', 'cake', 'pcs', 'pancakeswap v2', 'pancakeswap v3'],
    category: 'Dexes'
  },
  {
    slug: 'curve-dex',
    displayName: 'Curve',
    aliases: ['curve', 'crv', 'curve finance'],
    category: 'Dexes'
  },
  {
    slug: 'balancer',
    displayName: 'Balancer',
    aliases: ['bal', 'balancer v2'],
    category: 'Dexes'
  },
  {
    slug: 'sushiswap',
    displayName: 'SushiSwap',
    aliases: ['sushi', 'sushiswap v2'],
    category: 'Dexes'
  },

  // 借贷协议
  {
    slug: 'aave',
    displayName: 'Aave',
    aliases: ['aave v2', 'aave v3', 'aave arc'],
    category: 'Lending'
  },
  {
    slug: 'aave-v3',
    displayName: 'Aave V3',
    aliases: ['aave 3', 'aavev3'],
    category: 'Lending'
  },
  {
    slug: 'compound',
    displayName: 'Compound',
    aliases: ['comp', 'compound v2', 'compound v3'],
    category: 'Lending'
  },
  {
    slug: 'makerdao',
    displayName: 'MakerDAO',
    aliases: ['maker', 'mkr', 'dai'],
    category: 'CDP'
  },
  {
    slug: 'spark',
    displayName: 'Spark Protocol',
    aliases: ['spark', 'sparkdao'],
    category: 'Lending'
  },

  // 收益协议
  {
    slug: 'lido',
    displayName: 'Lido',
    aliases: ['ldo', 'steth', 'lido finance'],
    category: 'Liquid Staking'
  },
  {
    slug: 'yearn-finance',
    displayName: 'Yearn Finance',
    aliases: ['yearn', 'yfi', 'yvault'],
    category: 'Yield'
  },
  {
    slug: 'convex-finance',
    displayName: 'Convex Finance',
    aliases: ['convex', 'cvx'],
    category: 'Yield'
  },
  {
    slug: 'rocket-pool',
    displayName: 'Rocket Pool',
    aliases: ['rpl', 'rocketpool', 'reth'],
    category: 'Liquid Staking'
  },

  // 衍生品
  {
    slug: 'gmx',
    displayName: 'GMX',
    aliases: ['gmx v1', 'gmx v2'],
    category: 'Derivatives'
  },
  {
    slug: 'dydx',
    displayName: 'dYdX',
    aliases: ['dydx v3', 'dydx v4'],
    category: 'Derivatives'
  },
  {
    slug: 'synthetix',
    displayName: 'Synthetix',
    aliases: ['snx', 'synthetix v2', 'synthetix v3'],
    category: 'Derivatives'
  },

  // 跨链桥
  {
    slug: 'stargate',
    displayName: 'Stargate Finance',
    aliases: ['stargate', 'stg'],
    category: 'Bridge'
  },

  // 其他热门协议
  {
    slug: 'justlend',
    displayName: 'JustLend',
    aliases: ['just lend', 'jst', 'tron lend'],
    category: 'Lending'
  },
  {
    slug: 'benqi',
    displayName: 'BENQI',
    aliases: ['qi', 'benqi lending', 'benqi liquid staking'],
    category: 'Lending'
  },
]

/**
 * 热门协议快捷选择配置
 */
export interface QuickProtocol {
  slug: string
  name: string
  logo?: string
  category: string
  description: string
}

export const QUICK_PROTOCOLS: QuickProtocol[] = [
  {
    slug: 'uniswap',
    name: 'Uniswap',
    category: 'DEX',
    description: '最大的去中心化交易所'
  },
  {
    slug: 'pancakeswap',
    name: 'PancakeSwap',
    category: 'DEX',
    description: 'BSC 生态最大的 DEX'
  },
  {
    slug: 'aave',
    name: 'Aave',
    category: '借贷',
    description: '领先的借贷协议'
  },
  {
    slug: 'lido',
    name: 'Lido',
    category: '质押',
    description: '最大的流动性质押协议'
  },
  {
    slug: 'curve-dex',
    name: 'Curve',
    category: 'DEX',
    description: '稳定币交易专家'
  },
  {
    slug: 'makerdao',
    name: 'MakerDAO',
    category: 'CDP',
    description: 'DAI 稳定币发行方'
  },
]

/**
 * 搜索协议（支持别名匹配）
 * @param query 搜索关键词
 * @returns 匹配的协议 slug 列表
 */
export function searchProtocolsByAlias(query: string): string[] {
  if (!query.trim()) return []

  const lowerQuery = query.toLowerCase().trim()
  const results: { slug: string; score: number }[] = []

  for (const protocol of PROTOCOL_ALIASES) {
    let score = 0

    // 完全匹配 slug（最高优先级）
    if (protocol.slug === lowerQuery) {
      score = 100
    }
    // 完全匹配显示名称（次高优先级）
    else if (protocol.displayName.toLowerCase() === lowerQuery) {
      score = 90
    }
    // 完全匹配别名
    else if (protocol.aliases.some(alias => alias === lowerQuery)) {
      score = 80
    }
    // slug 包含查询
    else if (protocol.slug.includes(lowerQuery)) {
      score = 60
    }
    // 显示名称包含查询
    else if (protocol.displayName.toLowerCase().includes(lowerQuery)) {
      score = 50
    }
    // 别名包含查询
    else if (protocol.aliases.some(alias => alias.includes(lowerQuery))) {
      score = 40
    }

    if (score > 0) {
      results.push({ slug: protocol.slug, score })
    }
  }

  // 按分数排序并返回 slug
  return results
    .sort((a, b) => b.score - a.score)
    .map(r => r.slug)
}

/**
 * 根据 slug 获取协议别名信息
 */
export function getProtocolAlias(slug: string): ProtocolAlias | undefined {
  return PROTOCOL_ALIASES.find(p => p.slug === slug)
}

/**
 * 获取所有已配置别名的协议 slugs
 */
export function getAllAliasedProtocolSlugs(): string[] {
  return PROTOCOL_ALIASES.map(p => p.slug)
}
