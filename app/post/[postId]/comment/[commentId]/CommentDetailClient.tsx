'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import { Post, Comment } from '@/types/database'
import { useAuth } from '@/app/providers/AuthProvider'
import Avatar from '@/components/Avatar'
import CommentInput from '@/components/CommentInput'
import Breadcrumb from '@/components/Breadcrumb'
import { formatRelativeTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { renderText } from '@/lib/textParser'
import SwipeablePageTransition from '@/components/SwipeablePageTransition'

interface CommentDetailClientProps {
  post: Post
  comment: Comment
  initialReplies: Comment[]
}

export default function CommentDetailClient({
  post,
  comment: initialComment,
  initialReplies,
}: CommentDetailClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [comment] = useState(initialComment)
  const [replies, setReplies] = useState(initialReplies)
  const [showFullPost, setShowFullPost] = useState(false)

  // 提交回复
  const handleSubmitReply = async (content: string) => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`/api/comments/${comment.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({ content }),
      })

      const data = await response.json()

      if (response.ok) {
        // 添加新回复到列表
        setReplies(prev => [...prev, data.reply])
      } else {
        throw new Error(data.error || '回复失败')
      }
    } catch (error) {
      console.error('提交回复失败:', error)
      throw error
    }
  }

  return (
    <SwipeablePageTransition enableSwipeBack={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto bg-white min-h-screen">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="p-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition mb-2"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <Breadcrumb
              items={[
                { label: '动态', href: `/post/${post.id}` },
                { label: `@${comment.user?.username || '未知用户'} 的评论`, href: '' }
              ]}
            />
          </div>
        </div>

        {/* 原动态（折叠显示） */}
        <div className="border-b border-gray-100 p-4 bg-gray-50">
          <div className="flex items-start space-x-3">
            <Link
              href={`/profile/${post.user?.username || 'unknown'}`}
              className="flex-shrink-0"
            >
              <Avatar
                username={post.user?.username}
                avatarUrl={post.user?.avatar_url}
                avatarTemplate={post.user?.avatar_template}
                size="sm"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/profile/${post.user?.username || 'unknown'}`}
                className="font-semibold text-sm text-gray-900 hover:text-blue-500 transition"
              >
                @{post.user?.username || '未知用户'}
              </Link>
              <div className={`mt-1 ${!showFullPost && 'line-clamp-3'}`}>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {renderText(post.content)}
                </p>
              </div>
              {post.content.length > 100 && (
                <button
                  onClick={() => setShowFullPost(!showFullPost)}
                  className="text-blue-500 text-sm mt-1 hover:text-blue-600 transition"
                >
                  {showFullPost ? '收起' : '查看完整动态'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 当前评论（完整显示） */}
        <div className="border-b border-gray-200 p-4 bg-white">
          <div className="flex space-x-3">
            <Link
              href={`/profile/${comment.user?.username || 'unknown'}`}
              className="flex-shrink-0"
            >
              <Avatar
                username={comment.user?.username}
                avatarUrl={comment.user?.avatar_url}
                avatarTemplate={comment.user?.avatar_template}
                size="md"
              />
            </Link>

            <div className="flex-1 min-w-0">
              {/* 用户名和时间 */}
              <div className="flex items-center space-x-2 mb-2">
                <Link
                  href={`/profile/${comment.user?.username || 'unknown'}`}
                  className="font-semibold text-gray-900 hover:text-blue-500 transition"
                >
                  @{comment.user?.username || '未知用户'}
                </Link>
                <span className="text-gray-400 text-xs">·</span>
                <span className="text-gray-500 text-xs" suppressHydrationWarning>
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>

              {/* 评论内容 */}
              <p className="text-gray-800 text-base whitespace-pre-wrap break-words leading-relaxed mb-3">
                {renderText(comment.content)}
              </p>

              {/* 互动统计 */}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{comment.reply_count} 条回复</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 回复输入框 */}
        <div className="border-b border-gray-100">
          <CommentInput
            onSubmit={handleSubmitReply}
            placeholder={`回复 @${comment.user?.username || '未知用户'}...`}
            initialValue={`@${comment.user?.username || '未知用户'} `}
          />
        </div>

        {/* 回复列表 */}
        <div className="border-t border-gray-100">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              回复 {replies.length > 0 ? `(${replies.length})` : ''}
            </h2>
          </div>

          {replies.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">还没有回复</p>
              <p className="text-gray-400 text-xs mt-1">快来发表第一条回复吧</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {replies.map((reply) => {
                const hasNestedReplies = reply.reply_count > 0

                return (
                  <div
                    key={reply.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex space-x-3">
                      {/* 头像 */}
                      <Link
                        href={`/profile/${reply.user?.username || 'unknown'}`}
                        className="flex-shrink-0"
                      >
                        <Avatar
                          username={reply.user?.username}
                          avatarUrl={reply.user?.avatar_url}
                          avatarTemplate={reply.user?.avatar_template}
                          size="md"
                          className="hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition"
                        />
                      </Link>

                      {/* 回复内容 */}
                      <div className="flex-1 min-w-0">
                        {/* 用户名和时间 */}
                        <div className="flex items-center space-x-2 mb-1">
                          <Link
                            href={`/profile/${reply.user?.username || 'unknown'}`}
                            className="font-semibold text-sm text-gray-900 hover:text-blue-500 transition"
                          >
                            @{reply.user?.username || '未知用户'}
                          </Link>
                          <span className="text-gray-400 text-xs">·</span>
                          <span className="text-gray-500 text-xs" suppressHydrationWarning>
                            {formatRelativeTime(reply.created_at)}
                          </span>
                        </div>

                        {/* 回复文本 */}
                        <p className="text-gray-800 text-sm whitespace-pre-wrap break-words leading-relaxed mb-2">
                          {renderText(reply.content)}
                        </p>

                        {/* 互动按钮 */}
                        <div className="flex items-center space-x-6 text-xs text-gray-500">
                          {/* 嵌套回复链接 */}
                          {hasNestedReplies ? (
                            <Link
                              href={`/post/${post.id}/comment/${reply.id}`}
                              className="flex items-center space-x-1 hover:text-blue-500 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>{reply.reply_count} 条回复</span>
                              <span className="ml-1">→</span>
                            </Link>
                          ) : (
                            <Link
                              href={`/post/${post.id}/comment/${reply.id}`}
                              className="flex items-center space-x-1 hover:text-blue-500 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>回复</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    </SwipeablePageTransition>
  )
}
