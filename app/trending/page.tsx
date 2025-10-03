'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Flame } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import HotBadge from '@/components/HotBadge'
import { useAuth } from '@/app/providers/AuthProvider'
import { Post } from '@/types/database'
import { supabase } from '@/lib/supabase'

type TimeRange = 'today' | 'week' | 'month'

interface TrendingPost extends Post {
  rank?: number
}

export default function TrendingPage() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState<TimeRange>('today')
  const [posts, setPosts] = useState<TrendingPost[]>([])
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  // 获取用户点赞的动态列表
  const fetchUserLikes = useCallback(async (userId: string) => {
    try {
      const { data: likes, error } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId)

      if (error) {
        console.error('获取点赞列表错误:', error)
        return new Set<string>()
      }

      return new Set(likes?.map((like) => like.post_id) || [])
    } catch (err) {
      console.error('获取点赞列表错误:', err)
      return new Set<string>()
    }
  }, [])

  // 获取热门动态
  const fetchTrendingPosts = useCallback(async (range: TimeRange, pageNum: number = 1) => {
    try {
      setLoading(true)

      const response = await fetch(`/api/posts/trending?range=${range}&page=${pageNum}&limit=20`, {
        cache: 'no-store',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取热门动态失败')
      }

      // 添加排名信息
      const postsWithRank = data.posts?.map((post: Post, index: number) => ({
        ...post,
        rank: (pageNum - 1) * 20 + index + 1,
      })) || []

      if (pageNum === 1) {
        setPosts(postsWithRank)
      } else {
        setPosts(prev => [...prev, ...postsWithRank])
      }

      setHasMore(data.hasMore)

      // 如果用户已登录，获取点赞状态
      if (user?.id) {
        const likedIds = await fetchUserLikes(user.id)
        setLikedPostIds(likedIds)
      } else {
        setLikedPostIds(new Set())
      }
    } catch (err) {
      console.error('获取热门动态错误:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, fetchUserLikes])

  // 切换时间范围
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range)
    setPage(1)
    fetchTrendingPosts(range, 1)
  }

  // 加载更多
  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchTrendingPosts(timeRange, nextPage)
  }

  // 初始加载
  useEffect(() => {
    fetchTrendingPosts(timeRange, 1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 当用户登录状态改变时，重新获取点赞状态
  useEffect(() => {
    if (user?.id && posts.length > 0) {
      fetchUserLikes(user.id).then(setLikedPostIds)
    } else if (!user) {
      setLikedPostIds(new Set())
    }
  }, [user?.id, fetchUserLikes, posts.length])

  // 点赞或取消点赞
  const handleToggleLike = async (postId: string) => {
    if (!user) {
      alert('请先登录')
      return
    }

    const isLiked = likedPostIds.has(postId)

    // 乐观更新
    setLikedPostIds((prev) => {
      const newSet = new Set(prev)
      if (isLiked) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              likes_count: isLiked
                ? post.likes_count - 1
                : post.likes_count + 1,
            }
          : post
      )
    )

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      })

      const data = await response.json()

      if (!response.ok) {
        // 如果失败，恢复状态
        setLikedPostIds((prev) => {
          const newSet = new Set(prev)
          if (isLiked) {
            newSet.add(postId)
          } else {
            newSet.delete(postId)
          }
          return newSet
        })

        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likes_count: isLiked
                    ? post.likes_count + 1
                    : post.likes_count - 1,
                }
              : post
          )
        )

        throw new Error(data.error || '操作失败')
      }

      // 使用服务器返回的准确点赞数更新
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, likes_count: data.likesCount }
            : post
        )
      )
    } catch (err) {
      console.error('点赞操作错误:', err)
    }
  }

  // 删除动态
  const handlePostDelete = async (postId: string) => {
    try {
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId))

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      })

      const data = await response.json()

      if (!response.ok) {
        await fetchTrendingPosts(timeRange, 1)
        throw new Error(data.error || '删除失败')
      }
    } catch (err) {
      console.error('删除动态错误:', err)
      throw err
    }
  }

  const timeRangeOptions = [
    { value: 'today' as TimeRange, label: '今天' },
    { value: 'week' as TimeRange, label: '本周' },
    { value: 'month' as TimeRange, label: '本月' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 页面标题和时间范围选择 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">热门动态</h1>
          </div>

          {/* 时间范围标签 */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleTimeRangeChange(option.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  timeRange === option.value
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 加载状态 */}
        {loading && page === 1 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-fade-in">
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-full shimmer"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 rounded w-1/4 shimmer"></div>
                    <div className="h-3 rounded w-1/3 shimmer"></div>
                  </div>
                </div>
                <div className="space-y-2 ml-0 sm:ml-[52px]">
                  <div className="h-4 rounded w-full shimmer"></div>
                  <div className="h-4 rounded w-5/6 shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          // 空状态
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Flame className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              暂无热门动态
            </h3>
            <p className="text-gray-500 mb-6">
              {timeRange === 'today' && '今天还没有热门动态'}
              {timeRange === 'week' && '本周还没有热门动态'}
              {timeRange === 'month' && '本月还没有热门动态'}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
            >
              查看所有动态
            </Link>
          </div>
        ) : (
          // 热门动态列表
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="relative">
                {/* 热度徽章 */}
                {post.hot_score !== undefined && post.hot_score > 0 && (
                  <div className="absolute -top-2 left-4 z-10">
                    <HotBadge score={post.hot_score} rank={post.rank} />
                  </div>
                )}

                <div className={post.hot_score !== undefined && post.hot_score > 0 ? 'pt-8' : ''}>
                  <PostCard
                    post={post}
                    onLike={handleToggleLike}
                    onUnlike={handleToggleLike}
                    onDelete={handlePostDelete}
                    isLiked={likedPostIds.has(post.id)}
                    commentsCount={post.comments_count || 0}
                  />
                </div>
              </div>
            ))}

            {/* 加载更多按钮 */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
