'use client'

import { useCallback, useMemo } from 'react'
import { Zap, TrendingUp, Shield } from 'lucide-react'
import { Chain } from '@/lib/defillama/types'
import { TVL_RANGES } from '@/lib/defi-utils'
import { useYieldFilters } from '@/hooks/useYieldFilters'
import { useRealtimeYields } from '@/app/defi/hooks/useRealtimeYields'
import YieldCard from '@/components/defi/YieldCard'
import YieldFilters from '@/components/defi/filters/YieldFilters'
import QuickFilterButtons from '@/components/defi/filters/QuickFilterButtons'
import LoadingGrid from '@/components/defi/common/LoadingGrid'
import EmptyState from '@/components/defi/common/EmptyState'

const YIELD_QUICK_FILTERS = [
  { label: '超高收益', icon: Zap, minApy: 100 },
  { label: '高收益', icon: TrendingUp, minApy: 50 },
  { label: '稳定币', icon: Shield, stablecoin: true },
  { label: '低风险', icon: Shield, lowRisk: true },
]

interface YieldsTabProps {
  availableChains: Chain[]
}

export default function YieldsTab({ availableChains }: YieldsTabProps) {
  const { state: filters, actions: filterActions } = useYieldFilters()

  // 获取 TVL 范围
  const tvlRange = TVL_RANGES[filters.selectedTvlRange]
  const minTvl = tvlRange.min > 0 ? tvlRange.min : undefined

  // Use real-time yields hook from Phase 2
  const { data: rawYields, loading, error, isConnected, isRealtime, updateCount } = useRealtimeYields({
    protocol: filters.selectedProtocol,
    chain: filters.selectedChain,
    minApy: filters.minApy > 0 ? filters.minApy : undefined,
    minTvl,
    stablecoin: filters.onlyStablecoin ? true : undefined,
    limit: filters.limit * 2, // 获取更多数据以便客户端过滤
    interval: 2000, // 2-second updates
  })

  // 客户端额外过滤（风险、资产类型、TVL 上限）
  const yields = useMemo(() => {
    let filtered = rawYields

    // 风险等级过滤
    if (filters.selectedRisk && filters.selectedRisk !== 'all') {
      filtered = filtered.filter(pool => {
        const ilRisk = pool.ilRisk?.toLowerCase() || 'unknown'
        return ilRisk === filters.selectedRisk.toLowerCase()
      })
    }

    // 资产类型过滤
    if (filters.selectedExposure && filters.selectedExposure !== 'all') {
      filtered = filtered.filter(pool => {
        const exposure = pool.exposure?.toLowerCase() || 'single'
        return exposure === filters.selectedExposure.toLowerCase()
      })
    }

    // TVL 上限过滤（API 只支持 minTvl）
    if (tvlRange.max !== Infinity) {
      filtered = filtered.filter(pool => pool.tvlUsd <= tvlRange.max)
    }

    // 限制数量
    return filtered.slice(0, filters.limit)
  }, [rawYields, filters.selectedRisk, filters.selectedExposure, tvlRange, filters.limit])

  // Apply quick filter
  const applyQuickFilter = useCallback((index: number) => {
    const filter = YIELD_QUICK_FILTERS[index]
    filterActions.setActiveQuickFilter(index)

    if (filter.minApy) {
      filterActions.setMinApy(filter.minApy)
      filterActions.setSelectedChain('')
      filterActions.setSelectedProtocol('')
    }
    if (filter.stablecoin) {
      filterActions.setOnlyStablecoin(true)
    }
  }, [filterActions])

  // Load more yields
  const loadMoreYields = () => {
    filterActions.setLimit(filters.limit + 20)
  }

  return (
    <>
      {/* Quick Filters */}
      <QuickFilterButtons
        filters={YIELD_QUICK_FILTERS}
        activeIndex={filters.activeQuickFilter}
        onFilterClick={applyQuickFilter}
        activeColor="green"
      />

      {/* Filter Panel */}
      <YieldFilters
        selectedChain={filters.selectedChain}
        onChainChange={filterActions.setSelectedChain}
        selectedProtocol={filters.selectedProtocol}
        onProtocolChange={filterActions.setSelectedProtocol}
        selectedTvlRange={filters.selectedTvlRange}
        onTvlRangeChange={filterActions.setSelectedTvlRange}
        minApy={filters.minApy}
        onMinApyChange={filterActions.setMinApy}
        selectedRisk={filters.selectedRisk}
        onRiskChange={filterActions.setSelectedRisk}
        selectedExposure={filters.selectedExposure}
        onExposureChange={filterActions.setSelectedExposure}
        sortBy={filters.sortBy}
        onSortByChange={filterActions.setSortBy}
        onlyStablecoin={filters.onlyStablecoin}
        onStablecoinChange={filterActions.setOnlyStablecoin}
        availableChains={availableChains}
        onClearAll={filterActions.clearAll}
        hasActiveFilters={filterActions.hasActiveFilters()}
      />

      {/* Yield List */}
      {loading || (yields.length === 0 && updateCount === 0) ? (
        <LoadingGrid />
      ) : error ? (
        <EmptyState
          icon={TrendingUp}
          title="加载失败"
          description={error.message || '无法加载数据，请稍后重试'}
        />
      ) : yields.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="未找到收益率池子"
          description="尝试调整过滤条件"
          actionLabel={filterActions.hasActiveFilters() ? '清除过滤器' : undefined}
          onAction={filterActions.hasActiveFilters() ? filterActions.clearAll : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {yields.map((pool) => (
              <YieldCard key={pool.pool} pool={pool} />
            ))}
          </div>

          {/* Load More Button */}
          {yields.length >= filters.limit && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMoreYields}
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
