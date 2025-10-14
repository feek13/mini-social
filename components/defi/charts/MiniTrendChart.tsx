'use client'

import React from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendDataPoint {
  value: number
  timestamp?: number
}

interface MiniTrendChartProps {
  data: TrendDataPoint[]
  width?: number | string
  height?: number
  color?: 'green' | 'red' | 'blue' | 'purple' | 'auto'
  showIcon?: boolean
  showChange?: boolean
  className?: string
}

export default function MiniTrendChart({
  data,
  width = '100%',
  height = 40,
  color = 'auto',
  showIcon = true,
  showChange = true,
  className = ''
}: MiniTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <Minus className="w-4 h-4 text-gray-400" />
      </div>
    )
  }

  // 计算趋势方向和变化百分比
  const firstValue = data[0]?.value || 0
  const lastValue = data[data.length - 1]?.value || 0
  const change = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0
  const isPositive = change >= 0
  const isFlat = Math.abs(change) < 0.01

  // 自动判断颜色
  const getColor = () => {
    if (color !== 'auto') {
      const colors = {
        green: '#10B981',
        red: '#EF4444',
        blue: '#3B82F6',
        purple: '#A855F7'
      }
      return colors[color]
    }

    if (isFlat) return '#6B7280'
    return isPositive ? '#10B981' : '#EF4444'
  }

  const strokeColor = getColor()

  // 获取趋势图标
  const getTrendIcon = () => {
    if (isFlat) {
      return <Minus className="w-3 h-3 text-gray-500" />
    }
    if (isPositive) {
      return <TrendingUp className="w-3 h-3 text-green-500" />
    }
    return <TrendingDown className="w-3 h-3 text-red-500" />
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 迷你图表 */}
      <div style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 趋势指示器 */}
      {showIcon && getTrendIcon()}

      {/* 变化百分比 */}
      {showChange && (
        <span
          className={`text-xs font-semibold ${
            isFlat
              ? 'text-gray-500'
              : isPositive
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {isPositive && !isFlat && '+'}
          {change.toFixed(2)}%
        </span>
      )}
    </div>
  )
}

// 简化版本：只显示sparkline，不显示图标和百分比
export function SparklineChart({
  data,
  width = 60,
  height = 20,
  color = 'auto',
  className = ''
}: Omit<MiniTrendChartProps, 'showIcon' | 'showChange'>) {
  if (!data || data.length === 0) {
    return <div className={className} style={{ width, height }} />
  }

  const firstValue = data[0]?.value || 0
  const lastValue = data[data.length - 1]?.value || 0
  const change = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0
  const isPositive = change >= 0
  const isFlat = Math.abs(change) < 0.01

  const getColor = () => {
    if (color !== 'auto') {
      const colors = {
        green: '#10B981',
        red: '#EF4444',
        blue: '#3B82F6',
        purple: '#A855F7'
      }
      return colors[color]
    }

    if (isFlat) return '#6B7280'
    return isPositive ? '#10B981' : '#EF4444'
  }

  const strokeColor = getColor()

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// 用于展示7天趋势的专用组件
export function WeekTrendChart({
  data,
  className = ''
}: {
  data: TrendDataPoint[]
  className?: string
}) {
  return (
    <MiniTrendChart
      data={data}
      width={80}
      height={32}
      color="auto"
      showIcon={true}
      showChange={false}
      className={className}
    />
  )
}

// 用于展示30天趋势的专用组件
export function MonthTrendChart({
  data,
  className = ''
}: {
  data: TrendDataPoint[]
  className?: string
}) {
  return (
    <MiniTrendChart
      data={data}
      width={100}
      height={40}
      color="auto"
      showIcon={true}
      showChange={true}
      className={className}
    />
  )
}
