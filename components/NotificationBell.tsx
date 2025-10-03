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

  // 获取未读数量
  const fetchUnreadCount = async () => {
    if (!user) return

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const newCount = data.unreadCount

        // 如果数量增加，触发动画
        if (newCount > unreadCount) {
          setIsAnimating(true)
          setTimeout(() => setIsAnimating(false), 500)
        }

        setUnreadCount(newCount)
      }
    } catch (error) {
      console.error('获取未读数量失败:', error)
    }
  }

  // 初始加载和轮询
  useEffect(() => {
    if (!user) return

    fetchUnreadCount()

    // 每 30 秒轮询一次
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [user])

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
