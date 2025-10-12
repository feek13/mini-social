'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight, TrendingUp, ArrowRight } from 'lucide-react'
import { Protocol } from '@/lib/defillama/types'
import { formatTVL, formatChange, getChangeColor } from '@/lib/utils'
import MiniTrendChart from '@/components/defi/charts/MiniTrendChart'

interface ProtocolCardProps {
  protocol: Protocol
}

export default function ProtocolCard({ protocol }: ProtocolCardProps) {
  const { name, logo, category, tvl, change_1d, change_7d, chains, slug } = protocol

  const displayChains = chains.slice(0, 3)
  const remainingChains = chains.length - 3

  const miniChartData = Array.from({ length: 30 }, () => ({
    tvl: tvl * (0.8 + Math.random() * 0.4)
  }))

  return (
    <Link href={`/defi/protocol/${slug}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-lg hover:border-blue-200 transition-all animate-fade-in-up cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 group-hover:ring-2 group-hover:ring-blue-500 group-hover:ring-offset-2 transition">
              {logo ? (
                <Image
                  src={logo}
                  alt={`${name} logo`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-lg truncate group-hover:text-blue-500 transition">
                {name}
              </h3>
              {category && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  {category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="mb-3">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Total Value Locked</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {formatTVL(tvl)}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">24h:</span>
              <div className={`flex items-center space-x-0.5 text-sm font-semibold ${getChangeColor(change_1d)}`}>
                {change_1d !== null && change_1d >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : change_1d !== null ? (
                  <ArrowDownRight className="w-4 h-4" />
                ) : null}
                <span>{formatChange(change_1d)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">7d:</span>
              <div className={`flex items-center space-x-0.5 text-sm font-semibold ${getChangeColor(change_7d)}`}>
                {change_7d !== null && change_7d >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : change_7d !== null ? (
                  <ArrowDownRight className="w-4 h-4" />
                ) : null}
                <span>{formatChange(change_7d)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <MiniTrendChart data={miniChartData} color="#3B82F6" height={50} />
        </div>

        <div className="space-y-3">
          {chains.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 font-medium mb-2 block">Chains</span>
              <div className="flex flex-wrap gap-1.5">
                {displayChains.map((chain, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md"
                  >
                    {chain}
                  </span>
                ))}
                {remainingChains > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-md">
                    +{remainingChains}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-lg group-hover:bg-blue-600 transition-colors">
            查看详情
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  )
}
