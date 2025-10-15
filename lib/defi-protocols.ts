/**
 * DeFi 协议识别工具
 * 根据合约地址和交易记录识别用户使用的 DeFi 协议
 */

import type { MoralisTransaction } from '@/types/database'

export interface DeFiProtocol {
  id: string
  name: string
  category: 'DEX' | 'Lending' | 'Staking' | 'Yield' | 'Bridge' | 'Derivatives' | 'Other'
  logo?: string
  website?: string
  contracts: Record<string, string[]> // chain -> addresses
}

/**
 * 主流 DeFi 协议合约地址映射
 */
export const DEFI_PROTOCOLS: DeFiProtocol[] = [
  // DEX
  {
    id: 'uniswap',
    name: 'Uniswap',
    category: 'DEX',
    website: 'https://uniswap.org',
    contracts: {
      ethereum: [
        '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // UniswapV2Router02
        '0xe592427a0aece92de3edee1f18e0157c05861564', // SwapRouter
        '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // SwapRouter02
      ],
      polygon: ['0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff'],
      arbitrum: ['0xe592427a0aece92de3edee1f18e0157c05861564'],
      optimism: ['0xe592427a0aece92de3edee1f18e0157c05861564'],
      base: ['0x2626664c2603336e57b271c5c0b26f421741e481'],
    },
  },
  {
    id: 'pancakeswap',
    name: 'PancakeSwap',
    category: 'DEX',
    website: 'https://pancakeswap.finance',
    contracts: {
      bsc: [
        '0x10ed43c718714eb63d5aa57b78b54704e256024e', // PancakeRouter
        '0x13f4ea83d0bd40e75c8222255bc855a974568dd4', // SwapRouter
      ],
      ethereum: ['0xefc56627233b02ea95bae7e19f648d7dcd5bb132'],
      arbitrum: ['0x8ccddfd6b9dff9c1e5e0c99e2d3b0cbfc53f7f9f'],
    },
  },
  {
    id: 'sushiswap',
    name: 'SushiSwap',
    category: 'DEX',
    website: 'https://sushi.com',
    contracts: {
      ethereum: ['0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f'],
      polygon: ['0x1b02da8cb0d097eb8d57a175b88c7d8b47997506'],
      arbitrum: ['0x1b02da8cb0d097eb8d57a175b88c7d8b47997506'],
      bsc: ['0x1b02da8cb0d097eb8d57a175b88c7d8b47997506'],
    },
  },

  // Lending
  {
    id: 'aave',
    name: 'Aave',
    category: 'Lending',
    website: 'https://aave.com',
    contracts: {
      ethereum: [
        '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9', // LendingPoolV2
        '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2', // PoolV3
      ],
      polygon: ['0x794a61358d6845594f94dc1db02a252b5b4814ad'],
      arbitrum: ['0x794a61358d6845594f94dc1db02a252b5b4814ad'],
      optimism: ['0x794a61358d6845594f94dc1db02a252b5b4814ad'],
      avalanche: ['0x794a61358d6845594f94dc1db02a252b5b4814ad'],
      base: ['0xa238dd80c259a72e81d7e4664a9801593f98d1c5'],
    },
  },
  {
    id: 'compound',
    name: 'Compound',
    category: 'Lending',
    website: 'https://compound.finance',
    contracts: {
      ethereum: [
        '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b', // Comptroller
        '0xc3d688b66703497daa19211eedff47f25384cdc3', // cETH
      ],
      polygon: ['0x20ca53e2395fa571798623f1cfbd11fe2c114c24'],
      arbitrum: ['0x2e44e174f7d53f0212823acc11c01a11d58c5bcb'],
    },
  },

  // Staking & Liquid Staking
  {
    id: 'lido',
    name: 'Lido',
    category: 'Staking',
    website: 'https://lido.fi',
    contracts: {
      ethereum: [
        '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', // stETH
        '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // wstETH
      ],
      polygon: ['0x9ee91f9f426fa633d227f7a9b000e28b9dfd8599'],
    },
  },
  {
    id: 'rocketpool',
    name: 'Rocket Pool',
    category: 'Staking',
    website: 'https://rocketpool.net',
    contracts: {
      ethereum: [
        '0xae78736cd615f374d3085123a210448e74fc6393', // rETH
      ],
    },
  },

  // Yield Aggregators
  {
    id: 'yearn',
    name: 'Yearn Finance',
    category: 'Yield',
    website: 'https://yearn.finance',
    contracts: {
      ethereum: [
        '0xba2e7fed597fd0e3e70f5130bcdbbfe06bb94fe1', // YFI
      ],
      polygon: ['0xda537104d6a5edd53c6fbba9a898708e465260b6'],
      arbitrum: ['0xaf88d065e77c8cc2239327c5edb3a432268e5831'],
    },
  },

  // Bridges
  {
    id: 'stargate',
    name: 'Stargate',
    category: 'Bridge',
    website: 'https://stargate.finance',
    contracts: {
      ethereum: ['0x8731d54e9d02c286767d56ac03e8037c07e01e98'],
      bsc: ['0x4a364f8c717caad9a442737eb7b8a55cc6cf18d8'],
      polygon: ['0x45a01e4e04f14f7a4a6702c74187c5f6222033cd'],
      arbitrum: ['0x53bf833a5d6c4dda888f69c22c88c9f356a41614'],
      optimism: ['0xb0d502e938ed5f4df2e681fe6e419ff29631d62b'],
      avalanche: ['0x45a01e4e04f14f7a4a6702c74187c5f6222033cd'],
    },
  },
  {
    id: 'across',
    name: 'Across Protocol',
    category: 'Bridge',
    website: 'https://across.to',
    contracts: {
      ethereum: ['0x5c7bcd6e7de5423a257d81b442095a1a6ced35c5'],
      polygon: ['0x69b5c72837769ef1e7c164abc6515dcb5bc9e5e7'],
      arbitrum: ['0xe35e9842fceaca96570b734083f4a58e8f7c5f2a'],
      optimism: ['0xa420b2d1c0841415a695b81e5b867bcd07dff8c9'],
      base: ['0x09aea4b2242abc8bb4bb78d537a67a245a7bec64'],
    },
  },

  // Perpetuals
  {
    id: 'gmx',
    name: 'GMX',
    category: 'Derivatives',
    website: 'https://gmx.io',
    contracts: {
      arbitrum: [
        '0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a', // GMX
        '0x489ee077994b6658eafa855c308275ead8097c4a', // GLP
      ],
      avalanche: ['0x62edc0692bd897d2295872a9ffcac5425011c661'],
    },
  },
]

/**
 * 从交易记录中识别使用的 DeFi 协议
 */
export function identifyDeFiProtocols(
  transactions: MoralisTransaction[],
  chain: string
): Array<{ protocol: DeFiProtocol; interactions: number }> {
  const protocolMap = new Map<string, number>()

  // 防御性检查：确保 transactions 是数组
  if (!Array.isArray(transactions)) {
    console.warn('[DeFi Protocols] transactions 不是数组，使用空数组')
    return []
  }

  transactions.forEach((tx) => {
    const toAddress = tx.to_address?.toLowerCase()
    if (!toAddress) return

    DEFI_PROTOCOLS.forEach((protocol) => {
      const chainContracts = protocol.contracts[chain]?.map((addr) => addr.toLowerCase()) || []

      if (chainContracts.includes(toAddress)) {
        const count = protocolMap.get(protocol.id) || 0
        protocolMap.set(protocol.id, count + 1)
      }
    })
  })

  // 转换为数组并排序
  return Array.from(protocolMap.entries())
    .map(([id, interactions]) => ({
      protocol: DEFI_PROTOCOLS.find((p) => p.id === id)!,
      interactions,
    }))
    .sort((a, b) => b.interactions - a.interactions)
}

/**
 * 检查地址是否是已知的 DeFi 协议合约
 */
export function isDeFiProtocol(address: string, chain: string): {
  isDefi: boolean
  protocol?: DeFiProtocol
} {
  const lowerAddress = address.toLowerCase()

  for (const protocol of DEFI_PROTOCOLS) {
    const chainContracts = protocol.contracts[chain]?.map((addr) => addr.toLowerCase()) || []
    if (chainContracts.includes(lowerAddress)) {
      return { isDefi: true, protocol }
    }
  }

  return { isDefi: false }
}

/**
 * 获取协议类别的显示信息
 */
export function getCategoryInfo(category: DeFiProtocol['category']): {
  label: string
  color: string
  icon: string
} {
  switch (category) {
    case 'DEX':
      return { label: '去中心化交易所', color: 'blue', icon: '🔄' }
    case 'Lending':
      return { label: '借贷协议', color: 'green', icon: '🏦' }
    case 'Staking':
      return { label: '质押协议', color: 'purple', icon: '🔒' }
    case 'Yield':
      return { label: '收益聚合器', color: 'yellow', icon: '🌾' }
    case 'Bridge':
      return { label: '跨链桥', color: 'indigo', icon: '🌉' }
    case 'Derivatives':
      return { label: '衍生品', color: 'red', icon: '📈' }
    default:
      return { label: '其他', color: 'gray', icon: '⚡' }
  }
}
