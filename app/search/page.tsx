'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Loader2, ArrowLeft } from 'lucide-react'
import Avatar from '@/components/Avatar'
import PostCard from '@/components/PostCard'
import { Profile, Post } from '@/types/database'

type TabType = 'users' | 'posts'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''

  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [users, setUsers] = useState<Profile[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [usersTotal, setUsersTotal] = useState(0)
  const [postsTotal, setPostsTotal] = useState(0)

  // 搜索用户
  const searchUsers = async () => {
    if (!query || query.length < 2) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=users&limit=20`
      )
      if (response.ok) {
        const data = await response.json()
        setUsers(data.results)
        setUsersTotal(data.total)
      }
    } catch (error) {
      console.error('Failed to search users:', error)
    } finally {
      setLoading(false)
    }
  }

  // 搜索动态
  const searchPosts = async () => {
    if (!query || query.length < 2) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=posts&limit=20`
      )
      if (response.ok) {
        const data = await response.json()
        setPosts(data.results)
        setPostsTotal(data.total)
      }
    } catch (error) {
      console.error('Failed to search posts:', error)
    } finally {
      setLoading(false)
    }
  }

  // 当查询或标签变化时执行搜索
  useEffect(() => {
    if (activeTab === 'users') {
      searchUsers()
    } else {
      searchPosts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeTab])

  // 高亮匹配的文本
  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery) return text

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  const [searchInput, setSearchInput] = useState(query)

  // 当 query 变化时更新 searchInput
  useEffect(() => {
    setSearchInput(query)
  }, [query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`)
    }
  }

  if (!query) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">搜索</h1>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索用户或动态..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              autoFocus
            />
          </div>
        </form>

        {/* 空状态提示 */}
        <div className="text-center py-12">
          <Search size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">搜索用户或动态</h2>
          <p className="text-gray-500">输入关键词开始搜索</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 搜索框 */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索用户或动态..."
            className="w-full pl-12 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
      </form>

      {/* 搜索结果提示 */}
      <div className="mb-6">
        <p className="text-gray-600">
          {activeTab === 'users'
            ? `找到 ${usersTotal} 个用户`
            : `找到 ${postsTotal} 条动态`}
        </p>
      </div>

      {/* 标签切换 */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-medium transition relative ${
            activeTab === 'users'
              ? 'text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          用户
          {usersTotal > 0 && (
            <span className="ml-2 text-sm text-gray-500">({usersTotal})</span>
          )}
          {activeTab === 'users' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-3 font-medium transition relative ${
            activeTab === 'posts'
              ? 'text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          动态
          {postsTotal > 0 && (
            <span className="ml-2 text-sm text-gray-500">({postsTotal})</span>
          )}
          {activeTab === 'posts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <span className="ml-3 text-gray-600">搜索中...</span>
        </div>
      )}

      {/* 用户结果 */}
      {!loading && activeTab === 'users' && (
        <div className="space-y-4">
          {users.length > 0 ? (
            users.map(user => (
              <Link
                key={user.id}
                href={`/profile/${user.username}`}
                className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition"
              >
                <div className="flex items-center space-x-4">
                  <Avatar
                    username={user.username}
                    avatarUrl={user.avatar_url}
                    avatarTemplate={user.avatar_template}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {highlightText(user.username, query)}
                    </h3>
                    {user.bio && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {highlightText(user.bio, query)}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition">
                      查看主页
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-16">
              <Search size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                没有找到相关用户
              </h3>
              <p className="text-gray-500">试试其他关键词</p>
            </div>
          )}
        </div>
      )}

      {/* 动态结果 */}
      {!loading && activeTab === 'posts' && (
        <div className="space-y-4">
          {posts.length > 0 ? (
            posts.map(post => (
              <div key={post.id} className="relative">
                <PostCard post={post} />
                {/* 可以添加高亮显示匹配内容的功能 */}
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <Search size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                没有找到相关动态
              </h3>
              <p className="text-gray-500">试试其他关键词</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex justify-center items-center">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <span className="ml-3 text-gray-600">加载中...</span>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
