import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json()

    // 验证输入
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 验证用户名格式
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: '用户名长度应在 3-20 个字符之间' },
        { status: 400 }
      )
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: '用户名只能包含字母、数字和下划线' },
        { status: 400 }
      )
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少需要 6 个字符' },
        { status: 400 }
      )
    }

    // 创建 Supabase 客户端
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 检查用户名是否已存在
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: '该用户名已被使用' },
        { status: 400 }
      )
    }

    // 使用 Supabase Auth 创建用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })

    if (authError) {
      console.error('注册错误:', authError)

      // 处理常见错误
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: '该邮箱已被注册' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: authError.message || '注册失败，请重试' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: '注册失败，请重试' },
        { status: 500 }
      )
    }

    // 在 profiles 表中创建用户资料（使用 admin client 绕过 RLS）
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          username,
        },
      ])

    if (profileError) {
      console.error('创建用户资料错误:', profileError)

      // 如果创建资料失败，删除已创建的认证用户（回滚）
      // 注意：这需要 service role key
      // 为了简化，我们先记录错误
      return NextResponse.json(
        { error: '创建用户资料失败，请联系管理员' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: '注册成功',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          username,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('注册 API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
