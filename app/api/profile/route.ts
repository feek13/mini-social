import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api' // import { createClient } from '@supabase/supabase-js'
import { isValidAvatarTemplate } from '@/lib/avatar'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// GET - 获取当前用户资料
export async function GET(request: NextRequest) {
  try {
    // 获取 Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // 创建 Supabase 客户端
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    // 验证用户 - 传入 token 以验证
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 获取用户资料
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('获取用户资料错误:', profileError)
      return NextResponse.json(
        { error: '获取用户资料失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('获取用户资料错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 获取 Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // 创建 Supabase 客户端
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    // 验证用户 - 传入 token 以验证
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 获取请求体
    const body = await request.json()
    const { username, avatar_template, bio, location } = body

    // 验证数据
    if (username) {
      const trimmedUsername = username.trim()
      if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
        return NextResponse.json(
          { error: '用户名长度必须在 3-20 个字符之间' },
          { status: 400 }
        )
      }
    }

    if (avatar_template && !isValidAvatarTemplate(avatar_template)) {
      return NextResponse.json(
        { error: '无效的头像模版' },
        { status: 400 }
      )
    }

    if (bio && bio.length > 160) {
      return NextResponse.json(
        { error: '个人简介不能超过 160 个字符' },
        { status: 400 }
      )
    }

    if (location && location.length > 50) {
      return NextResponse.json(
        { error: '位置不能超过 50 个字符' },
        { status: 400 }
      )
    }

    // 如果要更新用户名，检查是否已存在
    if (username && username !== user.user_metadata?.username) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .single()

      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: '该用户名已被使用' },
          { status: 409 }
        )
      }
    }

    // 准备更新数据
    const updateData: Record<string, string | undefined> = {}
    if (username !== undefined) updateData.username = username.trim()
    if (avatar_template !== undefined) updateData.avatar_template = avatar_template
    if (bio !== undefined) updateData.bio = bio.trim() || null
    if (location !== undefined) updateData.location = location.trim() || null

    // 更新用户信息
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('更新用户信息错误:', updateError)
      return NextResponse.json(
        { error: '更新失败，请重试' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: updatedUser,
    })
  } catch (error) {
    console.error('更新个人资料错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
