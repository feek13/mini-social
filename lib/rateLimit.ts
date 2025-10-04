/**
 * 简单的内存速率限制器
 * 生产环境建议使用 Redis 等持久化存储
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimits = new Map<string, RateLimitEntry>()

// 每 5 分钟清理一次过期的记录
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * 速率限制检查
 * @param identifier 用户标识符（user ID 或 IP）
 * @param maxRequests 时间窗口内最大请求数
 * @param windowMs 时间窗口（毫秒）
 * @returns 是否允许请求
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 默认 1 分钟
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimits.get(identifier)

  // 如果没有记录或已过期，创建新记录
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    rateLimits.set(identifier, {
      count: 1,
      resetAt
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt
    }
  }

  // 如果已达到限制
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt
    }
  }

  // 增加计数
  entry.count++
  rateLimits.set(identifier, entry)

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt
  }
}

/**
 * 速率限制预设配置
 */
export const RateLimitPresets = {
  // 严格限制 - 用于敏感操作（如注册、登录）
  strict: { maxRequests: 5, windowMs: 60000 }, // 1分钟5次

  // 普通限制 - 用于一般写操作（如发帖、评论）
  normal: { maxRequests: 10, windowMs: 60000 }, // 1分钟10次

  // 宽松限制 - 用于读操作
  relaxed: { maxRequests: 60, windowMs: 60000 }, // 1分钟60次

  // 点赞/关注等快速操作
  burst: { maxRequests: 20, windowMs: 60000 }, // 1分钟20次
}

/**
 * 为不同的操作类型应用速率限制
 */
export function rateLimitByType(
  identifier: string,
  type: keyof typeof RateLimitPresets
): { allowed: boolean; remaining: number; resetAt: number } {
  const preset = RateLimitPresets[type]
  return checkRateLimit(identifier, preset.maxRequests, preset.windowMs)
}

/**
 * 重置特定用户的速率限制（用于测试或管理员操作）
 */
export function resetRateLimit(identifier: string): void {
  rateLimits.delete(identifier)
}
