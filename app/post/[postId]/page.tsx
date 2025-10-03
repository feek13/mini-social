import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PostDetailClient from './PostDetailClient'

// 生成动态 metadata
export async function generateMetadata({
  params
}: {
  params: Promise<{ postId: string }>
}): Promise<Metadata> {
  try {
    const { postId } = await params

    // 获取动态详情
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl.replace('/supabase', '')}/api/posts/${postId}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      return {
        title: '动态不存在 - MiniSocial',
      }
    }

    const { post } = await response.json()

    const title = `${post.user?.username || '用户'}: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''} - MiniSocial`
    const description = post.content.substring(0, 160)

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
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/supabase', '') || 'http://localhost:3000'

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
      comments = (commentsData.comments || []).filter((comment: any) => !comment.parent_comment_id)
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
