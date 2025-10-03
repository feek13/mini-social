'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle } from 'lucide-react'
import { Comment } from '@/types/database'
import Avatar from '@/components/Avatar'
import { formatRelativeTime } from '@/lib/utils'
import { renderText } from '@/lib/textParser'

interface PostCommentListProps {
  comments: Comment[]
  postId: string
  loading?: boolean
}

export default function PostCommentList({
  comments,
  postId,
  loading = false,
}: PostCommentListProps) {
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())

  const handleLikeComment = (commentId: string) => {
    setLikedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">还没有评论</p>
        <p className="text-gray-400 text-xs mt-1">快来发表第一条评论吧</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {comments.map((comment) => {
        const isLiked = likedComments.has(comment.id)
        const hasReplies = comment.reply_count > 0

        return (
          <div
            key={comment.id}
            onClick={() => window.location.href = `/post/${postId}/comment/${comment.id}`}
            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex space-x-3">
              {/* 头像 */}
              <Link
                href={`/profile/${comment.user?.username || 'unknown'}`}
                className="flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar
                  username={comment.user?.username}
                  avatarUrl={comment.user?.avatar_url}
                  avatarTemplate={comment.user?.avatar_template}
                  size="md"
                  className="hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition"
                />
              </Link>

              {/* 评论内容 */}
              <div className="flex-1 min-w-0">
                {/* 用户名和时间 */}
                <div className="flex items-center space-x-2 mb-1">
                  <Link
                    href={`/profile/${comment.user?.username || 'unknown'}`}
                    className="font-semibold text-sm text-gray-900 hover:text-blue-500 transition"
                    onClick={(e) => e.stopPropagation()}
                  >
                    @{comment.user?.username || '未知用户'}
                  </Link>
                  <span className="text-gray-400 text-xs">·</span>
                  <span className="text-gray-500 text-xs" suppressHydrationWarning>
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>

                {/* 评论文本 */}
                <div className="mb-2">
                  <p className="text-gray-800 text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {renderText(comment.content)}
                  </p>
                </div>

                {/* 互动按钮 */}
                <div className="flex items-center space-x-6 text-xs text-gray-500">
                  {/* 点赞 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLikeComment(comment.id)
                    }}
                    className={`flex items-center space-x-1 transition-colors ${
                      isLiked ? 'text-red-500' : 'hover:text-red-500'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`}
                    />
                    <span>{isLiked ? 1 : 0}</span>
                  </button>

                  {/* 回复数和链接 */}
                  <Link
                    href={`/post/${postId}/comment/${comment.id}`}
                    className="flex items-center space-x-1 hover:text-blue-500 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{comment.reply_count || 0}</span>
                    <span>回复</span>
                    {hasReplies && <span className="ml-1">→</span>}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
