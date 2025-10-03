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

    // 检查是否已点赞
    const { data: existingLikes, error: checkError } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id)

    if (checkError) {
      console.error('检查点赞状态错误:', checkError)
    }

    console.log('点赞检查结果:', {
      postId,
      userId: user.id,
      existingLikes,
      hasLike: existingLikes && existingLikes.length > 0
    })

    const existingLike = existingLikes && existingLikes.length > 0 ? existingLikes[0] : null

    if (existingLike) {
      // 已点赞，执行取消点赞
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('取消点赞错误:', deleteError)
        return NextResponse.json(
          { error: '取消点赞失败，请重试' },
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
        message: '已取消点赞',
        isLiked: false,
        likesCount: updatedPost?.likes_count || 0,
      })
    } else {
      // 未点赞，执行点赞 - 先删除可能存在的记录，再插入
      // 这样可以避免数据库约束问题
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      // 插入新点赞
      const { error: insertError } = await supabase
        .from('likes')
        .insert([
          {
            post_id: postId,
            user_id: user.id,
          },
        ])

      if (insertError) {
        console.error('点赞错误:', insertError)
        console.error('点赞详细信息:', {
          postId,
          userId: user.id,
          errorCode: insertError.code,
          errorMessage: insertError.message,
          errorDetails: insertError.details
        })
        return NextResponse.json(
          { error: `点赞失败: ${insertError.message}` },
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
    }
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
