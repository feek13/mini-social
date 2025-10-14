'use client'

import { TVL_RANGES, TvlRange, SortOption } from '@/lib/defi-utils'

interface YieldFiltersProps {
  chains: string[]
  selectedChain: string
  selectedTvlRange: number
  selectedRisk: string
  sortBy: SortOption
  onChainChange: (chain: string) => void
  onTvlRangeChange: (rangeIndex: number) => void
  onRiskChange: (risk: string) => void
  onSortChange: (sort: SortOption) => void
}

export default function YieldFilters({
  chains,
  selectedChain,
  selectedTvlRange,
  selectedRisk,
  sortBy,
  onChainChange,
  onTvlRangeChange,
  onRiskChange,
  onSortChange,
}: YieldFiltersProps) {
  const riskOptions = [
    { value: 'all', label: '全部' },
    { value: 'no', label: '无 IL 风险' },
    { value: 'yes', label: '有 IL 风险' },
  ]

  const sortOptions = [
    { value: 'apy_desc', label: 'APY 从高到低' },
    { value: 'apy_asc', label: 'APY 从低到高' },
    { value: 'tvl_desc', label: 'TVL 从高到低' },
    { value: 'apy30d_desc', label: '30d Avg APY 从高到低' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Chain 筛选 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            链
          </label>
          <select
            value={selectedChain}
            onChange={(e) => onChainChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition cursor-pointer"
          >
            <option value="all">全部链</option>
            {chains.map((chain) => (
              <option key={chain} value={chain}>
                {chain}
              </option>
            ))}
          </select>
        </div>

        {/* TVL 筛选 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            TVL 范围
          </label>
          <select
            value={selectedTvlRange}
            onChange={(e) => onTvlRangeChange(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition cursor-pointer"
          >
            {TVL_RANGES.map((range, index) => (
              <option key={index} value={index}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Risk 筛选 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            IL 风险
          </label>
          <select
            value={selectedRisk}
            onChange={(e) => onRiskChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition cursor-pointer"
          >
            {riskOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort 排序 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            排序
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition cursor-pointer"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 筛选提示 */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold">💡 提示:</span>
          <span>
            {selectedTvlRange === 0
              ? '建议选择 TVL $10M+ 的池子，流动性更好'
              : sortBy === 'apy30d_desc'
              ? '按 30 天平均 APY 排序更稳定可靠'
              : '按 APY 排序可找到最高收益产品'}
          </span>
        </div>
      </div>
    </div>
  )
}
