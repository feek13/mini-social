import React from 'react'
import Link from 'next/link'

// 解析文本中的 # 话题和 @ 提及
interface ParsedPart {
  type: 'text' | 'hashtag' | 'mention'
  content: string
  value?: string
}

/**
 * 解析文本，提取 # 话题和 @ 用户名
 * @param text 要解析的文本
 * @returns 解析后的部分数组
 */
export function parseContent(text: string): ParsedPart[] {
  const parts: ParsedPart[] = []
  let lastIndex = 0

  // 匹配 # 话题和 @ 用户（支持中文）
  const regex = /(#[a-zA-Z0-9_\u4e00-\u9fa5]+)|(@[a-zA-Z0-9_]+)/g
  let match

  while ((match = regex.exec(text)) !== null) {
    // 添加普通文本
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      })
    }

    // 添加话题或提及
    const matchedText = match[0]
    if (matchedText.startsWith('#')) {
      parts.push({
        type: 'hashtag',
        content: matchedText,
        value: matchedText.substring(1)
      })
    } else if (matchedText.startsWith('@')) {
      parts.push({
        type: 'mention',
        content: matchedText,
        value: matchedText.substring(1)
      })
    }

    lastIndex = regex.lastIndex
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    })
  }

  return parts
}

/**
 * 将解析后的文本渲染为 React 元素，# 和 @ 变为可点击链接
 * @param text 要渲染的文本
 * @param disableLinks 是否禁用链接（用于嵌套在其他链接中的场景）
 * @returns React 元素数组
 */
export function renderText(text: string, disableLinks = false): React.ReactNode {
  const parts = parseContent(text)

  return parts.map((part, index) => {
    if (part.type === 'hashtag') {
      if (disableLinks) {
        return <span key={index} className="text-blue-500">{part.content}</span>
      }
      return (
        <Link
          key={index}
          href={`/search?q=${encodeURIComponent('#' + part.value)}`}
          className="text-blue-500 hover:text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part.content}
        </Link>
      )
    } else if (part.type === 'mention') {
      if (disableLinks) {
        return <span key={index} className="text-blue-500">{part.content}</span>
      }
      return (
        <Link
          key={index}
          href={`/profile/${part.value}`}
          className="text-blue-500 hover:text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part.content}
        </Link>
      )
    } else {
      return <span key={index}>{part.content}</span>
    }
  })
}

/**
 * 提取文本中的所有话题标签（不含 #）
 * @param text 要提取的文本
 * @returns 话题标签数组
 */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g)
  return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : []
}

/**
 * 提取文本中的所有 @ 提及（不含 @）
 * @param text 要提取的文本
 * @returns 用户名数组
 */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g)
  return matches ? matches.map(mention => mention.slice(1).toLowerCase()) : []
}
