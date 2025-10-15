'use client'

import { TrendingUp, Shield, Droplets, Sparkles, ExternalLink, Activity, Target } from 'lucide-react'
import { YieldPool } from '@/lib/defillama/types'
import {
  formatTVL,
  formatAPY,
  getRiskStyle,
  isHighAPY,
  calculateRiskScore,
  getRiskScoreStyle,
  getAPYTrendIcon,
  getAPYTrendColor,
  formatAPYChange,
  getPredictionStyle,
} from '@/lib/utils'
import { getPoolInvestUrl } from '@/lib/defi-utils'

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
    apyPct7D,
    tvlUsd,
    ilRisk,
    stablecoin,
    predictions,
    poolMeta,
  } = pool

  const riskStyle = getRiskStyle(ilRisk)
  const highAPY = isHighAPY(apy)

  // 计算风险评分
  const riskScore = calculateRiskScore(pool)
  const riskScoreStyle = getRiskScoreStyle(riskScore)

  // APY 趋势
  const trendIcon = getAPYTrendIcon(apyPct7D)
  const trendColor = getAPYTrendColor(apyPct7D)

  // AI 预测
  const predictionStyle = predictions?.predictedClass
    ? getPredictionStyle(predictions.predictedClass)
    : null

  // 获取区块链浏览器 URL
  const getEtherscanUrl = () => {
    const chainLower = chain.toLowerCase()

    if (chainLower.includes('ethereum') || chainLower === 'eth') {
      return 'https://etherscan.io'
    } else if (chainLower.includes('bsc') || chainLower.includes('binance')) {
      return 'https://bscscan.com'
    } else if (chainLower.includes('polygon')) {
      return 'https://polygonscan.com'
    } else if (chainLower.includes('arbitrum')) {
      return 'https://arbiscan.io'
    } else if (chainLower.includes('optimism')) {
      return 'https://optimistic.etherscan.io'
    } else if (chainLower.includes('base')) {
      return 'https://basescan.org'
    }

    // 默认返回 Etherscan
    return 'https://etherscan.io'
  }

  const etherscanBaseUrl = getEtherscanUrl()

  return (
    <div
      className={`rounded-xl shadow-sm border p-4 sm:p-5 hover:shadow-md transition-all animate-fade-in-up group ${
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

          {/* 链标签和额外标签 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-md">
              {chain}
            </span>

            {/* 风险评分标签 */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md ${riskScoreStyle.bg} ${riskScoreStyle.color}`}
              title={`风险评分: ${riskScore}/100`}
            >
              <Target className="w-3 h-3" />
              {riskScoreStyle.label}
            </span>

            {/* AI 预测标签 */}
            {predictionStyle && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md ${predictionStyle.bg} ${predictionStyle.color}`}
                title={`AI 预测: ${predictions?.predictedClass}`}
              >
                <Activity className="w-3 h-3" />
                {predictionStyle.label}
              </span>
            )}

            {/* 池子元数据 */}
            {poolMeta && (
              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-md" title={poolMeta}>
                {poolMeta.length > 15 ? `${poolMeta.slice(0, 15)}...` : poolMeta}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 中间：APY（重点展示） */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        {/* 主 APY */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <TrendingUp className={`w-5 h-5 ${highAPY ? 'text-green-600' : 'text-green-500'}`} />
              <span className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                Total APY
              </span>
            </div>
            {/* 7 天 APY 趋势 - 只在有实际变化时显示 */}
            {apyPct7D !== null && apyPct7D !== undefined && Math.abs(apyPct7D) > 0.01 && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`} title={`7天变化: ${formatAPYChange(apyPct7D)}`}>
                <span className="text-lg">{trendIcon}</span>
                <span className="text-xs">{formatAPYChange(apyPct7D)}</span>
              </div>
            )}
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
          {/* Base APY - 只在有意义时显示 */}
          {apyBase !== null && apyBase > 0 && Math.abs(apyBase - apy) > 0.01 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Base APY:</span>
              <span className="font-semibold text-gray-900">{formatAPY(apyBase)}</span>
            </div>
          )}

          {/* Reward APY - 只在有奖励时显示 */}
          {apyReward !== null && apyReward > 0.01 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Reward APY:</span>
              <span className="font-semibold text-green-600">{formatAPY(apyReward)}</span>
            </div>
          )}

          {/* 30 天平均 APY - 只在与当前 APY 有明显差异时显示 */}
          {apyMean30d !== null && Math.abs(apyMean30d - apy) > 0.1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">30d Avg:</span>
              <span className={`font-semibold ${apyMean30d > apy ? 'text-red-600' : 'text-blue-600'}`}>
                {formatAPY(apyMean30d)}
              </span>
            </div>
          )}

          {/* 如果没有显示任何分解数据，显示提示 */}
          {(!apyReward || apyReward < 0.01) &&
           (!apyMean30d || Math.abs(apyMean30d - apy) <= 0.1) &&
           (!apyBase || Math.abs(apyBase - apy) <= 0.01) && (
            <div className="text-xs text-gray-500 italic">
              APY 稳定，无额外奖励
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
              <span className="text-xs text-gray-500 font-medium">TVL (参考)</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {formatTVL(tvlUsd)}
            </div>
            <div className="text-xs text-orange-500 mt-0.5 font-medium">
              点击下方查看实时
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

        {/* Etherscan 链接 */}
        <a
          href={`${etherscanBaseUrl}/search?q=${encodeURIComponent(project)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <span>在区块链浏览器上搜索</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>

        {/* 查看详情按钮 */}
        <a
          href={`/defi/yields/${encodeURIComponent(pool.pool)}`}
          className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-all active:scale-95 hover:shadow-lg ${
            highAPY
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          title={`查看 ${project} 的完整数据和详细信息`}
        >
          <span>查看完整数据</span>
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
        </a>
      </div>
    </div>
  )
}
