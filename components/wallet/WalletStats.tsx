'use client'

import { TrendingUp, TrendingDown, Wallet, Activity, Award } from 'lucide-react'
import type { MoralisTokenBalance, MoralisTransaction } from '@/types/database'

interface WalletStatsProps {
  totalValue: number
  tokens: MoralisTokenBalance[]
  transactions: MoralisTransaction[]
  chains: Array<{
    chain: string
    balance_usd: number
    tokens_count: number
    nfts_count: number
  }>
}

/**
 * 钱包统计分析面板
 * 显示关键指标和洞察
 */
export default function WalletStats({
  totalValue,
  tokens,
  transactions,
  chains,
}: WalletStatsProps) {
  // 计算统计数据
  const totalTokens = chains.reduce((sum, c) => sum + c.tokens_count, 0)
  const totalNFTs = chains.reduce((sum, c) => sum + c.nfts_count, 0)
  const activeChains = chains.filter((c) => c.balance_usd > 0 || c.tokens_count > 0).length

  // 获取最大持仓代币
  const topToken = tokens.length > 0
    ? tokens.reduce((max, token) =>
        (token.usd_value || 0) > (max.usd_value || 0) ? token : max
      )
    : null

  // 计算交易统计
  const successfulTxs = transactions.filter((tx) => tx.receipt_status === '1').length
  const failedTxs = transactions.filter((tx) => tx.receipt_status === '0').length
  const successRate = transactions.length > 0
    ? (successfulTxs / transactions.length) * 100
    : 0

  // 分析钱包类型
  const walletType = analyzeWalletType(totalTokens, totalNFTs, totalValue, activeChains)

  return (
    <div className="space-y-6">
      {/* 关键指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 总资产价值 */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5" />
            <p className="text-sm opacity-90">总资产</p>
          </div>
          <p className="text-2xl font-bold">
            ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* 代币数量 */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" />
            <p className="text-sm opacity-90">代币</p>
          </div>
          <p className="text-2xl font-bold">{totalTokens}</p>
          <p className="text-xs opacity-75 mt-1">跨 {activeChains} 条链</p>
        </div>

        {/* NFT 数量 */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5" />
            <p className="text-sm opacity-90">NFT</p>
          </div>
          <p className="text-2xl font-bold">{totalNFTs}</p>
        </div>

        {/* 交易成功率 */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5" />
            <p className="text-sm opacity-90">成功率</p>
          </div>
          <p className="text-2xl font-bold">{successRate.toFixed(0)}%</p>
          <p className="text-xs opacity-75 mt-1">{successfulTxs}/{transactions.length} 笔交易</p>
        </div>
      </div>

      {/* 钱包洞察 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          钱包洞察
        </h3>

        <div className="space-y-4">
          {/* 钱包类型 */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                钱包类型
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {walletType.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {walletType.description}
              </p>
            </div>
          </div>

          {/* Top 持仓 */}
          {topToken && topToken.usd_value && topToken.usd_value > 0 && (() => {
            // 兼容不同的字段命名
            const tokenName = (topToken as any).token_name || topToken.name || 'Unknown Token'
            const tokenSymbol = (topToken as any).token_symbol || topToken.symbol || '???'
            const balance = topToken.balance_formatted || '0'

            return (
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="p-2 bg-green-500 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    最大持仓
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {tokenName} ({tokenSymbol})
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {parseFloat(balance).toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })} {tokenSymbol}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${topToken.usd_value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {((topToken.usd_value / totalValue) * 100).toFixed(1)}% 占比
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* 活跃度分析 */}
          <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                活跃度
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                最近 25 笔交易，成功 {successfulTxs} 笔，失败 {failedTxs} 笔
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {successRate >= 95 ? '交易成功率优秀' :
                 successRate >= 80 ? '交易成功率良好' :
                 '建议检查 gas 设置'}
              </p>
            </div>
          </div>

          {/* 多链分布 */}
          {activeChains > 1 && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white mb-1">
                  多链玩家
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  在 {activeChains} 条链上持有资产
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  显示出良好的多链生态参与度
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 分析钱包类型
 */
function analyzeWalletType(
  tokens: number,
  nfts: number,
  totalValue: number,
  activeChains: number
): { label: string; description: string } {
  // 巨鲸钱包
  if (totalValue > 1000000) {
    return {
      label: '🐋 巨鲸钱包',
      description: '持有超过 $1M 资产，属于大户级别',
    }
  }

  // 高净值钱包
  if (totalValue > 100000) {
    return {
      label: '💎 高净值钱包',
      description: '持有超过 $100K 资产，资深投资者',
    }
  }

  // NFT 收藏家
  if (nfts > 50 && nfts > tokens) {
    return {
      label: '🎨 NFT 收藏家',
      description: `持有 ${nfts} 个 NFT，热衷于收藏数字艺术`,
    }
  }

  // 多链活跃用户
  if (activeChains >= 5) {
    return {
      label: '🌐 多链活跃用户',
      description: `在 ${activeChains} 条链上活跃，深度参与多链生态`,
    }
  }

  // DeFi 玩家
  if (tokens > 20) {
    return {
      label: '🚀 DeFi 玩家',
      description: `持有 ${tokens} 种代币，积极参与 DeFi 生态`,
    }
  }

  // 普通用户
  if (totalValue > 1000) {
    return {
      label: '👤 活跃用户',
      description: '持有一定数量的加密资产',
    }
  }

  // 新手
  return {
    label: '🌱 新手用户',
    description: '刚开始探索加密世界',
  }
}
