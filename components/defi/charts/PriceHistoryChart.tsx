'use client'

import React, { useState, useMemo } from 'react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area
} from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react'

interface PriceDataPoint {
  timestamp: number
  price: number
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
}

interface PriceHistoryChartProps {
  data: PriceDataPoint[]
  tokenSymbol?: string
  height?: number
  showVolume?: boolean
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: PriceDataPoint
    value: number
    dataKey: string
  }>
  label?: number
}

type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all'
type ChartType = 'line' | 'candlestick' | 'area'

export default function PriceHistoryChart({
  data,
  tokenSymbol = 'Token',
  height = 450,
  showVolume = false
}: PriceHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [chartType, setChartType] = useState<ChartType>('area')

  // 筛选时间范围
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return data

    const now = Date.now() / 1000
    const ranges: Record<TimeRange, number> = {
      '24h': 24 * 60 * 60,
      '7d': 7 * 24 * 60 * 60,
      '30d': 30 * 24 * 60 * 60,
      '90d': 90 * 24 * 60 * 60,
      '1y': 365 * 24 * 60 * 60,
      'all': Infinity
    }

    const cutoff = now - ranges[timeRange]
    return data.filter(d => d.timestamp >= cutoff)
  }, [data, timeRange])

  // 计算统计数据
  const stats = useMemo(() => {
    if (filteredData.length === 0) return {
      current: 0,
      high: 0,
      low: 0,
      change: 0,
      changePercent: 0,
      volume: 0
    }

    const prices = filteredData.map(d => d.price)
    const high = Math.max(...prices)
    const low = Math.min(...prices)
    const current = filteredData[filteredData.length - 1]?.price || 0
    const first = filteredData[0]?.price || 0
    const change = current - first
    const changePercent = first > 0 ? (change / first) * 100 : 0

    const volume = filteredData.reduce((sum, d) => sum + (d.volume || 0), 0)

    return { current, high, low, change, changePercent, volume }
  }, [filteredData])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)

    if (timeRange === '24h') {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

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

  const formatPrice = (price: number) => {
    if (price >= 1) {
      return `$${price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`
    }
    return `$${price.toFixed(6)}`
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload

      return (
        <div className="bg-gray-900 px-4 py-3 rounded-lg shadow-xl border border-gray-700">
          <p className="text-xs text-gray-400 mb-2">
            {new Date((label || 0) * 1000).toLocaleString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>

          {chartType === 'candlestick' && data.open !== undefined ? (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-gray-400">Open:</span>
                <span className="text-white font-semibold">{formatPrice(data.open)}</span>

                <span className="text-gray-400">High:</span>
                <span className="text-green-400 font-semibold">{formatPrice(data.high || 0)}</span>

                <span className="text-gray-400">Low:</span>
                <span className="text-red-400 font-semibold">{formatPrice(data.low || 0)}</span>

                <span className="text-gray-400">Close:</span>
                <span className="text-white font-bold">{formatPrice(data.close || data.price)}</span>
              </div>
            </>
          ) : (
            <p className="text-lg font-bold text-blue-400">
              Price: {formatPrice(data.price)}
            </p>
          )}

          {data.volume !== undefined && data.volume > 0 && (
            <p className="text-xs text-purple-400 mt-2">
              Volume: ${data.volume.toLocaleString('en-US')}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' }
  ]

  const chartTypes: { value: ChartType; label: string; icon: React.ReactNode }[] = [
    { value: 'line', label: 'Line', icon: <Activity className="w-3.5 h-3.5" /> },
    { value: 'area', label: 'Area', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { value: 'candlestick', label: 'Candle', icon: <BarChart3 className="w-3.5 h-3.5" /> }
  ]

  return (
    <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 rounded-xl shadow-xl border border-blue-800/30 p-4 md:p-6">
      {/* 顶部：标题和统计 */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            <h3 className="text-base md:text-lg font-semibold text-white">
              {tokenSymbol} Price
            </h3>
          </div>

          {/* 当前价格和变化 */}
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-black text-white">
              {formatPrice(stats.current)}
            </p>
            <div className={`flex items-center gap-1 text-sm font-bold ${
              stats.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {stats.changePercent >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {stats.changePercent >= 0 ? '+' : ''}
                {stats.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800/50 backdrop-blur rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400">High</p>
            <p className="text-sm font-bold text-green-400">{formatPrice(stats.high)}</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400">Low</p>
            <p className="text-sm font-bold text-red-400">{formatPrice(stats.low)}</p>
          </div>
          {showVolume && (
            <div className="bg-gray-800/50 backdrop-blur rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400">Vol</p>
              <p className="text-sm font-bold text-purple-400">
                ${(stats.volume / 1000000).toFixed(1)}M
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 控制器 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        {/* 时间范围选择器 */}
        <div className="flex bg-gray-800/70 backdrop-blur rounded-lg p-1 overflow-x-auto hide-scrollbar">
          {timeRanges.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex-1 ${
                timeRange === range.value
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* 图表类型选择器 */}
        <div className="flex bg-gray-800/70 backdrop-blur rounded-lg p-1">
          {chartTypes.map(type => (
            <button
              key={type.value}
              onClick={() => setChartType(type.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                chartType === type.value
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
              title={type.label}
            >
              {type.icon}
              <span className="hidden md:inline">{type.label}</span>
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
            <ComposedChart
              data={filteredData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
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
                tickFormatter={(value) => `$${value.toFixed(value >= 1 ? 2 : 4)}`}
                stroke="#6B7280"
                style={{ fontSize: '10px' }}
                tick={{ fontSize: 10 }}
                width={60}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Render different chart types */}
              {chartType === 'line' && (
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                />
              )}

              {chartType === 'area' && (
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                />
              )}

              {chartType === 'candlestick' && (
                <Bar
                  dataKey="price"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No price data available for this time range</p>
        </div>
      )}

      {/* 底部说明 */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <p className="text-xs text-gray-400 text-center">
          {timeRange === '24h' ? '24小时价格走势' : `最近 ${timeRange} 的价格历史数据`}
        </p>
      </div>
    </div>
  )
}
