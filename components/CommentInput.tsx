'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import Avatar from '@/components/Avatar'
import { Profile } from '@/types/database'

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
}

interface Suggestion {
  type: 'user' | 'hashtag'
  value: string
  display: string
}

export default function CommentInput({
  onSubmit,
  placeholder = '说点什么...'
}: CommentInputProps) {
  const { user, profile } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 检测 @ 或 # 输入
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const text = content
    const pos = cursorPosition

    // 查找当前光标前的 @ 或 #
    let triggerChar = ''
    let startIndex = -1
    let query = ''

    for (let i = pos - 1; i >= 0; i--) {
      const char = text[i]
      if (char === '@' || char === '#') {
        triggerChar = char
        startIndex = i
        query = text.substring(i + 1, pos)
        break
      }
      if (char === ' ' || char === '\n') {
        break
      }
    }

    if (triggerChar && startIndex !== -1) {
      // 获取建议
      fetchSuggestions(triggerChar, query)
    } else {
      setShowSuggestions(false)
      setSuggestions([])
    }
  }, [content, cursorPosition])

  const fetchSuggestions = async (type: string, query: string) => {
    if (type === '@') {
      // 获取用户建议
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=5`)
        const data = await response.json()

        if (response.ok && data.users) {
          const userSuggestions: Suggestion[] = data.users.map((user: Profile) => ({
            type: 'user' as const,
            value: user.username,
            display: user.username,
          }))
          setSuggestions(userSuggestions)
          setShowSuggestions(userSuggestions.length > 0)
          setSelectedIndex(0)
        }
      } catch (error) {
        console.error('获取用户建议失败:', error)
      }
    } else if (type === '#') {
      // 获取话题建议（简单模拟，实际需要 API）
      // TODO: 实现话题建议 API
      const mockHashtags = [
        '热门话题',
        '编程',
        '技术',
        '生活',
        '旅行',
      ].filter(tag => tag.includes(query))

      const hashtagSuggestions: Suggestion[] = mockHashtags.map(tag => ({
        type: 'hashtag' as const,
        value: tag,
        display: tag,
      }))
      setSuggestions(hashtagSuggestions)
      setShowSuggestions(hashtagSuggestions.length > 0)
      setSelectedIndex(0)
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    const newPosition = e.target.selectionStart

    setContent(newContent)
    setCursorPosition(newPosition)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && showSuggestions) {
      e.preventDefault()
      selectSuggestion(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (suggestion: Suggestion) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const text = content
    const pos = cursorPosition

    // 查找 @ 或 # 的位置
    let startIndex = -1
    for (let i = pos - 1; i >= 0; i--) {
      const char = text[i]
      if (char === '@' || char === '#') {
        startIndex = i
        break
      }
      if (char === ' ' || char === '\n') {
        break
      }
    }

    if (startIndex !== -1) {
      const prefix = suggestion.type === 'user' ? '@' : '#'
      const newContent = text.substring(0, startIndex) + prefix + suggestion.value + ' ' + text.substring(pos)
      const newPosition = startIndex + prefix.length + suggestion.value.length + 1

      setContent(newContent)
      setCursorPosition(newPosition)
      setShowSuggestions(false)

      // 恢复焦点和光标位置
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(newPosition, newPosition)
      }, 0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !content.trim() || loading) return

    setLoading(true)
    try {
      await onSubmit(content.trim())
      setContent('')
      setCursorPosition(0)
    } catch (error) {
      console.error('发送评论失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500 text-sm">
          请先
          <a href="/login" className="text-blue-500 hover:text-blue-600 font-medium mx-1 transition">
            登录
          </a>
          后评论
        </p>
      </div>
    )
  }

  return (
    <div id="comment-section" className="bg-white border-t border-gray-100 p-4">
      <form onSubmit={handleSubmit} className="flex space-x-3">
        <Avatar
          username={profile?.username}
          avatarUrl={profile?.avatar_url}
          avatarTemplate={profile?.avatar_template}
          size="sm"
          className="flex-shrink-0 mt-1"
        />

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={loading}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            rows={3}
            maxLength={280}
          />

          {/* 建议列表 */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-64 max-h-48 overflow-y-auto z-50">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition ${
                    index === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-blue-500 font-medium">
                    {suggestion.type === 'user' ? '@' : '#'}
                  </span>
                  <span className="ml-1">{suggestion.display}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {content.length}/280
              {' · '}
              输入 @ 提及用户，# 添加话题
            </span>
            <button
              type="submit"
              disabled={!content.trim() || loading}
              className="flex items-center space-x-1 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? '发送中...' : '评论'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
