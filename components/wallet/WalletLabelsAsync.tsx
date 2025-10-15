'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { WalletLabel, EvmChain } from '@/types/database'

/**
 * 异步加载钱包标签组件
 * 不阻塞主页面加载，独立请求并渲染
 */
export default function WalletLabelsAsync({
  address,
  chain,
}: {
  address: string
  chain: EvmChain
}) {
  const [labels, setLabels] = useState<WalletLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        setLoading(true)
        setError(false)

        const res = await fetch(`/api/wallet/${address}/labels?chain=${chain}`)
        const data = await res.json()

        if (res.ok && data.success) {
          setLabels(data.data.labels || [])
        } else {
          setError(true)
        }
      } catch (err) {
        console.error('[Labels] 加载失败:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    // 延迟 100ms 加载，让主内容先渲染
    const timer = setTimeout(fetchLabels, 100)
    return () => clearTimeout(timer)
  }, [address, chain])

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">分析标签中...</span>
      </div>
    )
  }

  // 加载失败或无标签
  if (error || labels.length === 0) {
    return null
  }

  // 显示标签
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <span
          key={label.id}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                   bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30
                   text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
          title={`置信度: ${(label.confidence_score * 100).toFixed(0)}%`}
        >
          {label.label_display}
        </span>
      ))}
    </div>
  )
}
