'use client'

import { useState, useEffect } from 'react'
import YieldCard from '@/components/defi/YieldCard'
import type { YieldPool } from '@/lib/defillama/types'

interface Props {
  chain?: string
  minTvl?: number
  limit?: number
  title?: string
}

export function PancakeSwapPools({ chain, minTvl, limit = 20, title = 'PancakeSwap Pools' }: Props) {
  const [pools, setPools] = useState<YieldPool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (chain) params.append('chain', chain)
    if (minTvl) params.append('minTvl', minTvl.toString())
    if (limit) params.append('limit', limit.toString())

    fetch(`/api/defi/pancakeswap/pools?${params}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch PancakeSwap pools')
        return res.json()
      })
      .then(data => setPools(data.pools || []))
      .catch(err => {
        console.error('Error fetching PancakeSwap pools:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [chain, minTvl, limit])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl h-80 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <p className="text-red-600 text-sm">
          ❌ 无法加载 PancakeSwap 池子数据: {error}
        </p>
      </div>
    )
  }

  if (pools.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-600">
          🔍 未找到符合条件的 PancakeSwap 池子
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{pools.length} pools</span>
          {chain && (
            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-md">
              {chain}
            </span>
          )}
        </div>
      </div>

      {/* 池子网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pools.map(pool => (
          <YieldCard key={pool.pool} pool={pool} />
        ))}
      </div>
    </div>
  )
}
