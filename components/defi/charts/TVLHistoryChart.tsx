'use client'

import React, { useState, useMemo } from 'react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart
} from 'recharts'
import { formatTVL } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

interface ChartDataPoint {
  date: number
  tvl: number
  timestamp: number
}

interface TVLHistoryChartProps {
  data: ChartDataPoint[]
  height?: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: ChartDataPoint
    value: number
  }>
}

type TimeRange = '7d' | '30d' | '90d' | '180d' | '1y' | 'all'

export default function TVLHistoryChart({
  data,
  height = 400
}: TVLHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [showUSD, setShowUSD] = useState(true)

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return []
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
        <div className="bg-gray-900 px-3 py-2 rounded-lg shadow-xl border border-gray-700 max-w-[200px]">
          <p className="text-xs text-gray-400 mb-1 whitespace-nowrap">
            {new Date(data.timestamp * 1000).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="text-base font-bold text-blue-400 whitespace-nowrap">
            TVL: {formatTVL(data.tvl)}
          </p>
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
    <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-4 md:p-6 overflow-hidden">
      {/* 顶部：标题 */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <h3 className="text-base md:text-lg font-semibold text-white truncate">
          Total Value Locked
        </h3>
      </div>

      {/* 时间范围选择器 - 移动端可横向滚动 */}
      <div className="mb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
          <div className="flex bg-gray-800 rounded-lg p-1 flex-shrink-0">
            {timeRanges.map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  timeRange === range.value
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* USD 切换 */}
          <button
            onClick={() => setShowUSD(!showUSD)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
              showUSD
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            USD
          </button>
        </div>
      </div>

      {/* 图表 - 移动端高度调整 */}
      {filteredData && filteredData.length > 0 ? (
        <div className="w-full overflow-x-auto">
          <AreaChart
            width={1100}
            height={height}
            data={filteredData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
              <defs>
                <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatDate}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => {
                  // 移动端简化显示
                  if (value >= 1000000000) {
                    return `${(value / 1000000000).toFixed(1)}B`
                  }
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`
                  }
                  return formatTVL(value)
                }}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="tvl"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#tvlGradient)"
              />
          </AreaChart>
        </div>
      ) : (
        <div className="flex items-center justify-center text-gray-400" style={{ height: `${height}px` }}>
          No TVL data available ({data?.length || 0} points, filtered: {filteredData?.length || 0})
        </div>
      )}
    </div>
  )
}
