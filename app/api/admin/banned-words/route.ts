import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'
import type { BannedWordSeverity, BannedWordCategory } from '@/types/database'

/**
 * 创建敏感词（管理员专用）
 * POST /api/admin/banned-words
 *
 * Request Body:
 * {
 *   word: string,
 *   severity: BannedWordSeverity,
 *   category: BannedWordCategory,
 *   replacement?: string,
 *   is_regex?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证认证
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 2. 检查管理员权限
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id })
    if (!isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 3. 解析请求体
    const body = await request.json()
    const { word, severity, category, replacement, is_regex = false } = body

    // 4. 验证参数
    if (!word || !severity || !category) {
      return NextResponse.json({ error: '敏感词、严重程度和分类不能为空' }, { status: 400 })
    }

    // 验证正则表达式
    if (is_regex) {
      try {
        new RegExp(word)
      } catch (e) {
        return NextResponse.json({ error: '无效的正则表达式' }, { status: 400 })
      }
    }

    // 5. 创建敏感词
    const { data: bannedWord, error: createError } = await supabase
      .from('banned_words')
      .insert({
        word,
        severity,
        category,
        replacement: replacement || null,
        is_regex,
        added_by: user.id,
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      // 检查是否是重复词
      if (createError.code === '23505') {
        return NextResponse.json({ error: '该敏感词已存在' }, { status: 400 })
      }
      console.error('[Admin Banned Words API] 创建错误:', createError)
      return NextResponse.json({ error: '创建敏感词失败' }, { status: 500 })
    }

    return NextResponse.json({ banned_word: bannedWord })
  } catch (error) {
    console.error('[Admin Banned Words API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * 获取敏感词列表（管理员专用）
 * GET /api/admin/banned-words?severity=high&category=hate_speech&is_active=true&page=1&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证认证
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 2. 检查管理员权限
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id })
    if (!isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 3. 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const severity = searchParams.get('severity')
    const category = searchParams.get('category')
    const is_active = searchParams.get('is_active')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit

    // 4. 构建查询
    let query = supabase
      .from('banned_words')
      .select('*', { count: 'exact' })

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }

    // 5. 执行查询
    const { data: words, error: queryError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (queryError) {
      console.error('[Admin Banned Words API] 查询错误:', queryError)
      return NextResponse.json({ error: '查询敏感词失败' }, { status: 500 })
    }

    return NextResponse.json({
      banned_words: words || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: count ? Math.ceil(count / limit) : 0,
      },
    })
  } catch (error) {
    console.error('[Admin Banned Words API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
