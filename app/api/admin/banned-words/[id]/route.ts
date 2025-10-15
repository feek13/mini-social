import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientWithAuth } from '@/lib/supabase-api'
import type { BannedWordSeverity, BannedWordCategory } from '@/types/database'

/**
 * 更新敏感词
 * PATCH /api/admin/banned-words/[id]
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 2. 检查管理员权限
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id })
    if (!isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 3. 检查敏感词是否存在
    const { data: existingWord, error: fetchError } = await supabase
      .from('banned_words')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingWord) {
      return NextResponse.json({ error: '敏感词不存在' }, { status: 404 })
    }

    // 4. 解析请求体
    const body = await request.json()
    const { word, severity, category, replacement, is_regex, is_active } = body

    // 验证正则表达式（如果提供）
    if (is_regex !== undefined && is_regex && word) {
      try {
        new RegExp(word)
      } catch (e) {
        return NextResponse.json({ error: '无效的正则表达式' }, { status: 400 })
      }
    }

    // 5. 更新敏感词
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (word !== undefined) updateData.word = word
    if (severity !== undefined) updateData.severity = severity
    if (category !== undefined) updateData.category = category
    if (replacement !== undefined) updateData.replacement = replacement
    if (is_regex !== undefined) updateData.is_regex = is_regex
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updatedWord, error: updateError } = await supabase
      .from('banned_words')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      // 检查是否是重复词
      if (updateError.code === '23505') {
        return NextResponse.json({ error: '该敏感词已存在' }, { status: 400 })
      }
      console.error('[Admin Banned Words API] 更新错误:', updateError)
      return NextResponse.json({ error: '更新敏感词失败' }, { status: 500 })
    }

    // 6. 记录审核操作
    await supabase.from('moderation_actions').insert({
      admin_id: user.id,
      action_type: 'update_banned_word',
      target_type: 'system',
      target_id: id,
      details: {
        old_data: existingWord,
        new_data: updateData,
      },
    })

    return NextResponse.json({
      success: true,
      banned_word: updatedWord,
    })
  } catch (error) {
    console.error('[Admin Banned Words API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * 删除敏感词
 * DELETE /api/admin/banned-words/[id]
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 2. 检查管理员权限
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id })
    if (!isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 3. 检查敏感词是否存在
    const { data: existingWord, error: fetchError } = await supabase
      .from('banned_words')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingWord) {
      return NextResponse.json({ error: '敏感词不存在' }, { status: 404 })
    }

    // 4. 删除敏感词
    const { error: deleteError } = await supabase
      .from('banned_words')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[Admin Banned Words API] 删除错误:', deleteError)
      return NextResponse.json({ error: '删除敏感词失败' }, { status: 500 })
    }

    // 5. 记录审核操作
    await supabase.from('moderation_actions').insert({
      admin_id: user.id,
      action_type: 'delete_banned_word',
      target_type: 'system',
      target_id: id,
      details: {
        word: existingWord.word,
        severity: existingWord.severity,
        category: existingWord.category,
      },
    })

    return NextResponse.json({
      success: true,
      message: '敏感词已删除',
    })
  } catch (error) {
    console.error('[Admin Banned Words API] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
