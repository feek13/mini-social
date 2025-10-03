import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// DELETE - 删除评论
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // 从请求头获取 Authorization token
    const authHeader = request.headers.get('authorization')

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

    // 获取评论 ID
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: '评论 ID 无效' },
        { status: 400 }
      )
    }

    // 先查询评论是否存在，并验证所有权
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: '评论不存在' },
        { status: 404 }
      )
    }

    // 验证是否为评论作者
    if (comment.user_id !== user.id) {
      return NextResponse.json(
        { error: '无权删除此评论' },
        { status: 403 }
      )
    }

    // 删除评论
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('删除评论错误:', deleteError)
      return NextResponse.json(
        { error: '删除评论失败，请重试' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: '删除成功' },
      { status: 200 }
    )
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
