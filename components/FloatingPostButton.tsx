'use client'

import { useState, useEffect } from 'react'
import { Feather } from 'lucide-react'

interface FloatingPostButtonProps {
  onClick: () => void
}

export default function FloatingPostButton({ onClick }: FloatingPostButtonProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleScroll = () => {
      // 清除之前的定时器
      clearTimeout(timeoutId)

      // 设置新的定时器 - 防抖优化
      timeoutId = setTimeout(() => {
        // 当滚动超过 300px 时显示按钮
        setIsVisible(window.scrollY > 300)
      }, 100)
    }

    // 监听滚动事件，passive 优化性能
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 如果不可见，不渲染
  if (!isVisible) return null

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 left-6 z-40
                 w-14 h-14 rounded-full
                 bg-gradient-to-r from-blue-500 to-blue-600
                 text-white shadow-lg
                 hover:scale-110 hover:shadow-xl
                 transition-all duration-200
                 flex items-center justify-center
                 animate-fade-in-up group"
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
