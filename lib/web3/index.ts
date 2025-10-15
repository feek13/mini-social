/**
 * Web3 服务 - 统一入口
 * 整合 Alchemy + Ankr + CoinGecko
 */

// 主要 API
export { web3, wallet, price } from './client'

// 高级 API
export { web3Provider } from './provider'
export { alchemyClient } from './alchemy/client'
export { ankrClient } from './ankr/client'
export { coinGeckoClient } from './coingecko/client'

// 类型
export type {
  Web3Provider,
  NativeBalance,
  TokenBalance,
  NFT,
  Transaction,
  TokenPrice,
  WalletSnapshot,
  ChainSnapshot,
  Web3ProviderError,
  GetBalanceRequest,
  GetTokensRequest,
  GetNFTsRequest,
  GetTransactionsRequest,
  GetPricesRequest,
} from './types'

// 配置
export {
  CHAIN_CONFIGS,
  RATE_LIMITS,
  CACHE_CONFIGS,
  getChainConfig,
  isProviderSupported,
  DEFAULT_CHAINS,
  PRIORITY_CHAINS,
  ALL_CHAINS,
  ALCHEMY_SUPPORTED_CHAINS,
  ANKR_SUPPORTED_CHAINS,
} from './config'

// 工具
export { memoryCache, generateCacheKey } from './cache'
export { withRetry, isRetryableError } from './utils/retry'
export { RateLimiter, getRateLimiter } from './utils/ratelimit'
export {
  isValidEthereumAddress,
  formatAddress,
  shortenAddress,
  isSameAddress,
} from './utils/address'
