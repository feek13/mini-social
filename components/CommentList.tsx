'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, MessageSquare } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { Comment } from '@/types/database'
import Avatar from '@/components/Avatar'
import { formatRelativeTime } from '@/lib/utils'

interface CommentListProps {
  comments: Comment[]
  onDelete?: (commentId: string) => Promise<void>
  loading?: boolean
}

export default function CommentList({
  comments,
  onDelete,
  loading = false,
}: CommentListProps) {
  const { user } = useAuth()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (commentId: string) => {
    if (!onDelete || !confirm('确定要删除这条评论吗？')) return

    setDeletingId(commentId)
    try {
      await onDelete(commentId)
    } catch (error) {
      console.error('删除评论失败:', error)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">还没有评论，来发表第一条评论吧！</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const isOwner = user?.id === comment.user_id

        return (
          <div
            key={comment.id}
            className="flex space-x-3 group animate-fade-in"
          >
            {/* 头像 */}
            <Link
              href={`/profile/${comment.user?.username || 'unknown'}`}
              className="flex-shrink-0"
            >
              <Avatar
                username={comment.user?.username}
                avatarUrl={comment.user?.avatar_url}
                avatarTemplate={comment.user?.avatar_template}
                size="sm"
                className="hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition"
              />
            </Link>

            {/* 评论内容 */}
            <div className="flex-1 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* 用户名和时间 */}
                  <div className="flex items-center space-x-2 mb-1">
                    <Link
                      href={`/profile/${comment.user?.username || 'unknown'}`}
                      className="font-semibold text-sm text-gray-900 truncate hover:text-blue-500 transition"
                    >
                      {comment.user?.username || '未知用户'}
                    </Link>
                    <span className="text-gray-400 text-xs flex-shrink-0">·</span>
                    <span className="text-gray-500 text-xs flex-shrink-0">
                      {formatRelativeTime(comment.created_at)}
                    </span>
                  </div>

                  {/* 评论文本 */}
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                    {comment.content}
                  </p>
                </div>

                {/* 删除按钮（仅所有者可见） */}
                {isOwner && onDelete && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all p-1.5 rounded-full opacity-0 group-hover:opacity-100 active:scale-95 flex-shrink-0"
                    title="删除评论"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
