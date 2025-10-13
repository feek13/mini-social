'use client'

import { useState } from 'react'
import { X, ExternalLink, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { LinkPreviewData } from '@/app/api/link-preview/route'

interface LinkPreviewProps {
  preview: LinkPreviewData
  onRemove?: () => void
  showRemoveButton?: boolean
  compact?: boolean
}

export default function LinkPreview({
  preview,
  onRemove,
  showRemoveButton = true,
  compact = false
}: LinkPreviewProps) {
  const [imageError, setImageError] = useState(false)

  // 提取域名
  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  return (
    <div className={`relative border border-gray-200 rounded-lg overflow-hidden bg-white hover:bg-gray-50 transition-colors ${
      compact ? '' : 'max-w-xl'
    }`}>
      {/* 删除按钮 */}
      {showRemoveButton && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 bg-gray-900/60 text-white rounded-full hover:bg-gray-900/80 transition-colors z-10"
          aria-label="删除链接预览"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 点击整个卡片打开链接 */}
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className={`flex ${compact ? 'flex-col' : 'flex-row'} h-full`}>
          {/* 图片部分 */}
          {preview.image && !imageError && (
            <div className={`relative flex-shrink-0 bg-gray-100 ${
              compact
                ? 'w-full h-48'
                : 'w-48 h-32'
            }`}>
              <Image
                src={preview.image}
                alt={preview.title || '链接预览图片'}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
                unoptimized
              />
            </div>
          )}

          {/* 文本内容部分 */}
          <div className={`flex-1 flex flex-col justify-between p-3 ${compact ? '' : 'min-w-0'}`}>
            {/* 域名和 favicon */}
            <div className="flex items-center gap-2 mb-2">
              {preview.favicon && (
                <Image
                  src={preview.favicon}
                  alt=""
                  width={16}
                  height={16}
                  className="flex-shrink-0"
                  onError={(e) => {
                    // 隐藏加载失败的 favicon
                    e.currentTarget.style.display = 'none'
                  }}
                  unoptimized
                />
              )}
              <span className="text-xs text-gray-500 truncate">
                {preview.siteName || getDomain(preview.url)}
              </span>
              <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0 ml-auto" />
            </div>

            {/* 标题 */}
            {preview.title && (
              <h3 className={`font-semibold text-gray-900 mb-1 ${
                compact ? 'line-clamp-2 text-sm' : 'line-clamp-1 text-base'
              }`}>
                {preview.title}
              </h3>
            )}

            {/* 描述 */}
            {preview.description && (
              <p className={`text-gray-600 ${
                compact ? 'line-clamp-2 text-xs' : 'line-clamp-2 text-sm'
              }`}>
                {preview.description}
              </p>
            )}
          </div>
        </div>
      </a>
    </div>
  )
}

// 加载状态组件
export function LinkPreviewLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${
      compact ? '' : 'max-w-xl'
    }`}>
      <div className={`flex ${compact ? 'flex-col' : 'flex-row'} h-full animate-pulse`}>
        {/* 图片骨架 */}
        <div className={`flex-shrink-0 bg-gray-200 ${
          compact ? 'w-full h-48' : 'w-48 h-32'
        }`}>
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        </div>

        {/* 文本内容骨架 */}
        <div className={`flex-1 p-3 ${compact ? '' : 'min-w-0'}`}>
          <div className="h-3 bg-gray-200 rounded mb-3 w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  )
}
