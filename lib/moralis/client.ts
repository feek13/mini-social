/**
 * Moralis API Client
 * 用于获取多链钱包数据：余额、NFT、交易历史等
 * 文档：https://docs.moralis.io/web3-data-api/evm
 */

import type {
  EvmChain,
  MoralisTokenBalance,
  MoralisNativeBalance,
  MoralisNFT,
  MoralisTransaction,
} from '@/types/database'
import {
  MORALIS_CONFIG,
  formatAddress,
  isValidEthereumAddress,
  getChainConfig,
} from './config'

/**
 * Moralis API 客户端类
 */
class MoralisClient {
  private apiKey: string
  private baseURL: string

  constructor() {
    this.apiKey = process.env.MORALIS_API_KEY || ''
    this.baseURL = MORALIS_CONFIG.BASE_URL

    if (!this.apiKey) {
      console.warn('[Moralis] API key not configured. Set MORALIS_API_KEY in environment variables.')
    }
  }

  /**
   * 通用 API 请求方法
   */
  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Moralis API key not configured')
    }

    const url = new URL(`${this.baseURL}${endpoint}`)

    // 添加查询参数
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-API-Key': this.apiKey,
      },
      next: { revalidate: 300 }, // 缓存 5 分钟
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Moralis API error (${response.status}): ${error}`)
    }

    return response.json()
  }

  /**
   * 验证钱包地址格式
   */
  private validateAddress(address: string): void {
    if (!isValidEthereumAddress(address)) {
      throw new Error(`Invalid Ethereum address format: ${address}`)
    }
  }

  /**
   * 获取钱包的原生代币余额（ETH, BNB, MATIC 等）
   * GET /{address}/balance
   */
  async getNativeBalance(
    address: string,
    chain: EvmChain
  ): Promise<MoralisNativeBalance> {
    this.validateAddress(address)

    const chainConfig = getChainConfig(chain)
    const formattedAddress = formatAddress(address)

    interface ApiResponse {
      balance: string
    }

    const data = await this.request<ApiResponse>(`/${formattedAddress}/balance`, {
      chain: chainConfig.moralis_chain_id,
    })

    // 格式化余额（从 Wei 转换）
    const balanceWei = BigInt(data.balance)
    const decimals = BigInt(10 ** chainConfig.native_token.decimals)
    const balanceFormatted = (Number(balanceWei) / Number(decimals)).toFixed(6)

    return {
      balance: data.balance,
      balance_formatted: balanceFormatted,
      // USD 价格需要额外查询，这里暂不实现
    }
  }

  /**
   * 获取多个代币的价格
   * GET /erc20/prices
   */
  async getTokenPrices(
    tokens: Array<{ address: string; chain: EvmChain }>,
    includeMarketData: boolean = false
  ): Promise<Record<string, { usdPrice: number; usdPriceFormatted: string }>> {
    if (tokens.length === 0) return {}

    try {
      // Moralis 价格 API 需要单独调用，这里我们批量处理
      const pricePromises = tokens.map(async ({ address: tokenAddress, chain }) => {
        try {
          const chainConfig = getChainConfig(chain)
          const formattedAddress = formatAddress(tokenAddress)

          interface PriceResponse {
            usdPrice: number
            usdPriceFormatted: string
            '24hrPercentChange': string
            exchangeAddress: string
            exchangeName: string
          }

          const params: Record<string, string> = {
            chain: chainConfig.moralis_chain_id,
          }

          if (includeMarketData) {
            params.include = 'percent_change'
          }

          const data = await this.request<PriceResponse>(`/erc20/${formattedAddress}/price`, params)

          return {
            key: `${chain}:${tokenAddress.toLowerCase()}`,
            price: {
              usdPrice: data.usdPrice,
              usdPriceFormatted: data.usdPriceFormatted,
            },
          }
        } catch (error) {
          // 价格获取失败时返回 null
          return {
            key: `${chain}:${tokenAddress.toLowerCase()}`,
            price: { usdPrice: 0, usdPriceFormatted: '0' },
          }
        }
      })

      const results = await Promise.allSettled(pricePromises)

      return results.reduce((acc, result) => {
        if (result.status === 'fulfilled' && result.value) {
          acc[result.value.key] = result.value.price
        }
        return acc
      }, {} as Record<string, { usdPrice: number; usdPriceFormatted: string }>)
    } catch (error) {
      console.error('[Moralis] 批量获取价格失败:', error)
      return {}
    }
  }

  /**
   * 获取钱包的 ERC20 代币余额（包含价格）
   * GET /{address}/erc20
   */
  async getTokenBalances(
    address: string,
    chain: EvmChain,
    options?: {
      excludeSpam?: boolean
      excludeUnverifiedContracts?: boolean
      includePrices?: boolean
    }
  ): Promise<MoralisTokenBalance[]> {
    this.validateAddress(address)

    const chainConfig = getChainConfig(chain)
    const formattedAddress = formatAddress(address)

    const params: Record<string, string> = {
      chain: chainConfig.moralis_chain_id,
    }

    if (options?.excludeSpam) {
      params.exclude_spam = 'true'
    }

    if (options?.excludeUnverifiedContracts) {
      params.exclude_unverified_contracts = 'true'
    }

    const data = await this.request<MoralisTokenBalance[]>(
      `/${formattedAddress}/erc20`,
      params
    )

    // 格式化余额
    const tokensWithBalance = data.map((token) => {
      const balanceRaw = BigInt(token.balance)
      const decimals = BigInt(10 ** token.decimals)
      const balanceFormatted = (Number(balanceRaw) / Number(decimals)).toFixed(6)

      return {
        ...token,
        balance_formatted: balanceFormatted,
        usd_value: 0, // 默认值
      }
    })

    // 如果需要价格，批量获取（限制前50个以避免API超时）
    if (options?.includePrices && tokensWithBalance.length > 0) {
      const tokensToPrice = tokensWithBalance.slice(0, 50)
      const priceQueries = tokensToPrice.map((t) => ({
        address: t.token_address,
        chain,
      }))

      const prices = await this.getTokenPrices(priceQueries)

      return tokensWithBalance.map((token) => {
        const priceKey = `${chain}:${token.token_address.toLowerCase()}`
        const priceData = prices[priceKey]

        if (priceData && priceData.usdPrice) {
          const usdValue = parseFloat(token.balance_formatted) * priceData.usdPrice
          return {
            ...token,
            usd_price: priceData.usdPrice,
            usd_value: usdValue,
          }
        }

        return token
      })
    }

    return tokensWithBalance
  }

  /**
   * 获取钱包的 NFT
   * GET /{address}/nft
   */
  async getNFTs(
    address: string,
    chain: EvmChain,
    options?: {
      limit?: number
      excludeSpam?: boolean
    }
  ): Promise<{ result: MoralisNFT[]; total: number }> {
    this.validateAddress(address)

    const chainConfig = getChainConfig(chain)
    const formattedAddress = formatAddress(address)

    const params: Record<string, string> = {
      chain: chainConfig.moralis_chain_id,
      limit: String(options?.limit || MORALIS_CONFIG.DEFAULT_PAGE_SIZE),
    }

    if (options?.excludeSpam) {
      params.exclude_spam = 'true'
    }

    interface ApiResponse {
      result: MoralisNFT[]
      page: number
      page_size: number
      cursor: string | null
    }

    const data = await this.request<ApiResponse>(`/${formattedAddress}/nft`, params)

    return {
      result: data.result,
      total: data.result.length,
    }
  }

  /**
   * 获取钱包的交易历史
   * GET /{address}
   */
  async getTransactions(
    address: string,
    chain: EvmChain,
    options?: {
      fromBlock?: number
      toBlock?: number
      limit?: number
    }
  ): Promise<{ result: MoralisTransaction[]; total: number }> {
    this.validateAddress(address)

    const chainConfig = getChainConfig(chain)
    const formattedAddress = formatAddress(address)

    const params: Record<string, string> = {
      chain: chainConfig.moralis_chain_id,
      limit: String(options?.limit || 25),
    }

    if (options?.fromBlock) {
      params.from_block = String(options.fromBlock)
    }

    if (options?.toBlock) {
      params.to_block = String(options.toBlock)
    }

    interface ApiResponse {
      result: MoralisTransaction[]
      page: number
      page_size: number
      cursor: string | null
    }

    const data = await this.request<ApiResponse>(`/${formattedAddress}`, params)

    return {
      result: data.result,
      total: data.result.length,
    }
  }

  /**
   * 获取钱包的 ERC20 代币转账记录
   * GET /{address}/erc20/transfers
   */
  async getTokenTransfers(
    address: string,
    chain: EvmChain,
    options?: {
      limit?: number
      contractAddresses?: string[]
    }
  ): Promise<{ result: unknown[]; total: number }> {
    this.validateAddress(address)

    const chainConfig = getChainConfig(chain)
    const formattedAddress = formatAddress(address)

    const params: Record<string, string> = {
      chain: chainConfig.moralis_chain_id,
      limit: String(options?.limit || 25),
    }

    if (options?.contractAddresses && options.contractAddresses.length > 0) {
      params.contract_addresses = options.contractAddresses.join(',')
    }

    interface ApiResponse {
      result: unknown[]
      page: number
      page_size: number
      cursor: string | null
    }

    const data = await this.request<ApiResponse>(
      `/${formattedAddress}/erc20/transfers`,
      params
    )

    return {
      result: data.result,
      total: data.result.length,
    }
  }

  /**
   * 获取钱包的完整快照（所有链）
   * 聚合多链数据，包含价格和USD价值
   */
  async getWalletSnapshot(
    address: string,
    chains: EvmChain[],
    options?: {
      includePrices?: boolean
    }
  ): Promise<{
    address: string
    chains: Array<{
      chain: EvmChain
      native_balance: MoralisNativeBalance
      tokens: MoralisTokenBalance[]
      nfts_count: number
      balance_usd: number
    }>
    total_chains: number
    total_value_usd: number
  }> {
    this.validateAddress(address)

    const results = await Promise.allSettled(
      chains.map(async (chain) => {
        const [nativeBalance, tokens, nfts] = await Promise.all([
          this.getNativeBalance(address, chain).catch(() => ({
            balance: '0',
            balance_formatted: '0',
          })),
          this.getTokenBalances(address, chain, {
            excludeSpam: true,
            excludeUnverifiedContracts: true,
            includePrices: options?.includePrices ?? true, // 默认包含价格
          }).catch(() => []),
          this.getNFTs(address, chain, { excludeSpam: true }).catch(() => ({
            result: [],
            total: 0,
          })),
        ])

        // 计算该链上的总USD价值
        const tokensValue = tokens.reduce((sum, token) => sum + (token.usd_value || 0), 0)
        // TODO: 添加原生代币价格
        const balanceUsd = tokensValue

        return {
          chain,
          native_balance: nativeBalance,
          tokens,
          nfts_count: nfts.total,
          balance_usd: balanceUsd,
        }
      })
    )

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<{
        chain: EvmChain
        native_balance: MoralisNativeBalance
        tokens: MoralisTokenBalance[]
        nfts_count: number
        balance_usd: number
      }> => result.status === 'fulfilled')
      .map((result) => result.value)

    // 计算所有链的总USD价值
    const totalValueUsd = successfulResults.reduce((sum, chain) => sum + chain.balance_usd, 0)

    return {
      address: formatAddress(address),
      chains: successfulResults,
      total_chains: successfulResults.length,
      total_value_usd: totalValueUsd,
    }
  }

  /**
   * 批量获取多个钱包的余额（同一条链）
   * 使用 Promise.allSettled 避免单个失败影响整体
   */
  async getBatchWalletBalances(
    addresses: string[],
    chain: EvmChain
  ): Promise<
    Array<{
      address: string
      native_balance: MoralisNativeBalance | null
      tokens: MoralisTokenBalance[]
      error?: string
    }>
  > {
    const results = await Promise.allSettled(
      addresses.map(async (address) => {
        try {
          const [nativeBalance, tokens] = await Promise.all([
            this.getNativeBalance(address, chain),
            this.getTokenBalances(address, chain, { excludeSpam: true }),
          ])

          return {
            address: formatAddress(address),
            native_balance: nativeBalance,
            tokens,
          }
        } catch (error) {
          return {
            address: formatAddress(address),
            native_balance: null,
            tokens: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      })
    )

    return results.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : {
            address: '',
            native_balance: null,
            tokens: [],
            error: result.reason,
          }
    )
  }
}

// 导出单例
export const moralis = new MoralisClient()
