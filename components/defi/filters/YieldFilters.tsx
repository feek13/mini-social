'use client'

import { Shield, Coins, ArrowUpDown, X } from 'lucide-react'
import { Chain } from '@/lib/defillama/types'
import { TVL_RANGES } from '@/lib/defi-utils'
import type { YieldSortOption } from '@/hooks/useYieldFilters'
import ProtocolSearchInput from '@/components/defi/common/ProtocolSearchInput'

interface YieldFiltersProps {
  selectedChain: string
  onChainChange: (chain: string) => void
  selectedProtocol: string
  onProtocolChange: (protocol: string) => void
  selectedTvlRange: number
  onTvlRangeChange: (range: number) => void
  minApy: number
  onMinApyChange: (apy: number) => void
  selectedRisk: string
  onRiskChange: (risk: string) => void
  selectedExposure: string
  onExposureChange: (exposure: string) => void
  sortBy: YieldSortOption
  onSortByChange: (sort: YieldSortOption) => void
  onlyStablecoin: boolean
  onStablecoinChange: (value: boolean) => void
  availableChains: Chain[]
  onClearAll: () => void
  hasActiveFilters: boolean
}

export default function YieldFilters({
  selectedChain,
  onChainChange,
  selectedProtocol,
  onProtocolChange,
  selectedTvlRange,
  onTvlRangeChange,
  minApy,
  onMinApyChange,
  selectedRisk,
  onRiskChange,
  selectedExposure,
  onExposureChange,
  sortBy,
  onSortByChange,
  onlyStablecoin,
  onStablecoinChange,
  availableChains,
  onClearAll,
  hasActiveFilters
}: YieldFiltersProps) {
  return (
    <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">过滤条件</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            清除所有
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 链过滤 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            区块链
          </label>
          <select
            value={selectedChain}
            onChange={(e) => onChainChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部链</option>
            {availableChains.map((chain) => (
              <option key={chain.name} value={chain.name}>
                {chain.name}
              </option>
            ))}
          </select>
        </div>

        {/* 协议过滤 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            协议名称
          </label>
          <ProtocolSearchInput
            value={selectedProtocol}
            onChange={onProtocolChange}
            placeholder="例如: aave, uniswap, pancake"
          />
        </div>

        {/* TVL 范围过滤 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            TVL 范围
          </label>
          <select
            value={selectedTvlRange}
            onChange={(e) => onTvlRangeChange(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TVL_RANGES.map((range, index) => (
              <option key={index} value={index}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* 最低 APY */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            最低 APY (%)
          </label>
          <input
            type="number"
            value={minApy}
            onChange={(e) => onMinApyChange(parseFloat(e.target.value) || 0)}
            min="0"
            step="1"
            placeholder="0"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 风险等级 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            风险等级
          </label>
          <select
            value={selectedRisk}
            onChange={(e) => onRiskChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部风险</option>
            <option value="no">无 IL 风险</option>
            <option value="yes">有 IL 风险</option>
            <option value="unknown">未知风险</option>
          </select>
        </div>

        {/* 资产类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <Coins className="w-4 h-4" />
            资产类型
          </label>
          <select
            value={selectedExposure}
            onChange={(e) => onExposureChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部类型</option>
            <option value="single">单一资产</option>
            <option value="multi">多资产</option>
          </select>
        </div>

        {/* 排序方式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <ArrowUpDown className="w-4 h-4" />
            排序方式
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as YieldSortOption)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="apy_desc">APY 从高到低</option>
            <option value="apy_asc">APY 从低到高</option>
            <option value="tvl_desc">TVL 从高到低</option>
            <option value="trend_desc">趋势最好</option>
          </select>
        </div>
      </div>

      {/* 稳定币复选框 */}
      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="only-stablecoin"
          checked={onlyStablecoin}
          onChange={(e) => onStablecoinChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
        <label htmlFor="only-stablecoin" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-blue-500" />
          只显示稳定币池子
        </label>
      </div>
    </div>
  )
}
