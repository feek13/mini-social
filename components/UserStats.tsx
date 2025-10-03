'use client'

import { useState, useEffect } from 'react'
import { FileText, Heart, MessageCircle, Calendar, Users, UserCheck } from 'lucide-react'
import { formatNumber, formatDays } from '@/lib/utils'

interface UserStatsProps {
  username: string
}

interface Stats {
  postsCount: number
  likesCount: number
  commentsCount: number
  followersCount: number
  followingCount: number
  memberDays: number
}

export default function UserStats({ username }: UserStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/users/${username}/stats`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '获取统计数据失败')
        }

        setStats(data)
      } catch (err) {
        console.error('获取统计数据错误:', err)
        setError(err instanceof Error ? err.message : '获取统计数据失败')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [username])

  // 加载状态
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse"
          >
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  // 错误状态 - 静默失败，不显示
  if (error || !stats) {
    return null
  }

  const statsItems = [
    {
      icon: FileText,
      value: stats.postsCount,
      label: '动态',
      color: 'text-blue-500',
    },
    {
      icon: Heart,
      value: stats.likesCount,
      label: '点赞',
      color: 'text-red-500',
    },
    {
      icon: MessageCircle,
      value: stats.commentsCount,
      label: '评论',
      color: 'text-green-500',
    },
    {
      icon: Users,
      value: stats.followersCount,
      label: '粉丝',
      color: 'text-indigo-500',
    },
    {
      icon: UserCheck,
      value: stats.followingCount,
      label: '关注',
      color: 'text-cyan-500',
    },
    {
      icon: Calendar,
      value: stats.memberDays,
      label: formatDays(stats.memberDays),
      color: 'text-purple-500',
      isText: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {statsItems.map((item, index) => {
        const Icon = item.icon
        return (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:scale-105 transition-transform cursor-default"
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <Icon className={`w-6 h-6 ${item.color}`} />
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {item.isText ? '' : formatNumber(item.value)}
              </div>
              <div className="text-sm text-gray-600">
                {item.isText ? item.label : item.label}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
