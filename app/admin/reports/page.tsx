'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flag, Search, Filter, X, Eye, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { ReportStatus, ReportType, ReportReason } from '@/types/database'

interface Report {
  id: string
  report_type: ReportType
  reason: ReportReason
  description: string | null
  status: ReportStatus
  created_at: string
  reporter: {
    id: string
    username: string
  }
  reported_post_id: string | null
  reported_comment_id: string | null
  reported_user_id: string | null
  reported_message_id: string | null
}

const REPORT_TYPES: { value: ReportType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'post', label: '动态' },
  { value: 'comment', label: '评论' },
  { value: 'user', label: '用户' },
  { value: 'message', label: '消息' },
]

const REPORT_STATUSES: { value: ReportStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: '全部状态', color: 'gray' },
  { value: 'pending', label: '待处理', color: 'orange' },
  { value: 'reviewing', label: '审核中', color: 'blue' },
  { value: 'resolved', label: '已解决', color: 'green' },
  { value: 'dismissed', label: '已驳回', color: 'gray' },
]

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: '垃圾信息' },
  { value: 'harassment', label: '骚扰' },
  { value: 'hate_speech', label: '仇恨言论' },
  { value: 'violence', label: '暴力内容' },
  { value: 'nudity', label: '色情内容' },
  { value: 'misinformation', label: '虚假信息' },
  { value: 'copyright', label: '版权侵犯' },
  { value: 'other', label: '其他' },
]

export default function ReportsManagementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending')
  const [searchQuery, setSearchQuery] = useState('')

  // Selected report for detail view
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const reportId = searchParams.get('id')
    if (reportId && reports.length > 0) {
      const report = reports.find(r => r.id === reportId)
      if (report) {
        setSelectedReport(report)
      }
    }
  }, [searchParams, reports])

  useEffect(() => {
    fetchReports()
  }, [typeFilter, statusFilter])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        router.push('/')
        return
      }

      // Build query params
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/admin/reports?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '获取举报列表失败')
      }

      setReports(result.reports || [])
    } catch (err) {
      console.error('获取举报列表错误:', err)
      setError(err instanceof Error ? err.message : '获取举报列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (reportId: string, newStatus: ReportStatus) => {
    try {
      setProcessing(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          resolution_note: actionNote || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '操作失败')
      }

      // Update local state
      setReports(prev =>
        prev.map(r => (r.id === reportId ? { ...r, status: newStatus } : r))
      )

      setSelectedReport(null)
      setActionNote('')
      alert('操作成功')
      fetchReports()
    } catch (err) {
      console.error('处理举报错误:', err)
      alert(err instanceof Error ? err.message : '操作失败')
    } finally {
      setProcessing(false)
    }
  }

  const filteredReports = reports.filter((report) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        report.reporter.username.toLowerCase().includes(query) ||
        report.reason.toLowerCase().includes(query) ||
        report.description?.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">请先登录</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-700 mb-2"
          >
            ← 返回管理后台
          </button>
          <h1 className="text-3xl font-bold text-gray-900">举报管理</h1>
          <p className="text-gray-600 mt-1">查看和处理用户举报</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索举报人、原因..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ReportType | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REPORT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REPORT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600 mt-4">加载中...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <Flag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">没有找到举报记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">类型</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">原因</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">举报人</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">状态</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">时间</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {REPORT_TYPES.find(t => t.value === report.report_type)?.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {REPORT_REASONS.find(r => r.value === report.reason)?.label}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">{report.reporter.username}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            REPORT_STATUSES.find(s => s.value === report.status)?.color === 'orange'
                              ? 'bg-orange-100 text-orange-700'
                              : REPORT_STATUSES.find(s => s.value === report.status)?.color === 'blue'
                              ? 'bg-blue-100 text-blue-700'
                              : REPORT_STATUSES.find(s => s.value === report.status)?.color === 'green'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {REPORT_STATUSES.find(s => s.value === report.status)?.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>查看</span>
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

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">举报详情</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">举报类型</label>
                <p className="mt-1 text-gray-900">
                  {REPORT_TYPES.find(t => t.value === selectedReport.report_type)?.label}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">举报原因</label>
                <p className="mt-1 text-gray-900">
                  {REPORT_REASONS.find(r => r.value === selectedReport.reason)?.label}
                </p>
              </div>

              {selectedReport.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">详细说明</label>
                  <p className="mt-1 text-gray-700 bg-gray-50 rounded-lg p-3">
                    {selectedReport.description}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">举报人</label>
                <p className="mt-1 text-gray-900">{selectedReport.reporter.username}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">当前状态</label>
                <p className="mt-1">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedReport.status === 'pending'
                        ? 'bg-orange-100 text-orange-700'
                        : selectedReport.status === 'reviewing'
                        ? 'bg-blue-100 text-blue-700'
                        : selectedReport.status === 'resolved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {REPORT_STATUSES.find(s => s.value === selectedReport.status)?.label}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">处理备注（可选）</label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="记录处理结果或原因..."
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            {selectedReport.status === 'pending' && (
              <div className="p-6 border-t border-gray-200 flex space-x-3">
                <button
                  onClick={() => handleAction(selectedReport.id, 'reviewing')}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>{processing ? '处理中...' : '开始审核'}</span>
                </button>
              </div>
            )}

            {selectedReport.status === 'reviewing' && (
              <div className="p-6 border-t border-gray-200 flex space-x-3">
                <button
                  onClick={() => handleAction(selectedReport.id, 'resolved')}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{processing ? '处理中...' : '确认解决'}</span>
                </button>
                <button
                  onClick={() => handleAction(selectedReport.id, 'dismissed')}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{processing ? '处理中...' : '驳回举报'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
