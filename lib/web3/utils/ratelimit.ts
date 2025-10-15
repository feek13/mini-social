/**
 * 限流工具 - 令牌桶算法
 */

import type { RateLimitConfig, RateLimitState } from '../types'

/**
 * 令牌桶限流器
 */
export class RateLimiter {
  private state: RateLimitState
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    this.state = {
      tokens: config.burstSize,
      lastRefill: Date.now(),
    }
  }

  /**
   * 补充令牌
   */
  private refill(): void {
    const now = Date.now()
    const timePassed = now - this.state.lastRefill
    const tokensToAdd = (timePassed / 1000) * this.config.requestsPerSecond

    if (tokensToAdd > 0) {
      this.state.tokens = Math.min(
        this.config.burstSize,
        this.state.tokens + tokensToAdd
      )
      this.state.lastRefill = now
    }
  }

  /**
   * 尝试消费令牌
   */
  tryConsume(tokens: number = 1): boolean {
    this.refill()

    if (this.state.tokens >= tokens) {
      this.state.tokens -= tokens
      return true
    }

    return false
  }

  /**
   * 等待直到可以消费令牌
   */
  async waitForToken(tokens: number = 1): Promise<void> {
    while (!this.tryConsume(tokens)) {
      // 计算需要等待的时间
      const tokensNeeded = tokens - this.state.tokens
      const waitTime = (tokensNeeded / this.config.requestsPerSecond) * 1000

      await new Promise((resolve) => setTimeout(resolve, Math.max(waitTime, 100)))
    }
  }

  /**
   * 获取当前令牌数
   */
  getAvailableTokens(): number {
    this.refill()
    return this.state.tokens
  }

  /**
   * 重置限流器
   */
  reset(): void {
    this.state = {
      tokens: this.config.burstSize,
      lastRefill: Date.now(),
    }
  }
}

/**
 * 全局限流器映射
 */
const rateLimiters = new Map<string, RateLimiter>()

/**
 * 获取或创建限流器
 */
export function getRateLimiter(
  key: string,
  config: RateLimitConfig
): RateLimiter {
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, new RateLimiter(config))
  }
  return rateLimiters.get(key)!
}
