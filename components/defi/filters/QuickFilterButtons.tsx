'use client'

import { LucideIcon } from 'lucide-react'

export interface QuickFilter {
  label: string
  icon: LucideIcon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface QuickFilterButtonsProps {
  filters: QuickFilter[]
  activeIndex: number
  onFilterClick: (index: number) => void
  activeColor?: 'blue' | 'green'
}

export default function QuickFilterButtons({
  filters,
  activeIndex,
  onFilterClick,
  activeColor = 'blue'
}: QuickFilterButtonsProps) {
  const activeClass = activeColor === 'blue'
    ? 'bg-blue-500 text-white shadow-md'
    : 'bg-green-500 text-white shadow-md'

  const hoverClass = activeColor === 'blue'
    ? 'hover:border-blue-300 hover:text-blue-600'
    : 'hover:border-green-300 hover:text-green-600'

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      {filters.map((filter, index) => {
        const Icon = filter.icon
        return (
          <button
            key={index}
            onClick={() => onFilterClick(index)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeIndex === index
                ? activeClass
                : `bg-white text-gray-600 border border-gray-200 ${hoverClass}`
            }`}
          >
            <Icon className="w-4 h-4" />
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
