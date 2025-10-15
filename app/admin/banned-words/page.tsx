'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  AlertTriangle,
  Search,
  Plus,
  X,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { BannedWord, BannedWordSeverity, BannedWordCategory } from '@/types/database'

type SeverityFilter = BannedWordSeverity | 'all'
type CategoryFilter = BannedWordCategory | 'all'
type ActiveFilter = 'all' | 'active' | 'inactive'

export default function BannedWordsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [bannedWords, setBannedWords] = useState<BannedWord[]>([])
  const [filteredWords, setFilteredWords] = useState<BannedWord[]>([])

  // 筛选状态
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 分页
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // 模态框
  const [showModal, setShowModal] = useState(false)
  const [editingWord, setEditingWord] = useState<BannedWord | null>(null)

  // 表单
  const [wordForm, setWordForm] = useState({
    word: '',
    severity: 'medium' as BannedWordSeverity,
    category: 'profanity' as BannedWordCategory,
    replacement: '',
    is_regex: false,
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // 获取敏感词列表
  const fetchBannedWords = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (severityFilter !== 'all') params.append('severity', severityFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (activeFilter !== 'all') params.append('active', activeFilter === 'active' ? 'true' : 'false')

      const response = await fetch(`/api/admin/banned-words?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '获取敏感词列表失败')
      }

      setBannedWords(result.words)
      setFilteredWords(result.words)
      setTotal(result.pagination.total)
      setTotalPages(result.pagination.totalPages)
    } catch (error) {
      console.error('获取敏感词列表错误:', error)
      alert(error instanceof Error ? error.message : '获取敏感词列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBannedWords()
  }, [severityFilter, categoryFilter, activeFilter, page])

  // 搜索过滤
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredWords(bannedWords)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = bannedWords.filter(
      (word) =>
        word.word.toLowerCase().includes(query) ||
        (word.replacement && word.replacement.toLowerCase().includes(query))
    )
    setFilteredWords(filtered)
  }, [searchQuery, bannedWords])

  // 打开新建模态框
  const handleOpenCreateModal = () => {
    setEditingWord(null)
    setWordForm({
      word: '',
      severity: 'medium',
      category: 'profanity',
      replacement: '',
      is_regex: false,
    })
    setFormError('')
    setShowModal(true)
  }

  // 打开编辑模态框
  const handleOpenEditModal = (word: BannedWord) => {
    setEditingWord(word)
    setWordForm({
      word: word.word,
      severity: word.severity,
      category: word.category,
      replacement: word.replacement || '',
      is_regex: word.is_regex,
    })
    setFormError('')
    setShowModal(true)
  }

  // 提交表单（创建或更新）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setFormError('请先登录')
        return
      }

      const payload = {
        word: wordForm.word.trim(),
        severity: wordForm.severity,
        category: wordForm.category,
        replacement: wordForm.replacement.trim() || undefined,
        is_regex: wordForm.is_regex,
      }

      let response
      if (editingWord) {
        // 更新
        response = await fetch(`/api/admin/banned-words/${editingWord.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        })
      } else {
        // 创建
        response = await fetch('/api/admin/banned-words', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        })
      }

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || (editingWord ? '更新敏感词失败' : '添加敏感词失败'))
      }

      setShowModal(false)
      fetchBannedWords()
    } catch (error) {
      console.error('提交表单错误:', error)
      setFormError(error instanceof Error ? error.message : '操作失败')
    } finally {
      setFormLoading(false)
    }
  }

  // 删除敏感词
  const handleDelete = async (wordId: string) => {
    if (!confirm('确定要删除此敏感词吗？此操作不可恢复。')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('请先登录')
        return
      }

      const response = await fetch(`/api/admin/banned-words/${wordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '删除敏感词失败')
      }

      fetchBannedWords()
    } catch (error) {
      console.error('删除敏感词错误:', error)
      alert(error instanceof Error ? error.message : '删除敏感词失败')
    }
  }

  // 切换启用状态
  const handleToggleActive = async (word: BannedWord) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('请先登录')
        return
      }

      const response = await fetch(`/api/admin/banned-words/${word.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ is_active: !word.is_active }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '更新状态失败')
      }

      fetchBannedWords()
    } catch (error) {
      console.error('切换状态错误:', error)
      alert(error instanceof Error ? error.message : '更新状态失败')
    }
  }

  // 获取严重程度标签样式
  const getSeverityBadge = (severity: BannedWordSeverity) => {
    const styles = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    }
    const labels = {
      low: '低',
      medium: '中',
      high: '高',
      critical: '严重',
    }
    return { style: styles[severity], label: labels[severity] }
  }

  // 获取分类标签
  const getCategoryLabel = (category: BannedWordCategory) => {
    const labels = {
      profanity: '脏话',
      hate_speech: '仇恨言论',
      spam: '垃圾信息',
      violence: '暴力',
      other: '其他',
    }
    return labels[category]
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
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
                <h1 className="text-3xl font-bold text-gray-900">敏感词管理</h1>
                <p className="text-gray-600 mt-1">管理系统敏感词库和内容过滤规则</p>
              </div>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>添加敏感词</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="space-y-4">
            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">严重程度</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'low', 'medium', 'high', 'critical'] as const).map((severity) => (
                  <button
                    key={severity}
                    onClick={() => {
                      setSeverityFilter(severity)
                      setPage(1)
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      severityFilter === severity
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {severity === 'all' && '全部'}
                    {severity === 'low' && '低'}
                    {severity === 'medium' && '中'}
                    {severity === 'high' && '高'}
                    {severity === 'critical' && '严重'}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'profanity', 'hate_speech', 'spam', 'violence', 'other'] as const).map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setCategoryFilter(category)
                      setPage(1)
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      categoryFilter === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category === 'all' && '全部'}
                    {category === 'profanity' && '脏话'}
                    {category === 'hate_speech' && '仇恨言论'}
                    {category === 'spam' && '垃圾信息'}
                    {category === 'violence' && '暴力'}
                    {category === 'other' && '其他'}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Filter & Search */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-2">
                {(['all', 'active', 'inactive'] as ActiveFilter[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setActiveFilter(status)
                      setPage(1)
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' && '全部'}
                    {status === 'active' && '启用'}
                    {status === 'inactive' && '禁用'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索敏感词..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-80"
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              共 <span className="font-semibold text-gray-900">{total}</span> 条敏感词记录
            </p>
          </div>
        </div>

        {/* Banned Words List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">暂无敏感词记录</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      敏感词
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      严重程度
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分类
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      替换词
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      正则
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWords.map((word) => {
                    const severityBadge = getSeverityBadge(word.severity)
                    return (
                      <tr key={word.id} className="hover:bg-gray-50 transition-colors">
                        {/* 敏感词 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{word.word}</div>
                        </td>

                        {/* 严重程度 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityBadge.style}`}
                          >
                            {severityBadge.label}
                          </span>
                        </td>

                        {/* 分类 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {getCategoryLabel(word.category)}
                          </span>
                        </td>

                        {/* 替换词 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500">
                            {word.replacement || '-'}
                          </span>
                        </td>

                        {/* 正则 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {word.is_regex ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                          )}
                        </td>

                        {/* 状态 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(word)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                              word.is_active
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {word.is_active ? '启用' : '禁用'}
                          </button>
                        </td>

                        {/* 操作 */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              onClick={() => handleOpenEditModal(word)}
                              className="text-blue-600 hover:text-blue-900"
                              title="编辑"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(word.id)}
                              className="text-red-600 hover:text-red-900"
                              title="删除"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingWord ? '编辑敏感词' : '添加敏感词'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setFormError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 敏感词 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  敏感词 *
                </label>
                <input
                  type="text"
                  value={wordForm.word}
                  onChange={(e) => setWordForm({ ...wordForm, word: e.target.value })}
                  placeholder="输入敏感词或正则表达式"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* 严重程度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  严重程度 *
                </label>
                <select
                  value={wordForm.severity}
                  onChange={(e) => setWordForm({ ...wordForm, severity: e.target.value as BannedWordSeverity })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="critical">严重</option>
                </select>
              </div>

              {/* 分类 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类 *
                </label>
                <select
                  value={wordForm.category}
                  onChange={(e) => setWordForm({ ...wordForm, category: e.target.value as BannedWordCategory })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="profanity">脏话</option>
                  <option value="hate_speech">仇恨言论</option>
                  <option value="spam">垃圾信息</option>
                  <option value="violence">暴力</option>
                  <option value="other">其他</option>
                </select>
              </div>

              {/* 替换词 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  替换词（可选）
                </label>
                <input
                  type="text"
                  value={wordForm.replacement}
                  onChange={(e) => setWordForm({ ...wordForm, replacement: e.target.value })}
                  placeholder="例如：***"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  留空则直接拒绝包含敏感词的内容
                </p>
              </div>

              {/* 是否正则 */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={wordForm.is_regex}
                    onChange={(e) => setWordForm({ ...wordForm, is_regex: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">使用正则表达式</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  启用后，敏感词将作为正则表达式进行匹配
                </p>
              </div>

              {/* Error */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{formError}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormError('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {formLoading ? '处理中...' : editingWord ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
