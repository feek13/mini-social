import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'
import type { UpdateWalletTrackerRequest } from '@/types/database'

/**
 * 更新钱包追踪
 * PATCH /api/wallet/trackers/[id]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // 1. 验证认证
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 2. 检查追踪记录是否存在且属于当前用户
    const { data: tracker, error: fetchError } = await supabase
      .from('wallet_trackers')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !tracker) {
      return NextResponse.json({ error: '追踪记录不存在' }, { status: 404 })
    }

    // 3. 解析请求体
    const body: UpdateWalletTrackerRequest = await request.json()
    const { nickname, notes, notification_enabled } = body

    // 4. 更新追踪记录
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (nickname !== undefined) updateData.nickname = nickname
    if (notes !== undefined) updateData.notes = notes
    if (notification_enabled !== undefined)
      updateData.notification_enabled = notification_enabled

    const { data: updatedTracker, error: updateError } = await supabase
      .from('wallet_trackers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Wallet Trackers API] 更新错误:', updateError)
      return NextResponse.json({ error: '更新追踪失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '更新成功',
      data: updatedTracker,
    })
  } catch (error) {
    console.error('[Wallet Trackers API] 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    )
  }
}

/**
 * 删除钱包追踪
 * DELETE /api/wallet/trackers/[id]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // 1. 验证认证
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClientWithAuth(accessToken)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 2. 检查追踪记录是否存在且属于当前用户
    const { data: tracker, error: fetchError } = await supabase
      .from('wallet_trackers')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !tracker) {
      return NextResponse.json({ error: '追踪记录不存在' }, { status: 404 })
    }

    // 3. 删除追踪记录
    const { error: deleteError } = await supabase
      .from('wallet_trackers')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[Wallet Trackers API] 删除错误:', deleteError)
      return NextResponse.json({ error: '删除追踪失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '取消追踪成功',
    })
  } catch (error) {
    console.error('[Wallet Trackers API] 错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    )
  }
}
