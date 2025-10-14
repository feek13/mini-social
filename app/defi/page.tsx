'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, BarChart3, DollarSign, Compass } from 'lucide-react'
import Navbar from '@/components/Navbar'
import InvestDiscovery from '@/components/defi/InvestDiscovery'
import ProtocolsTab from '@/components/defi/tabs/ProtocolsTab'
import YieldsTab from '@/components/defi/tabs/YieldsTab'
import PricesTab from '@/components/defi/tabs/PricesTab'
import ErrorAlert from '@/components/defi/common/ErrorAlert'
import { Chain } from '@/lib/defillama/types'

type Tab = 'protocols' | 'yields' | 'prices' | 'discovery'

export default function DeFiPage() {
  const [activeTab, setActiveTab] = useState<Tab>('protocols')
  const [error, setError] = useState<string>('')

  // Chain data state (shared across tabs)
  const [availableChains, setAvailableChains] = useState<Chain[]>([])
  const [chainsLoading, setChainsLoading] = useState(false)

  // Show error and auto-dismiss
  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(''), 3000)
  }

  // Fetch available chains
  const fetchChains = useCallback(async () => {
    try {
      setChainsLoading(true)
      const response = await fetch('/api/defi/chains')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取链列表失败')
      }

      setAvailableChains(data.chains || [])
    } catch (error) {
      console.error('获取链列表失败:', error)
      setAvailableChains([])
    } finally {
      setChainsLoading(false)
    }
  }, [])

  // Load chains on mount
  useEffect(() => {
    fetchChains()
  }, [fetchChains])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 overflow-x-hidden">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">DeFi 数据浏览器</h1>
          </div>
          <p className="text-gray-600 text-sm">
            浏览 DeFi 协议、收益率池子和代币价格
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <ErrorAlert
            message={error}
            onClose={() => setError('')}
          />
        )}

        {/* Tab Navigation */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-2">
          <div className="flex gap-2 min-w-max sm:min-w-0">
            <button
              onClick={() => setActiveTab('protocols')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'protocols'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              协议
            </button>
            <button
              onClick={() => setActiveTab('yields')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'yields'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              收益率
            </button>
            <button
              onClick={() => setActiveTab('prices')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'prices'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              价格查询
            </button>
            <button
              onClick={() => setActiveTab('discovery')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'discovery'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Compass className="w-4 h-4" />
              发现
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'protocols' && (
          <ProtocolsTab
            availableChains={availableChains}
            chainsLoading={chainsLoading}
          />
        )}

        {activeTab === 'yields' && (
          <YieldsTab
            availableChains={availableChains}
          />
        )}

        {activeTab === 'prices' && (
          <PricesTab
            availableChains={availableChains}
            onError={showError}
          />
        )}

        {activeTab === 'discovery' && (
          <InvestDiscovery />
        )}
      </main>
    </div>
  )
}
