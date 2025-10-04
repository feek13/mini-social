import DOMPurify from 'isomorphic-dompurify'

/**
 * 清理 HTML 内容，防止 XSS 攻击
 * @param dirty 原始 HTML 字符串
 * @returns 清理后的安全 HTML
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * 清理纯文本内容
 * 移除所有 HTML 标签，只保留文本
 * @param text 原始文本
 * @returns 清理后的纯文本
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

/**
 * 验证 URL 是否安全
 * @param url URL 字符串
 * @returns 是否为安全的 URL
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // 只允许 http 和 https 协议
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * 清理用户输入的 URL
 * @param url URL 字符串
 * @returns 清理后的 URL 或 null
 */
export function sanitizeUrl(url: string): string | null {
  if (!isSafeUrl(url)) {
    return null
  }

  try {
    const parsed = new URL(url)
    // 移除潜在的危险参数
    parsed.searchParams.delete('javascript')
    parsed.searchParams.delete('data')
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * 转义特殊字符用于显示
 * @param str 原始字符串
 * @returns 转义后的字符串
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return str.replace(/[&<>"'/]/g, (char) => map[char])
}
