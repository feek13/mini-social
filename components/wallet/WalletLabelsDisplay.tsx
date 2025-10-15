'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { getLabelTypeInfo } from '@/lib/wallet-labels'
import type { WalletLabel } from '@/types/database'

interface WalletLabelsDisplayProps {
  address: string
  chain?: string
}

/**
 * 钱包智能标签展示组件
 * 自动获取并显示钱包的智能标签
 */
export default function WalletLabelsDisplay({
  address,
  chain = 'ethereum',
}: WalletLabelsDisplayProps) {
  const [labels, setLabels] = useState<WalletLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLabels()
  }, [address, chain])

  const fetchLabels = async () => {
    try {
      setLoading(true)
      setError('')

      const res = await fetch(`/api/wallet/${address}/labels?chain=${chain}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '获取标签失败')
      }

      setLabels(data.data.labels || [])
    } catch (err) {
      console.error('获取标签失败:', err)
      setError(err instanceof Error ? err.message : '获取标签失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">生成智能标签中...</span>
      </div>
    )
  }

  if (error || labels.length === 0) {
    return null
  }

  // 按类型分组
  const labelsByType = labels.reduce((acc, label) => {
    if (!acc[label.label_type]) {
      acc[label.label_type] = []
    }
    acc[label.label_type].push(label)
    return acc
  }, {} as Record<string, WalletLabel[]>)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          智能标签
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {labels.map((label) => {
          const typeInfo = getLabelTypeInfo(label.label_type)

          return (
            <span
              key={label.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                        bg-${typeInfo.color}-100 text-${typeInfo.color}-700
                        dark:bg-${typeInfo.color}-900/30 dark:text-${typeInfo.color}-300
                        border border-${typeInfo.color}-200 dark:border-${typeInfo.color}-800
                        hover:shadow-sm transition-shadow`}
              title={`置信度: ${(label.confidence_score * 100).toFixed(0)}%`}
            >
              <span>{label.label_display}</span>
              {label.confidence_score >= 0.9 && (
                <Sparkles className="w-3 h-3" />
              )}
            </span>
          )
        })}
      </div>

      {/* 按类型显示（可选） */}
      {Object.keys(labelsByType).length > 1 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            按类别查看
          </summary>
          <div className="mt-2 space-y-2">
            {Object.entries(labelsByType).map(([type, typeLabels]) => {
              const typeInfo = getLabelTypeInfo(type)
              return (
                <div key={type} className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    {typeInfo.icon} {typeInfo.name}:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {typeLabels.map((label) => (
                      <span
                        key={label.id}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                      >
                        {label.label_display}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
