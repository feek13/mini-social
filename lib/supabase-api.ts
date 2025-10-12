import { createClient } from '@supabase/supabase-js'

// 为匿名访问创建 Supabase 客户端（用于读取公开数据）
export function getSupabaseClient() {
  // 清理环境变量值（移除可能的换行符和空白）
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabaseUrl = rawUrl?.trim().replace(/\s+/g, '') || ''
  const supabaseAnonKey = rawAnonKey?.trim().replace(/\s+/g, '') || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'mini-social-api',
      },
    },
  })
}

// 使用 service role 创建 Supabase 客户端（用于绕过 RLS 的后台操作，如缓存）
export function getSupabaseServiceClient() {
  // 清理环境变量值（移除可能的换行符和空白）
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabaseUrl = rawUrl?.trim().replace(/\s+/g, '') || ''
  const supabaseServiceKey = rawServiceKey?.trim().replace(/\s+/g, '')

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase URL or Service Role Key')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'mini-social-service',
      },
    },
  })
}

// 使用用户 token 创建 Supabase 客户端（用于需要认证的操作）
export function getSupabaseClientWithAuth(accessToken: string) {
  // 清理环境变量值（移除可能的换行符和空白）
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabaseUrl = rawUrl?.trim().replace(/\s+/g, '') || ''
  const supabaseServiceKey = rawServiceKey?.trim().replace(/\s+/g, '')
  const supabaseAnonKey = rawAnonKey?.trim().replace(/\s+/g, '') || ''

  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL')
  }

  // 如果有 service key，使用它绕过 RLS
  if (supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  // 否则使用 anon key 和 access token
  if (!supabaseAnonKey) {
    throw new Error('Missing Supabase anon key')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
