'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import PostForm from '@/components/PostForm'
import PostCard from '@/components/PostCard'
import { useAuth } from '@/app/providers/AuthProvider'
import { Post } from '@/types/database'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [repostedPostIds, setRepostedPostIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  // 获取用户转发的动态列表
  const fetchUserReposts = useCallback(async (userId: string) => {
    try {
      const { data: reposts, error } = await supabase
        .from('posts')
        .select('original_post_id')
        .eq('user_id', userId)
        .eq('is_repost', true)

      if (error) {
        console.error('获取转发列表错误:', error)
        return new Set<string>()
      }

      return new Set(reposts?.map((repost) => repost.original_post_id).filter(Boolean) || [])
    } catch (err) {
      console.error('获取转发列表错误:', err)
      return new Set<string>()
    }
  }, [])

  // 获取动态列表
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/posts', {
        cache: 'no-store', // 客户端组件使用 cache 而不是 next
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取动态失败')
      }

      setPosts(data.posts || [])

      // 如果用户已登录，获取点赞和转发状态
      if (user?.id) {
        const [likedIds, repostedIds] = await Promise.all([
          fetchUserLikes(user.id),
          fetchUserReposts(user.id)
        ])
        setLikedPostIds(likedIds)
        setRepostedPostIds(repostedIds)
      } else {
        setLikedPostIds(new Set())
        setRepostedPostIds(new Set())
      }
    } catch (err) {
      console.error('获取动态错误:', err)
      setError('获取动态失败，请刷新重试')
    } finally {
      setLoading(false)
    }
  }, [user?.id, fetchUserLikes, fetchUserReposts])

  // 初始加载 - 只在 user.id 变化时重新加载
  useEffect(() => {
    fetchPosts()
  }, []) // 只在组件挂载时加载一次

  // 当用户登录状态改变时，重新获取点赞和转发状态
  useEffect(() => {
    if (user?.id && posts.length > 0) {
      Promise.all([
        fetchUserLikes(user.id),
        fetchUserReposts(user.id)
      ]).then(([likedIds, repostedIds]) => {
        setLikedPostIds(likedIds)
        setRepostedPostIds(repostedIds)
      })
    } else if (!user) {
      setLikedPostIds(new Set())
      setRepostedPostIds(new Set())
    }
  }, [user?.id, fetchUserLikes, fetchUserReposts, posts.length])

  // 发布新动态
  const handlePostSubmit = async (content: string, imageUrls?: string[]) => {
    try {
      // 获取当前会话的 access token
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({ content, images: imageUrls }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '发布失败')
      }

      // 刷新动态列表
      await fetchPosts()
    } catch (err) {
      console.error('发布动态错误:', err)
      throw err
    }
  }

  // 删除动态
  const handlePostDelete = async (postId: string) => {
    try {
      // 乐观更新：立即从 UI 移除
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId))

      // 获取 access token
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
        // 如果删除失败，恢复数据
        await fetchPosts()
        throw new Error(data.error || '删除失败')
      }
    } catch (err) {
      console.error('删除动态错误:', err)
      throw err
    }
  }

  // 转发或取消转发
  const handleRepost = async (postId: string, newRepostCount: number) => {
    // 乐观更新：立即更新 repost_count
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        // 如果是原动态，直接更新
        if (post.id === postId) {
          return { ...post, repost_count: newRepostCount }
        }
        // 如果是转发动态，且原动态 ID 匹配，也需要更新原动态的 repost_count
        if (post.is_repost && post.original_post && post.original_post.id === postId) {
          return {
            ...post,
            original_post: {
              ...post.original_post,
              repost_count: newRepostCount
            }
          }
        }
        return post
      })
    )

    // 立即刷新转发状态和动态列表
    if (user?.id) {
      // 并行更新转发状态和重新获取动态列表
      await Promise.all([
        fetchUserReposts(user.id).then(setRepostedPostIds),
        fetchPosts() // 刷新动态列表以显示新的转发
      ])
    }
  }

  // 点赞或取消点赞
  const handleToggleLike = async (postId: string) => {
    if (!user) {
      alert('请先登录')
      return
    }

    const isLiked = likedPostIds.has(postId)

    // 乐观更新：立即更新 UI
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
      // 获取 access token
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


  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <Navbar />

      {/* 主内容 */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 发布框（仅登录用户可见） */}
        {user && (
          <div className="mb-6">
            <PostForm onSubmit={handlePostSubmit} />
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 加载状态 */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 overflow-hidden animate-fade-in">
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
                  <div className="h-4 rounded w-3/4 shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          // 空状态 - 欢迎页面/产品介绍
          <div className="space-y-6">
            {/* 主标题区 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-12 text-center text-white animate-fade-in-up hover-glow">
              <div className="text-6xl mb-6 animate-float">🚀</div>
              <h1 className="text-4xl font-bold mb-4 animate-fade-in">
                欢迎来到 Mini Social
              </h1>
              <p className="text-xl text-blue-50 mb-8 animate-slide-up">
                一个简洁、现代的社交平台，在这里分享你的想法和故事
              </p>
              {!user && (
                <div className="flex justify-center space-x-4">
                  <a
                    href="/signup"
                    className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                  >
                    立即注册
                  </a>
                  <a
                    href="/login"
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors border-2 border-white"
                  >
                    登录
                  </a>
                </div>
              )}
            </div>

            {/* 功能介绍 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center hover-lift animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                <div className="text-4xl mb-4 animate-bounce-subtle">✍️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  发布动态
                </h3>
                <p className="text-gray-600 text-sm">
                  快速分享你的想法、见解和日常，与朋友们保持联系
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center hover-lift animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                <div className="text-4xl mb-4 animate-bounce-subtle" style={{animationDelay: '0.1s'}}>💬</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  互动交流
                </h3>
                <p className="text-gray-600 text-sm">
                  点赞、评论，与他人进行有意义的对话和交流
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center hover-lift animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                <div className="text-4xl mb-4 animate-bounce-subtle" style={{animationDelay: '0.2s'}}>🌟</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  关注好友
                </h3>
                <p className="text-gray-600 text-sm">
                  关注感兴趣的人，第一时间了解他们的最新动态
                </p>
              </div>
            </div>

            {/* 开始使用提示 */}
            {user ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">👋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  开始你的第一条动态吧！
                </h3>
                <p className="text-gray-600">
                  当前还没有任何动态，成为第一个分享想法的人
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-600 mb-4">
                  加入我们，开启你的社交之旅
                </p>
                <div className="flex justify-center space-x-4">
                  <a
                    href="/signup"
                    className="text-blue-500 hover:text-blue-600 font-medium underline"
                  >
                    创建账户
                  </a>
                  <span className="text-gray-400">或</span>
                  <a
                    href="/login"
                    className="text-blue-500 hover:text-blue-600 font-medium underline"
                  >
                    登录已有账户
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          // 动态列表
          <div className="space-y-4">
            {posts.map((post) => {
              // 对于转发动态，检查原动态ID是否已转发
              const postIdToCheck = post.is_repost && post.original_post_id
                ? post.original_post_id
                : post.id

              return (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleToggleLike}
                  onUnlike={handleToggleLike}
                  onDelete={handlePostDelete}
                  onRepost={handleRepost}
                  isLiked={likedPostIds.has(post.id)}
                  hasReposted={repostedPostIds.has(postIdToCheck)}
                  commentsCount={
                    post.is_repost && post.original_post
                      ? post.original_post.comments_count || 0
                      : post.comments_count || 0
                  }
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
