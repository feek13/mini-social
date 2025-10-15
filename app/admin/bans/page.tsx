'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Ban, UserX, Calendar, Clock, Search, Plus, X, AlertCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'

type BanType = 'temporary' | 'permanent'
type BanStatus = 'active' | 'expired' | 'lifted' | 'all'

interface UserBan {
  id: string
  user_id: string
  banned_by: string
  reason: string
  ban_type: BanType
  expires_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  user: {
    id: string
    username: string
    avatar_url: string | null
    avatar_template: string | null
  }
  admin: {
    id: string
    username: string
  }
}

export default function BansManagementPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [bans, setBans] = useState<UserBan[]>([])
  const [filteredBans, setFilteredBans] = useState<UserBan[]>([])

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<BanStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 分页
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // 模态框
  const [showBanModal, setShowBanModal] = useState(false)
  const [selectedBan, setSelectedBan] = useState<UserBan | null>(null)

  // 新建封禁表单
  const [banForm, setBanForm] = useState({
    username: '',
    reason: '',
    ban_type: 'temporary' as BanType,
    duration_hours: 24,
  })
  const [banError, setBanError] = useState('')
  const [banLoading, setBanLoading] = useState(false)

  // 获取封禁列表
  const fetchBans = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        router.push('/login')
        return
      }

      const response = await fetch(
        `/api/admin/bans?status=${statusFilter}&page=${page}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '获取封禁列表失败')
      }

      setBans(result.bans)
      setFilteredBans(result.bans)
      setTotal(result.pagination.total)
      setTotalPages(result.pagination.totalPages)
    } catch (error) {
      console.error('获取封禁列表错误:', error)
      alert(error instanceof Error ? error.message : '获取封禁列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBans()
  }, [statusFilter, page])

  // 搜索过滤
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBans(bans)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = bans.filter(
      (ban) =>
        ban.user.username.toLowerCase().includes(query) ||
        ban.reason.toLowerCase().includes(query) ||
        ban.admin.username.toLowerCase().includes(query)
    )
    setFilteredBans(filtered)
  }, [searchQuery, bans])

  // 创建封禁
  const handleCreateBan = async (e: React.FormEvent) => {
    e.preventDefault()
    setBanError('')
    setBanLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setBanError('请先登录')
        return
      }

      // 先查找用户 ID
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', banForm.username)
        .single()

      if (userError || !targetUser) {
        setBanError('用户不存在')
        return
      }

      const response = await fetch('/api/admin/bans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: targetUser.id,
          reason: banForm.reason,
          ban_type: banForm.ban_type,
          duration_hours: banForm.ban_type === 'temporary' ? banForm.duration_hours : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '创建封禁失败')
      }

      // 重置表单
      setBanForm({
        username: '',
        reason: '',
        ban_type: 'temporary',
        duration_hours: 24,
      })
      setShowBanModal(false)

      // 刷新列表
      fetchBans()
    } catch (error) {
      console.error('创建封禁错误:', error)
      setBanError(error instanceof Error ? error.message : '创建封禁失败')
    } finally {
      setBanLoading(false)
    }
  }

  // 解除封禁
  const handleUnban = async (banId: string) => {
    if (!confirm('确定要解除此封禁吗？')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('请先登录')
        return
      }

      const response = await fetch(`/api/admin/bans/${banId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '解除封禁失败')
      }

      // 刷新列表
      fetchBans()
    } catch (error) {
      console.error('解除封禁错误:', error)
      alert(error instanceof Error ? error.message : '解除封禁失败')
    }
  }

  // 删除封禁记录
  const handleDeleteBan = async (banId: string) => {
    if (!confirm('确定要删除此封禁记录吗？此操作不可恢复。')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('请先登录')
        return
      }

      const response = await fetch(`/api/admin/bans/${banId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '删除封禁失败')
      }

      // 刷新列表
      fetchBans()
    } catch (error) {
      console.error('删除封禁错误:', error)
      alert(error instanceof Error ? error.message : '删除封禁失败')
    }
  }

  // 格式化时间
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 计算剩余时间
  const getRemainingTime = (expiresAt: string | null) => {
    if (!expiresAt) return null

    const now = new Date().getTime()
    const expires = new Date(expiresAt).getTime()
    const diff = expires - now

    if (diff <= 0) return '已过期'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `剩余 ${days} 天 ${hours} 小时`
    return `剩余 ${hours} 小时`
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">需要登录</h2>
            <p className="text-gray-600">请先登录后再访问管理后台</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-500 hover:text-gray-700"
              >
                <Shield className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">封禁管理</h1>
                <p className="text-gray-600 mt-1">管理被封禁的用户账号</p>
              </div>
            </div>
            <button
              onClick={() => setShowBanModal(true)}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>封禁用户</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              {(['all', 'active', 'expired', 'lifted'] as BanStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status)
                    setPage(1)
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' && '全部'}
                  {status === 'active' && '活跃'}
                  {status === 'expired' && '已过期'}
                  {status === 'lifted' && '已解除'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索用户名或原因..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-80"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              共 <span className="font-semibold text-gray-900">{total}</span> 条封禁记录
            </p>
          </div>
        </div>

        {/* Bans List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        ) : filteredBans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <UserX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">暂无封禁记录</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      原因
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      执行人
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时间
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBans.map((ban) => (
                    <tr key={ban.id} className="hover:bg-gray-50 transition-colors">
                      {/* 用户 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <Avatar
                            username={ban.user.username}
                            avatarUrl={ban.user.avatar_url}
                            avatarTemplate={ban.user.avatar_template || 'micah'}
                            size="sm"
                          />
                          <button
                            onClick={() => router.push(`/profile/${ban.user.username}`)}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            @{ban.user.username}
                          </button>
                        </div>
                      </td>

                      {/* 原因 */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={ban.reason}>
                          {ban.reason}
                        </div>
                      </td>

                      {/* 类型 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              ban.ban_type === 'permanent'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {ban.ban_type === 'permanent' ? '永久' : '临时'}
                          </span>
                          {ban.expires_at && (
                            <span className="text-xs text-gray-500">
                              {getRemainingTime(ban.expires_at)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 状态 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ban.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {ban.is_active ? '活跃' : '已失效'}
                        </span>
                      </td>

                      {/* 执行人 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">@{ban.admin.username}</div>
                      </td>

                      {/* 时间 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(ban.created_at)}</span>
                          </div>
                          {ban.expires_at && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(ban.expires_at)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 操作 */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {ban.is_active && (
                            <button
                              onClick={() => handleUnban(ban.id)}
                              className="text-green-600 hover:text-green-900"
                              title="解除封禁"
                            >
                              解除
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBan(ban.id)}
                            className="text-red-600 hover:text-red-900"
                            title="删除记录"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-gray-700">
                    第 {page} / {totalPages} 页
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">封禁用户</h2>
              <button
                onClick={() => {
                  setShowBanModal(false)
                  setBanError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBan} className="space-y-4">
              {/* 用户名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  value={banForm.username}
                  onChange={(e) => setBanForm({ ...banForm, username: e.target.value })}
                  placeholder="输入要封禁的用户名"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* 封禁原因 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  封禁原因
                </label>
                <textarea
                  value={banForm.reason}
                  onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                  placeholder="请说明封禁原因"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              {/* 封禁类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  封禁类型
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="temporary"
                      checked={banForm.ban_type === 'temporary'}
                      onChange={(e) =>
                        setBanForm({ ...banForm, ban_type: e.target.value as BanType })
                      }
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">临时封禁</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="permanent"
                      checked={banForm.ban_type === 'permanent'}
                      onChange={(e) =>
                        setBanForm({ ...banForm, ban_type: e.target.value as BanType })
                      }
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">永久封禁</span>
                  </label>
                </div>
              </div>

              {/* 封禁时长（仅临时封禁） */}
              {banForm.ban_type === 'temporary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    封禁时长（小时）
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={banForm.duration_hours}
                    onChange={(e) =>
                      setBanForm({ ...banForm, duration_hours: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    常用时长: 24小时(1天), 168小时(7天), 720小时(30天)
                  </p>
                </div>
              )}

              {/* Error */}
              {banError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{banError}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBanModal(false)
                    setBanError('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={banLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {banLoading ? '处理中...' : '确认封禁'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
