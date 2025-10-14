'use client'

import { useState } from 'react'
import { Search, X, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react'
import { Chain } from '@/lib/defillama/types'
import { TVL_RANGES } from '@/lib/defi-utils'
import type { SortOption } from '@/hooks/useProtocolFilters'

const CATEGORIES = [
  'Dexes',
  'Lending',
  'Yield',
  'Bridge',
  'Liquid Staking',
  'CDP',
  'Derivatives',
  'Yield Aggregator',
]

const SORT_OPTIONS = [
  { value: 'tvl_desc', label: 'TVL 从高到低' },
  { value: 'tvl_asc', label: 'TVL 从低到高' },
  { value: 'change_1d_desc', label: '24h 涨幅最大' },
  { value: 'change_7d_desc', label: '7d 涨幅最大' },
]

interface ProtocolFiltersProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  selectedTvlRange: number
  onTvlRangeChange: (range: number) => void
  sortBy: SortOption
  onSortByChange: (sort: SortOption) => void
  selectedChains: string[]
  onChainToggle: (chain: string) => void
  availableChains: Chain[]
  chainsLoading: boolean
  onClearAll: () => void
  hasActiveFilters: boolean
}

export default function ProtocolFilters({
  selectedCategory,
  onCategoryChange,
  selectedTvlRange,
  onTvlRangeChange,
  sortBy,
  onSortByChange,
  selectedChains,
  onChainToggle,
  availableChains,
  chainsLoading,
  onClearAll,
  hasActiveFilters
}: ProtocolFiltersProps) {
  const [showChainSelector, setShowChainSelector] = useState(false)
  const [chainSearchQuery, setChainSearchQuery] = useState('')
  const [displayedChainsCount, setDisplayedChainsCount] = useState(20)

  // Filter chains based on search
  const filteredChains = availableChains.filter(chain =>
    chain.name.toLowerCase().includes(chainSearchQuery.toLowerCase())
  )

  const displayedChains = filteredChains.slice(0, displayedChainsCount)
  const topChains = availableChains.slice(0, 10)

  const loadMoreChains = () => {
    setDisplayedChainsCount(prev => prev + 20)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">高级筛选</h3>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 分类过滤 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分类
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部分类</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
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

        {/* 排序方式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <ArrowUpDown className="w-4 h-4" />
            排序方式
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortOption)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 链过滤（多选） */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            区块链（多选）
          </label>
          <button
            onClick={() => setShowChainSelector(!showChainSelector)}
            className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            {showChainSelector ? (
              <>
                <ChevronUp className="w-3 h-3" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                展开全部 ({availableChains.length} 条链)
              </>
            )}
          </button>
        </div>

        {/* 热门链快速选择 */}
        {!showChainSelector && (
          <div className="flex flex-wrap gap-2">
            {topChains.map((chain) => (
              <button
                key={chain.name}
                onClick={() => onChainToggle(chain.name)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedChains.includes(chain.name)
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {chain.name}
              </button>
            ))}
          </div>
        )}

        {/* 完整链选择器 */}
        {showChainSelector && (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            {/* 搜索框 */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={chainSearchQuery}
                onChange={(e) => {
                  setChainSearchQuery(e.target.value)
                  setDisplayedChainsCount(20)
                }}
                placeholder="搜索链名称..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 链列表 */}
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {chainsLoading ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  加载中...
                </div>
              ) : displayedChains.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  未找到匹配的链
                </div>
              ) : (
                <>
                  {displayedChains.map((chain) => (
                    <button
                      key={chain.name}
                      onClick={() => onChainToggle(chain.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                        selectedChains.includes(chain.name)
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-medium">{chain.name}</span>
                      <span className={`text-xs ${
                        selectedChains.includes(chain.name)
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }`}>
                        ${(chain.tvl / 1e9).toFixed(2)}B
                      </span>
                    </button>
                  ))}

                  {/* 加载更多按钮 */}
                  {displayedChains.length < filteredChains.length && (
                    <button
                      onClick={loadMoreChains}
                      className="w-full py-2 text-xs text-blue-500 hover:text-blue-600 font-medium"
                    >
                      加载更多 ({filteredChains.length - displayedChains.length} 条)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
