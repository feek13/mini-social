/**
 * 统一的 Web3 数据类型定义
 * 兼容 Alchemy, Ankr, Covalent 等多个服务
 */

import type { EvmChain } from '@/types/database'

// ============ 通用类型 ============

export type Web3Provider = 'alchemy' | 'ankr' | 'coingecko'

export interface ProviderConfig {
  apiKey: string
  baseURL?: string
  timeout?: number
  retries?: number
}

// ============ 钱包余额相关 ============

/**
 * 原生代币余额
 */
export interface NativeBalance {
  balance: string              // Wei 格式
  balance_formatted: string    // 人类可读格式
  balance_usd?: number         // USD 价值
  symbol: string               // 代币符号 (ETH, BNB, etc.)
  decimals: number             // 精度
}

/**
 * ERC20 代币余额
 */
export interface TokenBalance {
  token_address: string
  token_name: string
  token_symbol: string
  token_decimals: number
  balance: string              // 原始余额
  balance_formatted: string    // 格式化余额
  usd_price?: number          // USD 价格
  usd_value?: number          // USD 价值
  logo?: string               // 代币 logo
  thumbnail?: string          // 缩略图
}

/**
 * NFT 数据
 */
export interface NFT {
  token_id: string
  contract_address: string
  contract_type: 'ERC721' | 'ERC1155'
  name?: string
  symbol?: string
  token_uri?: string
  metadata?: NFTMetadata
  image_url?: string
  collection_name?: string
  quantity?: string           // ERC1155 数量
}

export interface NFTMetadata {
  name?: string
  description?: string
  image?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
}

/**
 * 交易记录
 */
export interface Transaction {
  hash: string
  from_address: string
  to_address: string
  value: string
  gas: string
  gas_price: string
  block_number: number
  block_timestamp: string
  status?: 'success' | 'failed'
  method?: string
}

// ============ 钱包快照 ============

export interface WalletSnapshot {
  address: string
  chains: ChainSnapshot[]
  total_chains: number
  total_value_usd: number
  updated_at: string
}

export interface ChainSnapshot {
  chain: EvmChain
  native_balance: NativeBalance
  tokens: TokenBalance[]
  nfts_count: number
  balance_usd: number
}

// ============ 价格数据 ============

export interface TokenPrice {
  token_address: string
  chain: EvmChain
  usd_price: number
  usd_price_24h_change?: number
  usd_market_cap?: number
  usd_24h_volume?: number
  last_updated: string
}

export interface PriceQueryResult {
  [key: string]: {  // key: `${chain}:${address}`
    usdPrice: number
    usdPriceFormatted: string
  }
}

// ============ 错误处理 ============

export class Web3ProviderError extends Error {
  constructor(
    message: string,
    public provider: Web3Provider,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'Web3ProviderError'
  }
}

// ============ 请求/响应类型 ============

export interface GetBalanceRequest {
  address: string
  chain: EvmChain
}

export interface GetTokensRequest {
  address: string
  chain: EvmChain
  includeNative?: boolean
  includePrices?: boolean
  excludeSpam?: boolean
}

export interface GetNFTsRequest {
  address: string
  chain: EvmChain
  limit?: number
  excludeSpam?: boolean
}

export interface GetTransactionsRequest {
  address: string
  chain: EvmChain
  limit?: number
  fromBlock?: number
  toBlock?: number
}

export interface GetPricesRequest {
  tokens: Array<{
    address: string
    chain: EvmChain
  }>
}

// ============ 缓存相关 ============

export interface CacheConfig {
  ttl: number        // 缓存时间（秒）
  enabled: boolean
}

export interface CachedData<T> {
  data: T
  timestamp: number
  provider: Web3Provider
}

// ============ 限流相关 ============

export interface RateLimitConfig {
  requestsPerSecond: number
  burstSize: number
}

export interface RateLimitState {
  tokens: number
  lastRefill: number
}
