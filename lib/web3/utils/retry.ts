/**
 * 重试工具 - 指数退避策略
 */

export interface RetryConfig {
  maxRetries: number
  initialDelay: number  // 毫秒
  maxDelay: number      // 毫秒
  backoffFactor: number // 退避因子
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
}

/**
 * 带重试的异步函数执行器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined
  let delay = config.initialDelay

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 最后一次尝试失败，抛出错误
      if (attempt === config.maxRetries) {
        break
      }

      // 等待后重试
      console.log(
        `[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
        lastError.message
      )

      await new Promise((resolve) => setTimeout(resolve, delay))

      // 计算下次延迟（指数退避）
      delay = Math.min(delay * config.backoffFactor, config.maxDelay)
    }
  }

  throw lastError
}

/**
 * 判断错误是否应该重试
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()

  // 网络错误
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  ) {
    return true
  }

  // HTTP 状态码错误
  if (message.includes('http 429')) {
    return true // 速率限制
  }
  if (message.includes('http 500') || message.includes('http 502') || message.includes('http 503')) {
    return true // 服务器错误
  }

  return false
}
