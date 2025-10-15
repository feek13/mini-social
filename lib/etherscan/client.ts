/**
 * Etherscan API 核心客户端
 * 支持 50+ 链，统一接口
 */

import type {
  ApiRequestParams,
  ChainId,
  EtherscanResponse,
  EtherscanError,
} from './types'
import { SUPPORTED_CHAINS } from './types'

// ============================================
// API 配置
// ============================================

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ''

if (!ETHERSCAN_API_KEY) {
  console.warn('[Etherscan] ⚠️  ETHERSCAN_API_KEY 未配置')
}

// API 速率限制配置（免费版：5 calls/sec）
const RATE_LIMIT = {
  maxRequests: 5,
  perMilliseconds: 1000,
}

// ============================================
// 请求队列（避免超过速率限制）
// ============================================

class RequestQueue {
  private queue: Array<() => Promise<void>> = []
  private processing = false
  private requestTimestamps: number[] = []

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.process()
    })
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      // 清理过期的时间戳
      const now = Date.now()
      this.requestTimestamps = this.requestTimestamps.filter(
        (timestamp) => now - timestamp < RATE_LIMIT.perMilliseconds
      )

      // 检查是否超过速率限制
      if (this.requestTimestamps.length >= RATE_LIMIT.maxRequests) {
        // 等待直到可以发送下一个请求
        const oldestTimestamp = this.requestTimestamps[0]
        const waitTime =
          RATE_LIMIT.perMilliseconds - (now - oldestTimestamp) + 100 // 加 100ms 缓冲
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      // 执行请求
      const request = this.queue.shift()
      if (request) {
        this.requestTimestamps.push(Date.now())
        await request()
      }
    }

    this.processing = false
  }
}

const requestQueue = new RequestQueue()

// ============================================
// 核心客户端类
// ============================================

export class EtherscanClient {
  private chainId: ChainId

  constructor(chainId: ChainId = 1) {
    this.chainId = chainId
  }

  /**
   * 获取链配置
   */
  private getChainConfig() {
    const config = SUPPORTED_CHAINS[this.chainId]
    if (!config) {
      throw new Error(`不支持的链 ID: ${this.chainId}`)
    }
    return config
  }

  /**
   * 构建 API 请求参数
   */
  private buildParams(params: Partial<ApiRequestParams>): ApiRequestParams {
    return {
      chainid: this.chainId,
      apikey: ETHERSCAN_API_KEY,
      ...params,
    } as ApiRequestParams
  }

  /**
   * 发送 API 请求
   */
  async request<T>(params: Partial<ApiRequestParams>): Promise<T> {
    const config = this.getChainConfig()
    const fullParams = this.buildParams(params)

    // 构建 URL
    const url = new URL(config.apiUrl)
    Object.entries(fullParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })

    // 添加到请求队列
    return requestQueue.add(async () => {
      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: EtherscanResponse<T> | EtherscanError = await response.json()

      // 检查 API 响应状态
      if (data.status === '0' && data.message !== 'No transactions found') {
        throw new Error(`Etherscan API Error: ${data.message}`)
      }

      return data.result as T
    })
  }

  /**
   * 切换链
   */
  switchChain(chainId: ChainId): void {
    if (!SUPPORTED_CHAINS[chainId]) {
      throw new Error(`不支持的链 ID: ${chainId}`)
    }
    this.chainId = chainId
  }

  /**
   * 获取当前链 ID
   */
  getCurrentChainId(): ChainId {
    return this.chainId
  }

  /**
   * 获取浏览器 URL
   */
  getExplorerUrl(path: string = ''): string {
    const config = this.getChainConfig()
    return `${config.explorerUrl}${path}`
  }

  /**
   * 获取交易 URL
   */
  getTxUrl(txHash: string): string {
    return this.getExplorerUrl(`/tx/${txHash}`)
  }

  /**
   * 获取地址 URL
   */
  getAddressUrl(address: string): string {
    return this.getExplorerUrl(`/address/${address}`)
  }

  /**
   * 获取代币 URL
   */
  getTokenUrl(tokenAddress: string): string {
    return this.getExplorerUrl(`/token/${tokenAddress}`)
  }
}

// ============================================
// 默认客户端实例
// ============================================

export const etherscan = new EtherscanClient(1) // 默认 Ethereum 主网

// ============================================
// 工具函数
// ============================================

/**
 * 创建指定链的客户端
 */
export function createEtherscanClient(chainId: ChainId): EtherscanClient {
  return new EtherscanClient(chainId)
}

/**
 * Wei 转 Ether
 */
export function weiToEth(wei: string | number): number {
  return Number(wei) / 1e18
}

/**
 * Ether 转 Wei
 */
export function ethToWei(eth: number): string {
  return (eth * 1e18).toFixed(0)
}

/**
 * Gwei 转 Ether
 */
export function gweiToEth(gwei: number): number {
  return gwei / 1e9
}

/**
 * 格式化地址（缩写）
 */
export function formatAddress(address: string, length: number = 6): string {
  if (address.length <= length * 2 + 2) {
    return address
  }
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`
}

/**
 * 验证地址格式
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * 验证交易哈希格式
 */
export function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash)
}
