'use client'

import { LucideIcon } from 'lucide-react'
import { formatTVL, formatChange, getChangeColor } from '@/lib/utils'

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: number
  change?: number | null
  suffix?: string
}

export default function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  suffix = ''
}: MetricCardProps) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        {change !== undefined && change !== null && (
          <span className={`text-sm font-semibold ${getChangeColor(change)}`}>
            {formatChange(change)}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white">
          {formatTVL(value)}
          {suffix && <span className="text-sm text-gray-400 ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  )
}
