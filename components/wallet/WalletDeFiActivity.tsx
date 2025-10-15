'use client'

import { ExternalLink } from 'lucide-react'
import { identifyDeFiProtocols, getCategoryInfo, type DeFiProtocol } from '@/lib/defi-protocols'
import type { MoralisTransaction } from '@/types/database'

interface WalletDeFiActivityProps {
  transactions: MoralisTransaction[]
  chain: string
}

/**
 * 钱包 DeFi 活动展示
 * 显示钱包与哪些 DeFi 协议有交互
 */
export default function WalletDeFiActivity({
  transactions,
  chain,
}: WalletDeFiActivityProps) {
  // 识别 DeFi 协议
  const defiProtocols = identifyDeFiProtocols(transactions, chain)

  if (defiProtocols.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          DeFi 协议交互
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            未检测到 DeFi 协议交互
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            基于最近 {transactions.length} 笔交易分析
          </p>
        </div>
      </div>
    )
  }

  // 按类别分组
  const protocolsByCategory = defiProtocols.reduce((acc, { protocol, interactions }) => {
    const category = protocol.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push({ protocol, interactions })
    return acc
  }, {} as Record<string, Array<{ protocol: DeFiProtocol; interactions: number }>>)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          DeFi 协议交互
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {defiProtocols.length} 个协议
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        基于最近 {transactions.length} 笔交易分析
      </p>

      {/* 按类别显示 */}
      <div className="space-y-6">
        {Object.entries(protocolsByCategory).map(([category, protocols]) => {
          const categoryInfo = getCategoryInfo(category as DeFiProtocol['category'])

          return (
            <div key={category}>
              {/* 类别标题 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{categoryInfo.icon}</span>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {categoryInfo.label}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({protocols.length})
                </span>
              </div>

              {/* 协议列表 */}
              <div className="space-y-2 ml-8">
                {protocols.map(({ protocol, interactions }) => (
                  <div
                    key={protocol.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700
                             hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {protocol.name}
                        </p>
                        {protocol.website && (
                          <a
                            href={protocol.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {interactions} 次交互
                      </p>
                    </div>

                    {/* 类别标签 */}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full
                        bg-${categoryInfo.color}-100 text-${categoryInfo.color}-700
                        dark:bg-${categoryInfo.color}-900/30 dark:text-${categoryInfo.color}-300`}
                    >
                      {categoryInfo.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 总结 */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl">💡</div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              DeFi 活跃度
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getDeFiActivitySummary(defiProtocols, protocolsByCategory)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 生成 DeFi 活动总结
 */
function getDeFiActivitySummary(
  protocols: Array<{ protocol: DeFiProtocol; interactions: number }>,
  byCategory: Record<string, any>
): string {
  const totalInteractions = protocols.reduce((sum, p) => sum + p.interactions, 0)
  const categories = Object.keys(byCategory)

  const parts: string[] = []

  // 最活跃协议
  if (protocols.length > 0) {
    const topProtocol = protocols[0]
    parts.push(`最常使用 ${topProtocol.protocol.name} (${topProtocol.interactions} 次)`)
  }

  // 跨类别活动
  if (categories.length >= 3) {
    parts.push(`跨 ${categories.length} 个 DeFi 类别活跃`)
  }

  // DEX 使用
  if (byCategory['DEX']) {
    parts.push('活跃的 DEX 交易者')
  }

  // 借贷协议
  if (byCategory['Lending']) {
    parts.push('参与借贷协议')
  }

  // 默认消息
  if (parts.length === 0) {
    parts.push(`与 ${protocols.length} 个 DeFi 协议有交互`)
  }

  return parts.join('，')
}
