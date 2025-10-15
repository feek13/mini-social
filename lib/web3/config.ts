/**
 * Web3 服务配置和路由规则
 */

import type { EvmChain } from '@/types/database'
import type { Web3Provider, RateLimitConfig, CacheConfig } from './types'

// ============ 链配置 ============

export interface ChainConfig {
  name: string
  nativeToken: {
    symbol: string
    decimals: number
  }
  // 每个链的优先服务提供商顺序
  providers: Web3Provider[]
}

export const CHAIN_CONFIGS: Record<EvmChain, ChainConfig> = {
  ethereum: {
    name: 'Ethereum',
    nativeToken: { symbol: 'ETH', decimals: 18 },
    providers: ['alchemy', 'ankr', 'coingecko'],
  },
  polygon: {
    name: 'Polygon',
    nativeToken: { symbol: 'MATIC', decimals: 18 },
    providers: ['alchemy', 'ankr', 'coingecko'],
  },
  bsc: {
    name: 'BNB Smart Chain',
    nativeToken: { symbol: 'BNB', decimals: 18 },
    providers: ['ankr', 'coingecko'],
  },
  arbitrum: {
    name: 'Arbitrum One',
    nativeToken: { symbol: 'ETH', decimals: 18 },
    providers: ['alchemy', 'ankr', 'coingecko'],
  },
  optimism: {
    name: 'Optimism',
    nativeToken: { symbol: 'ETH', decimals: 18 },
    providers: ['alchemy', 'ankr', 'coingecko'],
  },
  base: {
    name: 'Base',
    nativeToken: { symbol: 'ETH', decimals: 18 },
    providers: ['alchemy', 'ankr', 'coingecko'],
  },
  avalanche: {
    name: 'Avalanche C-Chain',
    nativeToken: { symbol: 'AVAX', decimals: 18 },
    providers: ['ankr', 'coingecko'],
  },
  fantom: {
    name: 'Fantom',
    nativeToken: { symbol: 'FTM', decimals: 18 },
    providers: ['ankr', 'coingecko'],
  },
  cronos: {
    name: 'Cronos',
    nativeToken: { symbol: 'CRO', decimals: 18 },
    providers: ['ankr', 'coingecko'],
  },
  gnosis: {
    name: 'Gnosis',
    nativeToken: { symbol: 'XDAI', decimals: 18 },
    providers: ['ankr', 'coingecko'],
  },
  linea: {
    name: 'Linea',
    nativeToken: { symbol: 'ETH', decimals: 18 },
    providers: ['ankr', 'coingecko'],
  },
  zksync: {
    name: 'zkSync Era',
    nativeToken: { symbol: 'ETH', decimals: 18 },
    providers: ['ankr', 'coingecko'],
  },
}

// ============ 数据类型路由 ============

export type DataType = 'balance' | 'tokens' | 'nfts' | 'transactions' | 'prices'

/**
 * 获取数据类型的优先服务商
 */
export function getProvidersForDataType(
  dataType: DataType,
  chain: EvmChain
): Web3Provider[] {
  // 价格数据总是优先使用 CoinGecko
  if (dataType === 'prices') {
    return ['coingecko']
  }

  // 其他数据类型按链配置
  return CHAIN_CONFIGS[chain]?.providers || ['ankr']
}

// ============ 限流配置 ============

export const RATE_LIMITS: Record<Web3Provider, RateLimitConfig> = {
  alchemy: {
    requestsPerSecond: 25,  // 300M CU/月 ≈ 25 req/s
    burstSize: 100,
  },
  ankr: {
    requestsPerSecond: 10,  // 公开 RPC 限制
    burstSize: 30,
  },
  coingecko: {
    requestsPerSecond: 0.5,  // 30 req/min ≈ 0.5 req/s
    burstSize: 10,
  },
}

// ============ 缓存配置 ============

export const CACHE_CONFIGS: Record<DataType, CacheConfig> = {
  balance: {
    ttl: 60,          // 1 分钟
    enabled: true,
  },
  tokens: {
    ttl: 60,          // 1 分钟
    enabled: true,
  },
  nfts: {
    ttl: 3600,        // 1 小时
    enabled: true,
  },
  transactions: {
    ttl: 60,          // 1 分钟
    enabled: true,
  },
  prices: {
    ttl: 300,         // 5 分钟
    enabled: true,
  },
}

// ============ 环境变量 ============

export const PROVIDER_CONFIGS = {
  alchemy: {
    apiKey: process.env.ALCHEMY_API_KEY || '',
    baseURL: 'https://api.alchemy.com/v2',
  },
  ankr: {
    apiKey: process.env.ANKR_API_KEY || '',
    baseURL: 'https://rpc.ankr.com/multichain',
  },
  coingecko: {
    apiKey: process.env.COINGECKO_API_KEY || '',  // 免费版无需
    baseURL: 'https://api.coingecko.com/api/v3',
  },
} as const

// ============ 辅助函数 ============

/**
 * 获取链配置
 */
export function getChainConfig(chain: EvmChain): ChainConfig {
  const config = CHAIN_CONFIGS[chain]
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`)
  }
  return config
}

/**
 * 检查服务商是否支持该链
 */
export function isProviderSupported(
  provider: Web3Provider,
  chain: EvmChain
): boolean {
  const config = CHAIN_CONFIGS[chain]
  return config?.providers.includes(provider) ?? false
}

/**
 * 获取默认支持的链列表
 * 优化：只加载主链，其他链按需加载（懒加载）
 */
export const DEFAULT_CHAINS: EvmChain[] = [
  'ethereum',  // 主链，90% 用户主要使用
  // 'polygon',  // 按需加载
  // 'bsc',      // 按需加载
  // 'arbitrum', // 按需加载
  // 'optimism', // 按需加载
  // 'base',     // 按需加载
]

/**
 * 快速加载链（优先级高）
 */
export const PRIORITY_CHAINS: EvmChain[] = ['ethereum', 'bsc']

/**
 * 完整链列表（用于懒加载）
 */
export const ALL_CHAINS: EvmChain[] = [
  'ethereum',
  'polygon',
  'bsc',
  'arbitrum',
  'optimism',
  'base',
]

/**
 * Alchemy 支持的链
 */
export const ALCHEMY_SUPPORTED_CHAINS: EvmChain[] = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
]

/**
 * Ankr 支持的链（更多）
 */
export const ANKR_SUPPORTED_CHAINS: EvmChain[] = [
  'ethereum',
  'polygon',
  'bsc',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'fantom',
  'cronos',
  'gnosis',
  'linea',
  'zksync',
]
