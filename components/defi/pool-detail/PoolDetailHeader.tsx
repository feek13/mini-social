'use client'

import { ArrowLeft, Shield, Sparkles, Target, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { YieldPool } from '@/lib/defillama/types'
import {
  getRiskStyle,
  isHighAPY,
  calculateRiskScore,
  getRiskScoreStyle,
  getPredictionStyle
} from '@/lib/utils'
import PoolShareButton from './PoolShareButton'

interface PoolDetailHeaderProps {
  pool: YieldPool
}

export default function PoolDetailHeader({ pool }: PoolDetailHeaderProps) {
  const router = useRouter()
  const riskStyle = getRiskStyle(pool.ilRisk)
  const highAPY = isHighAPY(pool.apy)
  const riskScore = calculateRiskScore(pool)
  const riskScoreStyle = getRiskScoreStyle(riskScore)
  const predictionStyle = pool.predictions?.predictedClass
    ? getPredictionStyle(pool.predictions.predictedClass)
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      {/* 面包屑导航和分享按钮 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          返回收益率列表
        </button>
        <PoolShareButton
          poolId={pool.pool}
          projectName={pool.project}
          apy={pool.apy}
        />
      </div>

      {/* 主标题区域 */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* 协议名称 */}
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-3xl font-bold text-gray-900 truncate">
              {pool.project}
            </h1>
            {highAPY && (
              <Sparkles className="w-6 h-6 text-yellow-500 flex-shrink-0 animate-pulse" />
            )}
          </div>

          {/* 代币符号 */}
          <div className="mb-4">
            <span className="text-xl font-semibold text-gray-700">{pool.symbol}</span>
          </div>

          {/* 标签区域 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 链标签 */}
            <span className="px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg">
              {pool.chain}
            </span>

            {/* 稳定币标签 */}
            {pool.stablecoin && (
              <span className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 rounded-lg">
                稳定币
              </span>
            )}

            {/* 风险等级 */}
            <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${riskStyle.bg} ${riskStyle.color}`}>
              <Shield className="w-3.5 h-3.5 inline mr-1" />
              {riskStyle.label}
            </span>

            {/* 风险评分 */}
            <span
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-lg ${riskScoreStyle.bg} ${riskScoreStyle.color}`}
              title={`风险评分: ${riskScore}/100`}
            >
              <Target className="w-3.5 h-3.5" />
              {riskScoreStyle.label}
            </span>

            {/* AI 预测 */}
            {predictionStyle && (
              <span
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-lg ${predictionStyle.bg} ${predictionStyle.color}`}
                title={`AI 预测: ${pool.predictions?.predictedClass}`}
              >
                <Activity className="w-3.5 h-3.5" />
                {predictionStyle.label}
              </span>
            )}

            {/* 池子类型 */}
            {pool.poolMeta && (
              <span className="px-3 py-1.5 text-sm font-medium bg-purple-100 text-purple-700 rounded-lg">
                {pool.poolMeta}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pool ID 提示（小字） */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 font-mono truncate">
          Pool ID: {pool.pool}
        </p>
      </div>
    </div>
  )
}
