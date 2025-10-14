'use client'

import { useState, useEffect } from 'react'
import { QUICK_PROTOCOLS, QuickProtocol } from '@/lib/defi-aliases'
import { Protocol } from '@/lib/defillama/types'
import Image from 'next/image'
import { Loader2, Sparkles } from 'lucide-react'

interface QuickProtocolPickerProps {
  onSelect: (protocol: Protocol) => void
}

/**
 * 热门协议快捷选择组件
 */
export default function QuickProtocolPicker({ onSelect }: QuickProtocolPickerProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [protocols, setProtocols] = useState<Map<string, Protocol>>(new Map())

  // 预加载热门协议数据
  useEffect(() => {
    const preloadProtocols = async () => {
      try {
        const response = await fetch('/api/defi/protocols?limit=100')
        const data = await response.json()

        if (data.protocols) {
          const map = new Map<string, Protocol>()
          data.protocols.forEach((p: Protocol) => {
            map.set(p.slug, p)
          })
          setProtocols(map)
        }
      } catch (err) {
        console.error('预加载协议失败:', err)
      }
    }

    preloadProtocols()
  }, [])

  const handleQuickSelect = async (quickProtocol: QuickProtocol) => {
    // 先检查是否已缓存
    if (protocols.has(quickProtocol.slug)) {
      onSelect(protocols.get(quickProtocol.slug)!)
      return
    }

    // 没有缓存，加载数据
    setLoading(quickProtocol.slug)

    try {
      const response = await fetch(`/api/defi/protocols?search=${quickProtocol.slug}&limit=1`)
      const data = await response.json()

      if (data.protocols && data.protocols.length > 0) {
        const protocol = data.protocols[0]
        onSelect(protocol)

        // 更新缓存
        setProtocols(prev => new Map(prev).set(protocol.slug, protocol))
      } else {
        alert('未找到该协议，请尝试搜索')
      }
    } catch (err) {
      console.error('加载协议失败:', err)
      alert('加载失败，请重试')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-yellow-500" />
        <p className="text-xs font-medium text-gray-600">热门协议快速选择</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {QUICK_PROTOCOLS.map((protocol) => {
          const cached = protocols.get(protocol.slug)
          const isLoading = loading === protocol.slug

          return (
            <button
              key={protocol.slug}
              onClick={() => handleQuickSelect(protocol)}
              disabled={isLoading}
              className="group relative p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition text-left disabled:opacity-50"
            >
              {/* 背景渐变效果 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition rounded-lg" />

              <div className="relative flex items-start gap-2">
                {/* Logo */}
                {cached?.logo && (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={cached.logo}
                      alt={protocol.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-sm text-gray-900 truncate">
                      {protocol.name}
                    </h4>
                    {isLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                  </div>

                  <p className="text-xs text-gray-500 mt-0.5">{protocol.description}</p>

                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                      {protocol.category}
                    </span>
                    {cached && (
                      <span className="text-[10px] text-gray-500 font-medium">
                        TVL: ${(cached.tvl / 1e9).toFixed(2)}B
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
