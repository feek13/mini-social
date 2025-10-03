import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteImages } from '@/lib/uploadImage'

// DELETE - 删除动态
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

    // 获取动态 ID
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: '动态 ID 无效' },
        { status: 400 }
      )
    }

    // 先查询动态是否存在，并验证所有权（同时获取图片信息）
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('user_id, images')
      .eq('id', id)
      .single()

    if (fetchError || !post) {
      return NextResponse.json(
        { error: '动态不存在' },
        { status: 404 }
      )
    }

    // 验证是否为动态作者
    if (post.user_id !== user.id) {
      return NextResponse.json(
        { error: '无权删除此动态' },
        { status: 403 }
      )
    }

    // 删除动态（评论和点赞会因为外键 ON DELETE CASCADE 自动删除）
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('删除动态错误:', deleteError)
      return NextResponse.json(
        { error: '删除动态失败，请重试' },
        { status: 500 }
      )
    }

    // 删除关联的图片文件
    if (post.images && post.images.length > 0) {
      try {
        await deleteImages(post.images)
      } catch (imgError) {
        console.error('删除图片失败（非关键错误）:', imgError)
        // 不影响动态删除的成功响应
      }
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

// GET - 获取单个动态详情（可选，用于未来扩展）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('获取动态详情')

    // 获取动态 ID
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: '动态 ID 无效' },
        { status: 400 }
      )
    }

    // 获取动态详情（包含用户信息）
    // 使用两次查询避免关系歧义
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()

    if (postError || !postData) {
      console.error('获取动态详情错误:', postError)
      return NextResponse.json(
        { error: '动态不存在' },
        { status: 404 }
      )
    }

    // 获取用户信息
    const { data: userData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, avatar_template')
      .eq('id', postData.user_id)
      .single()

    const post = {
      ...postData,
      user: userData
    }

    const error = null

    if (error) {
      console.error('获取动态详情错误:', error)
      return NextResponse.json(
        { error: '动态不存在' },
        { status: 404 }
      )
    }

    if (!post) {
      return NextResponse.json(
        { error: '动态不存在' },
        { status: 404 }
      )
    }

    // 如果是转发，获取原动态
    if (post.is_repost && post.original_post_id) {
      const { data: originalPostData } = await supabase
        .from('posts')
        .select('*')
        .eq('id', post.original_post_id)
        .single()

      if (originalPostData) {
        // 获取原动态作者信息
        const { data: originalUserData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, avatar_template')
          .eq('id', originalPostData.user_id)
          .single()

        post.original_post = {
          ...originalPostData,
          user: originalUserData
        }
      }
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
