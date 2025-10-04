import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'

export const dynamic = 'force-dynamic'

// GET - 搜索用户名（用于 @ 提及建议）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json(
        { error: '请提供搜索关键词' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // 搜索用户名，限制返回5个结果
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, avatar_template')
      .ilike('username', `${query}%`)
      .limit(5)

    if (error) {
      console.error('搜索用户错误:', error)
      return NextResponse.json(
        { error: '搜索失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
