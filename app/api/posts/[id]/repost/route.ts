import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'

// POST - 转发动态
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

    // 获取请求体（转发评论）
    const body = await request.json()
    const { comment } = body

    // 验证评论长度
    if (comment && comment.length > 280) {
      return NextResponse.json(
        { error: '评论不能超过 280 个字符' },
        { status: 400 }
      )
    }

    // 检查原动态是否存在
    const { data: originalPost, error: postError } = await supabase
      .from('posts')
      .select('id, user_id, is_repost')
      .eq('id', postId)
      .single()

    if (postError || !originalPost) {
      return NextResponse.json(
        { error: '原动态不存在' },
        { status: 404 }
      )
    }

    // 不能转发自己已经转发过的动态（避免嵌套转发）
    if (originalPost.is_repost) {
      return NextResponse.json(
        { error: '不能转发已转发的动态' },
        { status: 400 }
      )
    }

    // 不能转发自己的动态
    if (originalPost.user_id === user.id) {
      return NextResponse.json(
        { error: '不能转发自己的动态' },
        { status: 400 }
      )
    }

    // 检查是否已经转发过
    const { data: existingRepost, error: checkError } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('original_post_id', postId)
      .eq('is_repost', true)
      .maybeSingle()

    if (checkError) {
      console.error('检查转发状态错误:', checkError)
      return NextResponse.json(
        { error: '检查转发状态失败' },
        { status: 500 }
      )
    }

    if (existingRepost) {
      return NextResponse.json(
        { error: '您已经转发过该动态' },
        { status: 409 }
      )
    }

    // 创建转发记录
    const { data: repost, error: insertError } = await supabase
      .from('posts')
      .insert([
        {
          user_id: user.id,
          content: '', // 转发动态内容为空
          is_repost: true,
          original_post_id: postId,
          repost_comment: comment || null,
          images: [], // 转发不包含图片
          hot_score: 0, // 显式设置默认值，避免触发器错误
          likes_count: 0,
          repost_count: 0,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error('转发失败:', insertError)
      return NextResponse.json(
        { error: '转发失败，请重试' },
        { status: 500 }
      )
    }

    // 手动计算转发数（触发器可能未生效）
    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('original_post_id', postId)
      .eq('is_repost', true)

    return NextResponse.json({
      message: '转发成功',
      repost,
      repostCount: count || 0,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// DELETE - 取消转发
export async function DELETE(
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

    // 查找该用户对该动态的转发记录
    const { data: repost, error: findError } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('original_post_id', postId)
      .eq('is_repost', true)
      .maybeSingle()

    if (findError) {
      console.error('查找转发记录错误:', findError)
      return NextResponse.json(
        { error: '查找转发记录失败' },
        { status: 500 }
      )
    }

    if (!repost) {
      return NextResponse.json(
        { error: '未找到转发记录' },
        { status: 404 }
      )
    }

    // 删除转发记录
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', repost.id)

    if (deleteError) {
      console.error('删除转发记录错误:', deleteError)
      return NextResponse.json(
        { error: '取消转发失败' },
        { status: 500 }
      )
    }

    // 手动计算转发数（触发器可能未生效）
    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('original_post_id', postId)
      .eq('is_repost', true)

    return NextResponse.json({
      message: '已取消转发',
      success: true,
      repostCount: count || 0,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// GET - 检查当前用户是否已转发
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 从请求头获取 Authorization token
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({
        hasReposted: false,
      })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    // 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({
        hasReposted: false,
      })
    }

    // 获取动态 ID
    const { id: postId } = await params

    if (!postId) {
      return NextResponse.json(
        { error: '动态 ID 无效' },
        { status: 400 }
      )
    }

    // 查找转发记录
    const { data: repost, error: findError } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('original_post_id', postId)
      .eq('is_repost', true)
      .maybeSingle()

    if (findError) {
      console.error('查找转发记录错误:', findError)
      return NextResponse.json({
        hasReposted: false,
      })
    }

    return NextResponse.json({
      hasReposted: !!repost,
      repostId: repost?.id,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json({
      hasReposted: false,
    })
  }
}
