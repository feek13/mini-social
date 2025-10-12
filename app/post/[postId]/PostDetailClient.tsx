'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { Post, Comment } from '@/types/database'
import PostDetailCard from '@/components/PostDetailCard'
import CommentInput from '@/components/CommentInput'
import PostCommentList from '@/components/PostCommentList'
import { supabase } from '@/lib/supabase'
import SwipeablePageTransition from '@/components/SwipeablePageTransition'

interface PostDetailClientProps {
  post: Post
  initialComments: Comment[]
}

export default function PostDetailClient({
  post: initialPost,
  initialComments,
}: PostDetailClientProps) {
  const { user } = useAuth()
  const [post, setPost] = useState(initialPost)
  const [comments, setComments] = useState(initialComments)
  const [isLiked, setIsLiked] = useState(false)
  const [hasReposted, setHasReposted] = useState(false)
  const [isLikeProcessing, setIsLikeProcessing] = useState(false)
  const [pendingLikeState, setPendingLikeState] = useState<boolean | null>(null)

  // 检查点赞状态（优化：使用单次查询同时获取点赞和转发状态）
  useEffect(() => {
    const checkInteractionStatus = async () => {
      if (!user) {
        return
      }

      try {
        // 并行查询点赞和转发状态
        const [likeResult, repostResult] = await Promise.all([
          supabase
            .from('likes')
            .select('post_id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('posts')
            .select('id')
            .eq('user_id', user.id)
            .eq('original_post_id', post.is_repost && post.original_post_id ? post.original_post_id : post.id)
            .eq('is_repost', true)
            .maybeSingle()
        ])

        // 设置点赞状态
        if (likeResult.error) {
          console.error('检查点赞状态失败:', likeResult.error)
          setIsLiked(false)
        } else {
          setIsLiked(!!likeResult.data)
        }

        // 设置转发状态
        if (repostResult.error) {
          console.error('检查转发状态失败:', repostResult.error)
          setHasReposted(false)
        } else {
          setHasReposted(!!repostResult.data)
        }
      } catch (error) {
        console.error('检查互动状态异常:', error)
        setIsLiked(false)
        setHasReposted(false)
      }
    }

    checkInteractionStatus()
  }, [user, post.id, post.is_repost, post.original_post_id])


  // 使用 useRef 来存储防抖定时器
  const likeDebounceTimer = useRef<NodeJS.Timeout | null>(null)

  // 点赞/取消点赞（使用防抖优化性能）
  const handleLike = async () => {
    if (!user) return

    // 立即进行乐观更新UI，提供即时反馈
    const newLikeState = !isLiked
    setIsLiked(newLikeState)
    setPost(prev => ({
      ...prev,
      likes_count: newLikeState ? prev.likes_count + 1 : prev.likes_count - 1
    }))

    // 设置待处理状态
    setPendingLikeState(newLikeState)

    // 清除之前的定时器
    if (likeDebounceTimer.current) {
      clearTimeout(likeDebounceTimer.current)
    }

    // 300ms 防抖：用户停止点击后才发送请求
    likeDebounceTimer.current = setTimeout(async () => {
      if (isLikeProcessing || pendingLikeState === null) return

      setIsLikeProcessing(true)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token

        const response = await fetch(`/api/posts/${post.id}/like`, {
          method: 'POST',
          headers: {
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
        })

        if (response.ok) {
          const data = await response.json()
          // 使用API返回的实际状态更新UI
          setIsLiked(data.isLiked)
          setPost(prev => ({
            ...prev,
            likes_count: data.likesCount
          }))
        } else {
          // 请求失败，保持当前UI状态（已经乐观更新了）
          console.error('点赞请求失败')
        }
      } catch (error) {
        console.error('点赞操作失败:', error)
      } finally {
        setIsLikeProcessing(false)
        setPendingLikeState(null)
      }
    }, 300)
  }

  // 取消点赞使用相同的函数
  const handleUnlike = handleLike

  // 转发
  const handleRepost = (newRepostCount: number) => {
    setHasReposted(!hasReposted)
    setPost(prev => ({
      ...prev,
      repost_count: newRepostCount
    }))
  }

  // 提交评论
  const handleSubmitComment = async (content: string) => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({ content }),
      })

      const data = await response.json()

      if (response.ok) {
        // 添加新评论到列表
        setComments(prev => [...prev, data.comment])
        // 更新评论数
        setPost(prev => ({
          ...prev,
          comments_count: (prev.comments_count || 0) + 1
        }))
      } else {
        throw new Error(data.error || '评论失败')
      }
    } catch (error) {
      console.error('提交评论失败:', error)
      throw error
    }
  }

  return (
    <SwipeablePageTransition enableSwipeBack={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto bg-white min-h-screen">
          {/* 动态详情卡片 */}
          <PostDetailCard
            post={post}
            isLiked={isLiked}
            hasReposted={hasReposted}
            onLike={handleLike}
            onUnlike={handleUnlike}
            onRepost={handleRepost}
          />

          {/* 评论输入框 */}
          <CommentInput onSubmit={handleSubmitComment} />

          {/* 评论列表 */}
          <div className="border-t border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                评论 {comments.length > 0 ? `(${comments.length})` : ''}
              </h2>
            </div>
            <PostCommentList
              comments={comments}
              postId={post.id}
              loading={false}
            />
          </div>
        </div>
      </div>
    </SwipeablePageTransition>
  )
}
