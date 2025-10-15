import { getSupabaseClient } from './supabase-api'
import type { BannedWord, BannedWordSeverity } from '@/types/database'

/**
 * 内容过滤结果
 */
export interface ContentFilterResult {
  isBlocked: boolean // 是否被阻止发布
  filteredContent: string // 过滤后的内容
  matchedWords: Array<{
    word: string
    severity: BannedWordSeverity
    category: string
  }>
}

/**
 * 从数据库获取所有活跃的敏感词
 */
async function getBannedWords(): Promise<BannedWord[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('banned_words')
    .select('*')
    .eq('is_active', true)
    .order('severity', { ascending: false }) // 按严重程度排序，优先匹配严重的

  if (error) {
    console.error('[Content Filter] 获取敏感词错误:', error)
    return []
  }

  return data || []
}

/**
 * 检查文本是否包含敏感词
 * @param content 要检查的文本内容
 * @returns 过滤结果
 */
export async function filterContent(content: string): Promise<ContentFilterResult> {
  if (!content || content.trim().length === 0) {
    return {
      isBlocked: false,
      filteredContent: content,
      matchedWords: [],
    }
  }

  const bannedWords = await getBannedWords()
  let filteredContent = content
  const matchedWords: Array<{ word: string; severity: BannedWordSeverity; category: string }> = []
  let hasHighSeverity = false

  for (const bannedWord of bannedWords) {
    let matched = false

    if (bannedWord.is_regex) {
      // 正则表达式匹配
      try {
        const regex = new RegExp(bannedWord.word, 'gi')
        if (regex.test(filteredContent)) {
          matched = true

          // 如果有替换词，进行替换；否则用 *** 替换
          if (bannedWord.replacement) {
            filteredContent = filteredContent.replace(regex, bannedWord.replacement)
          } else {
            filteredContent = filteredContent.replace(regex, '***')
          }
        }
      } catch (e) {
        console.error('[Content Filter] 正则表达式错误:', bannedWord.word, e)
      }
    } else {
      // 普通字符串匹配（大小写不敏感）
      const regex = new RegExp(escapeRegex(bannedWord.word), 'gi')
      if (regex.test(filteredContent)) {
        matched = true

        // 如果有替换词，进行替换；否则用 *** 替换
        if (bannedWord.replacement) {
          filteredContent = filteredContent.replace(regex, bannedWord.replacement)
        } else {
          filteredContent = filteredContent.replace(regex, '***')
        }
      }
    }

    // 记录匹配的敏感词
    if (matched) {
      matchedWords.push({
        word: bannedWord.word,
        severity: bannedWord.severity,
        category: bannedWord.category,
      })

      // 检查是否包含高严重度敏感词
      if (bannedWord.severity === 'critical' || bannedWord.severity === 'high') {
        hasHighSeverity = true
      }
    }
  }

  return {
    isBlocked: hasHighSeverity, // 高严重度敏感词直接阻止发布
    filteredContent,
    matchedWords,
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 检查用户是否被封禁
 * @param userId 用户 ID
 * @returns 是否被封禁
 */
export async function isUserBanned(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('user_bans')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error) {
    // 如果没有找到记录，说明用户没有被封禁
    if (error.code === 'PGRST116') {
      return false
    }
    console.error('[Content Filter] 检查用户封禁状态错误:', error)
    return false
  }

  return !!data
}
