'use client'

import { TrendingUp, Shield, Droplets, Sparkles, Info } from 'lucide-react'
import { YieldPool } from '@/lib/defillama/types'
import { formatTVL, formatAPY, getRiskStyle, isHighAPY } from '@/lib/utils'

interface YieldCardProps {
  pool: YieldPool
}

export default function YieldCard({ pool }: YieldCardProps) {
  const {
    project,
    chain,
    symbol,
    apy,
    apyBase,
    apyReward,
    apyMean30d,
    tvlUsd,
    ilRisk,
    stablecoin,
  } = pool

  const riskStyle = getRiskStyle(ilRisk)
  const highAPY = isHighAPY(apy)

  return (
    <div
      className={`rounded-xl shadow-sm border p-4 sm:p-5 hover:shadow-md transition-all animate-fade-in-up cursor-pointer group ${
        highAPY
          ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200 hover:border-green-300'
          : 'bg-white border-gray-100 hover:border-gray-200'
      }`}
    >
      {/* 顶部：协议名称、链标签、代币符号 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          {/* 协议名称 */}
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-blue-500 transition">
              {project}
            </h3>
            {highAPY && (
              <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0 animate-pulse" />
            )}
          </div>

          {/* 代币符号 */}
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-gray-700">{symbol}</span>
            {stablecoin && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                稳定币
              </span>
            )}
          </div>

          {/* 链标签 */}
          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-md">
            {chain}
          </span>
        </div>
      </div>

      {/* 中间：APY（重点展示） */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        {/* 主 APY */}
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className={`w-5 h-5 ${highAPY ? 'text-green-600' : 'text-green-500'}`} />
            <span className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
              Total APY
            </span>
          </div>
          <div
            className={`text-4xl sm:text-5xl font-black ${
              highAPY
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600'
                : 'text-green-600'
            }`}
          >
            {formatAPY(apy)}
          </div>
        </div>

        {/* APY 分解 */}
        <div className="space-y-2">
          {/* Base APY */}
          {apyBase !== null && apyBase > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Base APY:</span>
              <span className="font-semibold text-gray-900">{formatAPY(apyBase)}</span>
            </div>
          )}

          {/* Reward APY */}
          {apyReward !== null && apyReward > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Reward APY:</span>
              <span className="font-semibold text-green-600">{formatAPY(apyReward)}</span>
            </div>
          )}

          {/* 30 天平均 APY */}
          {apyMean30d !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">30d Avg:</span>
              <span className="font-semibold text-blue-600">{formatAPY(apyMean30d)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 底部：TVL、风险等级、查看详情 */}
      <div className="space-y-3">
        {/* TVL 和风险等级 */}
        <div className="grid grid-cols-2 gap-3">
          {/* TVL */}
          <div>
            <div className="flex items-center space-x-1 mb-1">
              <Droplets className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">TVL</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {formatTVL(tvlUsd)}
            </div>
          </div>

          {/* 风险等级 */}
          <div>
            <div className="flex items-center space-x-1 mb-1">
              <Shield className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">风险</span>
            </div>
            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-md ${riskStyle.bg} ${riskStyle.color}`}>
              {riskStyle.label}
            </span>
          </div>
        </div>

        {/* 了解更多按钮 */}
        <button
          onClick={() => alert('收益率详情功能开发中，敬请期待！')}
          className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors active:scale-95 ${
            highAPY
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          title="点击了解更多"
        >
          了解更多
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
