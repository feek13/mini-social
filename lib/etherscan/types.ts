/**
 * Etherscan API 类型定义
 * 文档: https://docs.etherscan.io/
 */

// ============================================
// 链配置
// ============================================

export interface ChainConfig {
  chainId: number
  name: string
  symbol: string
  apiUrl: string
  explorerUrl: string
  rpcUrl?: string
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    apiUrl: 'https://api.etherscan.io/v2/api',
    explorerUrl: 'https://etherscan.io',
  },
  56: {
    chainId: 56,
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    apiUrl: 'https://api.etherscan.io/v2/api',
    explorerUrl: 'https://bscscan.com',
  },
  137: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    apiUrl: 'https://api.etherscan.io/v2/api',
    explorerUrl: 'https://polygonscan.com',
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    apiUrl: 'https://api.etherscan.io/v2/api',
    explorerUrl: 'https://arbiscan.io',
  },
  10: {
    chainId: 10,
    name: 'Optimism',
    symbol: 'ETH',
    apiUrl: 'https://api.etherscan.io/v2/api',
    explorerUrl: 'https://optimistic.etherscan.io',
  },
  8453: {
    chainId: 8453,
    name: 'Base',
    symbol: 'ETH',
    apiUrl: 'https://api.etherscan.io/v2/api',
    explorerUrl: 'https://basescan.org',
  },
}

// ============================================
// Gas Tracker 类型
// ============================================

export interface GasOracleResponse {
  status: string
  message: string
  result: {
    LastBlock: string
    SafeGasPrice: string
    ProposeGasPrice: string
    FastGasPrice: string
    suggestBaseFee: string
    gasUsedRatio: string
  }
}

export interface GasPrice {
  lastBlock: number
  safe: number
  propose: number
  fast: number
  baseFee: number
  gasUsedRatio: number
  timestamp: number
}

export interface GasEstimation {
  gasPrice: number
  estimatedTime: number // seconds
}

export interface DailyGasPrice {
  date: string
  avgGasPrice: number
}

// ============================================
// 账户类型
// ============================================

export interface Balance {
  address: string
  balance: string // Wei
  balanceInEth: number
}

export interface Transaction {
  blockNumber: string
  timeStamp: string
  hash: string
  nonce: string
  blockHash: string
  transactionIndex: string
  from: string
  to: string
  value: string
  gas: string
  gasPrice: string
  isError: string
  txreceipt_status: string
  input: string
  contractAddress: string
  cumulativeGasUsed: string
  gasUsed: string
  confirmations: string
  methodId?: string
  functionName?: string
}

export interface TokenTransfer {
  blockNumber: string
  timeStamp: string
  hash: string
  nonce: string
  blockHash: string
  from: string
  contractAddress: string
  to: string
  value: string
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
  transactionIndex: string
  gas: string
  gasPrice: string
  gasUsed: string
  cumulativeGasUsed: string
  input: string
  confirmations: string
}

// ============================================
// 代币类型
// ============================================

export interface TokenInfo {
  contractAddress: string
  tokenName: string
  symbol: string
  divisor: string
  tokenType: string
  totalSupply: string
  blueCheckmark: string
  description?: string
  website?: string
  email?: string
  blog?: string
  reddit?: string
  slack?: string
  facebook?: string
  twitter?: string
  bitcointalk?: string
  github?: string
  telegram?: string
  wechat?: string
  linkedin?: string
  discord?: string
  whitepaper?: string
  tokenPriceUSD?: string
}

export interface TokenBalance {
  contractAddress: string
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
  tokenQuantity: string
  tokenValue?: number // in USD
}

export interface TokenHolder {
  address: string
  quantity: string
  percentage: number
}

// ============================================
// NFT 类型
// ============================================

export interface NFTBalance {
  contractAddress: string
  tokenName: string
  tokenSymbol: string
  tokenId: string
  tokenURI?: string
  metadata?: any
}

// ============================================
// 声誉系统类型
// ============================================

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earned: boolean
  earnedAt?: number
}

export interface ReputationScore {
  address: string
  score: number
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  badges: Badge[]
  stats: {
    ethBalance: number
    firstTxDate: number
    totalTxCount: number
    defiProtocolsCount: number
    nftCount: number
    avgGasPrice: number
    walletAge: number // days
  }
}

// ============================================
// 缓存类型
// ============================================

export interface CacheEntry<T> {
  data: T
  expiresAt: number
  createdAt: number
}

// ============================================
// API 响应类型
// ============================================

export interface EtherscanResponse<T> {
  status: string
  message: string
  result: T
}

export interface EtherscanError {
  status: string
  message: string
  result: string
}

// ============================================
// 工具类型
// ============================================

export type ChainId = 1 | 56 | 137 | 42161 | 10 | 8453

export interface ApiRequestParams {
  chainid: number
  module: string
  action: string
  apikey: string
  [key: string]: string | number | boolean
}
