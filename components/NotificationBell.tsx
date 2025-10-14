'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import NotificationDropdown from './NotificationDropdown'

interface NotificationBellProps {
  variant?: 'icon' | 'button'
}

export default function NotificationBell({ variant = 'icon' }: NotificationBellProps) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // 初始加载和轮询
  useEffect(() => {
    if (!user) return

    let retryCount = 0
    const maxRetries = 3

    // 获取未读数量
    const fetchUnreadCount = async () => {
      try {
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
        if (!session?.access_token) {
          console.log('[NotificationBell] 未找到有效会话，跳过请求')
          return
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

        const response = await fetch('/api/notifications/unread-count', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          const newCount = data.unreadCount

          // 如果数量增加，触发动画
          if (newCount > unreadCount) {
            setIsAnimating(true)
            setTimeout(() => setIsAnimating(false), 500)
          }

          setUnreadCount(newCount)
          retryCount = 0 // 成功后重置重试计数
        } else if (response.status === 401) {
          console.log('[NotificationBell] 认证失败，可能需要重新登录')
        } else {
          console.warn(`[NotificationBell] API 返回错误: ${response.status}`)
        }
      } catch (error) {
        // 只在开发环境记录详细错误，生产环境静默失败
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.warn('[NotificationBell] 请求超时')
          } else if (error.message.includes('Failed to fetch')) {
            // 网络错误，尝试重试
            if (retryCount < maxRetries) {
              retryCount++
              console.warn(`[NotificationBell] 网络错误，${retryCount}/${maxRetries} 次重试`)
            }
          } else {
            console.error('[NotificationBell] 获取未读数量失败:', error.message)
          }
        }
      }
    }

    fetchUnreadCount()

    // 每 30 秒轮询一次
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [user, unreadCount])

  // 格式化未读数量显示
  const formatCount = (count: number) => {
    if (count === 0) return null
    if (count <= 9) return count
    if (count <= 99) return '9+'
    return '99+'
  }

  if (!user) return null

  const displayCount = formatCount(unreadCount)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative flex items-center space-x-2
          ${variant === 'button' ? 'px-3 py-2 rounded-full hover:bg-gray-100' : 'p-2 hover:bg-gray-100 rounded-full'}
          transition-colors
          ${isAnimating ? 'animate-pulse' : ''}
        `}
        aria-label="通知"
      >
        <div className="relative">
          <Bell
            className={`
              w-5 h-5 text-gray-600
              ${unreadCount > 0 ? 'text-blue-500' : ''}
              ${isAnimating ? 'animate-bounce' : ''}
            `}
          />
          {displayCount && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full animate-scale-in">
              {displayCount}
            </span>
          )}
        </div>
        {variant === 'button' && (
          <span className="text-sm font-medium text-gray-700">
            通知
          </span>
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
          onCountChange={setUnreadCount}
        />
      )}
    </div>
  )
}
