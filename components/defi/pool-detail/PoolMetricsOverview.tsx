'use client'

import { TrendingUp, Droplets, Shield, Sparkles, TrendingDown } from 'lucide-react'
import { YieldPool } from '@/lib/defillama/types'
import {
  formatTVL,
  formatAPY,
  formatAPYChange,
  getAPYTrendColor,
  calculateRiskScore,
  getRiskScoreStyle
} from '@/lib/utils'

interface PoolMetricsOverviewProps {
  pool: YieldPool
}

export default function PoolMetricsOverview({ pool }: PoolMetricsOverviewProps) {
  const riskScore = calculateRiskScore(pool)
  const riskScoreStyle = getRiskScoreStyle(riskScore)
  const trendColor = getAPYTrendColor(pool.apyPct7D)
  const hasReward = pool.apyReward !== null && pool.apyReward > 0.01
  const hasBase = pool.apyBase !== null && pool.apyBase > 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 当前 APY */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6 hover:shadow-lg transition">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">当前 APY</span>
          </div>
          {pool.apyPct7D !== null && pool.apyPct7D !== undefined && Math.abs(pool.apyPct7D) > 0.01 && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
              {pool.apyPct7D > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{formatAPYChange(pool.apyPct7D)}</span>
            </div>
          )}
        </div>
        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-1">
          {formatAPY(pool.apy)}
        </div>
        {pool.apyPct7D !== null && pool.apyPct7D !== undefined && Math.abs(pool.apyPct7D) > 0.01 && (
          <p className="text-xs text-gray-600">过去 7 天变化</p>
        )}
      </div>

      {/* TVL */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6 hover:shadow-lg transition">
        <div className="flex items-center gap-2 mb-2">
          <Droplets className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">总锁仓量</span>
        </div>
        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 mb-1">
          {formatTVL(pool.tvlUsd)}
        </div>
        <p className="text-xs text-gray-600">TVL (参考)</p>
      </div>

      {/* 风险评分 */}
      <div className={`bg-gradient-to-br ${riskScoreStyle.bg.replace('bg-', 'from-')}-50 to-${riskScoreStyle.bg.replace('bg-', '')}-100 rounded-xl border ${riskScoreStyle.bg.replace('bg-', 'border-')}-200 p-6 hover:shadow-lg transition`}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-gray-700" />
          <span className="text-sm font-medium text-gray-700">风险评分</span>
        </div>
        <div className={`text-4xl font-black mb-1 ${riskScoreStyle.color}`}>
          {riskScore}
          <span className="text-2xl font-semibold">/100</span>
        </div>
        <p className={`text-xs font-semibold ${riskScoreStyle.color}`}>
          {riskScoreStyle.label}
        </p>
      </div>

      {/* 收益组成 */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 hover:shadow-lg transition">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">收益组成</span>
        </div>
        <div className="space-y-2">
          {hasBase && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Base APY</span>
              <span className="text-lg font-bold text-blue-600">{formatAPY(pool.apyBase || 0)}</span>
            </div>
          )}
          {hasReward && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Reward APY</span>
              <span className="text-lg font-bold text-purple-600">{formatAPY(pool.apyReward || 0)}</span>
            </div>
          )}
          {!hasBase && !hasReward && (
            <div className="text-center py-2">
              <p className="text-sm text-gray-600">单一收益源</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{formatAPY(pool.apy)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
