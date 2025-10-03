import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseClientWithAuth } from '@/lib/supabase-api'

// 配置路由段缓存
export const dynamic = 'force-dynamic' // 禁用静态生成
export const revalidate = 10 // 10秒重新验证缓存

// GET - 获取所有动态列表
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    // 获取动态列表，按时间倒序，关联用户信息和评论计数
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (
          username,
          avatar_url,
          avatar_template
        ),
        comments(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取动态列表错误:', error)
      return NextResponse.json(
        { error: '获取动态列表失败' },
        { status: 500 }
      )
    }

    // 获取所有转发动态的原动态ID
    const originalPostIds = posts
      ?.filter(post => post.is_repost && post.original_post_id)
      .map(post => post.original_post_id)
      .filter((id, index, self) => self.indexOf(id) === index) // 去重

    // 如果有转发动态，获取原动态信息
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalPostsMap: Record<string, any> = {}
    if (originalPostIds && originalPostIds.length > 0) {
      const { data: originalPosts } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            avatar_url,
            avatar_template
          ),
          comments(count)
        `)
        .in('id', originalPostIds)

      // 创建原动态映射
      if (originalPosts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalPostsMap = originalPosts.reduce((acc: Record<string, any>, post: any) => {
          acc[post.id] = {
            ...post,
            user: post.profiles,
            profiles: undefined,
            comments_count: post.comments?.[0]?.count || 0,
            comments: undefined
          }
          return acc
        }, {})
      }
    }

    // 收集所有需要计算转发数的动态ID（包括原动态）
    const allPostIds = new Set<string>()
    posts?.forEach(post => {
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

      // 统计每个原动态的转发数
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repostCounts?.forEach((repost: any) => {
        const postId = repost.original_post_id
        repostCountsMap[postId] = (repostCountsMap[postId] || 0) + 1
      })
    }

    // 更新原动态映射中的转发数
    Object.keys(originalPostsMap).forEach(postId => {
      originalPostsMap[postId].repost_count = repostCountsMap[postId] || 0
    })

    // 重命名 profiles 为 user，添加 comments_count 和 original_post，更新 repost_count
    const postsWithUser = posts?.map(post => ({
      ...post,
      user: post.profiles,
      profiles: undefined,
      comments_count: post.comments?.[0]?.count || 0,
      comments: undefined,
      repost_count: repostCountsMap[post.id] || 0,
      original_post: post.is_repost && post.original_post_id
        ? originalPostsMap[post.original_post_id]
        : undefined
    }))

    // 返回响应并设置缓存头
    return NextResponse.json(
      { posts: postsWithUser || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    )
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// POST - 创建新动态
export async function POST(request: NextRequest) {
  try {
    // 从请求头获取 Authorization token
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '')

    if (!accessToken) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 使用带认证的客户端
    const supabase = getSupabaseClientWithAuth(accessToken)

    // 验证用户登录 - 传入 token 以验证
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 获取请求数据
    const { content, images } = await request.json()

    // 验证内容
    if (!content || typeof content !== 'string') {
      // 如果没有内容，检查是否有图片
      if (!images || !Array.isArray(images) || images.length === 0) {
        return NextResponse.json(
          { error: '请输入动态内容或上传图片' },
          { status: 400 }
        )
      }
    }

    const trimmedContent = content?.trim() || ''

    if (trimmedContent.length > 280) {
      return NextResponse.json(
        { error: '动态内容不能超过 280 个字符' },
        { status: 400 }
      )
    }

    // 验证图片
    if (images) {
      if (!Array.isArray(images)) {
        return NextResponse.json(
          { error: '图片格式错误' },
          { status: 400 }
        )
      }

      if (images.length > 9) {
        return NextResponse.json(
          { error: '最多上传 9 张图片' },
          { status: 400 }
        )
      }

      // 验证每个图片 URL
      for (const img of images) {
        if (typeof img !== 'string' || !img.startsWith('http')) {
          return NextResponse.json(
            { error: '图片 URL 格式错误' },
            { status: 400 }
          )
        }
      }
    }

    // 插入新动态
    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert([
        {
          user_id: user.id,
          content: trimmedContent,
          images: images || null,
        },
      ])
      .select(`
        *,
        profiles!posts_user_id_fkey (
          username,
          avatar_url,
          avatar_template
        )
      `)
      .single()

    if (insertError) {
      console.error('创建动态错误:', insertError)
      return NextResponse.json(
        { error: '创建动态失败，请重试' },
        { status: 500 }
      )
    }

    // 重命名 profiles 为 user 以匹配前端期望
    const postWithUser = post ? {
      ...post,
      user: post.profiles,
      profiles: undefined
    } : null

    return NextResponse.json(
      { message: '发布成功', post: postWithUser },
      { status: 201 }
    )
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
