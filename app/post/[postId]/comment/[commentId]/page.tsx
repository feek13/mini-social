import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CommentDetailClient from './CommentDetailClient'
import { Comment, Post } from '@/types/database'

// 生成动态 metadata
export async function generateMetadata({
  params
}: {
  params: Promise<{ postId: string; commentId: string }>
}): Promise<Metadata> {
  try {
    const { postId, commentId } = await params

    // 获取评论详情
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/comments/${commentId}/replies`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      return {
        title: '评论不存在 - MiniSocial',
      }
    }

    const { comment } = await response.json()

    const title = `${comment.user?.username || '用户'}: ${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''} - MiniSocial`
    const description = comment.content.substring(0, 160)

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: comment.created_at,
        authors: [comment.user?.username || '未知用户'],
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    }
  } catch (error) {
    console.error('生成 metadata 失败:', error)
    return {
      title: 'MiniSocial',
    }
  }
}

export default async function CommentDetailPage({
  params
}: {
  params: Promise<{ postId: string; commentId: string }>
}) {
  const { postId, commentId } = await params

  // 获取数据
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  let post: Post | null = null
  let comment: Comment | null = null
  let replies: Comment[] = []

  try {
    // 获取动态详情
    const postResponse = await fetch(`${baseUrl}/api/posts/${postId}`, {
      cache: 'no-store'
    })

    if (!postResponse.ok) {
      notFound()
    }

    const postData = await postResponse.json()
    post = postData.post

    // 获取评论详情和回复列表
    const commentResponse = await fetch(`${baseUrl}/api/comments/${commentId}/replies`, {
      cache: 'no-store'
    })

    if (!commentResponse.ok) {
      notFound()
    }

    const commentData = await commentResponse.json()
    comment = commentData.comment
    replies = commentData.replies || []

    // 验证评论属于该动态
    if (comment.post_id !== postId) {
      notFound()
    }
  } catch (error) {
    console.error('获取评论详情失败:', error)
    notFound()
  }

  if (!post || !comment) {
    notFound()
  }

  return <CommentDetailClient post={post} comment={comment} initialReplies={replies} />
}
