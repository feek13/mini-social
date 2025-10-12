'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Clock, TrendingUp } from 'lucide-react'
import { debounce } from 'lodash'
import Avatar from '@/components/Avatar'
import {
  getSearchHistory,
  addSearchHistory,
  removeSearchHistory,
  clearSearchHistory,
  SearchHistory,
} from '@/lib/searchHistory'
import { Profile } from '@/types/database'

interface SearchSuggestions {
  users: Profile[]
  keywords: string[]
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestions>({
    users: [],
    keywords: [],
  })
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const router = useRouter()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 加载搜索历史
  useEffect(() => {
    setSearchHistory(getSearchHistory())
  }, [])

  // 点击外部关闭建议框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 获取搜索建议
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions({ users: [], keywords: [] })
        setLoading(false)
        return
      }

      try {
        const response = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`
        )
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data)
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
      } finally {
        setLoading(false)
      }
    }, 300),
    []
  )

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedIndex(-1)

    if (value.trim().length >= 2) {
      setLoading(true)
      fetchSuggestions(value.trim())
    } else {
      setSuggestions({ users: [], keywords: [] })
    }
  }

  // 执行搜索
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query.trim()
    if (!finalQuery) return

    addSearchHistory(finalQuery)
    setSearchHistory(getSearchHistory())
    setIsOpen(false)
    setQuery('')
    setSuggestions({ users: [], keywords: [] })

    router.push(`/search?q=${encodeURIComponent(finalQuery)}`)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems =
      suggestions.users.length + suggestions.keywords.length + searchHistory.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0) {
        // 从建议中选择
        if (selectedIndex < suggestions.users.length) {
          const user = suggestions.users[selectedIndex]
          router.push(`/profile/${user.username}`)
          setIsOpen(false)
          setQuery('')
        } else if (selectedIndex < suggestions.users.length + suggestions.keywords.length) {
          const keywordIndex = selectedIndex - suggestions.users.length
          const keyword = suggestions.keywords[keywordIndex]
          handleSearch(keyword)
        } else {
          const historyIndex =
            selectedIndex - suggestions.users.length - suggestions.keywords.length
          const historyItem = searchHistory[historyIndex]
          handleSearch(historyItem.query)
        }
      } else {
        handleSearch()
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  // 清空输入
  const handleClear = () => {
    setQuery('')
    setSuggestions({ users: [], keywords: [] })
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  // 删除历史记录
  const handleRemoveHistory = (historyQuery: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeSearchHistory(historyQuery)
    setSearchHistory(getSearchHistory())
  }

  // 清空所有历史
  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearSearchHistory()
    setSearchHistory([])
  }

  const showSuggestions = isOpen && (query.length >= 2 || searchHistory.length > 0)
  const hasSuggestions =
    suggestions.users.length > 0 || suggestions.keywords.length > 0
  const showHistory = query.length < 2 && searchHistory.length > 0

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      {/* 搜索输入框 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder="搜索用户或动态..."
          className="w-full px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          suppressHydrationWarning
        />
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={18} />
          </button>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* 建议下拉框 */}
      {showSuggestions && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {/* 搜索历史 */}
          {showHistory && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  最近搜索
                </span>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-blue-500 hover:text-blue-600 transition"
                >
                  清空
                </button>
              </div>
              {searchHistory.map((item, index) => {
                const itemIndex = suggestions.users.length + suggestions.keywords.length + index
                return (
                  <div
                    key={item.timestamp}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition cursor-pointer ${
                      selectedIndex === itemIndex ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div
                      onClick={() => handleSearch(item.query)}
                      className="flex items-center space-x-2 flex-1"
                    >
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{item.query}</span>
                    </div>
                    <button
                      onClick={e => handleRemoveHistory(item.query, e)}
                      className="text-gray-400 hover:text-gray-600 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* 用户建议 */}
          {suggestions.users.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="px-3 py-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">用户</span>
              </div>
              {suggestions.users.map((user, index) => (
                <button
                  key={user.id}
                  onClick={() => {
                    router.push(`/profile/${user.username}`)
                    setIsOpen(false)
                    setQuery('')
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition ${
                    selectedIndex === index ? 'bg-gray-100' : ''
                  }`}
                >
                  <Avatar
                    username={user.username}
                    avatarUrl={user.avatar_url}
                    avatarTemplate={user.avatar_template}
                    size="sm"
                  />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {user.username}
                    </div>
                    {user.bio && (
                      <div className="text-xs text-gray-500 truncate">{user.bio}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 动态关键词建议 */}
          {suggestions.keywords.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="px-3 py-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  相关动态
                </span>
              </div>
              {suggestions.keywords.map((keyword, index) => {
                const itemIndex = suggestions.users.length + index
                return (
                  <button
                    key={index}
                    onClick={() => handleSearch(keyword)}
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition ${
                      selectedIndex === itemIndex ? 'bg-gray-100' : ''
                    }`}
                  >
                    <TrendingUp size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-700 truncate">{keyword}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* 空状态 */}
          {!showHistory && !hasSuggestions && query.length >= 2 && !loading && (
            <div className="p-8 text-center text-gray-500">
              <Search size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">没有找到相关结果</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
