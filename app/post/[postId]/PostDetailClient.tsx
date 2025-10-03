'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { Post, Comment } from '@/types/database'
import PostDetailCard from '@/components/PostDetailCard'
import CommentInput from '@/components/CommentInput'
import PostCommentList from '@/components/PostCommentList'
import { supabase } from '@/lib/supabase'

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
  const [loadingLikeStatus, setLoadingLikeStatus] = useState(true)
  const [loadingRepostStatus, setLoadingRepostStatus] = useState(true)

  // 检查点赞状态
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user) {
        setLoadingLikeStatus(false)
        return
      }

      try {
        const { data } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .single()

        setIsLiked(!!data)
      } catch (error) {
        console.error('检查点赞状态失败:', error)
      } finally {
        setLoadingLikeStatus(false)
      }
    }

    checkLikeStatus()
  }, [user, post.id])

  // 检查转发状态
  useEffect(() => {
    const checkRepostStatus = async () => {
      if (!user) {
        setLoadingRepostStatus(false)
        return
      }

      try {
        const originalPostId = post.is_repost && post.original_post_id
          ? post.original_post_id
          : post.id

        const { data } = await supabase
          .from('posts')
          .select('id')
          .eq('user_id', user.id)
          .eq('original_post_id', originalPostId)
          .eq('is_repost', true)
          .single()

        setHasReposted(!!data)
      } catch (error) {
        console.error('检查转发状态失败:', error)
      } finally {
        setLoadingRepostStatus(false)
      }
    }

    checkRepostStatus()
  }, [user, post.id, post.is_repost, post.original_post_id])

  // 点赞
  const handleLike = async () => {
    if (!user) return

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
        setIsLiked(true)
        setPost(prev => ({
          ...prev,
          likes_count: prev.likes_count + 1
        }))
      }
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  // 取消点赞
  const handleUnlike = async () => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      })

      if (response.ok) {
        setIsLiked(false)
        setPost(prev => ({
          ...prev,
          likes_count: Math.max(0, prev.likes_count - 1)
        }))
      }
    } catch (error) {
      console.error('取消点赞失败:', error)
    }
  }

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
  )
}
