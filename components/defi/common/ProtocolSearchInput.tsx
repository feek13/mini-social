'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { useProtocolSearch } from '@/hooks/useProtocolSearch'

interface ProtocolSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * 协议搜索输入框组件
 * 支持模糊搜索和自动建议
 */
export default function ProtocolSearchInput({
  value,
  onChange,
  placeholder = '例如: aave, uniswap, pancake',
  className = ''
}: ProtocolSearchInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { suggestions, loading, search, clear } = useProtocolSearch({
    debounceMs: 300,
    maxResults: 8
  })

  // 同步外部值变化
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // 点击外部关闭建议框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // 立即更新父组件（用于过滤）
    onChange(newValue)

    // 触发搜索建议
    if (newValue.trim()) {
      search(newValue)
      setShowSuggestions(true)
    } else {
      clear()
      setShowSuggestions(false)
    }
  }

  const handleSelectProtocol = (protocolName: string) => {
    setInputValue(protocolName)
    onChange(protocolName)
    setShowSuggestions(false)
    clear()
  }

  const handleClear = () => {
    setInputValue('')
    onChange('')
    clear()
    setShowSuggestions(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* 输入框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (inputValue.trim() && suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        />

        {/* 加载指示器或清除按钮 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : inputValue ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* 建议下拉框 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((protocol) => (
            <button
              key={protocol.slug}
              onClick={() => handleSelectProtocol(protocol.name)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 transition flex items-center gap-3 border-b border-gray-100 last:border-b-0"
              type="button"
            >
              {/* 协议图标 */}
              {protocol.logo ? (
                <img
                  src={protocol.logo}
                  alt={protocol.name}
                  className="w-6 h-6 rounded-full flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0" />
              )}

              {/* 协议信息 */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {protocol.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {protocol.category} • TVL: ${(protocol.tvl / 1e9).toFixed(2)}B
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 无结果提示 */}
      {showSuggestions && !loading && suggestions.length === 0 && inputValue.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center text-sm text-gray-500">
          未找到匹配的协议，但仍会尝试搜索
        </div>
      )}
    </div>
  )
}
