'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Repeat2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers/AuthProvider'
import { Post } from '@/types/database'
import Avatar from '@/components/Avatar'
import ImageViewer from '@/components/ImageViewer'
import RepostDialog from '@/components/RepostDialog'
import DeFiEmbedPreview from '@/components/defi/DeFiEmbedPreview'
import { supabase } from '@/lib/supabase'
import { renderText } from '@/lib/textParser'

interface PostDetailCardProps {
  post: Post
  isLiked?: boolean
  hasReposted?: boolean
  onLike?: () => void
  onUnlike?: () => void
  onRepost?: (newRepostCount: number) => void
}

export default function PostDetailCard({
  post,
  isLiked = false,
  hasReposted = false,
  onLike,
  onUnlike,
  onRepost,
}: PostDetailCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [likeAnimating, setLikeAnimating] = useState(false)
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showRepostDialog, setShowRepostDialog] = useState(false)
  const [repostAnimating, setRepostAnimating] = useState(false)
  const [showRepostMenu, setShowRepostMenu] = useState(false)
  const [repostSuccess, setRepostSuccess] = useState(false)
  const [repostError, setRepostError] = useState('')
  const [isReposting, setIsReposting] = useState(false)

  const isOwner = user?.id === post.user_id
  const originalAuthorId = post.is_repost && post.original_post
    ? post.original_post.user_id
    : post.user_id
  const canRepost = user && (hasReposted || user.id !== originalAuthorId)

  // 格式化完整时间
  const formatFullTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleLike = () => {
    if (!user) {
      router.push('/login')
      return
    }

    setLikeAnimating(true)
    setTimeout(() => setLikeAnimating(false), 600)

    if (isLiked && onUnlike) {
      onUnlike()
    } else if (onLike) {
      onLike()
    }
  }

  const handleRepost = async (comment?: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    if (isReposting) return

    setIsReposting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

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

      setRepostAnimating(true)
      setTimeout(() => setRepostAnimating(false), 300)

      setRepostSuccess(true)
      setTimeout(() => setRepostSuccess(false), 2000)

      if (onRepost && data.repostCount !== undefined) {
        onRepost(data.repostCount)
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

      if (onRepost && data.repostCount !== undefined) {
        onRepost(data.repostCount)
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

  const handleRepostClick = () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (hasReposted) {
      handleCancelRepost()
    } else {
      setShowRepostMenu(!showRepostMenu)
    }
  }

  const handleDirectRepost = async () => {
    setShowRepostMenu(false)
    await handleRepost()
  }

  const handleQuoteRepost = () => {
    setShowRepostMenu(false)
    setShowRepostDialog(true)
  }


  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* 顶部导航 */}
      <div className="flex items-center px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition mr-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">动态</h1>
      </div>

      <div className="p-6">
        {/* 转发提示 */}
        {post.is_repost && (
          <div className="flex items-center space-x-2 mb-4 text-gray-500 text-sm">
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

        {/* 转发评论 */}
        {post.is_repost && post.repost_comment && (
          <div className="mb-4">
            <p className="text-gray-800 text-lg whitespace-pre-wrap break-words leading-relaxed">
              {renderText(post.repost_comment)}
            </p>
          </div>
        )}

        {/* 原动态或普通动态 */}
        {post.is_repost && post.original_post ? (
          <div
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => router.push(`/post/${post.original_post_id}`)}
          >
            {/* 原动态用户信息 */}
            <div className="flex items-start space-x-3 mb-3">
              <Link
                href={`/profile/${post.original_post.user?.username || 'unknown'}`}
                className="flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar
                  username={post.original_post.user?.username}
                  avatarUrl={post.original_post.user?.avatar_url}
                  avatarTemplate={post.original_post.user?.avatar_template}
                  size="md"
                />
              </Link>
              <div className="flex-1">
                <Link
                  href={`/profile/${post.original_post.user?.username || 'unknown'}`}
                  className="font-semibold text-gray-900 hover:text-blue-500 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.original_post.user?.username || '未知用户'}
                </Link>
                <p className="text-sm text-gray-500">
                  {formatFullTime(post.original_post.created_at)}
                </p>
              </div>
            </div>

            {/* 原动态内容 */}
            <p className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed mb-3">
              {renderText(post.original_post.content)}
            </p>

            {/* 原动态图片 */}
            {post.original_post.images && post.original_post.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
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
            )}

            {/* 原动态 DeFi 嵌入显示 */}
            {post.original_post.defi_embeds && post.original_post.defi_embeds.length > 0 && (
              <div className="mb-3">
                <div className="grid grid-cols-1 gap-2">
                  {post.original_post.defi_embeds.map((embed: { embed_type: string; reference_id: string; snapshot_data: Record<string, unknown> }, index: number) => (
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
          </div>
        ) : (
          <>
            {/* 用户信息 */}
            <div className="flex items-start space-x-3 mb-4">
              <Link
                href={`/profile/${post.user?.username || 'unknown'}`}
                className="flex-shrink-0"
              >
                <Avatar
                  username={post.user?.username}
                  avatarUrl={post.user?.avatar_url}
                  avatarTemplate={post.user?.avatar_template}
                  size="lg"
                />
              </Link>
              <div className="flex-1">
                <Link
                  href={`/profile/${post.user?.username || 'unknown'}`}
                  className="font-bold text-xl text-gray-900 hover:text-blue-500 transition"
                >
                  {post.user?.username || '未知用户'}
                </Link>
                <p className="text-gray-500">@{post.user?.username || 'unknown'}</p>
              </div>
            </div>

            {/* 动态内容 */}
            <div className="mb-4">
              <p className="text-gray-800 text-xl whitespace-pre-wrap break-words leading-relaxed">
                {renderText(post.content)}
              </p>
            </div>

            {/* 图片 */}
            {post.images && post.images.length > 0 && (
              <div className="mb-4">
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
              </div>
            )}

            {/* DeFi 嵌入显示 */}
            {post.defi_embeds && post.defi_embeds.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-1 gap-3">
                  {post.defi_embeds.map((embed: { embed_type: string; reference_id: string; snapshot_data: Record<string, unknown> }, index: number) => (
                    <DeFiEmbedPreview
                      key={index}
                      embed={{
                        type: embed.embed_type,
                        referenceId: embed.reference_id,
                        snapshotData: embed.snapshot_data
                      }}
                      compact={false}
                      showLatestDataButton={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 时间戳 */}
            <div className="text-gray-500 text-sm mb-4 pb-4 border-b border-gray-100">
              {formatFullTime(post.created_at)}
            </div>
          </>
        )}

        {/* 互动统计 */}
        <div className="flex items-center space-x-6 py-4 border-y border-gray-100 text-sm">
          <div>
            <span className="font-bold text-gray-900">{post.likes_count || 0}</span>
            <span className="text-gray-500 ml-1">点赞</span>
          </div>
          <div>
            <span className="font-bold text-gray-900">{post.repost_count || 0}</span>
            <span className="text-gray-500 ml-1">转发</span>
          </div>
          <div>
            <span className="font-bold text-gray-900">{post.comments_count || 0}</span>
            <span className="text-gray-500 ml-1">评论</span>
          </div>
        </div>

        {/* 互动按钮 */}
        <div className="flex items-center justify-around py-4">
          {/* 点赞 */}
          <button
            onClick={handleLike}
            disabled={!user}
            className={`flex items-center space-x-2 transition-all group ${
              isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
            } ${!user ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}
          >
            <Heart
              className={`w-6 h-6 transition-all ${
                isLiked ? 'fill-current scale-110' : 'group-hover:scale-110'
              } ${likeAnimating ? 'animate-like-burst' : ''}`}
            />
            <span className="font-medium">点赞</span>
          </button>

          {/* 评论 */}
          <button
            onClick={() => {
              const commentSection = document.getElementById('comment-section')
              commentSection?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-all group active:scale-95"
          >
            <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="font-medium">评论</span>
          </button>

          {/* 转发 */}
          <div className="relative">
            <button
              onClick={handleRepostClick}
              disabled={!canRepost || isReposting}
              className={`flex items-center space-x-2 transition-all group ${
                hasReposted ? 'text-green-500' : 'text-gray-500 hover:text-green-500'
              } ${!canRepost || isReposting ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}`}
            >
              <Repeat2
                className={`w-6 h-6 transition-all ${
                  hasReposted ? 'scale-110' : 'group-hover:scale-110'
                } ${repostAnimating ? 'animate-repost-spin' : ''}`}
              />
              <span className="font-medium">转发</span>
            </button>

            {repostSuccess && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-full shadow-lg z-50 animate-slide-up whitespace-nowrap">
                转发成功 ✓
              </div>
            )}

            {repostError && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-full shadow-lg z-50 animate-slide-up whitespace-nowrap">
                {repostError}
              </div>
            )}

            {showRepostMenu && !hasReposted && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 min-w-[160px] z-50 animate-scale-in">
                <button
                  onClick={handleDirectRepost}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition flex items-center space-x-3"
                >
                  <Repeat2 className="w-4 h-4 text-green-500" />
                  <span className="font-medium">转发</span>
                </button>
                <button
                  onClick={handleQuoteRepost}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition flex items-center space-x-3"
                >
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">引用</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  )
}
