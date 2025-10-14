/**
 * DexScreener API 类型定义
 *
 * API 文档: https://docs.dexscreener.com/api/reference
 */

/**
 * 链 ID（支持的区块链）
 */
export type ChainId =
  | 'ethereum'
  | 'bsc'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'avalanche'
  | 'fantom'
  | 'base'
  | 'zksync'
  | 'solana'
  // ... 更多链

/**
 * 交易对信息
 */
export interface DexPair {
  chainId: string
  dexId: string
  url: string
  pairAddress: string
  labels?: string[]

  // 代币信息
  baseToken: {
    address: string
    name: string
    symbol: string
  }
  quoteToken: {
    address: string
    name: string
    symbol: string
  }

  // 价格数据
  priceNative: string
  priceUsd: string

  // 交易量
  txns: {
    m5: { buys: number; sells: number }
    h1: { buys: number; sells: number }
    h6: { buys: number; sells: number }
    h24: { buys: number; sells: number }
  }

  // 成交量
  volume: {
    h24: number
    h6: number
    h1: number
    m5: number
  }

  // 价格变化百分比
  priceChange: {
    m5: number
    h1: number
    h6: number
    h24: number
  }

  // 流动性
  liquidity?: {
    usd?: number
    base?: number
    quote?: number
  }

  // 完全稀释估值
  fdv?: number

  // 市值
  marketCap?: number

  // 创建时间
  pairCreatedAt?: number

  // 其他信息
  info?: {
    imageUrl?: string
    header?: string
    openGraph?: string
    websites?: Array<{ label: string; url: string }>
    socials?: Array<{ type: string; url: string }>
  }

  // Boost 信息
  boosts?: {
    active: number
  }
}

/**
 * 搜索结果
 */
export interface DexSearchResponse {
  schemaVersion: string
  pairs: DexPair[]
}

/**
 * Token Boosts（推广的代币）
 */
export interface TokenBoost {
  url: string
  chainId: string
  tokenAddress: string
  icon?: string
  header?: string
  openGraph?: string
  description?: string
  links?: Array<{
    type: string
    label: string
    url: string
  }>
  amount: number
  totalAmount: number
}

/**
 * Token Boosts 响应
 */
export interface TokenBoostsResponse {
  [tokenAddress: string]: TokenBoost
}

/**
 * Token Profile（代币资料）
 */
export interface TokenProfile {
  url: string
  chainId: string
  tokenAddress: string
  icon?: string
  header?: string
  openGraph?: string
  description?: string
  links?: Array<{
    type: string
    label: string
    url: string
  }>
}

/**
 * Token Profiles 响应
 */
export interface TokenProfilesResponse {
  [tokenAddress: string]: TokenProfile
}

/**
 * API 错误
 */
export interface DexScreenerError {
  error: string
  message?: string
}

/**
 * 类型守卫：判断是否为错误响应
 */
export function isDexScreenerError(obj: unknown): obj is DexScreenerError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as DexScreenerError).error === 'string'
  )
}

/**
 * 筛选选项
 */
export interface DexScreenerFilters {
  // 最小流动性（USD）
  minLiquidity?: number

  // 最小24h成交量（USD）
  minVolume24h?: number

  // 最小市值（USD）
  minMarketCap?: number

  // 价格变化筛选
  minPriceChange24h?: number
  maxPriceChange24h?: number

  // 交易笔数筛选
  minTxns24h?: number

  // 只显示 Boosted 代币
  boostedOnly?: boolean
}
