/**
 * Moralis API 配置
 * 支持的 EVM 链及其配置信息
 */

import type { EvmChain, ChainConfig } from '@/types/database'

/**
 * 支持的链配置
 * Moralis 支持多条 EVM 链，使用统一的地址格式
 */
export const CHAIN_CONFIGS: Record<EvmChain, ChainConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    explorer_url: 'https://etherscan.io',
    native_token: {
      symbol: 'ETH',
      decimals: 18,
    },
    moralis_chain_id: '0x1', // Mainnet
  },
  bsc: {
    id: 'bsc',
    name: 'BNB Smart Chain',
    explorer_url: 'https://bscscan.com',
    native_token: {
      symbol: 'BNB',
      decimals: 18,
    },
    moralis_chain_id: '0x38',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    explorer_url: 'https://polygonscan.com',
    native_token: {
      symbol: 'MATIC',
      decimals: 18,
    },
    moralis_chain_id: '0x89',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    explorer_url: 'https://arbiscan.io',
    native_token: {
      symbol: 'ETH',
      decimals: 18,
    },
    moralis_chain_id: '0xa4b1',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    explorer_url: 'https://optimistic.etherscan.io',
    native_token: {
      symbol: 'ETH',
      decimals: 18,
    },
    moralis_chain_id: '0xa',
  },
  base: {
    id: 'base',
    name: 'Base',
    explorer_url: 'https://basescan.org',
    native_token: {
      symbol: 'ETH',
      decimals: 18,
    },
    moralis_chain_id: '0x2105',
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche C-Chain',
    explorer_url: 'https://snowtrace.io',
    native_token: {
      symbol: 'AVAX',
      decimals: 18,
    },
    moralis_chain_id: '0xa86a',
  },
  fantom: {
    id: 'fantom',
    name: 'Fantom',
    explorer_url: 'https://ftmscan.com',
    native_token: {
      symbol: 'FTM',
      decimals: 18,
    },
    moralis_chain_id: '0xfa',
  },
  cronos: {
    id: 'cronos',
    name: 'Cronos',
    explorer_url: 'https://cronoscan.com',
    native_token: {
      symbol: 'CRO',
      decimals: 18,
    },
    moralis_chain_id: '0x19',
  },
  gnosis: {
    id: 'gnosis',
    name: 'Gnosis Chain',
    explorer_url: 'https://gnosisscan.io',
    native_token: {
      symbol: 'xDAI',
      decimals: 18,
    },
    moralis_chain_id: '0x64',
  },
  linea: {
    id: 'linea',
    name: 'Linea',
    explorer_url: 'https://lineascan.build',
    native_token: {
      symbol: 'ETH',
      decimals: 18,
    },
    moralis_chain_id: '0xe708',
  },
  zksync: {
    id: 'zksync',
    name: 'zkSync Era',
    explorer_url: 'https://explorer.zksync.io',
    native_token: {
      symbol: 'ETH',
      decimals: 18,
    },
    moralis_chain_id: '0x144',
  },
}

/**
 * 默认查询的主要链（用于初始加载）
 * 按 TVL 和用户量排序
 */
export const DEFAULT_CHAINS: EvmChain[] = [
  'ethereum',
  'bsc',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
]

/**
 * 获取链配置
 */
export function getChainConfig(chain: EvmChain): ChainConfig {
  return CHAIN_CONFIGS[chain]
}

/**
 * 获取所有支持的链
 */
export function getAllChains(): EvmChain[] {
  return Object.keys(CHAIN_CONFIGS) as EvmChain[]
}

/**
 * 验证链是否支持
 */
export function isChainSupported(chain: string): chain is EvmChain {
  return chain in CHAIN_CONFIGS
}

/**
 * 根据 Moralis Chain ID 获取链配置
 */
export function getChainByMoralisId(moralisChainId: string): ChainConfig | undefined {
  return Object.values(CHAIN_CONFIGS).find(
    (config) => config.moralis_chain_id.toLowerCase() === moralisChainId.toLowerCase()
  )
}

/**
 * Moralis API 基础配置
 */
export const MORALIS_CONFIG = {
  BASE_URL: 'https://deep-index.moralis.io/api/v2.2',

  // API 限制（免费版）
  RATE_LIMIT: {
    requestsPerSecond: 5,
    requestsPerDay: 40000,
  },

  // 缓存配置
  CACHE: {
    // 余额缓存 5 分钟
    BALANCE_TTL: 5 * 60 * 1000,

    // NFT 缓存 15 分钟
    NFT_TTL: 15 * 60 * 1000,

    // 交易历史缓存 10 分钟
    TRANSACTION_TTL: 10 * 60 * 1000,

    // 完整快照缓存 1 小时
    FULL_SNAPSHOT_TTL: 60 * 60 * 1000,
  },

  // 默认分页
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 500,
} as const

/**
 * 格式化地址（转为小写）
 */
export function formatAddress(address: string): string {
  return address.toLowerCase()
}

/**
 * 验证以太坊地址格式
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}
