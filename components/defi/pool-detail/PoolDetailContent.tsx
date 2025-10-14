'use client'

import { ExternalLink, AlertCircle } from 'lucide-react'
import { YieldPool } from '@/lib/defillama/types'
import { getPoolInvestUrl } from '@/lib/defi-utils'
import PoolDetailHeader from './PoolDetailHeader'
import PoolMetricsOverview from './PoolMetricsOverview'
import PoolApyChart from './PoolApyChart'
import PoolDetailTabs from './PoolDetailTabs'

interface PoolDetailContentProps {
  pool: YieldPool
}

export default function PoolDetailContent({ pool }: PoolDetailContentProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面头部 */}
        <PoolDetailHeader pool={pool} />

        {/* 核心指标卡片 */}
        <PoolMetricsOverview pool={pool} />

        {/* APY 历史图表 */}
        <PoolApyChart poolId={pool.pool} />

        {/* 标签页（概览/统计/关于） */}
        <PoolDetailTabs pool={pool} />

        {/* 底部 CTA 按钮 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">准备好投资了吗？</h3>
              <p className="text-sm text-gray-600">
                点击下方按钮前往 {pool.project} 官网查看实时数据并开始投资
              </p>
            </div>
            <a
              href={getPoolInvestUrl(pool)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all hover:shadow-lg active:scale-95 whitespace-nowrap"
            >
              <span>前往投资</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* 风险提示 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-900 mb-1">投资风险提示</h4>
              <p className="text-xs text-yellow-800">
                DeFi 投资存在风险，包括但不限于智能合约风险、无常损失、市场波动等。请在充分了解风险的情况下谨慎投资，不要投入超过您承受能力的资金。本平台仅提供信息展示，不构成投资建议。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
