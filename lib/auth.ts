import { NextRequest } from 'next/server'
import { getSupabaseClientWithAuth } from './supabase-api'
import type { User } from '@supabase/supabase-js'

/**
 * 从 API 请求中获取认证的用户
 * @param request NextRequest 对象
 * @returns 认证的用户对象或 null
 */
export async function getAuthUser(request: NextRequest): Promise<User | null> {
  try {
    // 从请求头获取 Authorization token
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '')

    if (!accessToken) {
      return null
    }

    // 使用带认证的客户端
    const supabase = getSupabaseClientWithAuth(accessToken)

    // 验证用户登录
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      console.error('Auth error:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('getAuthUser error:', error)
    return null
  }
}

/**
 * 要求请求必须认证，否则返回 401 响应
 * 使用示例：
 * ```ts
 * const user = await requireAuth(request)
 * if (!user.user) return user.response
 * // 继续处理...
 * ```
 */
export async function requireAuth(request: NextRequest): Promise<{
  user: User | null
  response: Response | null
  accessToken: string | null
}> {
  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.replace('Bearer ', '')

  if (!accessToken) {
    return {
      user: null,
      accessToken: null,
      response: Response.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }
  }

  const user = await getAuthUser(request)

  if (!user) {
    return {
      user: null,
      accessToken: null,
      response: Response.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }
  }

  return {
    user,
    accessToken,
    response: null
  }
}
