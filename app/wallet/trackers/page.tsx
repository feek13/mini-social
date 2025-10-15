'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Star,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Bell,
  BellOff,
  ExternalLink,
  Search,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { formatAddress } from '@/lib/moralis'
import type { WalletTracker } from '@/types/database'

/**
 * 钱包追踪列表页面
 * 显示用户追踪的所有钱包
 */
export default function WalletTrackersPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [trackers, setTrackers] = useState<WalletTracker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTracker, setEditingTracker] = useState<WalletTracker | null>(null)

  // 获取追踪列表
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    fetchTrackers()
  }, [user, router])

  const fetchTrackers = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      const res = await fetch('/api/wallet/trackers', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '获取追踪列表失败')
      }

      setTrackers(data.data)
    } catch (err) {
      console.error('获取追踪列表失败:', err)
      alert(err instanceof Error ? err.message : '获取追踪列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 切换通知
  const toggleNotification = async (tracker: WalletTracker) => {
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      const res = await fetch(`/api/wallet/trackers/${tracker.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          notification_enabled: !tracker.notification_enabled,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '更新通知设置失败')
      }

      // 更新本地状态
      setTrackers(trackers.map((t) =>
        t.id === tracker.id
          ? { ...t, notification_enabled: !t.notification_enabled }
          : t
      ))
    } catch (err) {
      console.error('更新通知设置失败:', err)
      alert(err instanceof Error ? err.message : '更新通知设置失败')
    }
  }

  // 删除追踪
  const deleteTracker = async (trackerId: string) => {
    if (!confirm('确定要取消追踪这个钱包吗？')) return

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      const res = await fetch(`/api/wallet/trackers/${trackerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '删除追踪失败')
      }

      // 更新本地状态
      setTrackers(trackers.filter((t) => t.id !== trackerId))
      alert('已取消追踪')
    } catch (err) {
      console.error('删除追踪失败:', err)
      alert(err instanceof Error ? err.message : '删除追踪失败')
    }
  }

  // 过滤追踪列表
  const filteredTrackers = trackers.filter((tracker) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      tracker.wallet_address.toLowerCase().includes(query) ||
      tracker.nickname?.toLowerCase().includes(query) ||
      tracker.notes?.toLowerCase().includes(query)
    )
  })

  if (!user) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            钱包追踪
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            追踪你感兴趣的钱包地址，获取实时通知
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加追踪
        </button>
      </div>

      {/* 搜索框 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索钱包地址、昵称或备注..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
                     bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 追踪列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredTrackers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow">
          <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery ? '未找到匹配的钱包' : '还没有追踪任何钱包'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery
              ? '试试其他搜索关键词'
              : '开始追踪你感兴趣的钱包地址，获取最新动态'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加第一个追踪
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrackers.map((tracker) => (
            <div
              key={tracker.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow hover:shadow-lg transition-shadow"
            >
              {/* 钱包信息 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  {tracker.nickname && (
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {tracker.nickname}
                    </h3>
                  )}
                  <Link
                    href={`/wallet/${tracker.wallet_address}`}
                    className="text-sm font-mono text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 truncate block"
                  >
                    {formatAddress(tracker.wallet_address)}
                  </Link>
                </div>
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0 ml-2" />
              </div>

              {/* 备注 */}
              {tracker.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {tracker.notes}
                </p>
              )}

              {/* 追踪信息 */}
              <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                追踪于 {new Date(tracker.tracked_at).toLocaleDateString('zh-CN')}
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleNotification(tracker)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                    tracker.notification_enabled
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                  title={tracker.notification_enabled ? '已开启通知' : '已关闭通知'}
                >
                  {tracker.notification_enabled ? (
                    <Bell className="w-4 h-4" />
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                  <span className="text-xs">通知</span>
                </button>

                <button
                  onClick={() => setEditingTracker(tracker)}
                  className="p-2 text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deleteTracker(tracker.id)}
                  className="p-2 text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <Link
                  href={`/wallet/${tracker.wallet_address}`}
                  className="p-2 text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title="查看详情"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加追踪模态框 */}
      {showAddModal && (
        <AddTrackerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchTrackers()
          }}
        />
      )}

      {/* 编辑追踪模态框 */}
      {editingTracker && (
        <EditTrackerModal
          tracker={editingTracker}
          onClose={() => setEditingTracker(null)}
          onSuccess={() => {
            setEditingTracker(null)
            fetchTrackers()
          }}
        />
      )}
    </div>
  )
}

/**
 * 添加追踪模态框
 */
function AddTrackerModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [address, setAddress] = useState('')
  const [nickname, setNickname] = useState('')
  const [notes, setNotes] = useState('')
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!address.trim()) {
      setError('请输入钱包地址')
      return
    }

    try {
      setSubmitting(true)
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      const res = await fetch('/api/wallet/trackers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          wallet_address: address.trim(),
          nickname: nickname.trim() || null,
          notes: notes.trim() || null,
          notification_enabled: notificationEnabled,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '添加追踪失败')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加追踪失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          添加钱包追踪
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 钱包地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              钱包地址 *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
                       bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 昵称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              昵称（可选）
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="给这个钱包起个名字"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
                       bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              备注（可选）
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加一些备注信息..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
                       bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 通知开关 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notification"
              checked={notificationEnabled}
              onChange={(e) => setNotificationEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="notification" className="text-sm text-gray-700 dark:text-gray-300">
              开启通知（钱包有新交易时通知我）
            </label>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? '添加中...' : '添加追踪'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * 编辑追踪模态框
 */
function EditTrackerModal({
  tracker,
  onClose,
  onSuccess,
}: {
  tracker: WalletTracker
  onClose: () => void
  onSuccess: () => void
}) {
  const [nickname, setNickname] = useState(tracker.nickname || '')
  const [notes, setNotes] = useState(tracker.notes || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      setSubmitting(true)
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      const res = await fetch(`/api/wallet/trackers/${tracker.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          nickname: nickname.trim() || null,
          notes: notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '更新追踪失败')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新追踪失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          编辑钱包追踪
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 钱包地址（只读） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              钱包地址
            </label>
            <input
              type="text"
              value={tracker.wallet_address}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
                       bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* 昵称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="给这个钱包起个名字"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
                       bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              备注
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加一些备注信息..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
                       bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? '保存中...' : '保存更改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
