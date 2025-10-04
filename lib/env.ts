/**
 * 环境变量验证
 * 确保所有必需的环境变量都已设置
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

/**
 * 验证环境变量
 * 在应用启动时调用，确保所有必需的环境变量都存在
 */
export function validateEnv(): void {
  const missing: string[] = []

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `缺少必需的环境变量:\n${missing.map(k => `  - ${k}`).join('\n')}\n\n` +
      `请在 .env.local 文件中设置这些变量。`
    )
  }

  // 验证 URL 格式
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl && !isValidUrl(supabaseUrl.trim())) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL 必须是有效的 URL')
  }
}

/**
 * 获取环境变量，带类型安全
 */
export function getEnv(key: typeof requiredEnvVars[number]): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`环境变量 ${key} 未设置`)
  }
  return value.trim()
}

/**
 * 获取可选的环境变量
 */
export function getOptionalEnv(key: typeof optionalEnvVars[number]): string | undefined {
  const value = process.env[key]
  return value?.trim()
}

/**
 * 检查是否在生产环境
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * 检查是否在开发环境
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * 验证 URL 格式
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 在服务器端打印环境变量状态（仅开发环境）
 */
export function logEnvStatus(): void {
  if (!isDevelopment()) return

  console.log('\n🔐 环境变量状态:')

  for (const key of requiredEnvVars) {
    const value = process.env[key]
    console.log(`  ✓ ${key}: ${value ? '已设置' : '❌ 未设置'}`)
  }

  for (const key of optionalEnvVars) {
    const value = process.env[key]
    console.log(`  ${value ? '✓' : '○'} ${key}: ${value ? '已设置' : '未设置（可选）'}`)
  }

  console.log('')
}
