import { useState } from 'react'

export type YieldSortOption = 'apy_desc' | 'apy_asc' | 'tvl_desc' | 'trend_desc'

export interface YieldFiltersState {
  selectedChain: string
  selectedProtocol: string
  minApy: number
  limit: number
  activeQuickFilter: number
  selectedTvlRange: number
  onlyStablecoin: boolean
  selectedRisk: string
  selectedExposure: string
  sortBy: YieldSortOption
}

export interface YieldFiltersActions {
  setSelectedChain: (chain: string) => void
  setSelectedProtocol: (protocol: string) => void
  setMinApy: (apy: number) => void
  setLimit: (limit: number) => void
  setActiveQuickFilter: (index: number) => void
  setSelectedTvlRange: (range: number) => void
  setOnlyStablecoin: (value: boolean) => void
  setSelectedRisk: (risk: string) => void
  setSelectedExposure: (exposure: string) => void
  setSortBy: (sort: YieldSortOption) => void
  clearAll: () => void
  hasActiveFilters: () => boolean
}

export function useYieldFilters() {
  const [selectedChain, setSelectedChain] = useState('')
  const [selectedProtocol, setSelectedProtocol] = useState('')
  const [minApy, setMinApy] = useState(0)
  const [limit, setLimit] = useState(30)
  const [activeQuickFilter, setActiveQuickFilter] = useState(-1)
  const [selectedTvlRange, setSelectedTvlRange] = useState(0)
  const [onlyStablecoin, setOnlyStablecoin] = useState(false)
  const [selectedRisk, setSelectedRisk] = useState('')
  const [selectedExposure, setSelectedExposure] = useState('')
  const [sortBy, setSortBy] = useState<YieldSortOption>('apy_desc')

  const clearAll = () => {
    setSelectedChain('')
    setSelectedProtocol('')
    setMinApy(0)
    setLimit(30)
    setActiveQuickFilter(-1)
    setSelectedTvlRange(0)
    setOnlyStablecoin(false)
    setSelectedRisk('')
    setSelectedExposure('')
    setSortBy('apy_desc')
  }

  const hasActiveFilters = () => {
    return !!(
      selectedChain ||
      selectedProtocol ||
      minApy > 0 ||
      activeQuickFilter >= 0 ||
      onlyStablecoin ||
      selectedRisk ||
      selectedExposure ||
      sortBy !== 'apy_desc' ||
      selectedTvlRange > 0
    )
  }

  const state: YieldFiltersState = {
    selectedChain,
    selectedProtocol,
    minApy,
    limit,
    activeQuickFilter,
    selectedTvlRange,
    onlyStablecoin,
    selectedRisk,
    selectedExposure,
    sortBy,
  }

  const actions: YieldFiltersActions = {
    setSelectedChain,
    setSelectedProtocol,
    setMinApy,
    setLimit,
    setActiveQuickFilter,
    setSelectedTvlRange,
    setOnlyStablecoin,
    setSelectedRisk,
    setSelectedExposure,
    setSortBy,
    clearAll,
    hasActiveFilters,
  }

  return { state, actions }
}
