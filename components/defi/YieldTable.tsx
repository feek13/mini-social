'use client'

import { useState } from 'react'
import { YieldPool } from '@/lib/defillama/types'
import { formatTVL, formatAPY, getRiskStyle } from '@/lib/utils'
import { getPoolInvestUrl } from '@/lib/defi-utils'
import { ArrowUpDown, ExternalLink, Shield, Droplets, TrendingUp } from 'lucide-react'

interface YieldTableProps {
  pools: YieldPool[]
  onSort?: (sortBy: 'apy' | 'tvl' | 'apy30d') => void
  currentSort?: 'apy' | 'tvl' | 'apy30d'
}

export default function YieldTable({ pools, onSort, currentSort }: YieldTableProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const handleSort = (column: 'apy' | 'tvl' | 'apy30d') => {
    if (currentSort === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      setSortOrder('desc')
    }
    onSort?.(column)
  }

  const getSortIcon = (column: 'apy' | 'tvl' | 'apy30d') => {
    if (currentSort !== column) {
      return <ArrowUpDown className="w-3 h-3 opacity-30" />
    }
    return (
      <ArrowUpDown
        className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-transform`}
      />
    )
  }

  if (pools.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="text-gray-500">暂无符合条件的产品</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                产品
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                协议
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                链
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleSort('tvl')}
              >
                <div className="flex items-center justify-end gap-1">
                  <Droplets className="w-3 h-3" />
                  <span>TVL</span>
                  {getSortIcon('tvl')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleSort('apy')}
              >
                <div className="flex items-center justify-end gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>APY</span>
                  {getSortIcon('apy')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleSort('apy30d')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>30d Avg</span>
                  {getSortIcon('apy30d')}
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>风险</span>
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pools.map((pool, index) => {
              const riskStyle = getRiskStyle(pool.ilRisk)
              const investUrl = getPoolInvestUrl(pool)
              const hasHighAPY = pool.apy > 50

              return (
                <tr
                  key={pool.pool}
                  className="hover:bg-gray-50 transition group"
                >
                  {/* 序号 */}
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {index + 1}
                  </td>

                  {/* 产品（币对） */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {/* 代币图标占位符 */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {pool.symbol.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-base">
                          {pool.symbol}
                        </div>
                        {pool.stablecoin && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full mt-1">
                            稳定币
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 协议 */}
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {pool.project}
                    </span>
                  </td>

                  {/* 链 */}
                  <td className="px-4 py-4">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-md">
                      {pool.chain}
                    </span>
                  </td>

                  {/* TVL */}
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatTVL(pool.tvlUsd)}
                    </span>
                  </td>

                  {/* APY */}
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span
                        className={`text-base font-bold ${
                          hasHighAPY ? 'text-green-600' : 'text-green-500'
                        }`}
                      >
                        {formatAPY(pool.apy)}
                      </span>
                      {/* 7 天变化 */}
                      {pool.apyPct7D !== null && pool.apyPct7D !== undefined && (
                        <span
                          className={`text-xs font-medium ${
                            pool.apyPct7D > 0
                              ? 'text-green-600'
                              : pool.apyPct7D < 0
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {pool.apyPct7D > 0 ? '+' : ''}
                          {pool.apyPct7D.toFixed(1)}% 7d
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 30d Avg APY */}
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-semibold text-blue-600">
                      {pool.apyMean30d !== null
                        ? formatAPY(pool.apyMean30d)
                        : '-'}
                    </span>
                  </td>

                  {/* 风险 */}
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-md ${riskStyle.bg} ${riskStyle.color}`}
                    >
                      {riskStyle.label}
                    </span>
                  </td>

                  {/* 操作 */}
                  <td className="px-4 py-4 text-center">
                    <a
                      href={investUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition group-hover:scale-105 active:scale-95"
                    >
                      认购
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 表格底部统计 */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
        共 <span className="font-semibold text-gray-900">{pools.length}</span> 个产品
      </div>
    </div>
  )
}
