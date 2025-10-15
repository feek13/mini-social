import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseClientWithAuth } from '@/lib/supabase-api'
import { extractHashtags, extractMentions } from '@/lib/textParser'
import { requireAuth } from '@/lib/auth'
import { PostSchema, validateData } from '@/lib/validation'
import { rateLimitByType } from '@/lib/rateLimit'
import { sanitizeText } from '@/lib/sanitize'
import { filterContent, isUserBanned } from '@/lib/content-filter'

// 配置路由段缓存
export const dynamic = 'force-dynamic' // 禁用静态生成
export const revalidate = 10 // 10秒重新验证缓存

// GET - 获取所有动态列表
export async function GET() {
  try {
    const supabase = getSupabaseClient()

    // 获取动态列表，按时间倒序，关联用户信息、评论计数和 DeFi embeds
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (
          username,
          avatar_url,
          avatar_template
        ),
        comments(count),
        post_defi_embeds(*)
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
          comments(count),
          post_defi_embeds(*)
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
            comments: undefined,
            defi_embeds: post.post_defi_embeds || [],
            post_defi_embeds: undefined
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

    // 重命名 profiles 为 user，添加 comments_count、original_post、defi_embeds，更新 repost_count
    const postsWithUser = posts?.map(post => ({
      ...post,
      user: post.profiles,
      profiles: undefined,
      comments_count: post.comments?.[0]?.count || 0,
      comments: undefined,
      repost_count: repostCountsMap[post.id] || 0,
      original_post: post.is_repost && post.original_post_id
        ? originalPostsMap[post.original_post_id]
        : undefined,
      defi_embeds: post.post_defi_embeds || [],
      post_defi_embeds: undefined
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
    // 1. 认证检查
    const auth = await requireAuth(request)
    if (!auth.user) return auth.response!

    const { user, accessToken } = auth

    // 2. 检查用户是否被封禁
    const isBanned = await isUserBanned(user.id)
    if (isBanned) {
      return NextResponse.json(
        { error: '您的账号已被封禁，无法发布内容' },
        { status: 403 }
      )
    }

    // 3. 速率限制检查
    const rateLimit = rateLimitByType(user.id, 'normal')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: '发布过于频繁，请稍后再试' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          }
        }
      )
    }

    // 3. 获取并验证请求数据
    const body = await request.json()
    const { content, originalPostId, defiEmbeds, linkPreview } = body

    // 如果是引用转发
    if (originalPostId) {
      // 验证评论长度
      if (content && content.length > 280) {
        return NextResponse.json(
          { error: '评论不能超过 280 个字符' },
          { status: 400 }
        )
      }

      // 5. 使用带认证的客户端
      const supabase = getSupabaseClientWithAuth(accessToken!)

      // 检查原动态是否存在
      const { data: originalPost, error: postError } = await supabase
        .from('posts')
        .select('id, user_id, is_repost')
        .eq('id', originalPostId)
        .single()

      if (postError || !originalPost) {
        return NextResponse.json(
          { error: '原动态不存在' },
          { status: 404 }
        )
      }

      // 不能引用已经转发的动态
      if (originalPost.is_repost) {
        return NextResponse.json(
          { error: '不能引用已转发的动态' },
          { status: 400 }
        )
      }

      // 检查是否已经转发过
      const { data: existingRepost } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('original_post_id', originalPostId)
        .eq('is_repost', true)
        .maybeSingle()

      if (existingRepost) {
        return NextResponse.json(
          { error: '您已经转发过该动态' },
          { status: 409 }
        )
      }

      // 创建引用转发
      let trimmedContent = content ? sanitizeText(content.trim()) : ''

      // 如果有转发评论，进行内容过滤
      if (trimmedContent) {
        const filterResult = await filterContent(trimmedContent)

        if (filterResult.isBlocked) {
          return NextResponse.json(
            {
              error: '内容包含严重违规内容，无法发布',
              details: filterResult.matchedWords.map(w => `${w.word} (${w.severity})`)
            },
            { status: 400 }
          )
        }

        // 使用过滤后的内容
        trimmedContent = filterResult.filteredContent
      }

      const { data: post, error: insertError } = await supabase
        .from('posts')
        .insert([
          {
            user_id: user.id,
            content: '',
            is_repost: true,
            original_post_id: originalPostId,
            repost_comment: trimmedContent || null,
            images: [],
            hot_score: 0,
            likes_count: 0,
            repost_count: 0,
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
        console.error('创建引用转发错误:', insertError)
        return NextResponse.json(
          { error: '创建引用转发失败，请重试' },
          { status: 500 }
        )
      }

      const postWithUser = post ? {
        ...post,
        user: post.profiles,
        profiles: undefined
      } : null

      return NextResponse.json(
        { message: '引用发布成功', post: postWithUser },
        { status: 201 }
      )
    }

    // 普通发布
    const validation = validateData(PostSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // 4. 清理用户输入
    let trimmedContent = validatedData.content ? sanitizeText(validatedData.content.trim()) : ''

    // 5. 内容过滤检查
    if (trimmedContent) {
      const filterResult = await filterContent(trimmedContent)

      if (filterResult.isBlocked) {
        return NextResponse.json(
          {
            error: '内容包含严重违规内容，无法发布',
            details: filterResult.matchedWords.map(w => `${w.word} (${w.severity})`)
          },
          { status: 400 }
        )
      }

      // 使用过滤后的内容
      trimmedContent = filterResult.filteredContent
    }

    // 6. 使用带认证的客户端
    const supabase = getSupabaseClientWithAuth(accessToken!)

    // 6. 插入新动态
    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert([
        {
          user_id: user.id,
          content: trimmedContent,
          images: validatedData.images || null,
          link_preview: linkPreview || null,
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

    // 处理话题标签
    if (trimmedContent) {
      const hashtags = extractHashtags(trimmedContent)

      for (const tag of hashtags) {
        // 查找或创建话题
        let { data: hashtag } = await supabase
          .from('hashtags')
          .select('id')
          .eq('name', tag)
          .single()

        if (!hashtag) {
          const { data: newHashtag } = await supabase
            .from('hashtags')
            .insert([{ name: tag }])
            .select('id')
            .single()

          hashtag = newHashtag
        }

        // 创建动态-话题关联
        if (hashtag) {
          await supabase
            .from('post_hashtags')
            .insert([{
              post_id: post.id,
              hashtag_id: hashtag.id
            }])
        }
      }

      // 处理 @ 提及
      const mentions = extractMentions(trimmedContent)

      for (const username of mentions) {
        // 查找被提及的用户
        const { data: mentionedUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single()

        // 如果用户存在，创建提及记录
        if (mentionedUser) {
          await supabase
            .from('mentions')
            .insert([{
              post_id: post.id,
              mentioned_user_id: mentionedUser.id,
              mentioner_user_id: user.id
            }])
        }
      }
    }

    // 处理 DeFi embeds
    if (defiEmbeds && Array.isArray(defiEmbeds) && defiEmbeds.length > 0) {
      // 定义 DeFi embed 类型
      interface DeFiEmbed {
        type: string
        referenceId: string
        snapshotData: Record<string, unknown>
      }

      // 限制最多 3 个 DeFi embeds
      const embedsToInsert = (defiEmbeds as DeFiEmbed[]).slice(0, 3).map((embed) => ({
        post_id: post.id,
        embed_type: embed.type,
        reference_id: embed.referenceId,
        snapshot_data: embed.snapshotData,
      }))

      const { error: embedsError } = await supabase
        .from('post_defi_embeds')
        .insert(embedsToInsert)

      if (embedsError) {
        console.error('插入 DeFi embeds 错误:', embedsError)
        // 不阻止发布成功，只记录错误
      }
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
