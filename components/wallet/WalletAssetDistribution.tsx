'use client'

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import type { MoralisTokenBalance } from '@/types/database'

interface WalletAssetDistributionProps {
  tokens: MoralisTokenBalance[]
  nativeBalance?: {
    symbol: string
    balance: string
    usd_value?: number
  }
}

/**
 * 钱包资产分布饼图
 * 显示代币持仓分布，按价值排序
 */
export default function WalletAssetDistribution({
  tokens,
  nativeBalance,
}: WalletAssetDistributionProps) {
  // 准备图表数据
  const chartData: Array<{
    name: string
    value: number
    symbol: string
  }> = []

  // 添加原生代币（如果有价值）
  if (nativeBalance && nativeBalance.usd_value && nativeBalance.usd_value > 0) {
    chartData.push({
      name: nativeBalance.symbol,
      value: nativeBalance.usd_value,
      symbol: nativeBalance.symbol,
    })
  }

  // 添加其他代币（只包含有价值的）
  tokens.forEach((token) => {
    if (token.usd_value && token.usd_value > 0) {
      chartData.push({
        name: token.symbol,
        value: token.usd_value,
        symbol: token.symbol,
      })
    }
  })

  // 按价值排序
  chartData.sort((a, b) => b.value - a.value)

  // 只显示前 10 个，其余合并为 "其他"
  let displayData = chartData.slice(0, 10)
  if (chartData.length > 10) {
    const othersValue = chartData.slice(10).reduce((sum, item) => sum + item.value, 0)
    displayData.push({
      name: '其他',
      value: othersValue,
      symbol: 'Others',
    })
  }

  // 如果没有数据
  if (displayData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          资产分布
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          暂无价值数据
        </div>
      </div>
    )
  }

  // 颜色配置
  const COLORS = [
    '#3B82F6', // blue-500
    '#10B981', // green-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#F97316', // orange-500
    '#14B8A6', // teal-500
    '#6366F1', // indigo-500
    '#9CA3AF', // gray-400 for "其他"
  ]

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {((data.value / displayData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        资产分布
      </h3>

      {/* 饼图 */}
      <div className="w-full flex justify-center">
        <PieChart width={400} height={400}>
          <Pie
            data={displayData}
            cx={200}
            cy={200}
            outerRadius={140}
            fill="#8884d8"
            dataKey="value"
          >
            {displayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </div>

      {/* 资产列表 */}
      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Top 资产
        </h4>
        {displayData.slice(0, 5).map((item, index) => {
          const totalValue = displayData.reduce((sum, d) => sum + d.value, 0)
          const percentage = (item.value / totalValue) * 100

          return (
            <div key={`asset-${index}`} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
