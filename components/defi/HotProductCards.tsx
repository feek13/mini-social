'use client'

import { YieldPool } from '@/lib/defillama/types'
import { formatAPY } from '@/lib/utils'
import { TrendingUp, Flame } from 'lucide-react'

interface HotProductCardsProps {
  products: YieldPool[]
}

export default function HotProductCards({ products }: HotProductCardsProps) {
  if (products.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-bold text-gray-900">热门投资品</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {products.map((product) => {
          const isAPR = product.apy < 10 && !product.stablecoin

          return (
            <div
              key={product.pool}
              className="flex-shrink-0 w-40 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
            >
              {/* 代币图标 */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {product.symbol.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">
                    {product.symbol}
                  </div>
                </div>
              </div>

              {/* APY */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-2xl font-black text-green-400">
                    {formatAPY(product.apy)}
                  </span>
                </div>
                <div className="text-xs text-gray-400 font-medium">
                  {isAPR ? 'APR' : 'APY'}
                </div>
              </div>

              {/* Hover 效果 */}
              <div className="mt-3 pt-3 border-t border-gray-700 group-hover:border-green-400 transition">
                <div className="text-xs text-gray-400 truncate">
                  {product.project}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
