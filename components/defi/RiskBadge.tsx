'use client'

import { Shield, AlertTriangle, CheckCircle, HelpCircle, Target } from 'lucide-react'
import { YieldPool } from '@/lib/defillama/types'
import { calculateRiskScore, getRiskScoreStyle } from '@/lib/utils'

interface RiskBadgeProps {
  pool: YieldPool
  size?: 'sm' | 'md' | 'lg'
  showScore?: boolean
  showIcon?: boolean
}

export default function RiskBadge({
  pool,
  size = 'md',
  showScore = true,
  showIcon = true
}: RiskBadgeProps) {
  const riskScore = calculateRiskScore(pool)
  const style = getRiskScoreStyle(riskScore)

  // 尺寸配置
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    md: {
      container: 'px-2.5 py-1.5 text-sm',
      icon: 'w-3.5 h-3.5',
      text: 'text-sm',
    },
    lg: {
      container: 'px-3 py-2 text-base',
      icon: 'w-4 h-4',
      text: 'text-base',
    },
  }

  const sizeConfig = sizeClasses[size]

  // 根据风险等级选择图标
  const getIcon = () => {
    if (riskScore >= 90) return <CheckCircle className={sizeConfig.icon} />
    if (riskScore >= 70) return <Shield className={sizeConfig.icon} />
    if (riskScore >= 50) return <HelpCircle className={sizeConfig.icon} />
    if (riskScore >= 30) return <AlertTriangle className={sizeConfig.icon} />
    return <AlertTriangle className={sizeConfig.icon} />
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${sizeConfig.container} font-semibold rounded-lg ${style.bg} ${style.color} transition-all hover:shadow-md cursor-default`}
      title={`风险评分: ${riskScore}/100`}
    >
      {showIcon && getIcon()}
      <span className={sizeConfig.text}>{style.label}</span>
      {showScore && (
        <span className={`${sizeConfig.text} opacity-75`}>
          ({riskScore})
        </span>
      )}
    </div>
  )
}

// 独立的风险评分显示组件（带详细信息）
export function DetailedRiskBadge({ pool }: { pool: YieldPool }) {
  const riskScore = calculateRiskScore(pool)
  const style = getRiskScoreStyle(riskScore)

  return (
    <div className={`p-4 rounded-xl border-2 ${style.bg} ${style.ring}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className={`w-5 h-5 ${style.color}`} />
          <h4 className={`font-bold ${style.color}`}>风险评估</h4>
        </div>
        <div className={`px-3 py-1 rounded-full ${style.bg} ${style.color} font-black text-lg`}>
          {riskScore}
        </div>
      </div>

      <div className="space-y-2">
        {/* 风险等级 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">风险等级</span>
          <span className={`text-sm font-semibold ${style.color}`}>{style.label}</span>
        </div>

        {/* 无常损失风险 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">IL 风险</span>
          <span className={`text-sm font-semibold ${
            pool.ilRisk?.toLowerCase() === 'no'
              ? 'text-green-600'
              : pool.ilRisk?.toLowerCase() === 'yes'
              ? 'text-red-600'
              : 'text-gray-600'
          }`}>
            {pool.ilRisk?.toLowerCase() === 'no'
              ? '无'
              : pool.ilRisk?.toLowerCase() === 'yes'
              ? '有'
              : '未知'}
          </span>
        </div>

        {/* TVL */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">TVL</span>
          <span className="text-sm font-semibold text-gray-900">
            ${(pool.tvlUsd / 1_000_000).toFixed(2)}M
          </span>
        </div>

        {/* APY */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">APY</span>
          <span className={`text-sm font-semibold ${
            pool.apy > 100 ? 'text-orange-600' : pool.apy > 50 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {pool.apy.toFixed(2)}%
          </span>
        </div>

        {/* AI 预测置信度 */}
        {pool.predictions?.binnedConfidence !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">AI 置信度</span>
            <span className="text-sm font-semibold text-blue-600">
              {pool.predictions.binnedConfidence}/3
            </span>
          </div>
        )}
      </div>

      {/* 说明 */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-600 leading-relaxed">
          {riskScore >= 90 && '极低风险池子，适合保守型投资者。TVL充足，无IL风险。'}
          {riskScore >= 70 && riskScore < 90 && '低风险池子，风险较小，适合稳健投资。'}
          {riskScore >= 50 && riskScore < 70 && '中等风险池子，需要谨慎评估。'}
          {riskScore >= 30 && riskScore < 50 && '较高风险池子，建议有经验的投资者参与。'}
          {riskScore < 30 && '高风险池子，存在多个风险因素，请谨慎投资。'}
        </p>
      </div>
    </div>
  )
}
