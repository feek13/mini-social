'use client'

import { useEffect, useState, useRef } from 'react'
import Avatar from './Avatar'

interface User {
  id: string
  username: string
  avatar_url?: string
  avatar_template?: string
}

interface MentionSuggestionsProps {
  text: string
  cursorPosition: number
  onSelect: (username: string, startPos: number, endPos: number) => void
}

export default function MentionSuggestions({
  text,
  cursorPosition,
  onSelect
}: MentionSuggestionsProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 检查光标前是否有 @
    const textBeforeCursor = text.slice(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    // 确保 @ 前面是空格或者是开头
    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? text[lastAtIndex - 1] : ' '
      if (charBeforeAt === ' ' || lastAtIndex === 0) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)

        // 检查 @ 后面没有空格
        if (!textAfterAt.includes(' ')) {
          setMentionStart(lastAtIndex)
          setQuery(textAfterAt)
          return
        }
      }
    }

    // 没有找到有效的 @，清空建议
    setMentionStart(null)
    setUsers([])
    setQuery('')
  }, [text, cursorPosition])

  useEffect(() => {
    if (mentionStart === null || query.length === 0) {
      setUsers([])
      return
    }

    // 防抖搜索
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/mentions?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
          setSelectedIndex(0)
        }
      } catch (error) {
        console.error('搜索用户失败:', error)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, mentionStart])

  useEffect(() => {
    // 键盘导航
    const handleKeyDown = (e: KeyboardEvent) => {
      if (users.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % users.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + users.length) % users.length)
      } else if (e.key === 'Enter' && mentionStart !== null) {
        e.preventDefault()
        const user = users[selectedIndex]
        if (user) {
          onSelect(user.username, mentionStart, cursorPosition)
          setUsers([])
          setMentionStart(null)
        }
      } else if (e.key === 'Escape') {
        setUsers([])
        setMentionStart(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [users, selectedIndex, mentionStart, cursorPosition, onSelect])

  if (users.length === 0 || mentionStart === null) {
    return null
  }

  return (
    <div
      ref={suggestionsRef}
      className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      style={{
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: '8px'
      }}
    >
      <div className="p-2 text-xs text-gray-500 border-b">
        建议用户
      </div>
      {users.map((user, index) => (
        <button
          key={user.id}
          onClick={() => {
            onSelect(user.username, mentionStart, cursorPosition)
            setUsers([])
            setMentionStart(null)
          }}
          className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition ${
            index === selectedIndex ? 'bg-blue-50' : ''
          }`}
        >
          <Avatar
            username={user.username}
            avatarUrl={user.avatar_url}
            avatarTemplate={user.avatar_template}
            size="sm"
          />
          <span className="font-medium">@{user.username}</span>
        </button>
      ))}
    </div>
  )
}
