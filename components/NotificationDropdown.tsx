'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Heart, MessageCircle, Repeat2, User, X, FileText } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import Avatar from './Avatar'
import type { Notification, NotificationType } from '@/types/database'

interface NotificationDropdownProps {
  onClose: () => void
  onCountChange: (count: number) => void
}

export default function NotificationDropdown({ onClose, onCountChange }: NotificationDropdownProps) {
  const { user } = useAuth()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // 获取通知列表
  const fetchNotifications = async () => {
    if (!user) return

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/notifications?limit=10', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        onCountChange(data.unreadCount)
      }
    } catch (error) {
      console.error('获取通知失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // 标记单条已读
  const markAsRead = async (notificationId: string) => {
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) return

      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      // 更新本地状态
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )

      // 更新未读数量
      const unreadCount = notifications.filter(n => !n.is_read && n.id !== notificationId).length
      onCountChange(unreadCount)
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  // 标记全部已读
  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) return

      await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      // 更新本地状态
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      onCountChange(0)
    } catch (error) {
      console.error('标记全部已读失败:', error)
    }
  }

  // 点击通知项
  const handleNotificationClick = async (notification: Notification) => {
    // 标记为已读
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // 跳转到相关内容
    if (notification.post_id) {
      router.push(`/?post=${notification.post_id}`)
    } else if (notification.sender?.username) {
      router.push(`/profile/${notification.sender.username}`)
    }

    onClose()
  }

  // 获取通知图标
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" fill="currentColor" />
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'repost':
        return <Repeat2 className="w-4 h-4 text-green-500" />
      case 'follow':
        return <User className="w-4 h-4 text-purple-500" />
      case 'new_post':
        return <FileText className="w-4 h-4 text-orange-500" />
      default:
        return null
    }
  }

  // 获取通知内容
  const getNotificationContent = (notification: Notification) => {
    const username = notification.sender?.username || '某用户'

    switch (notification.type) {
      case 'like':
        return `@${username} 点赞了你的动态`
      case 'comment':
        return (
          <div>
            <span>@{username} 评论了你的动态</span>
            {notification.comment?.content && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                &quot;{notification.comment.content}&quot;
              </p>
            )}
          </div>
        )
      case 'repost':
        return `@${username} 转发了你的动态`
      case 'follow':
        return `@${username} 关注了你`
      case 'new_post':
        return (
          <div>
            <span>@{username} 发布了新动态</span>
            {notification.post?.content && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                &quot;{notification.post.content}&quot;
              </p>
            )}
          </div>
        )
      default:
        return '新通知'
    }
  }

  // 格式化时间
  const formatTime = (createdAt: string) => {
    const now = new Date()
    const date = new Date(createdAt)
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 animate-fade-in"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">通知</h3>
        <div className="flex items-center space-x-2">
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              全部已读
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* 通知列表 */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-center">还没有通知</p>
          </div>
        ) : (
          notifications.map(notification => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`
                w-full flex items-start space-x-3 px-4 py-3 hover:bg-gray-50 transition text-left
                ${!notification.is_read ? 'bg-blue-50/50' : ''}
              `}
            >
              {/* 未读标记 */}
              {!notification.is_read && (
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
              )}

              {/* 发送者头像 */}
              <Avatar
                username={notification.sender?.username}
                avatarUrl={notification.sender?.avatar_url}
                avatarTemplate={notification.sender?.avatar_template}
                size="sm"
                className="flex-shrink-0"
              />

              {/* 通知内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  {getNotificationIcon(notification.type)}
                  <div className="text-sm text-gray-900 line-clamp-2">
                    {getNotificationContent(notification)}
                  </div>
                </div>
                {notification.post?.content && (
                  <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                    {notification.post.content}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {formatTime(notification.created_at)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* 底部 */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-200">
          <button
            onClick={() => {
              router.push('/notifications')
              onClose()
            }}
            className="w-full py-3 text-center text-sm text-blue-500 hover:bg-gray-50 font-medium transition"
          >
            查看全部
          </button>
        </div>
      )}
    </div>
  )
}
