'use client'

import { useState, useEffect, memo, useMemo, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { TrendingUp, Loader2, AlertCircle, Calendar } from 'lucide-react'
import { formatAPY } from '@/lib/utils'

interface ApyHistoryPoint {
  date: string
  timestamp: number
  apy: number
  apyBase: number
  apyReward: number
}

interface HistoryStats {
  avgApy: number
  maxApy: number
  minApy: number
  volatility: number
}

interface PoolApyChartProps {
  poolId: string
}

const TIME_RANGES = [
  { label: '7天', value: 7 },
  { label: '30天', value: 30 },
  { label: '90天', value: 90 },
]

function PoolApyChart({ poolId }: PoolApyChartProps) {
  const [history, setHistory] = useState<ApyHistoryPoint[]>([])
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const [selectedRange, setSelectedRange] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `/api/defi/yields/${encodeURIComponent(poolId)}/history?days=${selectedRange}`
        )
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch history')
        }

        console.log('[PoolApyChart] 历史数据:', result.history)
        console.log('[PoolApyChart] 统计数据:', result.stats)
        console.log('[PoolApyChart] 数据点数量:', result.history?.length)
        setHistory(result.history)
        setStats(result.stats)
      } catch (err) {
        console.error('Error fetching history:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [poolId, selectedRange])

  // 自定义 Tooltip（使用 useCallback 优化）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-xs text-gray-600 mb-2">{data.date}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-gray-700">Total APY:</span>
              <span className="text-sm font-bold text-green-600">{formatAPY(data.apy)}</span>
            </div>
            {data.apyBase > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-gray-700">Base APY:</span>
                <span className="text-sm font-semibold text-blue-600">{formatAPY(data.apyBase)}</span>
              </div>
            )}
            {data.apyReward > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-gray-700">Reward APY:</span>
                <span className="text-sm font-semibold text-purple-600">{formatAPY(data.apyReward)}</span>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }, [])

  // 检查是否有 Base APY 数据（memoized）
  const hasBaseApy = useMemo(() => history.some(h => h.apyBase > 0), [history])

  // 检查是否有 Reward APY 数据（memoized）
  const hasRewardApy = useMemo(() => history.some(h => h.apyReward > 0), [history])

  console.log('[PoolApyChart] 渲染状态:',
    'loading:', loading,
    'error:', error,
    'historyLength:', history.length,
    'hasBaseApy:', hasBaseApy,
    'hasRewardApy:', hasRewardApy
  )

  // 如果有数据，打印前3条
  if (history.length > 0) {
    console.log('[PoolApyChart] 前3条数据:', history.slice(0, 3))
    console.log('[PoolApyChart] 第一条完整数据:', JSON.stringify(history[0], null, 2))
  }

  // 检查 LineChart 是否可用
  console.log('[PoolApyChart] LineChart 类型:', typeof LineChart)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      {/* 头部：标题和时间范围选择 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">APY 历史趋势</h2>
          </div>
          {stats && !loading && (
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
              <span>平均: <span className="font-semibold text-gray-900">{formatAPY(stats.avgApy)}</span></span>
              <span>最高: <span className="font-semibold text-green-600">{formatAPY(stats.maxApy)}</span></span>
              <span>最低: <span className="font-semibold text-red-600">{formatAPY(stats.minApy)}</span></span>
            </div>
          )}
        </div>

        {/* 时间范围选择器 */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              onClick={() => setSelectedRange(range.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                selectedRange === range.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* 图表区域 */}
      <div className="w-full" style={{ height: '400px' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
            <p className="text-sm text-gray-600">加载历史数据...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
            <p className="text-sm text-gray-900 font-semibold mb-1">加载失败</p>
            <p className="text-xs text-gray-600">{error}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-10 h-10 text-yellow-500 mb-3" />
            <p className="text-sm text-gray-600">暂无历史数据</p>
          </div>
        ) : (
          <div style={{ width: '100%', overflow: 'auto' }}>
            <LineChart
              width={1100}
              height={380}
              data={history}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
                stroke="#9ca3af"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                stroke="#9ca3af"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="line"
              />

              {/* Total APY 线（主线，粗） */}
              <Line
                type="monotone"
                dataKey="apy"
                name="Total APY"
                stroke="#10b981"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />

              {/* Base APY 线 */}
              {hasBaseApy && (
                <Line
                  type="monotone"
                  dataKey="apyBase"
                  name="Base APY"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              )}

              {/* Reward APY 线 */}
              {hasRewardApy && (
                <Line
                  type="monotone"
                  dataKey="apyReward"
                  name="Reward APY"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </div>
        )}
      </div>

      {/* 数据说明 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          数据基于当前 APY 和历史变化百分比生成，仅供参考
        </p>
      </div>
    </div>
  )
}

// 使用 memo 优化性能，避免不必要的重新渲染
export default memo(PoolApyChart)
