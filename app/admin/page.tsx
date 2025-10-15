'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  Flag,
  Users,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalReports: number
  pendingReports: number
  reviewingReports: number
  resolvedReports: number
  dismissedReports: number
  totalBans: number
  activeBans: number
  totalModerationActions: number
  recentReports: Array<{
    id: string
    report_type: string
    reason: string
    status: string
    created_at: string
    reporter: {
      username: string
    }
  }>
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          router.push('/')
          return
        }

        const response = await fetch('/api/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '获取统计数据失败')
        }

        setStats(result)
      } catch (err) {
        console.error('获取管理员数据错误:', err)
        setError(err instanceof Error ? err.message : '获取数据失败')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDashboardStats()
    }
  }, [user, router])

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">请先登录</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 h-32"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">出错了</h2>
            <p className="text-red-700">{error}</p>
          </div>
        </main>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const statCards = [
    {
      title: '待处理举报',
      value: stats.pendingReports,
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      change: '+12%',
    },
    {
      title: '总举报数',
      value: stats.totalReports,
      icon: Flag,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      change: '+8%',
    },
    {
      title: '活跃封禁',
      value: stats.activeBans,
      icon: Shield,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      change: '-3%',
    },
    {
      title: '审核操作',
      value: stats.totalModerationActions,
      icon: BarChart3,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      change: '+15%',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">管理员后台</h1>
          <p className="text-gray-600">内容审核与用户管理</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.title}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* Reports Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Reports by Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">举报状态分布</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <span className="text-gray-700">待处理</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">{stats.pendingReports}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-700">审核中</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">{stats.reviewingReports}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">已解决</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">{stats.resolvedReports}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">已驳回</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">{stats.dismissedReports}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">快捷操作</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/reports')}
                className="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <Flag className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-gray-900">查看举报</span>
                </div>
                <span className="text-sm text-orange-600 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button
                onClick={() => router.push('/admin/bans')}
                className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-gray-900">用户封禁</span>
                </div>
                <span className="text-sm text-red-600 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button
                onClick={() => router.push('/admin/banned-words')}
                className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-900">敏感词管理</span>
                </div>
                <span className="text-sm text-purple-600 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button
                onClick={() => router.push('/admin/actions')}
                className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">审核记录</span>
                </div>
                <span className="text-sm text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">最近举报</h2>
          {stats.recentReports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Flag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无举报记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">类型</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">原因</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">举报人</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">状态</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">时间</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentReports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {report.report_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">{report.reason}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{report.reporter.username}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            report.status === 'pending'
                              ? 'bg-orange-100 text-orange-700'
                              : report.status === 'reviewing'
                              ? 'bg-blue-100 text-blue-700'
                              : report.status === 'resolved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => router.push(`/admin/reports?id=${report.id}`)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
