'use client'

import { YieldPool } from '@/lib/defillama/types'
import { formatTVL, formatAPY } from '@/lib/utils'

interface PoolInfoGridProps {
  pool: YieldPool
}

export default function PoolInfoGrid({ pool }: PoolInfoGridProps) {
  const infoItems = [
    { label: '项目', value: pool.project },
    { label: '区块链', value: pool.chain },
    { label: '代币对', value: pool.symbol },
    { label: '池子类型', value: pool.poolMeta || '标准' },
    {
      label: '30天平均 APY',
      value: pool.apyMean30d !== null ? formatAPY(pool.apyMean30d) : '-'
    },
    { label: 'IL 风险', value: pool.ilRisk === 'yes' ? '有' : pool.ilRisk === 'no' ? '无' : '未知' },
    { label: '资产类型', value: pool.exposure === 'single' ? '单一资产' : '多资产' },
    {
      label: '底层代币',
      value: pool.underlyingTokens && pool.underlyingTokens.length > 0
        ? pool.underlyingTokens.join(', ')
        : '-'
    },
    {
      label: '奖励代币',
      value: pool.rewardTokens && pool.rewardTokens.length > 0
        ? pool.rewardTokens.join(', ')
        : '-'
    },
    {
      label: '24h 交易量',
      value: pool.volumeUsd1d !== null ? formatTVL(pool.volumeUsd1d) : '-'
    },
    {
      label: '7天交易量',
      value: pool.volumeUsd7d !== null ? formatTVL(pool.volumeUsd7d) : '-'
    },
    {
      label: 'Base APY (7天)',
      value: pool.apyBase7d !== null ? formatAPY(pool.apyBase7d) : '-'
    },
    {
      label: '7天无常损失',
      value: pool.il7d !== null ? `${pool.il7d.toFixed(2)}%` : '-'
    },
    {
      label: 'Inception APY',
      value: pool.apyBaseInception !== null ? formatAPY(pool.apyBaseInception) : '-'
    },
    {
      label: '是否异常值',
      value: pool.outlier ? '是' : '否'
    },
    {
      label: '稳定币池',
      value: pool.stablecoin ? '是' : '否'
    }
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">详细信息</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {infoItems.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 transition"
          >
            <span className="text-sm font-medium text-gray-600">{item.label}</span>
            <span className="text-sm font-semibold text-gray-900 text-right ml-4 truncate max-w-[60%]">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* AI 预测详情（如果有） */}
      {pool.predictions && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">AI 预测分析</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-blue-50">
              <span className="text-xs text-gray-600 block mb-1">预测类别</span>
              <span className="text-sm font-bold text-blue-600">{pool.predictions.predictedClass}</span>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <span className="text-xs text-gray-600 block mb-1">预测概率</span>
              <span className="text-sm font-bold text-green-600">
                {(pool.predictions.predictedProbability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <span className="text-xs text-gray-600 block mb-1">置信度</span>
              <span className="text-sm font-bold text-purple-600">
                {pool.predictions.binnedConfidence}/10
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 统计信息（如果有） */}
      {(pool.mu !== null || pool.sigma !== null || pool.count !== null) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">统计数据</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pool.mu !== null && (
              <div className="p-3 rounded-lg bg-gray-50">
                <span className="text-xs text-gray-600 block mb-1">平均值 (μ)</span>
                <span className="text-sm font-bold text-gray-900">{pool.mu.toFixed(2)}</span>
              </div>
            )}
            {pool.sigma !== null && (
              <div className="p-3 rounded-lg bg-gray-50">
                <span className="text-xs text-gray-600 block mb-1">标准差 (σ)</span>
                <span className="text-sm font-bold text-gray-900">{pool.sigma.toFixed(2)}</span>
              </div>
            )}
            {pool.count !== null && (
              <div className="p-3 rounded-lg bg-gray-50">
                <span className="text-xs text-gray-600 block mb-1">数据点数</span>
                <span className="text-sm font-bold text-gray-900">{pool.count}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
