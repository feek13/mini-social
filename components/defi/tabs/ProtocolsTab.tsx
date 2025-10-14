'use client'

import { useState, useEffect, useCallback } from 'react'
import { Filter, Flame, Star, TrendingUp, Rocket, BarChart3, ArrowUpDown } from 'lucide-react'
import { Chain } from '@/lib/defillama/types'
import { TVL_RANGES } from '@/lib/defi-utils'
import { useDebounce } from '@/hooks/useDebounce'
import { useProtocolFilters } from '@/hooks/useProtocolFilters'
import { useRealtimeProtocols } from '@/app/defi/hooks/useRealtimeProtocols'
import ProtocolCard from '@/components/defi/ProtocolCard'
import ProtocolFilters from '@/components/defi/filters/ProtocolFilters'
import QuickFilterButtons from '@/components/defi/filters/QuickFilterButtons'
import ActiveFilterTags from '@/components/defi/filters/ActiveFilterTags'
import LoadingGrid from '@/components/defi/common/LoadingGrid'
import EmptyState from '@/components/defi/common/EmptyState'
import ProtocolSearchInput from '@/components/defi/common/ProtocolSearchInput'

const PROTOCOL_QUICK_FILTERS = [
  { label: '热门 Top 10', icon: Flame, limit: 10, sortBy: 'tvl_desc' },
  { label: 'Top 50', icon: Star, limit: 50, sortBy: 'tvl_desc' },
  { label: 'TVL $1B+', icon: TrendingUp, minTvl: 1_000_000_000 },
  { label: '增长最快', icon: Rocket, sortBy: 'change_7d_desc' },
]

interface ProtocolsTabProps {
  availableChains: Chain[]
  chainsLoading: boolean
}

export default function ProtocolsTab({ availableChains, chainsLoading }: ProtocolsTabProps) {
  const [showFilters, setShowFilters] = useState(false)
  const { state: filters, actions: filterActions } = useProtocolFilters()

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 500)

  // Calculate TVL range from selected index
  const tvlRange = TVL_RANGES[filters.selectedTvlRange]

  // Use real-time protocols hook from Phase 2
  const { data: protocols, loading, error, isConnected, isRealtime, updateCount } = useRealtimeProtocols({
    category: filters.selectedCategory,
    chain: filters.selectedChains[0], // API currently supports single chain
    minTvl: tvlRange.min > 0 ? tvlRange.min : undefined,
    limit: filters.limit,
    interval: 2000, // 2-second updates
  })

  // Apply quick filter
  const applyQuickFilter = useCallback((index: number) => {
    const filter = PROTOCOL_QUICK_FILTERS[index]
    filterActions.setActiveQuickFilter(index)

    if (filter.limit) {
      filterActions.setLimit(filter.limit)
    }
    if (filter.sortBy) {
      filterActions.setSortBy(filter.sortBy as 'tvl_desc' | 'tvl_asc' | 'change_7d_desc' | 'change_1d_desc')
    }
    if (filter.minTvl) {
      const rangeIndex = TVL_RANGES.findIndex(r => r.min === filter.minTvl)
      if (rangeIndex >= 0) {
        filterActions.setSelectedTvlRange(rangeIndex)
      }
    }
  }, [filterActions])

  return (
    <>
      {/* Quick Filters */}
      <QuickFilterButtons
        filters={PROTOCOL_QUICK_FILTERS}
        activeIndex={filters.activeQuickFilter}
        onFilterClick={applyQuickFilter}
        activeColor="blue"
      />

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <ProtocolSearchInput
              value={filters.searchQuery}
              onChange={filterActions.setSearchQuery}
              placeholder="搜索协议名称..."
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              showFilters || filterActions.hasActiveFilters()
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            过滤
          </button>
        </div>

        {/* Active Filter Tags */}
        {filterActions.hasActiveFilters() && (
          <ActiveFilterTags
            searchQuery={filters.searchQuery}
            selectedCategory={filters.selectedCategory}
            selectedChains={filters.selectedChains}
            selectedTvlRange={tvlRange.min > 0 ? tvlRange : undefined}
            onRemoveSearch={() => filterActions.setSearchQuery('')}
            onRemoveCategory={() => filterActions.setSelectedCategory('')}
            onRemoveChain={filterActions.removeChain}
            onRemoveTvlRange={() => filterActions.setSelectedTvlRange(0)}
            onClearAll={filterActions.clearAll}
          />
        )}

        {/* Filter Panel */}
        {showFilters && (
          <ProtocolFilters
            selectedCategory={filters.selectedCategory}
            onCategoryChange={filterActions.setSelectedCategory}
            selectedTvlRange={filters.selectedTvlRange}
            onTvlRangeChange={filterActions.setSelectedTvlRange}
            sortBy={filters.sortBy}
            onSortByChange={filterActions.setSortBy}
            selectedChains={filters.selectedChains}
            onChainToggle={filterActions.toggleChain}
            availableChains={availableChains}
            chainsLoading={chainsLoading}
            onClearAll={filterActions.clearAll}
            hasActiveFilters={filterActions.hasActiveFilters()}
          />
        )}
      </div>

      {/* Protocol List Header */}
      {!loading && protocols.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {debouncedSearchQuery ? '搜索结果' : '热门协议推荐'}
            </h2>
            <span className="text-sm text-gray-500">
              ({protocols.length} 个协议)
            </span>
          </div>

          {/* Sort Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 hidden sm:inline">按 TVL:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => filterActions.setSortBy('tvl_desc')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filters.sortBy === 'tvl_desc'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">高到低</span>
                <span className="sm:hidden">↓</span>
              </button>
              <button
                onClick={() => filterActions.setSortBy('tvl_asc')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filters.sortBy === 'tvl_asc'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">低到高</span>
                <span className="sm:hidden">↑</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protocol List */}
      {loading || (protocols.length === 0 && updateCount === 0) ? (
        <LoadingGrid />
      ) : error ? (
        <EmptyState
          icon={BarChart3}
          title="加载失败"
          description={error.message || '无法加载数据，请稍后重试'}
        />
      ) : protocols.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="未找到协议"
          description="尝试调整搜索条件或过滤器"
          actionLabel={filterActions.hasActiveFilters() ? '清除过滤器' : undefined}
          onAction={filterActions.hasActiveFilters() ? filterActions.clearAll : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {protocols.map((protocol) => (
              <ProtocolCard key={protocol.id} protocol={protocol} />
            ))}
          </div>

          {/* Load More Button */}
          {protocols.length >= filters.limit && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => filterActions.setLimit(filters.limit + 20)}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 hover:border-gray-300 transition font-medium"
              >
                加载更多
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
