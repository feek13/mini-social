'use client'

import { useState, useEffect } from 'react'
import { X, Repeat2 } from 'lucide-react'
import { Post } from '@/types/database'
import Avatar from '@/components/Avatar'
import { formatRelativeTime } from '@/lib/utils'

interface RepostDialogProps {
  post: Post
  isOpen: boolean
  onClose: () => void
  onRepost: (comment?: string) => Promise<void>
}

export default function RepostDialog({ post, isOpen, onClose, onRepost }: RepostDialogProps) {
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 重置状态当对话框关闭
  useEffect(() => {
    if (!isOpen) {
      setComment('')
      setIsSubmitting(false)
    }
  }, [isOpen])

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const handleSubmit = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await onRepost(comment.trim() || undefined)
      onClose()
    } catch (error) {
      console.error('转发失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  // 使用原动态（如果当前是转发）或当前动态
  const originalPost = post.is_repost && post.original_post ? post.original_post : post

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">转发动态</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 转发评论输入框 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              添加评论（可选）
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="说点什么..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              rows={3}
              maxLength={280}
              disabled={isSubmitting}
            />
            <div className="flex justify-end mt-2">
              <span className="text-xs text-gray-400">
                {comment.length}/280
              </span>
            </div>
          </div>

          {/* 原动态预览 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              原动态预览
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              {/* 用户信息 */}
              <div className="flex items-start space-x-3 mb-3">
                <Avatar
                  username={originalPost.user?.username}
                  avatarUrl={originalPost.user?.avatar_url}
                  avatarTemplate={originalPost.user?.avatar_template}
                  size="sm"
                  className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-gray-900 truncate">
                      {originalPost.user?.username || '未知用户'}
                    </span>
                    <span className="text-gray-400 text-xs">·</span>
                    <span className="text-gray-500 text-xs" suppressHydrationWarning>
                      {formatRelativeTime(originalPost.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 动态内容 */}
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                {originalPost.content}
              </p>

              {/* 互动数据 */}
              <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                <span>❤️ {originalPost.likes_count || 0}</span>
                <span>💬 {originalPost.comments_count || 0}</span>
                <span>🔄 {originalPost.repost_count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Repeat2 className="w-4 h-4" />
            <span>{isSubmitting ? '转发中...' : '转发'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
