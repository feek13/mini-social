'use client'

import { Search, X, TrendingUp } from 'lucide-react'

interface ActiveFilterTagsProps {
  searchQuery?: string
  selectedCategory?: string
  selectedChains?: string[]
  selectedTvlRange?: { label: string }
  onRemoveSearch?: () => void
  onRemoveCategory?: () => void
  onRemoveChain?: (chain: string) => void
  onRemoveTvlRange?: () => void
  onClearAll: () => void
}

export default function ActiveFilterTags({
  searchQuery,
  selectedCategory,
  selectedChains = [],
  selectedTvlRange,
  onRemoveSearch,
  onRemoveCategory,
  onRemoveChain,
  onRemoveTvlRange,
  onClearAll
}: ActiveFilterTagsProps) {
  const hasFilters = searchQuery || selectedCategory || selectedChains.length > 0 || selectedTvlRange

  if (!hasFilters) return null

  return (
    <div className="flex flex-wrap gap-2 items-center animate-fade-in">
      <span className="text-sm text-gray-500 font-medium">活跃筛选:</span>

      {searchQuery && onRemoveSearch && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm">
          <Search className="w-3.5 h-3.5" />
          <span>&quot;{searchQuery}&quot;</span>
          <button
            onClick={onRemoveSearch}
            className="hover:bg-blue-200 rounded-full p-0.5 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selectedCategory && onRemoveCategory && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm">
          <span>{selectedCategory}</span>
          <button
            onClick={onRemoveCategory}
            className="hover:bg-purple-200 rounded-full p-0.5 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selectedChains.map((chain) => (
        <div
          key={chain}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm"
        >
          <span>{chain}</span>
          {onRemoveChain && (
            <button
              onClick={() => onRemoveChain(chain)}
              className="hover:bg-green-200 rounded-full p-0.5 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}

      {selectedTvlRange && onRemoveTvlRange && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{selectedTvlRange.label}</span>
          <button
            onClick={onRemoveTvlRange}
            className="hover:bg-orange-200 rounded-full p-0.5 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <button
        onClick={onClearAll}
        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition font-medium"
      >
        清除所有
      </button>
    </div>
  )
}
