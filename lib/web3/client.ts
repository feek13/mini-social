/**
 * Web3 统一客户端 - 公开 API
 * 提供简洁的接口供应用使用
 */

import type { EvmChain } from '@/types/database'
import type {
  NativeBalance,
  TokenBalance,
  NFT,
  Transaction,
  TokenPrice,
  WalletSnapshot,
} from './types'
import { web3Provider } from './provider'

/**
 * 钱包相关 API
 */
export const wallet = {
  /**
   * 获取原生代币余额
   * @example
   * const balance = await wallet.getNativeBalance('ethereum', '0x...')
   */
  async getNativeBalance(chain: EvmChain, address: string): Promise<NativeBalance> {
    return web3Provider.getNativeBalance({ address, chain })
  },

  /**
   * 获取 ERC20 代币余额
   * @example
   * const tokens = await wallet.getTokens('ethereum', '0x...', { includePrices: true })
   */
  async getTokens(
    chain: EvmChain,
    address: string,
    options?: {
      includeNative?: boolean
      includePrices?: boolean
      excludeSpam?: boolean
    }
  ): Promise<TokenBalance[]> {
    return web3Provider.getTokenBalances({
      address,
      chain,
      ...options,
    })
  },

  /**
   * 获取 NFT
   * @example
   * const { nfts, total } = await wallet.getNFTs('ethereum', '0x...', { limit: 50 })
   */
  async getNFTs(
    chain: EvmChain,
    address: string,
    options?: {
      limit?: number
      excludeSpam?: boolean
    }
  ): Promise<{ nfts: NFT[]; total: number }> {
    return web3Provider.getNFTs({
      address,
      chain,
      ...options,
    })
  },

  /**
   * 获取交易历史
   * @example
   * const { transactions, total } = await wallet.getTransactions('ethereum', '0x...', { limit: 25 })
   */
  async getTransactions(
    chain: EvmChain,
    address: string,
    options?: {
      limit?: number
      fromBlock?: number
      toBlock?: number
    }
  ): Promise<{ transactions: Transaction[]; total: number }> {
    return web3Provider.getTransactions({
      address,
      chain,
      ...options,
    })
  },

  /**
   * 获取钱包完整快照（多链）
   * @example
   * const snapshot = await wallet.getSnapshot('0x...', ['ethereum', 'polygon', 'bsc'])
   */
  async getSnapshot(
    address: string,
    chains?: EvmChain[]
  ): Promise<WalletSnapshot> {
    return web3Provider.getWalletSnapshot(address, chains)
  },
}

/**
 * 价格相关 API
 */
export const price = {
  /**
   * 获取单个代币价格
   * @example
   * const tokenPrice = await price.getTokenPrice('ethereum', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
   */
  async getTokenPrice(chain: EvmChain, address: string): Promise<TokenPrice | null> {
    return web3Provider.getTokenPrice(chain, address)
  },

  /**
   * 批量获取代币价格
   * @example
   * const prices = await price.getTokenPrices([
   *   { chain: 'ethereum', address: '0x...' },
   *   { chain: 'polygon', address: '0x...' }
   * ])
   */
  async getTokenPrices(
    tokens: Array<{ chain: EvmChain; address: string }>
  ): Promise<Record<string, TokenPrice>> {
    return web3Provider.getTokenPrices({ tokens })
  },

  /**
   * 获取原生代币价格
   * @example
   * const ethPrice = await price.getNativePrice('ethereum')
   */
  async getNativePrice(chain: EvmChain): Promise<number | null> {
    return coinGeckoClient.getNativeTokenPrice(chain)
  },
}

/**
 * 默认导出统一客户端
 */
export const web3 = {
  wallet,
  price,
}

// 导出类型
export type {
  NativeBalance,
  TokenBalance,
  NFT,
  Transaction,
  TokenPrice,
  WalletSnapshot,
} from './types'

// 重新导出 provider（高级用户使用）
export { web3Provider } from './provider'

// 导入 CoinGecko 客户端
import { coinGeckoClient } from './coingecko/client'
