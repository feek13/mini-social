'use client'

import { useMemo, memo, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, Activity, Droplets } from 'lucide-react'
import { YieldPool } from '@/lib/defillama/types'
import { formatAPY, formatTVL } from '@/lib/utils'

interface PoolStatsTabProps {
  pool: YieldPool
}

function PoolStatsTab({ pool }: PoolStatsTabProps) {
  // APY 分布数据
  const apyDistribution = useMemo(() => {
    const data = []

    // 当前 APY
    if (pool.apy > 0) {
      data.push({
        name: '当前 APY',
        value: parseFloat(pool.apy.toFixed(2)),
        color: '#10b981'
      })
    }

    // Base APY
    if (pool.apyBase && pool.apyBase > 0) {
      data.push({
        name: 'Base APY',
        value: parseFloat(pool.apyBase.toFixed(2)),
        color: '#3b82f6'
      })
    }

    // Reward APY
    if (pool.apyReward && pool.apyReward > 0) {
      data.push({
        name: 'Reward APY',
        value: parseFloat(pool.apyReward.toFixed(2)),
        color: '#a855f7'
      })
    }

    // 30天平均 APY
    if (pool.apyMean30d && pool.apyMean30d > 0) {
      data.push({
        name: '30天平均',
        value: parseFloat(pool.apyMean30d.toFixed(2)),
        color: '#f59e0b'
      })
    }

    // 7天 Base APY
    if (pool.apyBase7d && pool.apyBase7d > 0) {
      data.push({
        name: '7天 Base',
        value: parseFloat(pool.apyBase7d.toFixed(2)),
        color: '#06b6d4'
      })
    }

    return data
  }, [pool])

  // 交易量数据
  const volumeData = useMemo(() => {
    const data = []

    if (pool.volumeUsd1d !== null && pool.volumeUsd1d > 0) {
      data.push({
        name: '24小时',
        value: pool.volumeUsd1d,
        label: formatTVL(pool.volumeUsd1d)
      })
    }

    if (pool.volumeUsd7d !== null && pool.volumeUsd7d > 0) {
      data.push({
        name: '7天',
        value: pool.volumeUsd7d,
        label: formatTVL(pool.volumeUsd7d)
      })
    }

    return data
  }, [pool])

  // APY 变化数据
  const apyChangeData = useMemo(() => {
    const data = []

    if (pool.apyPct1D !== null) {
      data.push({
        name: '1天',
        value: parseFloat(pool.apyPct1D.toFixed(2)),
        color: pool.apyPct1D > 0 ? '#10b981' : '#ef4444'
      })
    }

    if (pool.apyPct7D !== null) {
      data.push({
        name: '7天',
        value: parseFloat(pool.apyPct7D.toFixed(2)),
        color: pool.apyPct7D > 0 ? '#10b981' : '#ef4444'
      })
    }

    if (pool.apyPct30D !== null) {
      data.push({
        name: '30天',
        value: parseFloat(pool.apyPct30D.toFixed(2)),
        color: pool.apyPct30D > 0 ? '#10b981' : '#ef4444'
      })
    }

    return data
  }, [pool])

  // 自定义 Tooltip（使用 useCallback 优化）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-xs font-medium text-gray-700 mb-1">{data.name}</p>
          <p className="text-sm font-bold text-gray-900">
            {data.label || `${data.value}%`}
          </p>
        </div>
      )
    }
    return null
  }, [])

  return (
    <div className="space-y-6">
      {/* APY 分布图 */}
      {apyDistribution.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-gray-900">APY 分布</h3>
          </div>
          <div className="w-full" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={apyDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  stroke="#9ca3af"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {apyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* APY 变化百分比 */}
      {apyChangeData.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">APY 变化趋势</h3>
          </div>
          <div className="w-full" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={apyChangeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  stroke="#9ca3af"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {apyChangeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            绿色表示增长，红色表示下降
          </p>
        </div>
      )}

      {/* 交易量图表 */}
      {volumeData.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-5 h-5 text-cyan-600" />
            <h3 className="text-lg font-bold text-gray-900">交易量统计</h3>
          </div>
          <div className="w-full" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatTVL(value)}
                  stroke="#9ca3af"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 无数据提示 */}
      {apyDistribution.length === 0 && volumeData.length === 0 && apyChangeData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无统计数据</p>
        </div>
      )}
    </div>
  )
}

// 使用 memo 优化性能，避免不必要的重新渲染
export default memo(PoolStatsTab)
