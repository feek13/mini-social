import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'

export const dynamic = 'force-dynamic'

// GET - 获取包含指定话题的动态列表
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params
    const supabase = getSupabaseClient()

    // 查找话题
    const { data: hashtag, error: hashtagError } = await supabase
      .from('hashtags')
      .select('id, name, usage_count')
      .eq('name', tag.toLowerCase())
      .single()

    if (hashtagError || !hashtag) {
      return NextResponse.json(
        { error: '话题不存在' },
        { status: 404 }
      )
    }

    // 获取包含该话题的动态
    const { data: postHashtags, error: postHashtagsError } = await supabase
      .from('post_hashtags')
      .select(`
        post_id,
        posts (
          *,
          profiles!posts_user_id_fkey (
            username,
            avatar_url,
            avatar_template
          ),
          comments(count)
        )
      `)
      .eq('hashtag_id', hashtag.id)
      .order('created_at', { ascending: false })

    if (postHashtagsError) {
      console.error('获取动态列表错误:', postHashtagsError)
      return NextResponse.json(
        { error: '获取动态列表失败' },
        { status: 500 }
      )
    }

    // 收集所有动态ID用于计算转发数
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts = postHashtags?.map((ph: any) => ph.posts).filter(Boolean) || []
    const allPostIds = new Set<string>()
    posts.forEach(post => {
      if (!post.is_repost) {
        allPostIds.add(post.id)
      }
      if (post.is_repost && post.original_post_id) {
        allPostIds.add(post.original_post_id)
      }
    })

    // 计算每个动态的实际转发数
    const repostCountsMap: Record<string, number> = {}
    if (allPostIds.size > 0) {
      const { data: repostCounts } = await supabase
        .from('posts')
        .select('original_post_id')
        .in('original_post_id', Array.from(allPostIds))
        .eq('is_repost', true)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repostCounts?.forEach((repost: any) => {
        const postId = repost.original_post_id
        repostCountsMap[postId] = (repostCountsMap[postId] || 0) + 1
      })
    }

    // 格式化动态数据
    const postsWithUser = posts.map(post => ({
      ...post,
      user: post.profiles,
      profiles: undefined,
      comments_count: post.comments?.[0]?.count || 0,
      comments: undefined,
      repost_count: repostCountsMap[post.id] || 0
    }))

    return NextResponse.json({
      hashtag,
      posts: postsWithUser
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
