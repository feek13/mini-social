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
export function formatTVL(value: number | null | undefined): string {
  // 处理非数字值
  const numValue = Number(value)
  if (!value || isNaN(numValue) || numValue === 0) {
    return 'N/A'
  }

  if (numValue >= 1_000_000_000) {
    return `$${(numValue / 1_000_000_000).toFixed(2)}B`
  }
  if (numValue >= 1_000_000) {
    return `$${(numValue / 1_000_000).toFixed(2)}M`
  }
  if (numValue >= 1_000) {
    return `$${(numValue / 1_000).toFixed(2)}K`
  }
  return `$${numValue.toFixed(2)}`
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
 * formatAPY(null) // "N/A"
 */
export function formatAPY(apy: number | null | undefined): string {
  // 处理非数字值
  const numValue = Number(apy)
  if (apy === null || apy === undefined || isNaN(numValue)) {
    return 'N/A'
  }
  return `${numValue.toFixed(2)}%`
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

/**
 * 获取区块链浏览器 URL（根据链和代币地址）
 * @param chain 链名称（小写）
 * @param address 代币合约地址
 * @returns 区块链浏览器 URL
 *
 * @example
 * getBlockExplorerUrl('ethereum', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
 * // => "https://etherscan.io/token/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
 */
export function getBlockExplorerUrl(chain: string, address: string): string {
  const chainLower = chain.toLowerCase()

  // 区块链浏览器映射表
  const explorerMap: Record<string, string> = {
    ethereum: 'https://etherscan.io',
    eth: 'https://etherscan.io',
    bsc: 'https://bscscan.com',
    binance: 'https://bscscan.com',
    polygon: 'https://polygonscan.com',
    matic: 'https://polygonscan.com',
    arbitrum: 'https://arbiscan.io',
    optimism: 'https://optimistic.etherscan.io',
    avalanche: 'https://snowtrace.io',
    avax: 'https://snowtrace.io',
    fantom: 'https://ftmscan.com',
    ftm: 'https://ftmscan.com',
    base: 'https://basescan.org',
    celo: 'https://celoscan.io',
    moonbeam: 'https://moonscan.io',
    moonriver: 'https://moonriver.moonscan.io',
    gnosis: 'https://gnosisscan.io',
    xdai: 'https://gnosisscan.io',
    harmony: 'https://explorer.harmony.one',
    one: 'https://explorer.harmony.one',
    cronos: 'https://cronoscan.com',
    aurora: 'https://aurorascan.dev',
    metis: 'https://andromeda-explorer.metis.io',
    kava: 'https://explorer.kava.io',
    klaytn: 'https://scope.klaytn.com',
  }

  const explorerBaseUrl = explorerMap[chainLower]

  if (explorerBaseUrl) {
    return `${explorerBaseUrl}/token/${address}`
  }

  // 如果没有匹配的浏览器，返回 DeFiLlama 链页面作为备用
  return `https://defillama.com/chain/${chain}`
}

// =============================================================================
// DeFi 收益率相关工具函数（新增）
// =============================================================================

/**
 * 计算风险评分（0-100 分）
 * @param pool 收益率池子数据
 * @returns 风险评分（100 = 极低风险，0 = 极高风险）
 *
 * @example
 * calculateRiskScore(pool) // 85 (低风险)
 */
export function calculateRiskScore(pool: {
  ilRisk: string
  tvlUsd: number
  apy: number
  predictions?: { binnedConfidence?: number } | null
}): number {
  let score = 100

  // 无常损失风险扣分（-30 分）
  if (pool.ilRisk.toLowerCase() === 'yes') {
    score -= 30
  } else if (pool.ilRisk.toLowerCase() === 'unknown') {
    score -= 15
  }

  // TVL 太低扣分（-20 分）
  if (pool.tvlUsd < 100_000) {
    score -= 20
  } else if (pool.tvlUsd < 1_000_000) {
    score -= 10
  }

  // APY 异常高可能不稳定（-15 分）
  if (pool.apy > 100) {
    score -= 15
  } else if (pool.apy > 50) {
    score -= 8
  }

  // AI 预测信心度低扣分（-10 分）
  const confidence = pool.predictions?.binnedConfidence
  if (confidence !== undefined && confidence !== null) {
    if (confidence < 2) {
      score -= 10
    }
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * 获取风险评分的样式
 * @param score 风险评分（0-100）
 * @returns 包含颜色、背景和标签的对象
 */
export function getRiskScoreStyle(score: number): {
  color: string
  bg: string
  label: string
  ring: string
} {
  if (score >= 90) {
    return {
      color: 'text-green-700',
      bg: 'bg-green-100',
      label: '极低风险',
      ring: 'ring-green-500',
    }
  }
  if (score >= 70) {
    return {
      color: 'text-blue-700',
      bg: 'bg-blue-100',
      label: '低风险',
      ring: 'ring-blue-500',
    }
  }
  if (score >= 50) {
    return {
      color: 'text-yellow-700',
      bg: 'bg-yellow-100',
      label: '中等风险',
      ring: 'ring-yellow-500',
    }
  }
  if (score >= 30) {
    return {
      color: 'text-orange-700',
      bg: 'bg-orange-100',
      label: '较高风险',
      ring: 'ring-orange-500',
    }
  }
  return {
    color: 'text-red-700',
    bg: 'bg-red-100',
    label: '高风险',
    ring: 'ring-red-500',
  }
}

/**
 * 格式化 APY 变化百分比
 * @param change APY 变化百分比
 * @returns 格式化后的字符串（带符号）
 *
 * @example
 * formatAPYChange(0.5) // "+0.50%"
 * formatAPYChange(-1.2) // "-1.20%"
 */
export function formatAPYChange(change: number | null): string {
  if (change === null || change === undefined) return 'N/A'
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}

/**
 * 获取 APY 趋势图标
 * @param apyPct7D 7 天 APY 变化百分比
 * @returns 趋势标识字符串
 */
export function getAPYTrendIcon(apyPct7D: number | null): string {
  if (apyPct7D === null || apyPct7D === undefined) return '—'
  if (apyPct7D > 1) return '↑↑'  // 大涨
  if (apyPct7D > 0) return '↑'   // 上涨
  if (apyPct7D < -1) return '↓↓' // 大跌
  if (apyPct7D < 0) return '↓'   // 下跌
  return '→' // 持平
}

/**
 * 获取 APY 趋势颜色类名
 * @param apyPct7D 7 天 APY 变化百分比
 * @returns Tailwind 颜色类名
 */
export function getAPYTrendColor(apyPct7D: number | null): string {
  if (apyPct7D === null || apyPct7D === undefined) return 'text-gray-400'
  if (apyPct7D > 0) return 'text-green-600'
  if (apyPct7D < 0) return 'text-red-600'
  return 'text-gray-500'
}

/**
 * 获取预测结果的样式
 * @param predictedClass 预测分类
 * @returns 包含颜色、背景和标签的对象
 */
export function getPredictionStyle(predictedClass: string | null): {
  color: string
  bg: string
  label: string
} | null {
  if (!predictedClass) return null

  const classLower = predictedClass.toLowerCase()

  if (classLower.includes('stable') || classLower.includes('up')) {
    return {
      color: 'text-green-700',
      bg: 'bg-green-100',
      label: '稳定/上涨',
    }
  }

  if (classLower.includes('down')) {
    return {
      color: 'text-red-700',
      bg: 'bg-red-100',
      label: '可能下跌',
    }
  }

  return {
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    label: predictedClass,
  }
}

/**
 * 计算收益回报
 * @param principal 本金
 * @param apy APY 百分比
 * @param days 投资天数
 * @param compound 是否复利（默认 false）
 * @returns 收益和总额
 *
 * @example
 * calculateYieldReturn(10000, 10, 365, false) // { return: 1000, total: 11000 }
 * calculateYieldReturn(10000, 10, 365, true)  // { return: 1051.71, total: 11051.71 }
 */
export function calculateYieldReturn(
  principal: number,
  apy: number,
  days: number,
  compound: boolean = false
): {
  return: number
  total: number
} {
  const rate = apy / 100

  if (compound) {
    // 复利计算：A = P(1 + r/n)^(nt)
    // 假设每日复利（n = 365）
    const n = 365
    const t = days / 365
    const total = principal * Math.pow(1 + rate / n, n * t)
    const returnAmount = total - principal

    return {
      return: Math.round(returnAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    }
  } else {
    // 单利计算：A = P(1 + rt)
    const t = days / 365
    const total = principal * (1 + rate * t)
    const returnAmount = total - principal

    return {
      return: Math.round(returnAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    }
  }
}
