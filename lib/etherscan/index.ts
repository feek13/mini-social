/**
 * Etherscan 集成入口文件
 * 导出所有公共 API
 */

// 核心客户端
export {
  EtherscanClient,
  etherscan,
  createEtherscanClient,
  weiToEth,
  ethToWei,
  gweiToEth,
  formatAddress,
  isValidAddress,
  isValidTxHash,
} from './client'

// Gas Tracker
export {
  GasTracker,
  createGasTracker,
  COMMON_GAS_LIMITS,
  GAS_PRICE_PRESETS,
} from './gas'

// 账户模块
export {
  AccountModule,
  formatTokenBalance,
  formatTimestamp,
} from './account'

// 缓存
export {
  getCachedData,
  setCachedData,
  deleteCachedData,
  deleteCachedDataByPrefix,
  cleanupExpiredCache,
  getCacheStats,
  withCache,
  generateCacheKey,
} from './cache'

// 类型
export type {
  ChainConfig,
  ChainId,
  GasOracleResponse,
  GasPrice,
  GasEstimation,
  DailyGasPrice,
  Balance,
  Transaction,
  TokenTransfer,
  TokenInfo,
  TokenBalance,
  TokenHolder,
  NFTBalance,
  Badge,
  ReputationScore,
  CacheEntry,
  EtherscanResponse,
  EtherscanError,
  ApiRequestParams,
} from './types'

// 账户模块类型
export type {
  InternalTransaction,
  AccountBalance,
  WalletStats,
} from './account'

export { SUPPORTED_CHAINS } from './types'
