import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// 服务器端 Supabase 客户端（用于 Server Components 和 API Routes）
export async function createServerComponentClient() {
  // 清理环境变量值（移除可能的换行符和空白）
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabaseUrl = rawUrl?.trim().replace(/\s+/g, '') || ''
  const supabaseAnonKey = rawAnonKey?.trim().replace(/\s+/g, '') || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const cookieStore = await cookies()

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  })
}
