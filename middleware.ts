import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js 中间件
 * 用于：
 * 1. CSRF 防护
 * 2. 安全头设置
 * 3. API 速率限制（可选）
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // 1. CSRF 防护
  // 检查 POST/PUT/DELETE 请求的来源
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    // 如果有 origin 头，验证是否与 host 匹配
    if (origin) {
      try {
        const originUrl = new URL(origin)
        const hostUrl = host || ''

        // 允许同源请求
        if (!hostUrl.includes(originUrl.hostname)) {
          console.warn('CSRF 检测: 来源不匹配', { origin, host })
          return NextResponse.json(
            { error: '无效的请求来源' },
            { status: 403 }
          )
        }
      } catch (error) {
        console.error('CSRF 检测错误:', error)
        // origin 解析失败，拒绝请求
        return NextResponse.json(
          { error: '无效的请求来源' },
          { status: 403 }
        )
      }
    }
  }

  // 2. 添加安全头
  const headers = new Headers(response.headers)

  // 防止点击劫持
  headers.set('X-Frame-Options', 'DENY')

  // 防止 MIME 类型嗅探
  headers.set('X-Content-Type-Options', 'nosniff')

  // XSS 保护
  headers.set('X-XSS-Protection', '1; mode=block')

  // 仅允许 HTTPS
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // Referrer 策略
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // 权限策略
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
    headers,
  })
}

// 配置中间件应用的路径
export const config = {
  matcher: [
    // 匹配所有 API 路由
    '/api/:path*',
    // 排除静态文件和内部路由
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
