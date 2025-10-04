import { useEffect, useState } from 'react'

/**
 * 防抖 Hook
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的值
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('')
 * const debouncedQuery = useDebounce(searchQuery, 300)
 *
 * useEffect(() => {
 *   // 只在 debouncedQuery 变化时执行搜索
 *   performSearch(debouncedQuery)
 * }, [debouncedQuery])
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // 设置定时器
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // 清理函数：清除定时器
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 节流 Hook
 * @param value 需要节流的值
 * @param interval 节流间隔（毫秒）
 * @returns 节流后的值
 *
 * @example
 * ```tsx
 * const [scrollY, setScrollY] = useState(0)
 * const throttledScrollY = useThrottle(scrollY, 100)
 *
 * useEffect(() => {
 *   // 只在 throttledScrollY 变化时执行
 *   updateUI(throttledScrollY)
 * }, [throttledScrollY])
 * ```
 */
export function useThrottle<T>(value: T, interval: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const [lastUpdate, setLastUpdate] = useState<number>(0)

  useEffect(() => {
    const now = Date.now()

    // 如果距离上次更新超过了间隔时间，立即更新
    if (now - lastUpdate >= interval) {
      setThrottledValue(value)
      setLastUpdate(now)
    } else {
      // 否则设置定时器，在剩余时间后更新
      const timer = setTimeout(() => {
        setThrottledValue(value)
        setLastUpdate(Date.now())
      }, interval - (now - lastUpdate))

      return () => clearTimeout(timer)
    }
  }, [value, interval, lastUpdate])

  return throttledValue
}
