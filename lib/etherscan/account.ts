/**
 * Etherscan账户模块
 * 提供钱包账户相关的查询功能
 */

import type { EtherscanClient } from './client'
import { weiToEth } from './client'

// ============================================
// 类型定义
// ============================================

// 普通交易记录
export interface Transaction {
  blockNumber: string
  timeStamp: string
  hash: string
  nonce: string
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
  methodId: string
  functionName: string
}

// 内部交易记录
export interface InternalTransaction {
  blockNumber: string
  timeStamp: string
  hash: string
  from: string
  to: string
  value: string
  contractAddress: string
  input: string
  type: string
  gas: string
  gasUsed: string
  traceId: string
  isError: string
  errCode: string
}

// ERC20 代币转账记录
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

// ERC20 代币余额
export interface TokenBalance {
  contractAddress: string
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
  balance: string
}

// 账户余额
export interface AccountBalance {
  account: string
  balance: string
}

// 钱包统计数据
export interface WalletStats {
  address: string
  ethBalance: string // Wei
  ethBalanceFormatted: number // ETH
  totalTxCount: number
  normalTxCount: number
  internalTxCount: number
  tokenTransferCount: number
  uniqueTokensCount: number
  firstTxTimestamp: number
  lastTxTimestamp: number
  walletAgeDays: number
  isActive: boolean // 最近30天是否有交易
  topTokens: TokenBalance[] // 前5个代币
  defiProtocols: string[] // 交互过的 DeFi 协议列表
}

// ============================================
// 账户模块类
// ============================================

export class AccountModule {
  constructor(private client: EtherscanClient) {}

  /**
   * 获取ETH余额
   */
  async getBalance(address: string): Promise<string> {
    const result = await this.client.request<string>({
      module: 'account',
      action: 'balance',
      address: address.toLowerCase(),
      tag: 'latest',
    })
    return result
  }

  /**
   * 获取多个地址的ETH余额
   */
  async getBalanceMulti(addresses: string[]): Promise<AccountBalance[]> {
    const addressList = addresses.map(a => a.toLowerCase()).join(',')
    const result = await this.client.request<AccountBalance[]>({
      module: 'account',
      action: 'balancemulti',
      address: addressList,
      tag: 'latest',
    })
    return result
  }

  /**
   * 获取普通交易列表
   */
  async getTransactions(
    address: string,
    options?: {
      startBlock?: number
      endBlock?: number
      page?: number
      offset?: number // 每页数量，最大10000
      sort?: 'asc' | 'desc'
    }
  ): Promise<Transaction[]> {
    const result = await this.client.request<Transaction[]>({
      module: 'account',
      action: 'txlist',
      address: address.toLowerCase(),
      startblock: options?.startBlock || 0,
      endblock: options?.endBlock || 99999999,
      page: options?.page || 1,
      offset: options?.offset || 100,
      sort: options?.sort || 'desc',
    })
    return result
  }

  /**
   * 获取内部交易列表
   */
  async getInternalTransactions(
    address: string,
    options?: {
      startBlock?: number
      endBlock?: number
      page?: number
      offset?: number
      sort?: 'asc' | 'desc'
    }
  ): Promise<InternalTransaction[]> {
    const result = await this.client.request<InternalTransaction[]>({
      module: 'account',
      action: 'txlistinternal',
      address: address.toLowerCase(),
      startblock: options?.startBlock || 0,
      endblock: options?.endBlock || 99999999,
      page: options?.page || 1,
      offset: options?.offset || 100,
      sort: options?.sort || 'desc',
    })
    return result
  }

  /**
   * 获取 ERC20 代币转账列表
   */
  async getTokenTransfers(
    address: string,
    options?: {
      contractAddress?: string // 指定代币合约地址
      startBlock?: number
      endBlock?: number
      page?: number
      offset?: number
      sort?: 'asc' | 'desc'
    }
  ): Promise<TokenTransfer[]> {
    const params: Record<string, unknown> = {
      module: 'account',
      action: 'tokentx',
      address: address.toLowerCase(),
      startblock: options?.startBlock || 0,
      endblock: options?.endBlock || 99999999,
      page: options?.page || 1,
      offset: options?.offset || 100,
      sort: options?.sort || 'desc',
    }

    if (options?.contractAddress) {
      params.contractaddress = options.contractAddress.toLowerCase()
    }

    const result = await this.client.request<TokenTransfer[]>(params)
    return result
  }

  /**
   * 获取 ERC20 代币余额
   */
  async getTokenBalance(
    address: string,
    contractAddress: string
  ): Promise<string> {
    const result = await this.client.request<string>({
      module: 'account',
      action: 'tokenbalance',
      address: address.toLowerCase(),
      contractaddress: contractAddress.toLowerCase(),
      tag: 'latest',
    })
    return result
  }

  /**
   * 分析钱包统计数据（综合方法）
   */
  async getWalletStats(
    address: string,
    options?: {
      includeTokens?: boolean
      maxTxCount?: number
    }
  ): Promise<WalletStats> {
    const includeTokens = options?.includeTokens ?? true
    const maxTxCount = options?.maxTxCount || 100

    // 并行获取多个数据
    const [ethBalance, normalTxs, internalTxs, tokenTransfers] =
      await Promise.all([
        this.getBalance(address),
        this.getTransactions(address, {
          offset: maxTxCount,
          sort: 'desc',
        }),
        this.getInternalTransactions(address, {
          offset: maxTxCount,
          sort: 'desc',
        }).catch(() => [] as InternalTransaction[]), // 有些地址可能没有内部交易
        includeTokens
          ? this.getTokenTransfers(address, { offset: 100 })
          : Promise.resolve([] as TokenTransfer[]),
      ])

    // 计算统计数据
    const now = Math.floor(Date.now() / 1000)
    const firstTxTimestamp = normalTxs.length > 0
      ? parseInt(normalTxs[normalTxs.length - 1].timeStamp)
      : now
    const lastTxTimestamp = normalTxs.length > 0
      ? parseInt(normalTxs[0].timeStamp)
      : now

    const walletAgeDays = Math.floor((now - firstTxTimestamp) / 86400)
    const isActive = now - lastTxTimestamp < 30 * 86400 // 30天内有交易

    // 提取唯一的代币
    const uniqueTokens = new Map<string, TokenTransfer>()
    tokenTransfers.forEach((transfer) => {
      const key = transfer.contractAddress.toLowerCase()
      if (!uniqueTokens.has(key)) {
        uniqueTokens.set(key, transfer)
      }
    })

    // 获取前5个代币的余额
    const topTokens: TokenBalance[] = []
    if (includeTokens && uniqueTokens.size > 0) {
      const tokenAddresses = Array.from(uniqueTokens.keys()).slice(0, 5)
      const balances = await Promise.all(
        tokenAddresses.map((contractAddress) =>
          this.getTokenBalance(address, contractAddress).catch(() => '0')
        )
      )

      balances.forEach((balance, index) => {
        const tokenAddress = tokenAddresses[index]
        const tokenInfo = uniqueTokens.get(tokenAddress)
        if (tokenInfo && balance !== '0') {
          topTokens.push({
            contractAddress: tokenAddress,
            tokenName: tokenInfo.tokenName,
            tokenSymbol: tokenInfo.tokenSymbol,
            tokenDecimal: tokenInfo.tokenDecimal,
            balance,
          })
        }
      })
    }

    // 提取交互过的 DeFi 协议（基于合约地址的启发式识别）
    const defiProtocols = this.extractDeFiProtocols([
      ...normalTxs,
      ...internalTxs.map(tx => ({ to: tx.contractAddress, from: tx.from })),
    ])

    return {
      address,
      ethBalance,
      ethBalanceFormatted: weiToEth(ethBalance),
      totalTxCount: normalTxs.length + internalTxs.length + tokenTransfers.length,
      normalTxCount: normalTxs.length,
      internalTxCount: internalTxs.length,
      tokenTransferCount: tokenTransfers.length,
      uniqueTokensCount: uniqueTokens.size,
      firstTxTimestamp,
      lastTxTimestamp,
      walletAgeDays,
      isActive,
      topTokens,
      defiProtocols,
    }
  }

  /**
   * 提取交互过的 DeFi 协议
   * 基于已知的 DeFi 协议合约地址
   */
  private extractDeFiProtocols(
    transactions: Array<{ to: string; from: string }>
  ): string[] {
    // 已知的 DeFi 协议合约地址（Ethereum 主网）
    const knownProtocols: Record<string, string> = {
      // Uniswap
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2',
      '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3',
      '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3',

      // Aave
      '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': 'Aave V2',
      '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': 'Aave V3',

      // Compound
      '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b': 'Compound',

      // Curve
      '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7': 'Curve 3pool',
      '0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56': 'Curve stETH',

      // Lido
      '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'Lido',

      // MakerDAO
      '0x9759a6ac90977b93b58547b4a71c78317f391a28': 'MakerDAO Dai Join',

      // SushiSwap
      '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap',

      // 1inch
      '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch',

      // Balancer
      '0xba12222222228d8ba445958a75a0704d566bf2c8': 'Balancer V2',
    }

    const protocols = new Set<string>()

    transactions.forEach((tx) => {
      const to = tx.to?.toLowerCase()
      if (to && knownProtocols[to]) {
        protocols.add(knownProtocols[to])
      }
    })

    return Array.from(protocols)
  }

  /**
   * 计算活跃度分数（0-25）
   * 基于交易数量
   */
  calculateActivityScore(txCount: number): number {
    if (txCount === 0) return 0
    if (txCount < 10) return Math.floor((txCount / 10) * 5)
    if (txCount < 50) return 5 + Math.floor(((txCount - 10) / 40) * 5)
    if (txCount < 100) return 10 + Math.floor(((txCount - 50) / 50) * 5)
    if (txCount < 500) return 15 + Math.floor(((txCount - 100) / 400) * 5)
    return 25 // 500+ 交易
  }

  /**
   * 计算钱包年龄分数（0-20）
   * 基于钱包使用时长
   */
  calculateWalletAgeScore(ageDays: number): number {
    if (ageDays === 0) return 0
    if (ageDays < 30) return Math.floor((ageDays / 30) * 5) // 0-1个月: 0-5分
    if (ageDays < 90) return 5 + Math.floor(((ageDays - 30) / 60) * 5) // 1-3个月: 5-10分
    if (ageDays < 365) return 10 + Math.floor(((ageDays - 90) / 275) * 5) // 3-12个月: 10-15分
    return 15 + Math.min(Math.floor((ageDays - 365) / 365) * 5, 5) // 1年+: 15-20分（每年+5分，最多20分）
  }

  /**
   * 计算 DeFi 参与度分数（0-30）
   * 基于参与的协议数量
   */
  calculateDeFiScore(protocolCount: number): number {
    if (protocolCount === 0) return 0
    if (protocolCount === 1) return 10
    if (protocolCount === 2) return 15
    if (protocolCount === 3) return 20
    if (protocolCount >= 4) return 25
    return 30 // 5+ 协议
  }

  /**
   * 计算资产规模分数（0-15）
   * 基于 ETH 余额
   */
  calculateAssetScore(ethBalance: number): number {
    if (ethBalance === 0) return 0
    if (ethBalance < 0.1) return 3
    if (ethBalance < 1) return 6
    if (ethBalance < 10) return 9
    if (ethBalance < 100) return 12
    return 15 // 100+ ETH
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 格式化代币余额（考虑小数位）
 */
export function formatTokenBalance(
  balance: string,
  decimals: string
): number {
  const decimalCount = parseInt(decimals)
  return Number(balance) / Math.pow(10, decimalCount)
}

/**
 * 格式化时间戳为日期字符串
 */
export function formatTimestamp(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  return new Date(ts * 1000).toISOString()
}
