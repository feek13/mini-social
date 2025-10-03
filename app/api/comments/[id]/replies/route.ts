import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'
import { createClient } from '@supabase/supabase-js'

// GET - 获取评论的回复列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient()
    const { id: commentId } = await params

    if (!commentId) {
      return NextResponse.json(
        { error: '评论 ID 无效' },
        { status: 400 }
      )
    }

    // 获取评论详情
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select(`
        *,
        user:profiles!comments_user_id_fkey (
          username,
          avatar_url,
          avatar_template
        )
      `)
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json(
        { error: '评论不存在' },
        { status: 404 }
      )
    }

    // 获取回复列表（parent_comment_id = commentId）
    const { data: replies, error: repliesError } = await supabase
      .from('comments')
      .select(`
        *,
        user:profiles!comments_user_id_fkey (
          username,
          avatar_url,
          avatar_template
        )
      `)
      .eq('parent_comment_id', commentId)
      .order('created_at', { ascending: true })

    if (repliesError) {
      console.error('获取回复列表错误:', repliesError)
      return NextResponse.json(
        { error: '获取回复列表失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      comment,
      replies: replies || []
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// POST - 创建回复
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

    const { id: parentCommentId } = await params

    if (!parentCommentId) {
      return NextResponse.json(
        { error: '评论 ID 无效' },
        { status: 400 }
      )
    }

    // 获取请求数据
    const { content } = await request.json()

    // 验证内容
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: '请输入回复内容' },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()

    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { error: '回复内容不能为空' },
        { status: 400 }
      )
    }

    if (trimmedContent.length > 280) {
      return NextResponse.json(
        { error: '回复内容不能超过 280 个字符' },
        { status: 400 }
      )
    }

    // 检查父评论是否存在，并获取其信息
    const { data: parentComment, error: parentError } = await supabase
      .from('comments')
      .select('id, post_id, depth')
      .eq('id', parentCommentId)
      .single()

    if (parentError || !parentComment) {
      return NextResponse.json(
        { error: '父评论不存在' },
        { status: 404 }
      )
    }

    // 插入新回复
    const { data: reply, error: insertError } = await supabase
      .from('comments')
      .insert([
        {
          post_id: parentComment.post_id,
          user_id: user.id,
          parent_comment_id: parentCommentId,
          content: trimmedContent,
          depth: parentComment.depth + 1,
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
      console.error('创建回复错误:', insertError)
      return NextResponse.json(
        { error: '创建回复失败，请重试' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: '回复成功', reply },
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
