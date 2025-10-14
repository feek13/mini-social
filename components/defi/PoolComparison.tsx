'use client'

import { useState } from 'react'
import { X, GitCompare, TrendingUp, Droplets, Shield, Coins, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react'
import { YieldPool } from '@/lib/defillama/types'
import { formatAPY, formatTVL, calculateRiskScore, getRiskScoreStyle, getAPYTrendIcon, getAPYTrendColor } from '@/lib/utils'
import RiskBadge from './RiskBadge'

interface PoolComparisonProps {
  pools: YieldPool[]
  onRemovePool?: (poolId: string) => void
  maxPools?: number
}

export default function PoolComparison({ pools, onRemovePool, maxPools = 3 }: PoolComparisonProps) {
  const [expandedDetails, setExpandedDetails] = useState(false)

  if (pools.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <GitCompare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          尚未选择池子
        </h3>
        <p className="text-gray-500 mb-6">
          从收益率列表中选择最多 {maxPools} 个池子进行对比
        </p>
      </div>
    )
  }

  // 计算最佳指标（用于高亮显示）
  const bestAPY = Math.max(...pools.map(p => p.apy))
  const bestTVL = Math.max(...pools.map(p => p.tvlUsd))
  const bestRiskScore = Math.max(...pools.map(p => calculateRiskScore(p)))
  const bestTrend = Math.max(...pools.map(p => p.apyPct7D || -Infinity))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 标题 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">池子对比</h3>
              <p className="text-sm text-gray-600">
                {pools.length}/{maxPools} 个池子
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpandedDetails(!expandedDetails)}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
          >
            {expandedDetails ? '简化视图' : '详细对比'}
          </button>
        </div>
      </div>

      {/* 对比表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                指标
              </th>
              {pools.map((pool) => (
                <th key={pool.pool} className="px-4 py-3 text-left min-w-[200px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{pool.project}</p>
                      <p className="text-xs text-gray-500 truncate">{pool.symbol}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-900 text-white rounded">
                        {pool.chain}
                      </span>
                    </div>
                    {onRemovePool && (
                      <button
                        onClick={() => onRemovePool(pool.pool)}
                        className="p-1 hover:bg-red-100 rounded transition flex-shrink-0"
                        title="移除"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* APY */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50 z-10">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Total APY
                </div>
              </td>
              {pools.map((pool) => {
                const isBest = pool.apy === bestAPY
                return (
                  <td key={pool.pool} className="px-4 py-3">
                    <div className={`text-2xl font-black ${isBest ? 'text-green-600' : 'text-gray-900'}`}>
                      {formatAPY(pool.apy)}
                      {isBest && <Sparkles className="w-5 h-5 inline ml-1 text-yellow-500" />}
                    </div>
                    {pool.apyBase !== null && pool.apyBase > 0 && (
                      <p className="text-xs text-gray-500 mt-1">Base: {formatAPY(pool.apyBase)}</p>
                    )}
                    {pool.apyReward !== null && pool.apyReward > 0 && (
                      <p className="text-xs text-green-600 mt-0.5">Reward: +{formatAPY(pool.apyReward)}</p>
                    )}
                  </td>
                )
              })}
            </tr>

            {/* TVL */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50 z-10">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  TVL
                </div>
              </td>
              {pools.map((pool) => {
                const isBest = pool.tvlUsd === bestTVL
                return (
                  <td key={pool.pool} className="px-4 py-3">
                    <div className={`text-lg font-bold ${isBest ? 'text-blue-600' : 'text-gray-900'}`}>
                      {formatTVL(pool.tvlUsd)}
                      {isBest && <CheckCircle className="w-4 h-4 inline ml-1 text-blue-500" />}
                    </div>
                  </td>
                )
              })}
            </tr>

            {/* 风险评分 */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50 z-10">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  风险评分
                </div>
              </td>
              {pools.map((pool) => {
                const riskScore = calculateRiskScore(pool)
                const isBest = riskScore === bestRiskScore
                return (
                  <td key={pool.pool} className="px-4 py-3">
                    <RiskBadge pool={pool} size="md" showScore={true} />
                    {isBest && <CheckCircle className="w-4 h-4 inline ml-2 text-green-500" />}
                  </td>
                )
              })}
            </tr>

            {/* 7天趋势 */}
            {pools.some(p => p.apyPct7D !== null) && (
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50 z-10">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    7天趋势
                  </div>
                </td>
                {pools.map((pool) => {
                  const isBest = pool.apyPct7D === bestTrend && pool.apyPct7D !== null
                  const trendIcon = getAPYTrendIcon(pool.apyPct7D)
                  const trendColor = getAPYTrendColor(pool.apyPct7D)
                  return (
                    <td key={pool.pool} className="px-4 py-3">
                      {pool.apyPct7D !== null ? (
                        <div className={`flex items-center gap-2 ${trendColor}`}>
                          <span className="text-2xl">{trendIcon}</span>
                          <span className="text-lg font-bold">
                            {pool.apyPct7D > 0 ? '+' : ''}{pool.apyPct7D.toFixed(2)}%
                          </span>
                          {isBest && <Sparkles className="w-4 h-4 text-yellow-500" />}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )}

            {/* 详细信息（可展开） */}
            {expandedDetails && (
              <>
                {/* IL 风险 */}
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50 z-10">
                    IL 风险
                  </td>
                  {pools.map((pool) => (
                    <td key={pool.pool} className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded ${
                        pool.ilRisk?.toLowerCase() === 'no'
                          ? 'bg-green-100 text-green-700'
                          : pool.ilRisk?.toLowerCase() === 'yes'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {pool.ilRisk?.toLowerCase() === 'no' && <CheckCircle className="w-3 h-3" />}
                        {pool.ilRisk?.toLowerCase() === 'yes' && <AlertTriangle className="w-3 h-3" />}
                        {pool.ilRisk?.toLowerCase() === 'no' ? '无' : pool.ilRisk?.toLowerCase() === 'yes' ? '有' : '未知'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 资产类型 */}
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50 z-10">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-gray-500" />
                      资产类型
                    </div>
                  </td>
                  {pools.map((pool) => (
                    <td key={pool.pool} className="px-4 py-3">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {pool.exposure === 'single' ? '单一资产' : '多资产'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 稳定币 */}
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50 z-10">
                    稳定币
                  </td>
                  {pools.map((pool) => (
                    <td key={pool.pool} className="px-4 py-3">
                      {pool.stablecoin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          <CheckCircle className="w-3 h-3" />
                          是
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">否</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* 30天平均APY */}
                {pools.some(p => p.apyMean30d !== null) && (
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50 z-10">
                      30天平均APY
                    </td>
                    {pools.map((pool) => (
                      <td key={pool.pool} className="px-4 py-3">
                        {pool.apyMean30d !== null ? (
                          <span className="text-sm font-semibold text-blue-600">
                            {formatAPY(pool.apyMean30d)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}

                {/* AI 预测 */}
                {pools.some(p => p.predictions?.predictedClass) && (
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50 z-10">
                      AI 预测
                    </td>
                    {pools.map((pool) => (
                      <td key={pool.pool} className="px-4 py-3">
                        {pool.predictions?.predictedClass ? (
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            pool.predictions.predictedClass === 'Stable/Up'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {pool.predictions.predictedClass === 'Stable/Up' ? '稳定/上涨' : '下跌'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* 底部说明 */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
          <span>高亮显示最佳指标</span>
          <span className="mx-2">•</span>
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          <span>绿色标记表示该指标最优</span>
        </div>
      </div>
    </div>
  )
}
