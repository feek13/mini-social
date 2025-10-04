import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api' // import { createClient } from '@supabase/supabase-js'
import { extractMentions } from '@/lib/textParser'

// GET - 获取动态的评论列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient()
    const { id: postId } = await params

    if (!postId) {
      return NextResponse.json(
        { error: '动态 ID 无效' },
        { status: 400 }
      )
    }

    // 获取评论列表，按时间正序
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:profiles!comments_user_id_fkey (
          username,
          avatar_url,
          avatar_template
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('获取评论列表错误:', error)
      return NextResponse.json(
        { error: '获取评论列表失败' },
        { status: 500 }
      )
    }

    // 重命名 profiles 为 user 以匹配前端期望
    const commentsWithUser = comments?.map(comment => ({
      ...comment,
      user: comment.user, // 已经是user了，因为我们用了别名
    }))

    return NextResponse.json({ comments: commentsWithUser || [] })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// POST - 创建新评论
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 从请求头获取 Authorization token
    const authHeader = request.headers.get('authorization')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // 为认证操作创建带token的客户端
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? {
          Authorization: authHeader,
        } : {},
      },
    })

    // 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''))

    if (authError || !user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const { id: postId } = await params

    if (!postId) {
      return NextResponse.json(
        { error: '动态 ID 无效' },
        { status: 400 }
      )
    }

    // 获取请求数据
    const { content } = await request.json()

    // 验证内容
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: '请输入评论内容' },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()

    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { error: '评论内容不能为空' },
        { status: 400 }
      )
    }

    if (trimmedContent.length > 280) {
      return NextResponse.json(
        { error: '评论内容不能超过 280 个字符' },
        { status: 400 }
      )
    }

    // 检查动态是否存在
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { error: '动态不存在' },
        { status: 404 }
      )
    }

    // 插入新评论
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert([
        {
          post_id: postId,
          user_id: user.id,
          content: trimmedContent,
        },
      ])
      .select(`
        *,
        user:profiles!comments_user_id_fkey (
          username,
          avatar_url,
          avatar_template
        )
      `)
      .single()

    if (insertError) {
      console.error('创建评论错误:', insertError)
      return NextResponse.json(
        { error: '创建评论失败，请重试' },
        { status: 500 }
      )
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
            comment_id: comment.id,
            mentioned_user_id: mentionedUser.id,
            mentioner_user_id: user.id
          }])
      }
    }

    return NextResponse.json(
      { message: '评论成功', comment },
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
