'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Heart, MessageCircle, Repeat2, User, Loader2, FileText } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import Avatar from '@/components/Avatar'
import type { Notification, NotificationType } from '@/types/database'

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // 重定向未登录用户
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login')
    }
  }, [user, loading, router])

  // 获取通知列表
  const fetchNotifications = async (pageNum: number = 1, append: boolean = false) => {
    if (!user) return

    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) return

      const typeParam = filterType === 'all' ? '' : `&type=${filterType}`
      const response = await fetch(`/api/notifications?page=${pageNum}&limit=20${typeParam}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (append) {
          setNotifications(prev => [...prev, ...data.notifications])
        } else {
          setNotifications(data.notifications)
        }
        setHasMore(data.hasMore)
        setPage(pageNum)
      }
    } catch (error) {
      console.error('获取通知失败:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchNotifications(1, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterType])

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
    } catch (error) {
      console.error('标记全部已读失败:', error)
    }
  }

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
    } catch (error) {
      console.error('标记已读失败:', error)
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
  }

  // 加载更多
  const loadMore = () => {
    if (hasMore && !loadingMore) {
      fetchNotifications(page + 1, true)
    }
  }

  // 获取通知图标
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" fill="currentColor" />
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />
      case 'repost':
        return <Repeat2 className="w-5 h-5 text-green-500" />
      case 'follow':
        return <User className="w-5 h-5 text-purple-500" />
      case 'new_post':
        return <FileText className="w-5 h-5 text-orange-500" />
      default:
        return null
    }
  }

  // 获取通知内容
  const getNotificationContent = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return `点赞了你的动态`
      case 'comment':
        return '评论了你的动态'
      case 'repost':
        return '转发了你的动态'
      case 'follow':
        return '关注了你'
      case 'new_post':
        return '发布了新动态'
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

    // 显示具体日期
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 按日期分组
  const groupByDate = (notifications: Notification[]) => {
    const groups: { [key: string]: Notification[] } = {}
    const now = new Date()

    notifications.forEach(notification => {
      const date = new Date(notification.created_at)
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / 86400000)

      let group = ''
      if (days === 0) {
        group = '今天'
      } else if (days === 1) {
        group = '昨天'
      } else if (days < 7) {
        group = '本周'
      } else {
        group = '更早'
      }

      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(notification)
    })

    return groups
  }

  const groupedNotifications = groupByDate(notifications)
  const hasUnread = notifications.some(n => !n.is_read)

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Bell className="w-6 h-6 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900">通知</h1>
            </div>
            {hasUnread && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-500 hover:text-blue-600 font-medium"
              >
                全部已读
              </button>
            )}
          </div>

          {/* 筛选标签 */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: '全部' },
              { value: 'like', label: '点赞' },
              { value: 'comment', label: '评论' },
              { value: 'repost', label: '转发' },
              { value: 'follow', label: '关注' },
              { value: 'new_post', label: '发文' },
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setFilterType(filter.value as NotificationType | 'all')}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition
                  ${
                    filterType === filter.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* 通知列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12">
            <div className="flex flex-col items-center justify-center">
              <Bell className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">还没有通知</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
              <div key={group} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* 分组标题 */}
                <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-600">{group}</h2>
                </div>

                {/* 通知项 */}
                <div className="divide-y divide-gray-100">
                  {groupNotifications.map(notification => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`
                        w-full flex items-start space-x-4 px-4 py-4 hover:bg-gray-50 transition text-left
                        ${!notification.is_read ? 'bg-blue-50/30' : ''}
                      `}
                    >
                      {/* 未读标记 */}
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      )}

                      {/* 图标 */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* 发送者头像 */}
                      <Avatar
                        username={notification.sender?.username}
                        avatarUrl={notification.sender?.avatar_url}
                        avatarTemplate={notification.sender?.avatar_template}
                        size="md"
                        className="flex-shrink-0"
                      />

                      {/* 通知内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-900">
                          <span className="font-semibold">
                            @{notification.sender?.username || '某用户'}
                          </span>{' '}
                          <span className="text-gray-600">
                            {getNotificationContent(notification)}
                          </span>
                        </div>

                        {/* 评论内容 */}
                        {notification.type === 'comment' && notification.comment?.content && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            &quot;{notification.comment.content}&quot;
                          </p>
                        )}

                        {/* 动态预览 */}
                        {notification.post?.content && (
                          <div className={`mt-2 p-3 rounded-lg ${
                            notification.type === 'new_post' ? 'bg-orange-50' : 'bg-gray-50'
                          }`}>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {notification.post.content}
                            </p>
                          </div>
                        )}

                        {/* 时间 */}
                        <p className="text-sm text-gray-400 mt-2">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* 加载更多 */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-white text-blue-500 rounded-full shadow-sm hover:shadow-md transition disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>加载中...</span>
                    </span>
                  ) : (
                    '加载更多'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
