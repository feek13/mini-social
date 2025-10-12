'use client'

import React, { useState, useMemo } from 'react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

type TimeRange = '7d' | '30d' | '90d' | '180d' | '1y' | 'all'

export default function TVLHistoryChart({
  data,
  height = 400
}: TVLHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [showUSD, setShowUSD] = useState(true)

  // 根据时间范围过滤数据
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)

    if (timeRange === '7d' || timeRange === '30d') {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      })
    }

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short'
    })
  }

  interface TooltipProps {
    active?: boolean
    payload?: Array<{
      payload: ChartDataPoint
      value: number
    }>
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-900 px-4 py-3 rounded-lg shadow-xl border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">
            {new Date(data.timestamp * 1000).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="text-lg font-bold text-blue-400">
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
    <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6">
      {/* 顶部：标题和控制器 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Total Value Locked</h3>
        </div>

        {/* 时间范围选择器 */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-800 rounded-lg p-1">
            {timeRanges.map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
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
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              showUSD
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            USD
          </button>
        </div>
      </div>

      {/* 图表 */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={filteredData}>
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
          />
          <YAxis
            tickFormatter={(value) => formatTVL(value)}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
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
      </ResponsiveContainer>
    </div>
  )
}
