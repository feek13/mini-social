/**
 * 工具函数集合
 */

/**
 * 格式化相对时间
 * @param dateString ISO 日期字符串
 * @returns 相对时间描述
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 10) return '刚刚'
  if (seconds < 60) return `${seconds}秒前`
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  if (months < 12) return `${months}个月前`
  return `${years}年前`
}

/**
 * 获取用户名首字母（用于头像）
 * @param username 用户名
 * @returns 首字母大写
 */
export function getInitials(username: string | undefined): string {
  if (!username) return 'U'
  return username.charAt(0).toUpperCase()
}

/**
 * 生成头像背景颜色（基于用户名）
 * @param username 用户名
 * @returns Tailwind 渐变类名
 */
export function getAvatarGradient(username: string | undefined): string {
  if (!username) return 'from-gray-400 to-gray-600'

  const gradients = [
    'from-blue-400 to-blue-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-red-400 to-red-600',
    'from-orange-400 to-orange-600',
    'from-yellow-400 to-yellow-600',
    'from-green-400 to-green-600',
    'from-teal-400 to-teal-600',
    'from-cyan-400 to-cyan-600',
    'from-indigo-400 to-indigo-600',
  ]

  // 基于用户名生成一致的颜色
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return gradients[hash % gradients.length]
}

/**
 * 合并 className
 * @param classes className 数组
 * @returns 合并后的 className
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * 截断文本
 * @param text 原始文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * 格式化数字（缩写大数字）
 * @param num 数字
 * @returns 格式化后的字符串
 */
export function formatNumber(num: number): string {
  if (num < 1000) return num.toString()
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K'
  return (num / 1000000).toFixed(1) + 'M'
}

/**
 * 检查是否为有效的 URL
 * @param text 文本
 * @returns 是否为 URL
 */
export function isValidUrl(text: string): boolean {
  try {
    new URL(text)
    return true
  } catch {
    return false
  }
}

/**
 * 解析文本中的链接并添加 HTML
 * @param text 原始文本
 * @returns 包含链接的 HTML
 */
export function linkify(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.replace(
    urlRegex,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>'
  )
}

/**
 * 格式化加入天数
 * @param days 天数
 * @returns 格式化后的字符串
 */
export function formatDays(days: number): string {
  if (days < 1) return '今天加入'
  if (days === 1) return '加入 1 天'
  if (days < 30) return `加入 ${days} 天`
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `加入 ${months} 个月`
  }
  const years = Math.floor(days / 365)
  return `加入 ${years} 年`
}

// =============================================================================
// DeFi 相关工具函数
// =============================================================================

/**
 * 格式化 TVL/金额（带美元符号和千分位）
 * @param value 数值
 * @returns 格式化后的字符串
 *
 * @example
 * formatTVL(1234567890) // "$1.23B"
 * formatTVL(1234567)    // "$1.23M"
 * formatTVL(1234)       // "$1.23K"
 */
export function formatTVL(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`
  }
  return `$${value.toFixed(2)}`
}

/**
 * 格式化百分比变化
 * @param change 变化百分比
 * @returns 格式化后的字符串
 *
 * @example
 * formatChange(5.25)   // "+5.25%"
 * formatChange(-3.14)  // "-3.14%"
 * formatChange(null)   // "N/A"
 */
export function formatChange(change: number | null): string {
  if (change === null) return 'N/A'
  return `${change > 0 ? '+' : ''}${change.toFixed(2)}%`
}

/**
 * 格式化 APY 百分比
 * @param apy APY 数值
 * @returns 格式化后的字符串
 *
 * @example
 * formatAPY(12.5) // "12.50%"
 */
export function formatAPY(apy: number): string {
  return `${apy.toFixed(2)}%`
}

/**
 * 获取变化的颜色类名
 * @param change 变化百分比
 * @returns Tailwind 颜色类名
 */
export function getChangeColor(change: number | null): string {
  if (change === null) return 'text-gray-400'
  return change >= 0 ? 'text-green-500' : 'text-red-500'
}

/**
 * 获取风险等级的样式
 * @param risk 风险等级字符串
 * @returns 包含颜色、背景和标签的对象
 */
export function getRiskStyle(risk: string): {
  color: string
  bg: string
  label: string
} {
  const riskLower = risk.toLowerCase()

  if (riskLower === 'no') {
    return { color: 'text-green-700', bg: 'bg-green-100', label: '低风险' }
  }
  if (riskLower.includes('low')) {
    return { color: 'text-blue-700', bg: 'bg-blue-100', label: '较低风险' }
  }
  if (riskLower.includes('medium')) {
    return { color: 'text-yellow-700', bg: 'bg-yellow-100', label: '中等风险' }
  }
  if (riskLower.includes('high')) {
    return { color: 'text-orange-700', bg: 'bg-orange-100', label: '较高风险' }
  }
  return { color: 'text-gray-700', bg: 'bg-gray-100', label: risk }
}

/**
 * 判断是否为高 APY
 * @param apy APY 数值
 * @returns 是否为高 APY
 */
export function isHighAPY(apy: number): boolean {
  return apy > 50
}

/**
 * 格式化代币价格
 * @param price 价格
 * @returns 格式化后的价格字符串
 */
export function formatTokenPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
  return `$${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}`
}

/**
 * 格式化时间戳为可读时间
 * @param timestamp Unix 时间戳（秒）
 * @returns 格式化后的时间字符串
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
