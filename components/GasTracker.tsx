'use client'

/**
 * Gas Tracker 组件
 * 显示实时 Gas 价格，导航栏小组件
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Fuel } from 'lucide-react'

interface GasPrice {
  lastBlock: number
  safe: number
  propose: number
  fast: number
  baseFee: number
  gasUsedRatio: number
  timestamp: number
  level: {
    level: 'low' | 'medium' | 'high' | 'extreme'
    color: string
    emoji: string
  }
}

export default function GasTracker() {
  const [gasPrice, setGasPrice] = useState<GasPrice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取 Gas 价格
  const fetchGasPrice = async () => {
    try {
      const response = await fetch('/api/etherscan/gas/oracle')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      setGasPrice(result.data)
      setError(null)
    } catch (err) {
      console.error('[GasTracker] 获取 Gas 价格失败:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch gas price')
    } finally {
      setLoading(false)
    }
  }

  // 初始加载和定时刷新（每 2 分钟）
  useEffect(() => {
    fetchGasPrice()

    const interval = setInterval(fetchGasPrice, 2 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-gray-800/50 rounded-full animate-pulse">
        <Fuel className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">--</span>
      </div>
    )
  }

  if (error || !gasPrice) {
    return null // 静默失败
  }

  return (
    <Link
      href="/gas"
      className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-full transition-all group"
      title="查看 Gas 详情"
    >
      <Fuel className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-blue-500 transition-colors" />

      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {gasPrice.propose}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">gwei</span>
        <span className="text-sm">{gasPrice.level.emoji}</span>
      </div>
    </Link>
  )
}
