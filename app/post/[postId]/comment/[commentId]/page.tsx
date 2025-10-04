import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CommentDetailClient from './CommentDetailClient'
import { Comment, Post } from '@/types/database'
import { createClient } from '@supabase/supabase-js'

// 生成动态 metadata
export async function generateMetadata({
  params
}: {
  params: Promise<{ postId: string; commentId: string }>
}): Promise<Metadata> {
  try {
    const { postId, commentId } = await params

    // 直接使用 Supabase 客户端获取数据
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: commentData, error } = await supabase
      .from('comments')
      .select('*, user:user_id(*)')
      .eq('id', commentId)
      .single()

    if (error || !commentData) {
      return {
        title: '评论不存在 - MiniSocial',
      }
    }

    const comment = {
      ...commentData,
      user: commentData.user
    }

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

  // 直接使用 Supabase 客户端获取数据
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  let post: Post | null = null
  let comment: Comment | null = null
  let replies: Comment[] = []

  try {
    // 获取帖子数据
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (postError || !postData) {
      notFound()
    }

    // 获取用户信息
    const { data: userData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, avatar_template')
      .eq('id', postData.user_id)
      .single()

    post = {
      ...postData,
      user: userData
    } as Post

    // 如果是转发，获取原动态
    if (post.is_repost && post.original_post_id) {
      const { data: originalPostData } = await supabase
        .from('posts')
        .select('*')
        .eq('id', post.original_post_id)
        .single()

      if (originalPostData) {
        const { data: originalUserData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, avatar_template')
          .eq('id', originalPostData.user_id)
          .single()

        post.original_post = {
          ...originalPostData,
          user: originalUserData
        }
      }
    }

    // 获取评论详情
    const { data: commentData, error: commentError } = await supabase
      .from('comments')
      .select('*, user:user_id(*)')
      .eq('id', commentId)
      .single()

    if (commentError || !commentData) {
      notFound()
    }

    comment = {
      ...commentData,
      user: commentData.user
    } as Comment

    // 验证评论属于该动态
    if (comment.post_id !== postId) {
      notFound()
    }

    // 获取回复列表
    const { data: repliesData } = await supabase
      .from('comments')
      .select('*, user:user_id(*)')
      .eq('parent_comment_id', commentId)
      .order('created_at', { ascending: true })

    if (repliesData) {
      replies = repliesData.map((reply: Record<string, unknown>) => ({
        ...reply,
        user: reply.user
      })) as Comment[]
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
