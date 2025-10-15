'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Send, X } from 'lucide-react'
import type { Message } from '@/types/database'

type Props = {
  onSendMessage: (content: string, replyToMessageId?: string) => Promise<void>
  replyToMessage?: Message | null
  onCancelReply?: () => void
  disabled?: boolean
}

export default function MessageInput({ onSendMessage, replyToMessage, onCancelReply, disabled }: Props) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    const trimmedContent = content.trim()
    if (!trimmedContent || sending || disabled) return

    try {
      setSending(true)
      await onSendMessage(trimmedContent, replyToMessage?.id)
      setContent('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('[MessageInput] 发送失败:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Reply indicator */}
      {replyToMessage && (
        <div className="px-3 py-2 lg:px-4 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              回复 {replyToMessage.sender?.username || '用户'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {replyToMessage.content}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="取消回复"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 lg:p-4 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? '加载中...' : '输入消息...'}
          disabled={disabled || sending}
          rows={1}
          className="flex-1 resize-none border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 lg:px-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
          style={{ minHeight: '40px' }}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending || disabled}
          className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 touch-manipulation"
          aria-label="发送消息"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
