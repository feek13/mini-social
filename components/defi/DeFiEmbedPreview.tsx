'use client'

import { X, TrendingUp, Droplets, ExternalLink, Sparkles, RefreshCw } from 'lucide-react'
import { Protocol, YieldPool } from '@/lib/defillama/types'
import { DeFiEmbed, TokenData } from './DeFiEmbedPicker'
import Image from 'next/image'
import { formatTVL, formatAPY, formatChange, getChangeColor, isHighAPY } from '@/lib/utils'

interface DeFiEmbedPreviewProps {
  embed: DeFiEmbed
  onRemove?: () => void
  compact?: boolean
  showLatestDataButton?: boolean
}

export default function DeFiEmbedPreview({ embed, onRemove, compact = true, showLatestDataButton = false }: DeFiEmbedPreviewProps) {
  if (embed.type === 'protocol') {
    const protocol = embed.snapshotData as Protocol
    const protocolUrl = protocol.url || `https://defillama.com/protocol/${protocol.slug}`

    return (
      <div
        className={`relative border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all ${compact ? 'p-3' : 'p-4'}`}
      >
        {/* DeFi 标识角标 */}
        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-bl rounded-tr-lg z-20">
          DeFi
        </div>

        {onRemove && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove()
            }}
            className="absolute top-2 left-2 p-1 bg-white rounded-full shadow-sm hover:bg-red-50 transition z-10"
          >
            <X className="w-3 h-3 text-gray-500 hover:text-red-500" />
          </button>
        )}

        <div className="flex items-start gap-2 mb-2 mt-6">
          {protocol.logo && (
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white flex-shrink-0">
              <Image src={protocol.logo} alt={protocol.name} fill className="object-cover" unoptimized />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-gray-900 truncate transition">{protocol.name}</h4>
            <span className="inline-block px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
              {protocol.category}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">TVL</span>
            <span className="text-sm font-bold text-gray-900">{formatTVL(protocol.tvl)}</span>
          </div>
          {protocol.change_1d !== null && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">24h</span>
              <span className={`text-xs font-semibold ${getChangeColor(protocol.change_1d)}`}>
                {formatChange(protocol.change_1d)}
              </span>
            </div>
          )}
        </div>

        {protocol.chains && protocol.chains.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {protocol.chains.slice(0, 3).map((chain, idx) => (
              <span key={idx} className="px-1.5 py-0.5 text-xs bg-white text-gray-700 rounded">
                {chain}
              </span>
            ))}
            {protocol.chains.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs bg-white text-gray-500 rounded">
                +{protocol.chains.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 操作按钮区域 */}
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-blue-200">
          <a
            href={protocolUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            <span>查看协议详情</span>
          </a>

          {showLatestDataButton && (
            <a
              href={`https://defillama.com/protocol/${protocol.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 bg-white hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300 rounded-lg transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <RefreshCw className="w-3 h-3" />
              <span>查看最新数据</span>
            </a>
          )}
        </div>
      </div>
    )
  }

  if (embed.type === 'yield') {
    const pool = embed.snapshotData as YieldPool
    const highAPY = isHighAPY(pool.apy)
    const yieldUrl = `https://defillama.com/yields?project=${pool.project}`

    return (
      <div
        className={`relative border rounded-lg overflow-hidden hover:shadow-lg transition-all ${
          highAPY
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300'
            : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:border-purple-300'
        } ${compact ? 'p-3' : 'p-4'}`}
      >
        {/* DeFi 标识角标 */}
        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-green-500 text-white text-xs font-bold rounded-bl rounded-tr-lg z-20">
          DeFi
        </div>

        {onRemove && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove()
            }}
            className="absolute top-2 left-2 p-1 bg-white rounded-full shadow-sm hover:bg-red-50 transition z-10"
          >
            <X className="w-3 h-3 text-gray-500 hover:text-red-500" />
          </button>
        )}

        <div className="mb-2 mt-6">
          <div className="flex items-center gap-1 mb-1">
            <h4 className="font-bold text-sm text-gray-900 transition">{pool.project}</h4>
            {highAPY && <Sparkles className="w-3 h-3 text-yellow-500" />}
          </div>
          <p className="text-xs text-gray-600">{pool.symbol}</p>
          <span className="inline-block mt-1 px-1.5 py-0.5 text-xs font-medium bg-gray-900 text-white rounded">
            {pool.chain}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              APY
            </span>
            <span className={`text-lg font-black ${highAPY ? 'text-green-600' : 'text-green-500'}`}>
              {formatAPY(pool.apy)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              TVL
            </span>
            <span className="text-xs font-semibold text-gray-900">{formatTVL(pool.tvlUsd)}</span>
          </div>
        </div>

        {/* 操作按钮区域 */}
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-300">
          <a
            href={yieldUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-green-600 bg-white hover:bg-green-50 border border-green-200 hover:border-green-300 rounded-lg transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            <span>查看收益详情</span>
          </a>

          {showLatestDataButton && (
            <a
              href={`https://defillama.com/yields?project=${pool.project}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-lg transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <RefreshCw className="w-3 h-3" />
              <span>查看最新数据</span>
            </a>
          )}
        </div>
      </div>
    )
  }

  if (embed.type === 'token') {
    const token = embed.snapshotData as TokenData
    const explorerUrl = token.chain === 'ethereum'
      ? `https://etherscan.io/token/${token.address}`
      : `https://defillama.com/chain/${token.chain}`

    return (
      <div
        className={`relative border border-gray-200 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 overflow-hidden hover:shadow-lg hover:border-yellow-300 transition-all ${compact ? 'p-3' : 'p-4'}`}
      >
        {/* DeFi 标识角标 */}
        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-bl rounded-tr-lg z-20">
          DeFi
        </div>

        {onRemove && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove()
            }}
            className="absolute top-2 left-2 p-1 bg-white rounded-full shadow-sm hover:bg-red-50 transition z-10"
          >
            <X className="w-3 h-3 text-gray-500 hover:text-red-500" />
          </button>
        )}

        <div className="mb-2 mt-6">
          <h4 className="font-bold text-lg text-gray-900 transition">{token.symbol}</h4>
          <p className="text-xs text-gray-600 capitalize">{token.chain}</p>
        </div>

        <div className="mb-2">
          <div className="text-2xl font-black text-blue-600">
            ${token.price.toFixed(token.price < 0.01 ? 8 : token.price < 1 ? 6 : 2)}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span>精度: {token.decimals}</span>
        </div>

        {/* 操作按钮区域 */}
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-orange-200">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            <span>浏览器查看</span>
          </a>

          {showLatestDataButton && (
            <a
              href={`https://defillama.com/chain/${token.chain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-orange-600 bg-white hover:bg-orange-50 border border-orange-200 hover:border-orange-300 rounded-lg transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <RefreshCw className="w-3 h-3" />
              <span>查看最新价格</span>
            </a>
          )}
        </div>
      </div>
    )
  }

  return null
}
