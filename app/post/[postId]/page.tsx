import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PostDetailClient from './PostDetailClient'
import { Comment } from '@/types/database'
import { createClient } from '@supabase/supabase-js'

// 生成动态 metadata
export async function generateMetadata({
  params
}: {
  params: Promise<{ postId: string }>
}): Promise<Metadata> {
  try {
    const { postId } = await params

    // 直接使用 Supabase 客户端获取数据
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 获取帖子数据
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (postError || !postData) {
      return {
        title: '动态不存在 - MiniSocial',
      }
    }

    // 获取用户信息
    const { data: userData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, avatar_template')
      .eq('id', postData.user_id)
      .single()

    const post = {
      ...postData,
      user: userData
    }

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

  // 直接使用 Supabase 客户端获取数据
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  let post = null
  let comments = []

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
    }

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

    // 获取评论列表（只获取一级评论）
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*, user:user_id(*)')
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })

    if (commentsData) {
      comments = commentsData.map((comment: Record<string, unknown>) => ({
        ...comment,
        user: comment.user
      }))
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
