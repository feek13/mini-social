'use client'

import { useState, useEffect } from 'react'
import { Feather } from 'lucide-react'

interface FloatingPostButtonProps {
  onClick: () => void
  targetId?: string // 要监听的目标元素 ID
}

export default function FloatingPostButton({ onClick, targetId = 'post-form-container' }: FloatingPostButtonProps) {
  const [isVisible, setIsVisible] = useState(false)
  // v2024-01-13 - 强制浏览器重新加载

  useEffect(() => {
    // 找到要监听的目标元素
    const targetElement = document.getElementById(targetId)

    if (!targetElement) {
      console.warn(`FloatingPostButton: 找不到目标元素 #${targetId}`)
      return
    }

    // 检查元素是否在视口内（考虑导航栏高度）
    const checkVisibility = () => {
      const rect = targetElement.getBoundingClientRect()
      const navbarHeight = 64 // h-16 = 64px
      const buffer = 16 // 缓冲区，让按钮更早出现（大约滚动16px后就显示）

      // 判断元素是否完全可见：
      // - 如果元素顶部还在 navbarHeight + buffer 以下，说明完全可见，不显示按钮
      // - 如果元素顶部到达或超过 navbarHeight + buffer，说明接近被遮挡，显示按钮
      const threshold = navbarHeight + buffer
      const isElementFullyVisible = rect.top > threshold

      // 元素不完全可见时显示悬浮按钮
      setIsVisible(!isElementFullyVisible)
    }

    // 初始检查
    checkVisibility()

    // 监听滚动事件
    let rafId: number
    const handleScroll = () => {
      // 使用 requestAnimationFrame 优化性能
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(checkVisibility)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      window.removeEventListener('scroll', handleScroll)
    }
  }, [targetId])

  // 如果不可见，不渲染
  if (!isVisible) return null

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 left-6 z-[60]
                 w-14 h-14 rounded-full
                 bg-gradient-to-r from-blue-500 to-blue-600
                 text-white shadow-lg
                 hover:scale-110 hover:shadow-xl
                 transition-all duration-200
                 flex items-center justify-center
                 animate-fade-in-up group
                 touch-manipulation"
      style={{ touchAction: 'manipulation' }}
      aria-label="发布动态"
    >
      <Feather className="w-6 h-6" />

      {/* 悬浮文字提示 */}
      <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg
                       opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none
                       shadow-lg">
        发布动态
      </span>
    </button>
  )
}
