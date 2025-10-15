'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { CHAIN_CONFIGS } from '@/lib/moralis'
import type { EvmChain } from '@/types/database'

interface ChainData {
  chain: EvmChain
  balance_usd: number
  tokens_count: number
  nfts_count: number
}

interface WalletChainDistributionProps {
  chains: ChainData[]
}

/**
 * 钱包跨链资产分布
 * 显示不同链上的资产价值分布
 */
export default function WalletChainDistribution({ chains }: WalletChainDistributionProps) {
  // 过滤掉没有资产的链，并按价值排序
  const activeChains = chains
    .filter((c) => c.balance_usd > 0 || c.tokens_count > 0 || c.nfts_count > 0)
    .sort((a, b) => b.balance_usd - a.balance_usd)

  if (activeChains.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          跨链资产分布
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          暂无跨链资产
        </div>
      </div>
    )
  }

  // 准备图表数据
  const chartData = activeChains.map((chainData) => ({
    name: CHAIN_CONFIGS[chainData.chain]?.name || chainData.chain,
    value: chainData.balance_usd || 0,
    tokens: chainData.tokens_count || 0,
    nfts: chainData.nfts_count || 0,
    chain: chainData.chain,
  }))

  // 颜色映射
  const COLORS: Record<string, string> = {
    ethereum: '#627EEA',
    bsc: '#F3BA2F',
    polygon: '#8247E5',
    arbitrum: '#28A0F0',
    optimism: '#FF0420',
    base: '#0052FF',
    avalanche: '#E84142',
    fantom: '#1969FF',
    cronos: '#002D74',
    gnosis: '#04795B',
    linea: '#121212',
    zksync: '#8C8DFC',
  }

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              资产价值: <span className="font-medium text-gray-900 dark:text-white">
                ${(data.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              代币数量: <span className="font-medium text-gray-900 dark:text-white">{data.tokens || 0}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              NFT 数量: <span className="font-medium text-gray-900 dark:text-white">{data.nfts || 0}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // 计算总价值
  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          跨链资产分布
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          活跃链: {activeChains.length}
        </p>
      </div>

      {/* 柱状图 */}
      <div className="w-full overflow-x-auto">
        <BarChart
          width={Math.max(chartData.length * 80, 600)}
          height={300}
          data={chartData}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.chain] || '#3B82F6'}
              />
            ))}
          </Bar>
        </BarChart>
      </div>

      {/* 链列表详情 */}
      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          链上资产详情
        </h4>
        {chartData.map((item) => {
          const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0

          return (
            <div
              key={item.chain}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[item.chain] || '#3B82F6' }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.tokens} 代币 · {item.nfts} NFT
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${(item.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 总计 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            总资产价值
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  )
}
