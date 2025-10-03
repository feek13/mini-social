import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-api'

export async function GET() {
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const cleanedAnonKey = rawAnonKey.trim().replace(/\s+/g, '')

  const envCheck: Record<string, unknown> = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY_RAW_LENGTH: rawAnonKey.length,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_CLEANED_LENGTH: cleanedAnonKey.length,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_HAS_NEWLINES: rawAnonKey.includes('\n') ? '✗ YES' : '✓ NO',
    NEXT_PUBLIC_SUPABASE_ANON_KEY_HAS_SPACES: rawAnonKey.includes(' ') ? '✗ YES' : '✓ NO',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY?.length + ')' : '✗ Missing',
    NODE_ENV: process.env.NODE_ENV,
  }

  // 测试 Supabase 连接
  try {
    const supabase = getSupabaseClient()
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id')
      .limit(1)

    if (error) {
      envCheck.supabaseConnection = '✗ Error: ' + error.message
      envCheck.supabaseErrorCode = error.code
      envCheck.supabaseErrorDetails = error.details
    } else {
      envCheck.supabaseConnection = '✓ Connected successfully'
      envCheck.postsFound = posts?.length || 0
    }
  } catch (err: unknown) {
    envCheck.supabaseConnection = '✗ Exception: ' + (err instanceof Error ? err.message : String(err))
  }

  return NextResponse.json(envCheck)
}
