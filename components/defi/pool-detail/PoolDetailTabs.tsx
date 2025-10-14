'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, Info } from 'lucide-react'
import { YieldPool } from '@/lib/defillama/types'
import PoolInfoGrid from './PoolInfoGrid'
import PoolStatsTab from './PoolStatsTab'
import PoolAboutTab from './PoolAboutTab'

interface PoolDetailTabsProps {
  pool: YieldPool
}

type TabId = 'overview' | 'stats' | 'about'

interface Tab {
  id: TabId
  label: string
  icon: typeof TrendingUp
}

const TABS: Tab[] = [
  { id: 'overview', label: '概览', icon: TrendingUp },
  { id: 'stats', label: '统计', icon: BarChart3 },
  { id: 'about', label: '关于', icon: Info },
]

export default function PoolDetailTabs({ pool }: PoolDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-6">
      {/* 标签页头部 */}
      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 标签页内容 */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">详细信息</h3>
            <PoolInfoGrid pool={pool} />
          </div>
        )}

        {activeTab === 'stats' && (
          <PoolStatsTab pool={pool} />
        )}

        {activeTab === 'about' && (
          <PoolAboutTab pool={pool} />
        )}
      </div>
    </div>
  )
}
