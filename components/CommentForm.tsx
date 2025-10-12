'use client'

import { useState } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { Send } from 'lucide-react'
import Avatar from '@/components/Avatar'

interface CommentFormProps {
  postId: string
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
}

export default function CommentForm({
  onSubmit,
  placeholder = '写下你的评论...'
}: CommentFormProps) {
  const { user, profile } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isValid = content.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValid || loading || !user) return

    setLoading(true)
    setError('')

    try {
      await onSubmit(content.trim())
      setContent('') // 清空输入框
    } catch (err) {
      console.error('发布评论失败:', err)
      setError('发布失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500 text-sm">
          请先
          <a href="/login" className="text-blue-500 hover:text-blue-600 font-medium mx-1 transition">
            登录
          </a>
          后评论
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* 输入框 */}
        <div className="flex space-x-3">
          {/* 用户头像 */}
          <Avatar
            username={profile?.username}
            avatarUrl={profile?.avatar_url}
            size="sm"
            className="flex-shrink-0"
          />

          {/* 文本输入 */}
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              disabled={loading}
              className={`w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
              }`}
              rows={2}
            />
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="ml-11 p-2 bg-red-50 border border-red-200 rounded-lg animate-slide-up">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 发布按钮 */}
        <div className="flex justify-end ml-11">
          <button
            type="submit"
            disabled={!isValid || loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              !isValid || loading
                ? 'bg-blue-300 text-white cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95 shadow-sm hover:shadow'
            }`}
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                <span>发布中...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>发布评论</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
