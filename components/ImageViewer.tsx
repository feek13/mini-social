'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Repeat2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Post, Comment } from '@/types/database'
import Avatar from '@/components/Avatar'
import { formatRelativeTime } from '@/lib/utils'
import { renderText } from '@/lib/textParser'
import { supabase } from '@/lib/supabase'

interface ImageViewerProps {
  images: string[]
  initialIndex: number
  onClose: () => void
  post: Post
  isLiked?: boolean
  hasReposted?: boolean
  onLike?: (postId: string) => void
  onUnlike?: (postId: string) => void
  onRepost?: (postId: string, newRepostCount: number) => void
}

export default function ImageViewer({
  images,
  initialIndex,
  onClose,
  post,
  isLiked = false,
  hasReposted = false,
  onLike,
  onUnlike,
  onRepost
}: ImageViewerProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [liked, setLiked] = useState(isLiked)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [reposted, setReposted] = useState(hasReposted)
  const [repostsCount, setRepostsCount] = useState(post.repost_count || 0)
  const [likeAnimating, setLikeAnimating] = useState(false)
  const [repostAnimating, setRepostAnimating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showInfo, setShowInfo] = useState(false)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)

  // 同步外部状态
  useEffect(() => {
    setLiked(isLiked)
  }, [isLiked])

  useEffect(() => {
    setReposted(hasReposted)
  }, [hasReposted])

  // 加载评论数据
  useEffect(() => {
    const fetchComments = async () => {
      setLoadingComments(true)
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*, user:user_id(*)')
          .eq('post_id', post.id)
          .is('parent_comment_id', null)
          .order('created_at', { ascending: false })

        if (error) throw error

        if (data) {
          setComments(data.map((comment: Record<string, unknown>) => ({
            ...comment,
            user: comment.user
          })) as Comment[])
        }
      } catch (error) {
        console.error('加载评论失败:', error)
        setComments([])
      } finally {
        setLoadingComments(false)
      }
    }

    fetchComments()
  }, [post.id])

  // 上一张
  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  // 下一张
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    // 阻止背景滚动
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [onClose, handleNext, handlePrevious])

  // 触摸事件（移动端滑动）
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // 向左滑动
      handleNext()
    }

    if (touchStart - touchEnd < -75) {
      // 向右滑动
      handlePrevious()
    }
  }

  // 处理点赞
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isProcessing) return

    setIsProcessing(true)
    setLikeAnimating(true)
    setTimeout(() => setLikeAnimating(false), 600)

    const newLiked = !liked
    const newCount = newLiked ? likesCount + 1 : likesCount - 1

    // 乐观更新
    setLiked(newLiked)
    setLikesCount(newCount)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('未登录')
      }

      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: newLiked ? 'POST' : 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('操作失败')
      }

      // 调用父组件回调
      if (newLiked && onLike) {
        onLike(post.id)
      } else if (!newLiked && onUnlike) {
        onUnlike(post.id)
      }
    } catch (error) {
      console.error('点赞操作失败:', error)
      // 回滚
      setLiked(liked)
      setLikesCount(likesCount)
    } finally {
      setIsProcessing(false)
    }
  }

  // 处理转发
  const handleRepostClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isProcessing) return

    setIsProcessing(true)
    setRepostAnimating(true)
    setTimeout(() => setRepostAnimating(false), 300)

    const newReposted = !reposted
    const newCount = newReposted ? repostsCount + 1 : repostsCount - 1

    // 乐观更新
    setReposted(newReposted)
    setRepostsCount(newCount)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('未登录')
      }

      const postIdToRepost = post.is_repost && post.original_post_id
        ? post.original_post_id
        : post.id

      const response = await fetch(`/api/posts/${postIdToRepost}/repost`, {
        method: newReposted ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: newReposted ? JSON.stringify({}) : undefined,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '操作失败')
      }

      // 调用父组件回调
      if (onRepost && data.repostCount !== undefined) {
        onRepost(postIdToRepost, data.repostCount)
      }
    } catch (error) {
      console.error('转发操作失败:', error)
      // 回滚
      setReposted(reposted)
      setRepostsCount(repostsCount)
    } finally {
      setIsProcessing(false)
    }
  }

  // 显示评论输入框
  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowCommentInput(true)
    setShowControls(true) // 确保移动端控制可见
  }

  // 提交评论
  const handleSubmitComment = async () => {
    if (!commentText.trim() || isSubmittingComment) return

    setIsSubmittingComment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('未登录')
      }

      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content: commentText }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '评论失败')
      }

      // 成功后清空输入框并关闭
      setCommentText('')
      setShowCommentInput(false)

      // 将新评论添加到列表顶部
      if (data.comment) {
        setComments(prev => [data.comment, ...prev])
      }
    } catch (error) {
      console.error('评论失败:', error)
      alert(error instanceof Error ? error.message : '评论失败，请重试')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  // 切换控制显示（移动端）
  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation() // 阻止冒泡，防止关闭查看器
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowControls(!showControls)
    }
  }

  // 双击图片点赞
  const handleImageDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleLike(e)
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-black animate-fade-in"
      onClick={onClose}
    >
      {/* 顶部控制栏（移动端可点击切换显示） */}
      <div
        className={`absolute top-0 left-0 right-0 z-[210] bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'md:opacity-100 opacity-0 pointer-events-none md:pointer-events-auto'
        }`}
      >
        <div className="flex items-center justify-between p-4">
          {/* 关闭按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all active:scale-95"
            aria-label="关闭"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 图片计数器 */}
          {images.length > 1 && (
            <div className="px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* 占位，保持居中 */}
          <div className="w-10"></div>
        </div>
      </div>

      {/* 主容器：桌面端两栏布局 */}
      <div className="flex h-full w-full">
        {/* 左侧：图片展示区 */}
        <div className="flex-1 relative flex items-center justify-center">
          {/* 左箭头（桌面端） */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePrevious()
              }}
              className={`hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-[210] p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all hover:scale-110 active:scale-95`}
              aria-label="上一张"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* 右箭头（桌面端） */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleNext()
              }}
              className={`hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-[210] p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all hover:scale-110 active:scale-95`}
              aria-label="下一张"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* 图片容器 */}
          <div
            className="flex items-center justify-center w-full h-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleImageClick}
            onDoubleClick={handleImageDoubleClick}
          >
            <div className="relative max-w-full max-h-full w-full h-full flex items-center justify-center p-4 md:p-8">
              <Image
                src={images[currentIndex]}
                alt={`图片 ${currentIndex + 1}`}
                width={1200}
                height={800}
                className="max-w-full max-h-full w-auto h-auto object-contain select-none"
                unoptimized
                priority
                draggable={false}
              />
            </div>
          </div>

          {/* 底部缩略图（仅桌面端显示） */}
          {images.length > 1 && images.length <= 9 && (
            <div className="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-[210] gap-2 max-w-full overflow-x-auto px-4 pb-2 hide-scrollbar">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex(index)
                  }}
                  className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/50'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`缩略图 ${index + 1}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover pointer-events-none"
                    unoptimized
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：帖子信息侧边栏（仅桌面端显示） */}
        <div
          className="hidden md:flex flex-col w-[400px] bg-black/40 backdrop-blur-sm border-l border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶部：用户信息 */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-start space-x-3">
              <Link
                href={`/profile/${post.user?.username || 'unknown'}`}
                onClick={onClose}
              >
                <Avatar
                  username={post.user?.username}
                  avatarUrl={post.user?.avatar_url}
                  avatarTemplate={post.user?.avatar_template}
                  size="md"
                  className="hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${post.user?.username || 'unknown'}`}
                  onClick={onClose}
                  className="font-semibold text-white hover:text-blue-400 transition block truncate"
                >
                  {post.user?.username || '未知用户'}
                </Link>
                <span className="text-gray-400 text-sm" suppressHydrationWarning>
                  {formatRelativeTime(post.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* 中间：帖子内容和评论列表（可滚动） */}
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {/* 帖子内容 */}
            <div className="p-6 border-b border-white/10">
              <div className="text-white whitespace-pre-wrap break-words leading-relaxed">
                {renderText(post.content)}
              </div>
            </div>

            {/* 评论列表 */}
            <div className="text-white">
              {/* 评论标题 */}
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className="font-semibold text-sm text-white/80">
                  评论 {comments.length > 0 ? `(${comments.length})` : ''}
                </h3>
              </div>

              {/* 评论内容 */}
              <div className="divide-y divide-white/10">
                {loadingComments ? (
                  <div className="space-y-4 p-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex space-x-3">
                        <div className="w-10 h-10 bg-white/10 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-white/10 rounded w-1/4"></div>
                          <div className="h-3 bg-white/10 rounded w-3/4"></div>
                          <div className="h-3 bg-white/10 rounded w-1/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/60 text-sm">还没有评论</p>
                    <p className="text-white/40 text-xs mt-1">快来发表第一条评论吧</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-6 hover:bg-white/5 transition-colors">
                      <div className="flex space-x-3">
                        {/* 头像 */}
                        <Link
                          href={`/profile/${comment.user?.username || 'unknown'}`}
                          className="flex-shrink-0"
                          onClick={onClose}
                        >
                          <Avatar
                            username={comment.user?.username}
                            avatarUrl={comment.user?.avatar_url}
                            avatarTemplate={comment.user?.avatar_template}
                            size="sm"
                            className="hover:ring-2 hover:ring-blue-500 transition"
                          />
                        </Link>

                        {/* 评论内容 */}
                        <div className="flex-1 min-w-0">
                          {/* 用户名和时间 */}
                          <div className="flex items-center space-x-2 mb-1">
                            <Link
                              href={`/profile/${comment.user?.username || 'unknown'}`}
                              className="font-semibold text-sm text-white hover:text-blue-400 transition"
                              onClick={onClose}
                            >
                              @{comment.user?.username || '未知用户'}
                            </Link>
                            <span className="text-white/40 text-xs">·</span>
                            <span className="text-white/60 text-xs" suppressHydrationWarning>
                              {formatRelativeTime(comment.created_at)}
                            </span>
                          </div>

                          {/* 评论文本 */}
                          <div className="mb-2">
                            <p className="text-white/90 text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {renderText(comment.content)}
                            </p>
                          </div>

                          {/* 回复数 */}
                          {comment.reply_count > 0 && (
                            <Link
                              href={`/post/${post.id}/comment/${comment.id}`}
                              className="text-white/60 hover:text-blue-400 text-xs transition-colors inline-flex items-center space-x-1"
                              onClick={onClose}
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>{comment.reply_count} 条回复</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 底部：互动按钮和评论输入 */}
          <div className="border-t border-white/10">
            {/* 评论输入框（桌面端） */}
            {showCommentInput ? (
              <div className="p-4 border-b border-white/10">
                <div className="flex items-start space-x-3">
                  <Avatar
                    username={post.user?.username}
                    avatarUrl={post.user?.avatar_url}
                    avatarTemplate={post.user?.avatar_template}
                    size="sm"
                  />
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="添加评论..."
                      autoFocus
                      rows={3}
                      className="w-full bg-white/10 text-white placeholder-white/40 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={280}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-white/40 text-xs">
                        {commentText.length} / 280
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setShowCommentInput(false)
                            setCommentText('')
                          }}
                          className="px-3 py-1.5 text-xs text-white/60 hover:text-white transition"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim() || isSubmittingComment}
                          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                            commentText.trim() && !isSubmittingComment
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-blue-500/30 text-white/50 cursor-not-allowed'
                          }`}
                        >
                          {isSubmittingComment ? '发送中...' : '发送'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* 互动按钮 */}
            <div className="p-6">
              <div className="flex items-center justify-around">
                {/* 点赞按钮 */}
                <button
                  onClick={handleLike}
                  disabled={isProcessing}
                  className={`flex items-center space-x-2 transition-all group ${
                    liked
                      ? 'text-red-500'
                      : 'text-gray-300 hover:text-red-500'
                  } ${isProcessing ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}
                  title={liked ? '取消点赞' : '点赞'}
                >
                  <Heart
                    className={`w-6 h-6 transition-all ${
                      liked ? 'fill-current scale-110' : 'group-hover:scale-110'
                    } ${likeAnimating ? 'animate-like-burst' : ''}`}
                  />
                  <span className="text-sm font-medium tabular-nums">
                    {likesCount}
                  </span>
                </button>

                {/* 评论按钮 */}
                <button
                  onClick={handleCommentClick}
                  className="flex items-center space-x-2 transition-all group text-gray-300 hover:text-blue-500 active:scale-95"
                  title="添加评论"
                >
                  <MessageCircle className="w-6 h-6 transition-transform group-hover:scale-110" />
                  <span className="text-sm font-medium tabular-nums">
                    {post.comments_count || 0}
                  </span>
                </button>

                {/* 转发按钮 */}
                <button
                  onClick={handleRepostClick}
                  disabled={isProcessing}
                  className={`flex items-center space-x-2 transition-all group ${
                    reposted
                      ? 'text-green-500'
                      : 'text-gray-300 hover:text-green-500'
                  } ${isProcessing ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}
                  title={reposted ? '取消转发' : '转发'}
                >
                  <Repeat2
                    className={`w-6 h-6 transition-all ${
                      reposted ? 'scale-110' : 'group-hover:scale-110'
                    } ${repostAnimating ? 'animate-repost-spin' : ''}`}
                  />
                  <span className="text-sm font-medium tabular-nums">
                    {repostsCount}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 移动端：底部悬浮互动按钮 */}
        <div
          className={`md:hidden absolute bottom-0 left-0 right-0 z-[210] bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${
            showControls && !showCommentInput ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 pb-8">
            {/* 互动按钮行 */}
            <div className="flex items-center justify-around">
              {/* 点赞按钮 */}
              <button
                onClick={handleLike}
                disabled={isProcessing}
                className={`flex items-center space-x-2 transition-all px-3 py-2 ${
                  liked
                    ? 'text-red-500'
                    : 'text-white hover:text-red-400'
                } ${isProcessing ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}
              >
                <Heart
                  className={`w-6 h-6 transition-all ${
                    liked ? 'fill-current' : ''
                  } ${likeAnimating ? 'animate-like-burst' : ''}`}
                />
                <span className="text-sm font-medium tabular-nums">
                  {likesCount}
                </span>
              </button>

              {/* 评论按钮 */}
              <button
                onClick={handleCommentClick}
                className="flex items-center space-x-2 transition-all text-white hover:text-blue-400 active:scale-95 px-3 py-2"
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-sm font-medium tabular-nums">
                  {post.comments_count || 0}
                </span>
              </button>

              {/* 转发按钮 */}
              <button
                onClick={handleRepostClick}
                disabled={isProcessing}
                className={`flex items-center space-x-2 transition-all px-3 py-2 ${
                  reposted
                    ? 'text-green-500'
                    : 'text-white hover:text-green-400'
                } ${isProcessing ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}
              >
                <Repeat2
                  className={`w-6 h-6 transition-all ${
                    reposted ? 'scale-110' : ''
                  } ${repostAnimating ? 'animate-repost-spin' : ''}`}
                />
                <span className="text-sm font-medium tabular-nums">
                  {repostsCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 移动端：评论输入框 */}
        {showCommentInput && (
          <div
            className="md:hidden absolute bottom-0 left-0 right-0 z-[220] bg-black/95 backdrop-blur-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 pb-8">
              {/* 顶部栏 */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    setShowCommentInput(false)
                    setCommentText('')
                  }}
                  className="text-white/80 hover:text-white transition p-2"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-white font-semibold">添加评论</span>
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmittingComment}
                  className={`px-4 py-1.5 rounded-full font-semibold transition ${
                    commentText.trim() && !isSubmittingComment
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-blue-500/30 text-white/50 cursor-not-allowed'
                  }`}
                >
                  {isSubmittingComment ? '发送中...' : '发送'}
                </button>
              </div>

              {/* 用户信息 */}
              <div className="flex items-start space-x-3 mb-3">
                <Avatar
                  username={post.user?.username}
                  avatarUrl={post.user?.avatar_url}
                  avatarTemplate={post.user?.avatar_template}
                  size="sm"
                />
                <div className="flex-1">
                  <div className="text-white/80 text-sm mb-1">
                    回复 <span className="text-blue-400">@{post.user?.username}</span>
                  </div>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="添加评论..."
                    autoFocus
                    rows={4}
                    className="w-full bg-white/10 text-white placeholder-white/40 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={280}
                  />
                  <div className="text-right text-white/40 text-xs mt-1">
                    {commentText.length} / 280
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
