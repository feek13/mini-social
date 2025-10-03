import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'
import { cookies } from 'next/headers'

// POST - 点赞或取消点赞
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 从请求头获取 Authorization token
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    // 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 获取动态 ID
    const { id: postId } = await params

    if (!postId) {
      return NextResponse.json(
        { error: '动态 ID 无效' },
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

    // 先尝试删除点赞记录（如果存在）
    const { data: deleteData, error: deleteError } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .select()

    // 如果删除成功且有记录被删除，说明之前已点赞，现在取消点赞
    if (!deleteError && deleteData && deleteData.length > 0) {
      // 获取更新后的点赞数
      const { data: updatedPost } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .single()

      return NextResponse.json({
        message: '已取消点赞',
        isLiked: false,
        likesCount: updatedPost?.likes_count || 0,
      })
    }

    // 如果没有记录被删除，说明之前未点赞，现在执行点赞
    const { error: insertError } = await supabase
      .from('likes')
      .insert([
        {
          post_id: postId,
          user_id: user.id,
        },
      ])

    if (insertError) {
      // 如果是重复键错误，说明在并发情况下已经插入了，我们就当作成功
      if (insertError.code === '23505') {
        const { data: updatedPost } = await supabase
          .from('posts')
          .select('likes_count')
          .eq('id', postId)
          .single()

        return NextResponse.json({
          message: '点赞成功',
          isLiked: true,
          likesCount: updatedPost?.likes_count || 1,
        })
      }

      console.error('点赞错误:', insertError)
      return NextResponse.json(
        { error: '点赞失败，请重试' },
        { status: 500 }
      )
    }

    // 获取更新后的点赞数
    const { data: updatedPost } = await supabase
      .from('posts')
      .select('likes_count')
      .eq('id', postId)
      .single()

    return NextResponse.json({
      message: '点赞成功',
      isLiked: true,
      likesCount: updatedPost?.likes_count || 1,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
