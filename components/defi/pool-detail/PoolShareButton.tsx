'use client'

import { useState } from 'react'
import { Share2, Check, Copy, Twitter, Facebook } from 'lucide-react'

interface PoolShareButtonProps {
  poolId: string
  projectName: string
  apy: number
}

export default function PoolShareButton({ poolId, projectName, apy }: PoolShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const pageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/defi/yields/${encodeURIComponent(poolId)}`
    : ''

  const shareText = `${projectName} | APY ${apy.toFixed(2)}% - DeFi 投资机会`

  // 复制链接
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      setTimeout(() => setShowMenu(false), 1000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // 分享到 Twitter
  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`
    window.open(twitterUrl, '_blank', 'width=600,height=400')
    setShowMenu(false)
  }

  // 分享到 Facebook
  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`
    window.open(facebookUrl, '_blank', 'width=600,height=400')
    setShowMenu(false)
  }

  // 使用 Web Share API（移动端）
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: `查看 ${projectName} 的详细信息`,
          url: pageUrl
        })
        setShowMenu(false)
      } catch (err) {
        console.log('Share cancelled or failed:', err)
      }
    }
  }

  const hasNativeShare = typeof navigator !== 'undefined' && navigator.share

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">分享</span>
      </button>

      {/* 分享菜单 */}
      {showMenu && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* 菜单内容 */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            {/* 复制链接 */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">已复制!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">复制链接</span>
                </>
              )}
            </button>

            <div className="border-t border-gray-100" />

            {/* 分享到 Twitter */}
            <button
              onClick={shareToTwitter}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
            >
              <Twitter className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-gray-900">分享到 Twitter</span>
            </button>

            {/* 分享到 Facebook */}
            <button
              onClick={shareToFacebook}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
            >
              <Facebook className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">分享到 Facebook</span>
            </button>

            {/* 原生分享（移动端） */}
            {hasNativeShare && (
              <>
                <div className="border-t border-gray-100" />
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                >
                  <Share2 className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">更多分享方式</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
