'use client'

import { useState, memo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Trash2, Send, Repeat2, Link as LinkIcon } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { Post } from '@/types/database'
import Avatar from '@/components/Avatar'
import ImageViewer from '@/components/ImageViewer'
import RepostDialog from '@/components/RepostDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import DeFiEmbedPreview from '@/components/defi/DeFiEmbedPreview'
import { formatRelativeTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { renderText } from '@/lib/textParser'
import { useRouter } from 'next/navigation'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  user?: {
    username: string
    avatar_url?: string
    avatar_template?: string
  }
}

interface PostCardProps {
  post: Post
  onLike?: (postId: string) => void
  onUnlike?: (postId: string) => void
  onDelete?: (postId: string) => void
  onRepost?: (postId: string, newRepostCount: number) => void
  isLiked?: boolean
  hasReposted?: boolean
  commentsCount?: number
}

const PostCard = memo(function PostCard({
  post,
  onLike,
  onUnlike,
  onDelete,
  onRepost,
  isLiked = false,
  hasReposted = false,
  commentsCount: initialCommentsCount = 0,
}: PostCardProps) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeleteCommentDialog, setShowDeleteCommentDialog] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [likeAnimating, setLikeAnimating] = useState(false)
  const [commentAnimating, setCommentAnimating] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount)
  const [commentContent, setCommentContent] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showRepostDialog, setShowRepostDialog] = useState(false)
  const [repostAnimating, setRepostAnimating] = useState(false)
  const [showRepostMenu, setShowRepostMenu] = useState(false)
  const [repostSuccess, setRepostSuccess] = useState(false)
  const [repostError, setRepostError] = useState('')
  const [isReposting, setIsReposting] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const repostMenuRef = useRef<HTMLDivElement>(null)
  const isOwner = user?.id === post.user_id

  // 确保在客户端环境
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 登录框显示时禁用页面滚动
  useEffect(() => {
    if (showLoginPrompt) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showLoginPrompt])

  // 获取原帖的作者 ID（如果是转发，取原帖作者；否则取当前帖子作者）
  const originalAuthorId = post.is_repost && post.original_post
    ? post.original_post.user_id
    : post.user_id

  // 判断是否可以转发（不能转发自己原创的帖子，但可以取消已转发的帖子）
  const canRepost = user && (hasReposted || user.id !== originalAuthorId)

  // 点击外部关闭转发菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (repostMenuRef.current && !repostMenuRef.current.contains(event.target as Node)) {
        setShowRepostMenu(false)
      }
    }

    if (showRepostMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showRepostMenu])

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!onDelete) return

    setIsDeleting(true)
    try {
      await onDelete(post.id)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('删除失败:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLike = () => {
    if (!user) return

    setLikeAnimating(true)
    setTimeout(() => setLikeAnimating(false), 600)

    if (isLiked && onUnlike) {
      onUnlike(post.id)
    } else if (onLike) {
      onLike(post.id)
    }
  }

  // 加载评论
  const loadComments = async () => {
    setLoadingComments(true)
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`)
      const data = await response.json()

      if (response.ok) {
        setComments(data.comments || [])
        setCommentsCount(data.comments?.length || 0)
      }
    } catch (error) {
      console.error('加载评论失败:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  // 切换评论显示
  const handleToggleComments = () => {
    const newShowComments = !showComments
    setShowComments(newShowComments)

    // 添加评论按钮动画
    setCommentAnimating(true)
    setTimeout(() => setCommentAnimating(false), 400)

    if (newShowComments && comments.length === 0) {
      loadComments()
    }
  }

  // 提交评论
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !commentContent.trim() || submittingComment) return

    setSubmittingComment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({ content: commentContent }),
      })

      const data = await response.json()

      if (response.ok) {
        setComments([...comments, data.comment])
        setCommentsCount(commentsCount + 1)
        setCommentContent('')
      } else {
        console.error('评论失败:', data.error)
      }
    } catch (error) {
      console.error('评论失败:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  // 删除评论
  const handleDeleteCommentClick = (commentId: string) => {
    setDeletingCommentId(commentId)
    setShowDeleteCommentDialog(true)
  }

  const handleConfirmDeleteComment = async () => {
    if (!deletingCommentId) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`/api/comments/${deletingCommentId}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      })

      if (response.ok) {
        setComments(comments.filter(c => c.id !== deletingCommentId))
        setCommentsCount(Math.max(0, commentsCount - 1))
        setShowDeleteCommentDialog(false)
        setDeletingCommentId(null)
      } else {
        const data = await response.json()
        console.error('删除失败:', data.error)
        setShowDeleteCommentDialog(false)
        setDeletingCommentId(null)
      }
    } catch (error) {
      console.error('删除评论失败:', error)
      setShowDeleteCommentDialog(false)
      setDeletingCommentId(null)
    }
  }

  // 转发处理
  const handleRepost = async (comment?: string) => {
    if (!user) {
      setShowLoginPrompt(true)
      return
    }

    if (isReposting) return

    setIsReposting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      // 使用原动态 ID（如果当前是转发）或当前动态 ID
      const postIdToRepost = post.is_repost && post.original_post_id
        ? post.original_post_id
        : post.id

      const response = await fetch(`/api/posts/${postIdToRepost}/repost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({ comment }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '转发失败')
      }

      // 动画效果
      setRepostAnimating(true)
      setTimeout(() => setRepostAnimating(false), 300)

      // 显示成功提示
      setRepostSuccess(true)
      setTimeout(() => setRepostSuccess(false), 2000)

      // 更新转发数
      if (onRepost && data.repostCount !== undefined) {
        onRepost(postIdToRepost, data.repostCount)
      }
    } catch (error) {
      console.error('转发失败:', error)
      const errorMessage = error instanceof Error ? error.message : '转发失败，请重试'
      setRepostError(errorMessage)
      setTimeout(() => setRepostError(''), 3000)
    } finally {
      setIsReposting(false)
    }
  }

  // 取消转发
  const handleCancelRepost = async () => {
    if (isReposting) return

    setIsReposting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const postIdToCancel = post.is_repost && post.original_post_id
        ? post.original_post_id
        : post.id

      const response = await fetch(`/api/posts/${postIdToCancel}/repost`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '取消转发失败')
      }

      // 更新转发数
      if (onRepost && data.repostCount !== undefined) {
        onRepost(postIdToCancel, data.repostCount)
      }
    } catch (error) {
      console.error('取消转发失败:', error)
      const errorMessage = error instanceof Error ? error.message : '取消转发失败，请重试'
      setRepostError(errorMessage)
      setTimeout(() => setRepostError(''), 3000)
    } finally {
      setIsReposting(false)
    }
  }

  // 直接转发（无评论）
  const handleDirectRepost = async () => {
    if (!user) {
      setShowLoginPrompt(true)
      return
    }

    setShowRepostMenu(false)
    await handleRepost()
  }

  // 点击转发按钮 - 立即转发或取消
  const handleRepostClick = () => {
    if (!user) {
      setShowLoginPrompt(true)
      return
    }

    if (hasReposted) {
      handleCancelRepost()
    } else {
      // 直接转发（不弹窗）
      handleDirectRepost()
    }
  }

  // 复制链接用于引用
  const handleCopyLink = () => {
    const postIdToShare = post.is_repost && post.original_post_id
      ? post.original_post_id
      : post.id

    const link = `${window.location.origin}/post/${postIdToShare}`
    navigator.clipboard.writeText(link)

    // 显示成功提示
    setRepostSuccess(true)
    setTimeout(() => setRepostSuccess(false), 2000)

    setShowRepostMenu(false)
  }

  // 右键点击转发按钮显示菜单
  const handleRepostContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user || !canRepost) return
    setShowRepostMenu(true)
  }

  // 点击卡片进入详情页
  const handleCardClick = (e: React.MouseEvent) => {
    // 如果点击的是按钮、链接或输入框，不触发跳转
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('textarea') ||
      target.closest('input')
    ) {
      return
    }

    // 跳转到详情页
    router.push(`/post/${post.id}`)
  }

  // 点击原帖区域跳转到原帖详情页
  const handleOriginalPostClick = (e: React.MouseEvent) => {
    // 如果点击的是链接，让链接自己处理跳转
    const target = e.target as HTMLElement
    if (target.closest('a')) {
      return
    }

    // 阻止事件冒泡到外层卡片
    e.stopPropagation()

    // 跳转到原帖详情页
    if (post.original_post_id) {
      router.push(`/post/${post.original_post_id}`)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md hover:border-gray-200 transition-all animate-fade-in-up cursor-pointer ${!showLoginPrompt ? 'hover-lift' : ''}`}
    >
      {/* 转发提示（如果是转发） */}
      {post.is_repost && (
        <div className="flex items-center space-x-2 mb-3 text-gray-500 text-sm">
          <Repeat2 className="w-4 h-4" />
          <Link
            href={`/profile/${post.user?.username || 'unknown'}`}
            className="font-medium hover:text-green-500 transition"
          >
            @{post.user?.username || '未知用户'}
          </Link>
          <span>转发了</span>
        </div>
      )}

      {/* 转发评论（如果有） */}
      {post.is_repost && post.repost_comment && (
        <Link
          href={`/post/${post.id}`}
          className="block mb-4 ml-0 sm:ml-[52px] cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-2 transition"
        >
          <p className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
            {renderText(post.repost_comment)}
          </p>
        </Link>
      )}

      {/* 如果是转发，显示原动态（嵌套卡片） */}
      {post.is_repost && post.original_post ? (
        <div
          onClick={handleOriginalPostClick}
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 cursor-pointer hover:bg-gray-100 transition"
        >
          {/* 原动态用户信息 */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <Link
                href={`/profile/${post.original_post.user?.username || 'unknown'}`}
                className="flex-shrink-0"
              >
                <Avatar
                  username={post.original_post.user?.username}
                  avatarUrl={post.original_post.user?.avatar_url}
                  avatarTemplate={post.original_post.user?.avatar_template}
                  size="sm"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/profile/${post.original_post.user?.username || 'unknown'}`}
                    className="font-semibold text-sm text-gray-900 truncate hover:text-blue-500 transition"
                  >
                    {post.original_post.user?.username || '未知用户'}
                  </Link>
                  <span className="text-gray-400 text-xs flex-shrink-0">·</span>
                  <span className="text-gray-500 text-xs flex-shrink-0" suppressHydrationWarning>
                    {formatRelativeTime(post.original_post.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 原动态内容 */}
          <div
            onClick={(e) => {
              // 如果点击的是链接，不要导航到动态详情页
              if ((e.target as HTMLElement).closest('a')) {
                return
              }
              router.push(`/post/${post.original_post_id}`)
            }}
            className="block mb-3 cursor-pointer hover:bg-white -mx-2 px-2 py-1 transition rounded"
          >
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
              {renderText(post.original_post.content)}
            </p>
          </div>

          {/* 原动态图片（如果有） */}
          {post.original_post.images && post.original_post.images.length > 0 && (
            <div className="mb-3">
              <div className="grid grid-cols-2 gap-2">
                {post.original_post.images.slice(0, 4).map((img, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded overflow-hidden"
                  >
                    <Image
                      src={img}
                      alt={`图片 ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 原动态 DeFi 嵌入显示 */}
          {post.original_post.defi_embeds && post.original_post.defi_embeds.length > 0 && (
            <div className="mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {post.original_post.defi_embeds.map((embed: any, index: number) => (
                  <DeFiEmbedPreview
                    key={index}
                    embed={{
                      type: embed.embed_type,
                      referenceId: embed.reference_id,
                      snapshotData: embed.snapshot_data
                    }}
                    compact={true}
                    showLatestDataButton={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 原动态互动数据 */}
          <div className="flex items-center space-x-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
            <span>❤️ {post.original_post.likes_count || 0}</span>
            <span>💬 {post.original_post.comments_count || 0}</span>
            <span>🔄 {post.original_post.repost_count || 0}</span>
          </div>
        </div>
      ) : (
        <>
          {/* 普通动态：显示用户信息和内容 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              {/* 头像 */}
              <Link
                href={`/profile/${post.user?.username || 'unknown'}`}
                className="flex-shrink-0 group"
              >
                <Avatar
                  username={post.user?.username}
                  avatarUrl={post.user?.avatar_url}
                  avatarTemplate={post.user?.avatar_template}
                  size="md"
                  className="group-hover:ring-2 group-hover:ring-blue-500 group-hover:ring-offset-2 transition"
                />
              </Link>

              {/* 用户名和时间 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/profile/${post.user?.username || 'unknown'}`}
                    className="font-semibold text-gray-900 truncate hover:text-blue-500 transition"
                  >
                    {post.user?.username || '未知用户'}
                  </Link>
                  <span className="text-gray-400 text-sm flex-shrink-0">·</span>
                  <span className="text-gray-500 text-sm flex-shrink-0" suppressHydrationWarning>
                    {formatRelativeTime(post.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* 删除按钮（仅所有者可见） */}
            {isOwner && onDelete && (
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all p-2 rounded-full active:scale-95 flex-shrink-0"
                title="删除动态"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 内容 */}
          <div
            onClick={(e) => {
              // 如果点击的是链接，不要导航到动态详情页
              if ((e.target as HTMLElement).closest('a')) {
                return
              }
              router.push(`/post/${post.id}`)
            }}
            className="block mb-4 ml-0 sm:ml-[52px] cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-2 transition rounded"
          >
            <p className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
              {renderText(post.content)}
            </p>
          </div>
        </>
      )}

      {/* 图片展示 */}
      {post.images && post.images.length > 0 && (
        <div className="mb-4 ml-0 sm:ml-[52px]">
          {/* 根据图片数量显示不同布局 */}
          {post.images.length === 1 && (
            <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden cursor-pointer"
              onClick={() => {
                setSelectedImageIndex(0)
                setShowImageViewer(true)
              }}
            >
              <Image
                src={post.images[0]}
                alt="动态图片"
                fill
                className="object-cover hover:scale-105 transition-transform"
                unoptimized
              />
            </div>
          )}

          {post.images.length === 2 && (
            <div className="grid grid-cols-2 gap-2">
              {post.images.map((img, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedImageIndex(index)
                    setShowImageViewer(true)
                  }}
                >
                  <Image
                    src={img}
                    alt={`图片 ${index + 1}`}
                    fill
                    className="object-cover hover:scale-105 transition-transform"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}

          {post.images.length === 3 && (
            <div className="grid grid-cols-2 gap-2">
              <div
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                onClick={() => {
                  setSelectedImageIndex(0)
                  setShowImageViewer(true)
                }}
              >
                <Image
                  src={post.images[0]}
                  alt="图片 1"
                  fill
                  className="object-cover hover:scale-105 transition-transform"
                  unoptimized
                />
              </div>
              <div className="grid grid-rows-2 gap-2">
                {post.images.slice(1, 3).map((img, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => {
                      setSelectedImageIndex(index + 1)
                      setShowImageViewer(true)
                    }}
                  >
                    <Image
                      src={img}
                      alt={`图片 ${index + 2}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {post.images.length === 4 && (
            <div className="grid grid-cols-2 gap-2">
              {post.images.map((img, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedImageIndex(index)
                    setShowImageViewer(true)
                  }}
                >
                  <Image
                    src={img}
                    alt={`图片 ${index + 1}`}
                    fill
                    className="object-cover hover:scale-105 transition-transform"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}

          {post.images.length >= 5 && (
            <div className="grid grid-cols-3 gap-2">
              {post.images.slice(0, 9).map((img, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedImageIndex(index)
                    setShowImageViewer(true)
                  }}
                >
                  <Image
                    src={img}
                    alt={`图片 ${index + 1}`}
                    fill
                    className="object-cover hover:scale-105 transition-transform"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DeFi 嵌入显示 */}
      {post.defi_embeds && post.defi_embeds.length > 0 && (
        <div className="mb-4 ml-0 sm:ml-[52px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {post.defi_embeds.map((embed: any, index: number) => (
              <DeFiEmbedPreview
                key={index}
                embed={{
                  type: embed.embed_type,
                  referenceId: embed.reference_id,
                  snapshotData: embed.snapshot_data
                }}
                compact={true}
                showLatestDataButton={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* 未登录提示 */}
      {!user && (
        <div className="mb-3 ml-0 sm:ml-[52px] px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <a href="/login" className="font-semibold hover:underline">登录</a>
            {' '}或{' '}
            <a href="/signup" className="font-semibold hover:underline">注册</a>
            {' '}后即可点赞、评论和转发
          </p>
        </div>
      )}

      {/* 底部：互动按钮 */}
      <div className="flex items-center space-x-4 sm:space-x-8 pt-3 border-t border-gray-100 ml-0 sm:ml-[52px]">
        {/* 点赞按钮 */}
        <button
          onClick={handleLike}
          disabled={!user}
          className={`flex items-center space-x-2 transition-all group ${
            isLiked
              ? 'text-red-500'
              : 'text-gray-500 hover:text-red-500'
          } ${!user ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}
          title={user ? (isLiked ? '取消点赞' : '点赞') : '请先登录'}
        >
          <Heart
            className={`w-5 h-5 transition-all ${
              isLiked ? 'fill-current scale-110' : 'group-hover:scale-110 group-hover:fill-current group-hover:fill-opacity-20'
            } ${likeAnimating ? 'animate-like-burst' : ''}`}
          />
          <span className="text-sm font-medium tabular-nums transition-smooth">
            {post.likes_count || 0}
          </span>
        </button>

        {/* 评论按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (!user) {
              setShowLoginPrompt(true)
            } else {
              router.push(`/post/${post.id}`)
            }
          }}
          className="flex items-center space-x-2 transition-all group text-gray-500 hover:text-blue-500 active:scale-95"
          title={user ? "查看评论" : "登录后查看评论"}
        >
          <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="text-sm font-medium tabular-nums">{post.comments_count || 0}</span>
        </button>

        {/* 转发按钮 */}
        <div className="relative" ref={repostMenuRef}>
          <button
            onClick={handleRepostClick}
            onContextMenu={handleRepostContextMenu}
            disabled={!canRepost || isReposting}
            className={`flex items-center space-x-2 transition-all group ${
              hasReposted
                ? 'text-green-500'
                : 'text-gray-500 hover:text-green-500'
            } ${!canRepost || isReposting ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}
            title={
              !user ? '请先登录' :
              hasReposted ? '左键取消转发 | 右键复制链接' :
              user.id === originalAuthorId ? '不能转发自己的动态' :
              '左键转发 | 右键复制链接引用'
            }
          >
            <Repeat2
              className={`w-5 h-5 transition-all ${
                hasReposted ? 'scale-110' : 'group-hover:scale-110'
              } ${repostAnimating ? 'animate-repost-spin' : ''}`}
            />
            <span className="text-sm font-medium tabular-nums transition-smooth">
              {post.repost_count || 0}
            </span>
          </button>

          {/* 转发成功提示 */}
          {repostSuccess && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-full shadow-lg z-50 animate-slide-up whitespace-nowrap">
              {hasReposted ? '链接已复制' : '已转发到你的主页'}
            </div>
          )}

          {/* 转发错误提示 */}
          {repostError && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-full shadow-lg z-50 animate-slide-up whitespace-nowrap">
              {repostError}
            </div>
          )}

          {/* 右键菜单 */}
          {showRepostMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 min-w-[160px] z-50 animate-scale-in">
              {!hasReposted && (
                <button
                  onClick={handleDirectRepost}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition flex items-center space-x-3"
                >
                  <Repeat2 className="w-4 h-4 text-green-500" />
                  <span className="font-medium">转发</span>
                </button>
              )}
              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition flex items-center space-x-3"
              >
                <LinkIcon className="w-4 h-4 text-blue-500" />
                <span className="font-medium">复制链接引用</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 评论区域 */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100 ml-0 sm:ml-[52px] space-y-4">
          {/* 评论输入框 */}
          {user && (
            <form onSubmit={handleSubmitComment} className="flex items-start space-x-3">
              <Avatar
                username={profile?.username || user.email?.split('@')[0]}
                avatarUrl={profile?.avatar_url}
                avatarTemplate={profile?.avatar_template}
                size="sm"
                className="flex-shrink-0 mt-1"
              />
              <div className="flex-1">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="写下你的评论..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  maxLength={280}
                  disabled={submittingComment}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    {commentContent.length}/280
                  </span>
                  <button
                    type="submit"
                    disabled={!commentContent.trim() || submittingComment}
                    className="flex items-center space-x-1 px-4 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingComment ? '发送中...' : '发送'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 评论列表 */}
          <div className="space-y-3">
            {loadingComments ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex space-x-3 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                还没有评论，快来抢沙发吧~
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3 group animate-fade-in-up">
                  <Link
                    href={`/profile/${comment.user?.username || 'unknown'}`}
                    className="flex-shrink-0"
                  >
                    <Avatar
                      username={comment.user?.username}
                      avatarUrl={comment.user?.avatar_url}
                      avatarTemplate={comment.user?.avatar_template}
                      size="sm"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/profile/${comment.user?.username || 'unknown'}`}
                        className="font-medium text-sm text-gray-900 hover:text-blue-500 transition"
                      >
                        {comment.user?.username || '未知用户'}
                      </Link>
                      <span className="text-xs text-gray-400" suppressHydrationWarning>
                        {formatRelativeTime(comment.created_at)}
                      </span>
                      {user?.id === comment.user_id && (
                        <button
                          onClick={() => handleDeleteCommentClick(comment.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition ml-auto"
                          title="删除评论"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 图片查看器 */}
      {showImageViewer && post.images && post.images.length > 0 && (
        <ImageViewer
          images={post.images}
          initialIndex={selectedImageIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}

      {/* 转发对话框 */}
      <RepostDialog
        post={post}
        isOpen={showRepostDialog}
        onClose={() => setShowRepostDialog(false)}
        onRepost={handleRepost}
      />

      {/* 删除动态确认对话框 */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* 删除评论确认对话框 */}
      <DeleteConfirmDialog
        isOpen={showDeleteCommentDialog}
        onClose={() => {
          setShowDeleteCommentDialog(false)
          setDeletingCommentId(null)
        }}
        onConfirm={handleConfirmDeleteComment}
        title="删除评论"
        message="确定要删除这条评论吗？删除后无法恢复。"
        isDeleting={false}
      />

      {/* 登录提示对话框 - 使用 Portal 渲染到 body */}
      {isMounted && showLoginPrompt && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] animate-fade-in"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in relative z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                登录后查看评论
              </h3>
              <p className="text-gray-600 mb-6">
                加入 MiniSocial，发现更多精彩内容，与朋友互动交流
              </p>
              <div className="flex flex-col space-y-3">
                <Link
                  href="/login"
                  className="w-full px-6 py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors active:scale-95"
                >
                  登录
                </Link>
                <Link
                  href="/signup"
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-colors active:scale-95"
                >
                  注册新账号
                </Link>
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
                >
                  稍后再说
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
})

export default PostCard
