'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { formatTVL, formatChange, getChangeColor } from '@/lib/utils'

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  change?: number | null
  subValue?: string
  info?: string
}

export default function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  subValue,
  info
}: MetricCardProps) {
  const displayValue = typeof value === 'number' ? formatTVL(value) : value

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-5 hover:border-gray-700 transition-all">
      <div className="flex items-start justify-between mb-2 md:mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
          <span className="text-xs md:text-sm font-medium text-gray-400 truncate">
            {label}
          </span>
        </div>
        {info && (
          <button className="text-gray-500 hover:text-gray-300 transition flex-shrink-0 ml-2">
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-xl md:text-2xl font-bold text-white break-words">
          {displayValue}
        </div>

        {change !== null && change !== undefined && (
          <div className={`text-xs md:text-sm font-semibold ${getChangeColor(change)}`}>
            {formatChange(change)}
          </div>
        )}

        {subValue && (
          <div className="text-xs text-gray-500">
            {subValue}
          </div>
        )}
      </div>
    </div>
  )
}
