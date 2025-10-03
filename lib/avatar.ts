import { User } from '@/types/database'

// DiceBear 头像风格列表
export const AVATAR_STYLES = [
  { id: 'avataaars', name: '卡通人像', preview: '👤' },
  { id: 'bottts', name: '机器人', preview: '🤖' },
  { id: 'lorelei', name: '简约人像', preview: '👨' },
  { id: 'micah', name: '像素人像', preview: '🎮' },
  { id: 'pixel-art', name: '像素艺术', preview: '👾' },
  { id: 'adventurer', name: '冒险者', preview: '🧑‍🚀' },
  { id: 'big-smile', name: '笑脸', preview: '😊' },
  { id: 'croodles', name: '涂鸦', preview: '✏️' },
  { id: 'fun-emoji', name: '趣味表情', preview: '🎭' },
  { id: 'thumbs', name: '大拇指', preview: '👍' },
]

/**
 * 根据模版名称和用户名生成 DiceBear 头像 URL
 * @param template - 头像模版风格 ID
 * @param username - 用户名（用作 seed）
 * @returns DiceBear 头像 URL
 */
export function getAvatarUrl(template: string, username: string): string {
  // 验证模版是否存在
  const validTemplate = AVATAR_STYLES.find(style => style.id === template)
  const style = validTemplate ? template : 'avataaars' // 默认使用 avataaars

  // 使用用户名作为 seed 确保头像一致性
  const seed = encodeURIComponent(username || 'default')

  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`
}

/**
 * 获取用户显示头像
 * 优先级：自定义 URL > DiceBear 模版 > null（组件会显示首字母）
 * @param profile - 用户资料对象
 * @returns 头像 URL 或 undefined
 */
export function getUserAvatar(profile: {
  username?: string
  avatar_url?: string
  avatar_template?: string
}): string | undefined {
  // 优先使用自定义头像 URL
  if (profile.avatar_url) {
    return profile.avatar_url
  }

  // 其次使用模版生成头像
  if (profile.avatar_template && profile.username) {
    return getAvatarUrl(profile.avatar_template, profile.username)
  }

  // 返回 undefined，让组件显示首字母头像
  return undefined
}

/**
 * 验证头像模版是否有效
 * @param template - 头像模版 ID
 * @returns 是否为有效模版
 */
export function isValidAvatarTemplate(template: string): boolean {
  return AVATAR_STYLES.some(style => style.id === template)
}
