import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 单例模式：确保只创建一个客户端实例
let supabaseInstance: SupabaseClient | null = null

// 浏览器端 Supabase 客户端
export function createClientComponentClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  // 清理环境变量值（移除可能的换行符和空白）
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabaseUrl = rawUrl?.trim().replace(/\s+/g, '') || ''
  const supabaseAnonKey = rawAnonKey?.trim().replace(/\s+/g, '') || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  return supabaseInstance
}

// 默认导出浏览器端客户端
export const supabase = createClientComponentClient()
