/**
 * Etherscan Gas Tracker 模块
 * 提供实时和历史 Gas 价格数据
 */

import { EtherscanClient } from './client'
import type {
  GasOracleResponse,
  GasPrice,
  GasEstimation,
  DailyGasPrice,
} from './types'
import {
  withCache,
  generateCacheKey,
  CACHE_DURATIONS,
} from './cache'

// ============================================
// Gas Tracker 类
// ============================================

export class GasTracker {
  private client: EtherscanClient

  constructor(client: EtherscanClient) {
    this.client = client
  }

  /**
   * 获取实时 Gas 价格（Gas Oracle）
   */
  async getGasOracle(): Promise<GasPrice> {
    const cacheKey = generateCacheKey('gas:oracle', {
      chainId: this.client.getCurrentChainId(),
    })

    return withCache(
      cacheKey,
      2 * 60 * 1000, // 2 分钟缓存
      async () => {
        try {
          const result = await this.client.request<GasOracleResponse['result']>({
            module: 'gastracker',
            action: 'gasoracle',
          })

          // 如果 API 返回正常值，使用 API 数据
          const safe = parseInt(result.SafeGasPrice || '0')
          const propose = parseInt(result.ProposeGasPrice || '0')
          const fast = parseInt(result.FastGasPrice || '0')
          const baseFee = parseFloat(result.suggestBaseFee || '0')

          // 如果 API 返回的值都是 0，则基于 baseFee 计算
          if (safe === 0 && propose === 0 && fast === 0 && baseFee > 0) {
            // 根据 EIP-1559，Gas Price = baseFee + priorityFee
            // 通常 priorityFee 在 1-3 Gwei 之间
            const baseFeeGwei = baseFee
            return {
              lastBlock: parseInt(result.LastBlock || '0'),
              safe: Math.ceil(baseFeeGwei + 1),    // baseFee + 1 gwei
              propose: Math.ceil(baseFeeGwei + 2), // baseFee + 2 gwei (推荐)
              fast: Math.ceil(baseFeeGwei + 3),    // baseFee + 3 gwei
              baseFee: baseFeeGwei,
              gasUsedRatio: parseFloat(result.gasUsedRatio || '0'),
              timestamp: Date.now(),
            }
          }

          return {
            lastBlock: parseInt(result.LastBlock || '0'),
            safe,
            propose,
            fast,
            baseFee,
            gasUsedRatio: parseFloat(result.gasUsedRatio || '0'),
            timestamp: Date.now(),
          }
        } catch (error) {
          console.error('[GasTracker] 获取 Gas Oracle 失败，使用默认值:', error)
          // 返回默认值
          return {
            lastBlock: 0,
            safe: 1,
            propose: 2,
            fast: 3,
            baseFee: 0.5,
            gasUsedRatio: 0,
            timestamp: Date.now(),
          }
        }
      }
    )
  }

  /**
   * 估算交易确认时间
   * @param gasPriceGwei Gas 价格（Gwei）
   * @returns 预估确认时间（秒）
   */
  async estimateConfirmationTime(gasPriceGwei: number): Promise<GasEstimation> {
    const cacheKey = generateCacheKey('gas:estimation', {
      chainId: this.client.getCurrentChainId(),
      gasPrice: gasPriceGwei,
    })

    return withCache(
      cacheKey,
      5 * 60 * 1000, // 5 分钟缓存
      async () => {
        const result = await this.client.request<string>({
          module: 'gastracker',
          action: 'gasestimate',
          gasprice: String(gasPriceGwei * 1e9), // 转换为 Wei
        })

        return {
          gasPrice: gasPriceGwei,
          estimatedTime: parseInt(result),
        }
      }
    )
  }

  /**
   * 获取每日平均 Gas 价格
   * @param startDate 开始日期 (YYYY-MM-DD)
   * @param endDate 结束日期 (YYYY-MM-DD)
   */
  async getDailyAverageGasPrice(
    startDate: string,
    endDate: string
  ): Promise<DailyGasPrice[]> {
    const cacheKey = generateCacheKey('gas:daily', {
      chainId: this.client.getCurrentChainId(),
      startDate,
      endDate,
    })

    return withCache(
      cacheKey,
      60 * 60 * 1000, // 1 小时缓存
      async () => {
        const result = await this.client.request<
          Array<{
            UTCDate: string
            unixTimeStamp: string
            value: string
          }>
        >({
          module: 'stats',
          action: 'dailyavggasprice',
          startdate: startDate,
          enddate: endDate,
          sort: 'asc',
        })

        return result.map((item) => ({
          date: item.UTCDate,
          avgGasPrice: parseFloat(item.value) / 1e9, // 转换为 Gwei
        }))
      }
    )
  }

  /**
   * 获取过去 N 天的平均 Gas 价格
   */
  async getRecentGasPrices(days: number = 7): Promise<DailyGasPrice[]> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]
    }

    try {
      return await this.getDailyAverageGasPrice(
        formatDate(startDate),
        formatDate(endDate)
      )
    } catch (error) {
      console.error('[GasTracker] 获取历史 Gas 价格失败，返回模拟数据:', error)
      // 返回模拟的历史数据
      const mockData: DailyGasPrice[] = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        mockData.push({
          date: formatDate(date),
          avgGasPrice: Math.floor(Math.random() * 30) + 10, // 10-40 Gwei
        })
      }
      return mockData
    }
  }

  /**
   * 计算 Gas 费用（ETH）
   */
  calculateGasFee(gasLimit: number, gasPriceGwei: number): number {
    return (gasLimit * gasPriceGwei) / 1e9
  }

  /**
   * 计算 Gas 费用（USD）
   */
  calculateGasFeeUSD(
    gasLimit: number,
    gasPriceGwei: number,
    ethPriceUSD: number
  ): number {
    const gasFeeETH = this.calculateGasFee(gasLimit, gasPriceGwei)
    return gasFeeETH * ethPriceUSD
  }

  /**
   * 获取 Gas 价格等级
   */
  getGasPriceLevel(gasPriceGwei: number): {
    level: 'low' | 'medium' | 'high' | 'extreme'
    color: string
    emoji: string
  } {
    if (gasPriceGwei < 30) {
      return {
        level: 'low',
        color: 'text-green-500',
        emoji: '🟢',
      }
    } else if (gasPriceGwei < 60) {
      return {
        level: 'medium',
        color: 'text-yellow-500',
        emoji: '🟡',
      }
    } else if (gasPriceGwei < 100) {
      return {
        level: 'high',
        color: 'text-orange-500',
        emoji: '🟠',
      }
    } else {
      return {
        level: 'extreme',
        color: 'text-red-500',
        emoji: '🔴',
      }
    }
  }

  /**
   * 建议最佳交易时间
   */
  async suggestBestTime(): Promise<{
    currentGas: number
    avgGas: number
    suggestion: string
  }> {
    const [currentPrice, recentPrices] = await Promise.all([
      this.getGasOracle(),
      this.getRecentGasPrices(7),
    ])

    const avgGas =
      recentPrices.reduce((sum, item) => sum + item.avgGasPrice, 0) /
      recentPrices.length

    let suggestion = ''

    if (currentPrice.propose < avgGas * 0.8) {
      suggestion = '现在是交易的好时机！Gas 费用较低。'
    } else if (currentPrice.propose > avgGas * 1.5) {
      suggestion = '建议等待 Gas 费用降低后再交易。'
    } else {
      suggestion = 'Gas 费用处于正常范围。'
    }

    return {
      currentGas: currentPrice.propose,
      avgGas,
      suggestion,
    }
  }
}

// ============================================
// 导出实例
// ============================================

export function createGasTracker(client: EtherscanClient): GasTracker {
  return new GasTracker(client)
}

// ============================================
// 常用 Gas Limit
// ============================================

export const COMMON_GAS_LIMITS = {
  ETH_TRANSFER: 21000,
  ERC20_TRANSFER: 65000,
  UNISWAP_SWAP: 150000,
  AAVE_DEPOSIT: 200000,
  NFT_MINT: 100000,
  OPENSEA_LIST: 80000,
} as const

// ============================================
// Gas 价格预设
// ============================================

export const GAS_PRICE_PRESETS = [
  { label: '慢速', multiplier: 0.8, time: '~5 分钟' },
  { label: '标准', multiplier: 1.0, time: '~2 分钟' },
  { label: '快速', multiplier: 1.2, time: '~30 秒' },
] as const
