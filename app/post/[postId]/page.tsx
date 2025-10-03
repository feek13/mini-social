import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PostDetailClient from './PostDetailClient'
import { Comment } from '@/types/database'

// 生成动态 metadata
export async function generateMetadata({
  params
}: {
  params: Promise<{ postId: string }>
}): Promise<Metadata> {
  try {
    const { postId } = await params

    // 获取动态详情
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/posts/${postId}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      return {
        title: '动态不存在 - MiniSocial',
      }
    }

    const { post } = await response.json()

    // 如果是转发，使用原帖内容；否则使用当前帖子内容
    let displayContent = post.content || ''
    let displayUsername = post.user?.username || '用户'

    if (post.is_repost && post.original_post) {
      displayContent = post.original_post.content || ''
      displayUsername = post.original_post.user?.username || '用户'

      // 如果转发有评论，添加到标题中
      if (post.repost_comment) {
        displayContent = `${post.repost_comment} (转发: ${displayContent})`
      }
    }

    // 如果没有内容，使用默认文本
    if (!displayContent.trim()) {
      displayContent = '查看这条动态'
    }

    const title = `${displayUsername}: ${displayContent.substring(0, 100)}${displayContent.length > 100 ? '...' : ''} - MiniSocial`
    const description = displayContent.substring(0, 160)

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: post.created_at,
        authors: [post.user?.username || '未知用户'],
        images: post.images && post.images.length > 0 ? [
          {
            url: post.images[0],
            width: 1200,
            height: 630,
            alt: '动态图片',
          }
        ] : [],
      },
      twitter: {
        card: post.images && post.images.length > 0 ? 'summary_large_image' : 'summary',
        title,
        description,
        images: post.images && post.images.length > 0 ? [post.images[0]] : [],
      },
    }
  } catch (error) {
    console.error('生成 metadata 失败:', error)
    return {
      title: 'MiniSocial',
    }
  }
}

export default async function PostDetailPage({
  params
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = await params

  // 获取动态详情
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  let post = null
  let comments = []

  try {
    const postResponse = await fetch(`${baseUrl}/api/posts/${postId}`, {
      cache: 'no-store'
    })

    if (!postResponse.ok) {
      notFound()
    }

    const postData = await postResponse.json()
    post = postData.post

    // 获取评论列表（只获取一级评论）
    const commentsResponse = await fetch(`${baseUrl}/api/posts/${postId}/comments`, {
      cache: 'no-store'
    })

    if (commentsResponse.ok) {
      const commentsData = await commentsResponse.json()
      // 只保留一级评论（parent_comment_id 为 null）
      comments = (commentsData.comments || []).filter((comment: Comment) => !comment.parent_comment_id)
    }
  } catch (error) {
    console.error('获取动态详情失败:', error)
    notFound()
  }

  if (!post) {
    notFound()
  }

  return <PostDetailClient post={post} initialComments={comments} />
}
