'use client'

import { Shield, Coins, Droplets, LayoutGrid } from 'lucide-react'
import { PoolCategory, getCategoryLabel, getCategoryDescription } from '@/lib/defi-utils'

interface ProductTabsProps {
  activeCategory: PoolCategory
  onCategoryChange: (category: PoolCategory) => void
  counts?: Record<PoolCategory, number>
}

export default function ProductTabs({
  activeCategory,
  onCategoryChange,
  counts,
}: ProductTabsProps) {
  const tabs: Array<{
    key: PoolCategory
    icon: typeof Shield
    color: string
  }> = [
    { key: 'stablecoin', icon: Shield, color: 'blue' },
    { key: 'single', icon: Coins, color: 'purple' },
    { key: 'multi', icon: Droplets, color: 'green' },
    { key: 'all', icon: LayoutGrid, color: 'gray' },
  ]

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      blue: isActive
        ? 'bg-blue-100 text-blue-700 border-blue-300'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
      purple: isActive
        ? 'bg-purple-100 text-purple-700 border-purple-300'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200',
      green: isActive
        ? 'bg-green-100 text-green-700 border-green-300'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200',
      gray: isActive
        ? 'bg-gray-100 text-gray-900 border-gray-300'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300',
    }
    return colors[color as keyof typeof colors]
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-gray-900">发现</h2>
        {counts && (
          <span className="text-sm text-gray-500">
            {counts[activeCategory]} 个产品
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeCategory === tab.key
          const label = getCategoryLabel(tab.key)
          const description = getCategoryDescription(tab.key)
          const count = counts?.[tab.key]

          return (
            <button
              key={tab.key}
              onClick={() => onCategoryChange(tab.key)}
              className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all ${getColorClasses(
                tab.color,
                isActive
              )} ${isActive ? 'shadow-md' : 'shadow-sm hover:shadow-md'}`}
            >
              {/* 图标 */}
              <div
                className={`p-2 rounded-lg ${
                  isActive
                    ? `bg-${tab.color}-200`
                    : `bg-${tab.color}-50`
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* 标签 */}
              <div className="w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-base">{label}</span>
                  {count !== undefined && (
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        isActive
                          ? `bg-${tab.color}-200 text-${tab.color}-800`
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-left mt-1 opacity-80">
                  {description}
                </p>
              </div>

              {/* 选中指示器 */}
              {isActive && (
                <div
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full bg-${tab.color}-600 border-2 border-white`}
                ></div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
