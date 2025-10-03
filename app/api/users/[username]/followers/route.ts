import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET - 获取粉丝列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const supabase = createClient()

    // 查找目标用户
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 获取粉丝总数
    const { count, error: countError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', targetUser.id)

    if (countError) {
      console.error('获取粉丝数错误:', countError)
    }

    // 获取粉丝列表
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select(`
        follower_id,
        created_at,
        follower:profiles!follows_follower_id_fkey(
          id,
          username,
          avatar_url,
          avatar_template,
          bio
        )
      `)
      .eq('following_id', targetUser.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (followsError) {
      console.error('获取粉丝列表错误:', followsError)
      return NextResponse.json(
        { error: '获取粉丝列表失败' },
        { status: 500 }
      )
    }

    // 提取粉丝信息
    const followers = follows?.map((f: any) => f.follower).filter(Boolean) || []

    return NextResponse.json({
      followers,
      total: count || 0,
      page,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
