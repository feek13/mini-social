'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import PostCard from '@/components/PostCard'
import { Post } from '@/types/database'

interface Hashtag {
  id: string
  name: string
  usage_count: number
}

export default function HashtagPage() {
  const params = useParams()
  const router = useRouter()
  const tag = params.tag as string
  const [hashtag, setHashtag] = useState<Hashtag | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadHashtagPosts() {
      try {
        setLoading(true)
        const response = await fetch(`/api/hashtags/${tag}/posts`)

        if (!response.ok) {
          throw new Error('话题不存在')
        }

        const data = await response.json()
        setHashtag(data.hashtag)
        setPosts(data.posts || [])
      } catch (err) {
        console.error('加载话题动态失败:', err)
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }

    loadHashtagPosts()
  }, [tag])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !hashtag) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">话题不存在</h1>
          <p className="text-gray-600 mb-4">{error || '找不到该话题'}</p>
          <button
            onClick={() => router.back()}
            className="text-blue-500 hover:underline"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* 头部 */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          返回
        </button>

        <h1 className="text-3xl font-bold mb-2">#{hashtag.name}</h1>
        <p className="text-gray-600">
          {hashtag.usage_count} 条动态
        </p>
      </div>

      {/* 动态列表 */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            还没有包含此话题的动态
          </div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
  )
}
