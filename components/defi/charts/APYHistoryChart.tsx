'use client'

import React, { useState, useMemo } from 'react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatAPY } from '@/lib/utils'

interface APYDataPoint {
  date: number
  apy: number
  timestamp: number
  apyBase?: number
  apyReward?: number
}

interface APYHistoryChartProps {
  data: APYDataPoint[]
  height?: number
  showBaseReward?: boolean
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: APYDataPoint
    value: number
    dataKey: string
  }>
}

type TimeRange = '7d' | '30d' | '90d' | '180d' | '1y' | 'all'

export default function APYHistoryChart({
  data,
  height = 400,
  showBaseReward = false
}: APYHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  // 筛选时间范围
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return data

    const now = Date.now() / 1000
    const ranges: Record<TimeRange, number> = {
      '7d': 7 * 24 * 60 * 60,
      '30d': 30 * 24 * 60 * 60,
      '90d': 90 * 24 * 60 * 60,
      '180d': 180 * 24 * 60 * 60,
      '1y': 365 * 24 * 60 * 60,
      'all': Infinity
    }

    const cutoff = now - ranges[timeRange]
    return data.filter(d => d.timestamp >= cutoff)
  }, [data, timeRange])

  // 计算统计数据
  const stats = useMemo(() => {
    if (filteredData.length === 0) return { avg: 0, max: 0, min: 0, change: 0 }

    const apys = filteredData.map(d => d.apy)
    const avg = apys.reduce((a, b) => a + b, 0) / apys.length
    const max = Math.max(...apys)
    const min = Math.min(...apys)

    const first = filteredData[0]?.apy || 0
    const last = filteredData[filteredData.length - 1]?.apy || 0
    const change = first > 0 ? ((last - first) / first) * 100 : 0

    return { avg, max, min, change }
  }, [filteredData])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)

    if (timeRange === '7d' || timeRange === '30d') {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      })
    }

    return date.toLocaleDateString('zh-CN', {
      year: '2-digit',
      month: 'short'
    })
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-900 px-4 py-3 rounded-lg shadow-xl border border-gray-700">
          <p className="text-xs text-gray-400 mb-2">
            {new Date(data.timestamp * 1000).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="text-lg font-bold text-green-400 mb-1">
            Total APY: {formatAPY(data.apy)}
          </p>
          {showBaseReward && data.apyBase !== undefined && (
            <p className="text-xs text-blue-400">
              Base: {formatAPY(data.apyBase)}
            </p>
          )}
          {showBaseReward && data.apyReward !== undefined && data.apyReward > 0 && (
            <p className="text-xs text-purple-400">
              Reward: {formatAPY(data.apyReward)}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: '180d', label: '180d' },
    { value: '1y', label: '1y' },
    { value: 'all', label: 'All' }
  ]

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg border border-gray-700 p-4 md:p-6">
      {/* 顶部：标题和统计 */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          {stats.change >= 0 ? (
            <TrendingUp className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white">
              APY History
            </h3>
            <p className="text-xs text-gray-400">
              {timeRange === 'all' ? 'All time' : `Last ${timeRange}`}
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-2 text-right">
          <div className="bg-gray-800/50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400">Avg</p>
            <p className="text-sm font-bold text-white">{formatAPY(stats.avg)}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400">Change</p>
            <p className={`text-sm font-bold ${
              stats.change >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* 时间范围选择器 */}
      <div className="mb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex bg-gray-800 rounded-lg p-1 overflow-x-auto hide-scrollbar">
          {timeRanges.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex-1 ${
                timeRange === range.value
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* 图表 */}
      {filteredData.length > 0 ? (
        <div
          className="w-full"
          style={{
            height: `${height}px`,
            minHeight: `${height}px`
          }}
        >
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart
              data={filteredData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="apyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatDate}
                stroke="#6B7280"
                style={{ fontSize: '10px' }}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                stroke="#6B7280"
                style={{ fontSize: '10px' }}
                tick={{ fontSize: 10 }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* 平均值参考线 */}
              <ReferenceLine
                y={stats.avg}
                stroke="#9CA3AF"
                strokeDasharray="5 5"
                label={{
                  value: `Avg: ${stats.avg.toFixed(2)}%`,
                  fill: '#9CA3AF',
                  fontSize: 10,
                  position: 'right'
                }}
              />

              <Area
                type="monotone"
                dataKey="apy"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#apyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No data available for this time range</p>
        </div>
      )}

      {/* 底部说明 */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Total APY</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-gray-400" style={{ width: '12px' }}></div>
            <span>Average</span>
          </div>
          <div className="ml-auto">
            <span className="font-medium text-gray-300">
              Range: {formatAPY(stats.min)} - {formatAPY(stats.max)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
