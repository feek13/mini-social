'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, ExternalLink, Sparkles } from 'lucide-react'
import { formatTVL } from '@/lib/utils'

interface PancakeSwapOverview {
  name: string
  tvl: number
  chains: string[]
  chainTvls: Record<string, number>
  category: string
  logo: string | null
  url: string
  change_1d: number | null
  change_7d: number | null
}

export function PancakeSwapCard() {
  const [data, setData] = useState<PancakeSwapOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/defi/pancakeswap/overview')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch PancakeSwap data')
        return res.json()
      })
      .then(setData)
      .catch(err => {
        console.error('Error fetching PancakeSwap overview:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-8 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <p className="text-red-600 text-sm">
          ❌ 无法加载 PancakeSwap 数据: {error || '未知错误'}
        </p>
      </div>
    )
  }

  const isPositive = (data.change_1d || 0) >= 0
  const topChains = Object.entries(data.chainTvls)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return (
    <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-xl shadow-sm border border-orange-200 p-6 hover:shadow-md transition-all">
      {/* 顶部：Logo 和基本信息 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center">
            {data.logo ? (
              <img
                src={data.logo}
                alt={data.name}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <Sparkles className="w-8 h-8 text-orange-500" />
            )}
          </div>

          {/* 名称和分类 */}
          <div>
            <h3 className="font-bold text-xl text-gray-900 mb-1">{data.name}</h3>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-md">
                {data.category}
              </span>
              <span className="text-sm text-gray-600">
                {data.chains.length} chains
              </span>
            </div>
          </div>
        </div>

        {/* 外部链接 */}
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
          title="访问 PancakeSwap"
        >
          Visit
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* TVL 展示 */}
      <div className="mb-6">
        <div className="flex items-end gap-3 mb-2">
          <div>
            <span className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
              Total Value Locked
            </span>
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
              {formatTVL(data.tvl)}
            </div>
          </div>

          {/* 24h 变化 */}
          {data.change_1d !== null && data.change_1d !== undefined && (
            <div className={`flex items-center gap-1 pb-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span className="text-lg font-bold">
                {Math.abs(data.change_1d).toFixed(2)}%
              </span>
              <span className="text-xs text-gray-500">(24h)</span>
            </div>
          )}
        </div>

        {/* 7d 变化 */}
        {data.change_7d !== null && data.change_7d !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">7 days:</span>
            <span className={`font-semibold ${data.change_7d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.change_7d >= 0 ? '+' : ''}
              {data.change_7d.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* 顶部链分布 */}
      <div>
        <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">
          Top Chains by TVL
        </div>
        <div className="space-y-2">
          {topChains.map(([chain, tvl]) => {
            const percentage = (tvl / data.tvl) * 100
            return (
              <div key={chain} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-20">
                  {chain}
                </span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-24 text-right">
                  {formatTVL(tvl)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
