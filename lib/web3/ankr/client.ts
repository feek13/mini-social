/**
 * Ankr API 客户端
 * 文档: https://www.ankr.com/docs/advanced-api/
 */

import type { EvmChain } from '@/types/database'
import type {
  NativeBalance,
  TokenBalance,
  NFT,
  Transaction,
  GetBalanceRequest,
  GetTokensRequest,
  GetNFTsRequest,
  GetTransactionsRequest,
} from '../types'
import { Web3ProviderError } from '../types'

// 链映射到 Ankr blockchain 标识符
const CHAIN_TO_ANKR_ID: Record<EvmChain, string | null> = {
  ethereum: 'eth',
  polygon: 'polygon',
  bsc: 'bsc',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  base: 'base',
  avalanche: 'avalanche',
  fantom: 'fantom',
  cronos: 'cronos',
  gnosis: 'gnosis',
  linea: 'linea',
  zksync: 'scroll',  // Ankr 用 scroll 替代 zksync
}

interface AnkrRPCRequest {
  jsonrpc: string
  method: string
  params: unknown
  id: number
}

interface AnkrRPCResponse<T = unknown> {
  jsonrpc: string
  id: number
  result?: T
  error?: {
    code: number
    message: string
  }
}

/**
 * Ankr 账户余额响应
 */
interface AnkrAccountBalanceResult {
  assets: Array<{
    blockchain: string
    tokenName: string
    tokenSymbol: string
    tokenDecimals: number
    tokenType: string
    holderAddress: string
    balance: string
    balanceRawInteger: string
    balanceUsd: string
    tokenPrice: string
    thumbnail: string
    contractAddress?: string
  }>
  totalBalanceUsd: string
  nextPageToken?: string
}

/**
 * Ankr NFT 响应
 */
interface AnkrNFTsResult {
  owner: string
  assets: Array<{
    blockchain: string
    name: string
    tokenId: string
    tokenUrl: string
    imageUrl: string
    collectionName: string
    symbol: string
    contractType: number  // 0=ERC721, 1=ERC1155
    contractAddress: string
    quantity?: string
  }>
  nextPageToken?: string
}

/**
 * Ankr 客户端类
 */
export class AnkrClient {
  private apiKey: string
  private baseURL: string

  constructor(apiKey: string, baseURL = 'https://rpc.ankr.com/multichain') {
    this.apiKey = apiKey
    this.baseURL = baseURL

    if (!apiKey) {
      console.warn('[Ankr] API key not configured')
    }
  }

  /**
   * 通用 RPC 请求方法
   */
  private async request<T>(method: string, params: unknown): Promise<T> {
    const request: AnkrRPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: 1,
    }

    try {
      const response = await fetch(`${this.baseURL}/${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        next: { revalidate: 60 },  // 缓存 1 分钟
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: AnkrRPCResponse<T> = await response.json()

      if (data.error) {
        throw new Error(`Ankr RPC Error ${data.error.code}: ${data.error.message}`)
      }

      if (!data.result) {
        throw new Error('No result in response')
      }

      return data.result
    } catch (error) {
      throw new Web3ProviderError(
        `Ankr API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ankr',
        500,
        error
      )
    }
  }

  /**
   * 检查是否支持该链
   */
  isChainSupported(chain: EvmChain): boolean {
    return CHAIN_TO_ANKR_ID[chain] !== null
  }

  /**
   * 获取链标识符
   */
  private getChainId(chain: EvmChain): string {
    const chainId = CHAIN_TO_ANKR_ID[chain]
    if (!chainId) {
      throw new Web3ProviderError(
        `Ankr does not support chain: ${chain}`,
        'ankr',
        400
      )
    }
    return chainId
  }

  /**
   * 获取账户余额（包括原生代币和 ERC20）
   */
  async getAccountBalance(request: GetBalanceRequest): Promise<AnkrAccountBalanceResult> {
    const chainId = this.getChainId(request.chain)

    const result = await this.request<AnkrAccountBalanceResult>('ankr_getAccountBalance', {
      blockchain: chainId,
      walletAddress: request.address,
      onlyWhitelisted: true,  // 只显示 CoinGecko 上的代币
    })

    return result
  }

  /**
   * 获取原生代币余额
   */
  async getNativeBalance(request: GetBalanceRequest): Promise<NativeBalance> {
    try {
      const balances = await this.getAccountBalance(request)
      const nativeToken = this.getNativeSymbol(request.chain)

      // 查找原生代币
      const native = balances.assets.find(
        (asset) => asset.tokenSymbol === nativeToken && !asset.contractAddress
      )

      if (!native) {
        return {
          balance: '0',
          balance_formatted: '0',
          symbol: nativeToken,
          decimals: 18,
          balance_usd: 0,
        }
      }

      return {
        balance: native.balanceRawInteger,
        balance_formatted: native.balance,
        symbol: native.tokenSymbol,
        decimals: native.tokenDecimals,
        balance_usd: parseFloat(native.balanceUsd),
      }
    } catch (error) {
      throw new Web3ProviderError(
        `Failed to get native balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ankr',
        500,
        error
      )
    }
  }

  /**
   * 获取 ERC20 代币余额
   */
  async getTokenBalances(request: GetTokensRequest): Promise<TokenBalance[]> {
    try {
      const balances = await this.getAccountBalance(request)

      // 过滤出 ERC20 代币（有 contractAddress）
      const tokens: TokenBalance[] = balances.assets
        .filter((asset) => asset.contractAddress)
        .map((asset) => ({
          token_address: asset.contractAddress!,
          token_name: asset.tokenName,
          token_symbol: asset.tokenSymbol,
          token_decimals: asset.tokenDecimals,
          balance: asset.balanceRawInteger,
          balance_formatted: asset.balance,
          usd_price: parseFloat(asset.tokenPrice),
          usd_value: parseFloat(asset.balanceUsd),
          thumbnail: asset.thumbnail || undefined,
        }))

      // 按 USD 价值排序
      return tokens.sort((a, b) => (b.usd_value || 0) - (a.usd_value || 0))
    } catch (error) {
      throw new Web3ProviderError(
        `Failed to get token balances: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ankr',
        500,
        error
      )
    }
  }

  /**
   * 获取 NFT
   */
  async getNFTs(request: GetNFTsRequest): Promise<{ nfts: NFT[]; total: number }> {
    try {
      const chainId = this.getChainId(request.chain)

      const result = await this.request<AnkrNFTsResult>('ankr_getNFTsByOwner', {
        blockchain: [chainId],
        walletAddress: request.address,
        pageSize: request.limit || 100,
      })

      const nfts: NFT[] = result.assets.map((nft) => ({
        token_id: nft.tokenId,
        contract_address: nft.contractAddress,
        contract_type: nft.contractType === 0 ? 'ERC721' : 'ERC1155',
        name: nft.name,
        symbol: nft.symbol,
        image_url: nft.imageUrl,
        collection_name: nft.collectionName,
        token_uri: nft.tokenUrl,
        quantity: nft.quantity,
      }))

      return {
        nfts,
        total: nfts.length,
      }
    } catch (error) {
      throw new Web3ProviderError(
        `Failed to get NFTs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ankr',
        500,
        error
      )
    }
  }

  /**
   * 获取交易历史
   * 注意: Ankr Advanced API 不直接提供交易历史，需要使用其他方法
   */
  async getTransactions(request: GetTransactionsRequest): Promise<{ transactions: Transaction[]; total: number }> {
    // Ankr 的 Advanced API 不提供交易历史
    // 如果需要，可以使用 Ankr 的 RPC 节点配合 eth_getLogs
    console.warn('[Ankr] Transaction history not supported, use Alchemy instead')

    return {
      transactions: [],
      total: 0,
    }
  }

  /**
   * 获取原生代币符号
   */
  private getNativeSymbol(chain: EvmChain): string {
    const symbols: Record<EvmChain, string> = {
      ethereum: 'ETH',
      polygon: 'MATIC',
      bsc: 'BNB',
      arbitrum: 'ETH',
      optimism: 'ETH',
      base: 'ETH',
      avalanche: 'AVAX',
      fantom: 'FTM',
      cronos: 'CRO',
      gnosis: 'XDAI',
      linea: 'ETH',
      zksync: 'ETH',
    }
    return symbols[chain] || 'ETH'
  }
}

// 导出单例
export const ankrClient = new AnkrClient(
  process.env.ANKR_API_KEY || ''
)
