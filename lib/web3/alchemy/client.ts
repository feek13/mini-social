/**
 * Alchemy API 客户端
 * 文档: https://docs.alchemy.com/reference/alchemy-sdk-quickstart
 */

import { Alchemy, Network } from 'alchemy-sdk'
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

// 链映射到 Alchemy Network
const CHAIN_TO_NETWORK: Record<EvmChain, Network | null> = {
  ethereum: Network.ETH_MAINNET,
  polygon: Network.MATIC_MAINNET,
  arbitrum: Network.ARB_MAINNET,
  optimism: Network.OPT_MAINNET,
  base: Network.BASE_MAINNET,
  bsc: null,              // Alchemy 不支持
  avalanche: null,        // Alchemy 不支持
  fantom: null,           // Alchemy 不支持
  cronos: null,           // Alchemy 不支持
  gnosis: null,           // Alchemy 不支持
  linea: null,            // Alchemy 不支持
  zksync: null,           // Alchemy 不支持
}

/**
 * Alchemy 客户端类
 */
export class AlchemyClient {
  private clients: Map<EvmChain, Alchemy>
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.clients = new Map()

    if (!apiKey) {
      console.warn('[Alchemy] API key not configured')
    }
  }

  /**
   * 获取或创建指定链的 Alchemy 实例
   */
  private getClient(chain: EvmChain): Alchemy {
    // 检查缓存
    if (this.clients.has(chain)) {
      return this.clients.get(chain)!
    }

    // 检查是否支持
    const network = CHAIN_TO_NETWORK[chain]
    if (!network) {
      throw new Web3ProviderError(
        `Alchemy does not support chain: ${chain}`,
        'alchemy',
        400
      )
    }

    // 创建新实例
    const client = new Alchemy({
      apiKey: this.apiKey,
      network,
    })

    this.clients.set(chain, client)
    return client
  }

  /**
   * 检查是否支持该链
   */
  isChainSupported(chain: EvmChain): boolean {
    return CHAIN_TO_NETWORK[chain] !== null
  }

  /**
   * 获取原生代币余额
   */
  async getNativeBalance(request: GetBalanceRequest): Promise<NativeBalance> {
    try {
      const alchemy = this.getClient(request.chain)

      // 获取余额
      const balanceWei = await alchemy.core.getBalance(request.address)
      const balanceFormatted = Number(balanceWei.toString()) / 1e18

      return {
        balance: balanceWei.toString(),
        balance_formatted: balanceFormatted.toFixed(6),
        symbol: this.getNativeSymbol(request.chain),
        decimals: 18,
      }
    } catch (error) {
      throw new Web3ProviderError(
        `Failed to get native balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'alchemy',
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
      const alchemy = this.getClient(request.chain)

      // 获取所有 ERC20 代币
      const balancesResponse = await alchemy.core.getTokenBalances(request.address)

      // 过滤掉余额为 0 的代币
      const nonZeroBalances = balancesResponse.tokenBalances.filter(
        (token) => token.tokenBalance && BigInt(token.tokenBalance) > 0n
      )

      // 获取代币元数据
      const tokensWithMetadata = await Promise.all(
        nonZeroBalances.map(async (token) => {
          try {
            const metadata = await alchemy.core.getTokenMetadata(token.contractAddress)
            const balance = BigInt(token.tokenBalance || '0')
            const decimals = metadata.decimals || 18
            const balanceFormatted = Number(balance) / 10 ** decimals

            return {
              token_address: token.contractAddress,
              token_name: metadata.name || 'Unknown',
              token_symbol: metadata.symbol || 'Unknown',
              token_decimals: decimals,
              balance: token.tokenBalance || '0',
              balance_formatted: balanceFormatted.toFixed(6),
              logo: metadata.logo || undefined,
            }
          } catch (error) {
            // 如果元数据获取失败，返回基本信息
            return {
              token_address: token.contractAddress,
              token_name: 'Unknown',
              token_symbol: 'Unknown',
              token_decimals: 18,
              balance: token.tokenBalance || '0',
              balance_formatted: '0',
            }
          }
        })
      )

      // 按余额排序
      return tokensWithMetadata.sort((a, b) =>
        Number(BigInt(b.balance) - BigInt(a.balance))
      )
    } catch (error) {
      throw new Web3ProviderError(
        `Failed to get token balances: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'alchemy',
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
      const alchemy = this.getClient(request.chain)

      const response = await alchemy.nft.getNftsForOwner(request.address, {
        excludeFilters: request.excludeSpam ? ['SPAM'] : [],
        pageSize: request.limit || 100,
      })

      const nfts: NFT[] = response.ownedNfts.map((nft) => ({
        token_id: nft.tokenId,
        contract_address: nft.contract.address,
        contract_type: nft.contract.tokenType === 'ERC721' ? 'ERC721' : 'ERC1155',
        name: nft.name || nft.contract.name,
        symbol: nft.contract.symbol,
        image_url: nft.image.cachedUrl || nft.image.originalUrl,
        collection_name: nft.contract.name,
        metadata: nft.raw.metadata ? {
          name: nft.raw.metadata.name,
          description: nft.raw.metadata.description,
          image: nft.raw.metadata.image,
          attributes: nft.raw.metadata.attributes,
        } : undefined,
      }))

      return {
        nfts,
        total: response.totalCount,
      }
    } catch (error) {
      throw new Web3ProviderError(
        `Failed to get NFTs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'alchemy',
        500,
        error
      )
    }
  }

  /**
   * 获取交易历史
   */
  async getTransactions(request: GetTransactionsRequest): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      const alchemy = this.getClient(request.chain)

      // 使用 Asset Transfers API 获取交易
      const transfers = await alchemy.core.getAssetTransfers({
        fromAddress: request.address,
        category: ['external', 'erc20', 'erc721', 'erc1155'],
        maxCount: request.limit || 25,
        fromBlock: request.fromBlock ? `0x${request.fromBlock.toString(16)}` : undefined,
        toBlock: request.toBlock ? `0x${request.toBlock.toString(16)}` : undefined,
      })

      const transactions: Transaction[] = transfers.transfers.map((transfer) => ({
        hash: transfer.hash,
        from_address: transfer.from,
        to_address: transfer.to || '',
        value: transfer.value?.toString() || '0',
        gas: '0',  // Asset Transfers API 不提供 gas
        gas_price: '0',
        block_number: parseInt(transfer.blockNum, 16),
        block_timestamp: new Date().toISOString(),  // API 不提供时间戳
        method: transfer.category,
      }))

      return {
        transactions,
        total: transactions.length,
      }
    } catch (error) {
      throw new Web3ProviderError(
        `Failed to get transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'alchemy',
        500,
        error
      )
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
export const alchemyClient = new AlchemyClient(
  process.env.ALCHEMY_API_KEY || ''
)
