import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'
import { requireAuth } from '@/lib/auth'
import { rateLimitByType } from '@/lib/rateLimit'

// DELETE - 删除评论
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 认证检查
    const auth = await requireAuth(request)
    if (!auth.user) return auth.response!

    const { user, accessToken } = auth

    // 2. 速率限制检查
    const rateLimit = rateLimitByType(user.id, 'normal')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: '操作过于频繁，请稍后再试' },
        { status: 429 }
      )
    }

    // 3. 获取评论 ID
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: '评论 ID 无效' },
        { status: 400 }
      )
    }

    // 4. 使用带认证的客户端
    const supabase = getSupabaseClientWithAuth(accessToken!)

    // 5. 查询评论是否存在，并验证所有权
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
