import { useState } from 'react'

export type SortOption = 'tvl_desc' | 'tvl_asc' | 'change_1d_desc' | 'change_7d_desc'

export interface ProtocolFiltersState {
  searchQuery: string
  selectedCategory: string
  selectedChains: string[]
  selectedTvlRange: number
  sortBy: SortOption
  limit: number
  activeQuickFilter: number
}

export interface ProtocolFiltersActions {
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string) => void
  setSelectedChains: (chains: string[]) => void
  toggleChain: (chain: string) => void
  removeChain: (chain: string) => void
  setSelectedTvlRange: (range: number) => void
  setSortBy: (sort: SortOption) => void
  setLimit: (limit: number) => void
  setActiveQuickFilter: (index: number) => void
  clearAll: () => void
  hasActiveFilters: () => boolean
}

export function useProtocolFilters() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedChains, setSelectedChains] = useState<string[]>([])
  const [selectedTvlRange, setSelectedTvlRange] = useState(0)
  const [sortBy, setSortBy] = useState<SortOption>('tvl_desc')
  const [limit, setLimit] = useState(30)
  const [activeQuickFilter, setActiveQuickFilter] = useState(-1)

  const toggleChain = (chain: string) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain]
    )
  }

  const removeChain = (chain: string) => {
    setSelectedChains((prev) => prev.filter((c) => c !== chain))
  }

  const clearAll = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedChains([])
    setSelectedTvlRange(0)
    setSortBy('tvl_desc')
    setLimit(30)
    setActiveQuickFilter(-1)
  }

  const hasActiveFilters = () => {
    return !!(
      searchQuery ||
      selectedCategory ||
      selectedChains.length > 0 ||
      selectedTvlRange > 0 ||
      activeQuickFilter >= 0
    )
  }

  const state: ProtocolFiltersState = {
    searchQuery,
    selectedCategory,
    selectedChains,
    selectedTvlRange,
    sortBy,
    limit,
    activeQuickFilter,
  }

  const actions: ProtocolFiltersActions = {
    setSearchQuery,
    setSelectedCategory,
    setSelectedChains,
    toggleChain,
    removeChain,
    setSelectedTvlRange,
    setSortBy,
    setLimit,
    setActiveQuickFilter,
    clearAll,
    hasActiveFilters,
  }

  return { state, actions }
}
