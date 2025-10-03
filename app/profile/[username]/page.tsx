'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Calendar, ArrowLeft, MapPin } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import Avatar from '@/components/Avatar'
import UserStats from '@/components/UserStats'
import FollowButton from '@/components/FollowButton'
import { useAuth } from '@/app/providers/AuthProvider'
import { Post } from '@/types/database'
import { formatRelativeTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  username: string
  avatar_url?: string
  avatar_template?: string
  bio?: string
  location?: string
  created_at: string
}

interface ProfileData {
  profile: Profile
  posts: Post[]
  stats: {
    postsCount: number
  }
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const username = params.username as string

  const [data, setData] = useState<ProfileData | null>(null)
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [followStatus, setFollowStatus] = useState({ following: false, notifyOnPost: false })

  // 判断是否是当前用户的主页
  const isOwnProfile = user && data?.profile.id === user.id

  // 获取用户点赞的动态列表
  const fetchUserLikes = useCallback(async () => {
    if (!user) {
      setLikedPostIds(new Set())
      return
    }

    try {
      const { data: likes, error } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)

      if (error) {
        console.error('获取点赞列表错误:', error)
        return
      }

      const likedIds = new Set(likes?.map((like) => like.post_id) || [])
      setLikedPostIds(likedIds)
    } catch (err) {
      console.error('获取点赞列表错误:', err)
    }
  }, [user])

  // 获取关注状态
  const fetchFollowStatus = useCallback(async () => {
    if (!user) {
      setFollowStatus({ following: false, notifyOnPost: false })
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`/api/users/${username}/follow`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      })

      if (response.ok) {
        const result = await response.json()
        setFollowStatus({
          following: result.following || false,
          notifyOnPost: result.notifyOnPost || false,
        })
      }
    } catch (err) {
      console.error('获取关注状态错误:', err)
    }
  }, [user, username])

  // 获取个人主页数据
  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/profile/${username}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '获取用户信息失败')
      }

      setData(result)

      // 如果用户已登录，获取点赞状态和关注状态
      if (user) {
        await fetchUserLikes()
        await fetchFollowStatus()
      }
    } catch (err) {
      console.error('获取个人主页错误:', err)
      setError(err instanceof Error ? err.message : '获取用户信息失败，请刷新重试')
    } finally {
      setLoading(false)
    }
  }, [username, user, fetchUserLikes, fetchFollowStatus])

  useEffect(() => {
    if (username) {
      fetchProfileData()
    }
  }, [username, fetchProfileData])

  // 删除动态
  const handlePostDelete = async (postId: string) => {
    try {
      // 乐观更新：立即从 UI 移除
      setData((prevData) => {
        if (!prevData) return prevData
        return {
          ...prevData,
          posts: prevData.posts.filter((post) => post.id !== postId),
          stats: {
            ...prevData.stats,
            postsCount: prevData.stats.postsCount - 1,
          },
        }
      })

      // 获取 access token
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      })

      const result = await response.json()

      if (!response.ok) {
        // 如果删除失败，恢复数据
        await fetchProfileData()
        throw new Error(result.error || '删除失败')
      }
    } catch (err) {
      console.error('删除动态错误:', err)
      throw err
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

    setData((prevData) => {
      if (!prevData) return prevData
      return {
        ...prevData,
        posts: prevData.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes_count: isLiked
                  ? post.likes_count - 1
                  : post.likes_count + 1,
              }
            : post
        ),
      }
    })

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

      const result = await response.json()

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

        setData((prevData) => {
          if (!prevData) return prevData
          return {
            ...prevData,
            posts: prevData.posts.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    likes_count: isLiked
                      ? post.likes_count + 1
                      : post.likes_count - 1,
                  }
                : post
            ),
          }
        })

        throw new Error(result.error || '操作失败')
      }

      // 使用服务器返回的准确点赞数更新
      setData((prevData) => {
        if (!prevData) return prevData
        return {
          ...prevData,
          posts: prevData.posts.map((post) =>
            post.id === postId
              ? { ...post, likes_count: result.likesCount }
              : post
          ),
        }
      })
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
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>返回</span>
        </button>

        {/* 加载状态 */}
        {loading ? (
          <div className="space-y-6 animate-fade-in">
            {/* 用户信息骨架 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start space-x-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* 动态列表骨架 */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          // 错误状态
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center animate-fade-in">
            <div className="text-6xl mb-4">😕</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">出错了</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-500 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-600 transition"
            >
              返回首页
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6 animate-fade-in">
            {/* 用户信息卡片 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                {/* 头像 */}
                <Avatar
                  username={data.profile.username}
                  avatarUrl={data.profile.avatar_url}
                  avatarTemplate={data.profile.avatar_template}
                  size="xl"
                  className="flex-shrink-0"
                />

                {/* 用户信息 */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {data.profile.username}
                  </h1>

                  {/* 个人简介 */}
                  {data.profile.bio && (
                    <p className="text-gray-700 mb-3">{data.profile.bio}</p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-gray-500 mb-4">
                    {data.profile.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{data.profile.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm" suppressHydrationWarning>
                        加入于 {formatRelativeTime(data.profile.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* 统计数据 */}
                  <div className="flex items-center space-x-6">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">
                        {data.stats.postsCount}
                      </span>
                      <span className="text-gray-600 ml-1">动态</span>
                    </div>
                  </div>
                </div>

                {/* 编辑按钮（仅自己可见） */}
                {isOwnProfile && (
                  <Link
                    href="/profile/edit"
                    className="bg-gray-100 text-gray-700 px-5 py-2 rounded-full font-medium hover:bg-gray-200 transition active:scale-95 self-start sm:self-auto"
                  >
                    编辑资料
                  </Link>
                )}

                {/* 关注按钮（仅他人主页显示） */}
                {!isOwnProfile && data?.profile && (
                  <FollowButton
                    userId={data.profile.id}
                    username={data.profile.username}
                    initialFollowing={followStatus.following}
                    initialNotifyOnPost={followStatus.notifyOnPost}
                    onFollowChange={(following) => {
                      setFollowStatus(prev => ({ ...prev, following }))
                    }}
                  />
                )}
              </div>
            </div>

            {/* 统计数据 */}
            <UserStats username={username} />

            {/* 动态列表标题 */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {isOwnProfile ? '我的动态' : `${data.profile.username} 的动态`}
              </h2>
              <span className="text-sm text-gray-500">
                共 {data.stats.postsCount} 条
              </span>
            </div>

            {/* 动态列表 */}
            {data.posts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  还没有动态
                </h3>
                <p className="text-gray-600">
                  {isOwnProfile ? '发布你的第一条动态吧！' : '这个用户还没有发布任何动态'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={handleToggleLike}
                    onUnlike={handleToggleLike}
                    onDelete={isOwnProfile ? handlePostDelete : undefined}
                    isLiked={likedPostIds.has(post.id)}
                    commentsCount={post.comments_count || 0}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}
