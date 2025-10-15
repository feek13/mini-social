'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import { ArrowLeft, MoreVertical } from 'lucide-react'
import type { Conversation, Message } from '@/types/database'

type ConversationWithDetails = Conversation & {
  participants?: Array<{
    id: string
    username: string
    avatar_url?: string
    avatar_template?: string
    nft_avatar_url?: string
  }>
  other_participant?: {
    id: string
    username: string
    avatar_url?: string
    avatar_template?: string
    nft_avatar_url?: string
  }
}

type Props = {
  conversationId: string
  onBack?: () => void
}

export default function ChatWindow({ conversationId, onBack }: Props) {
  const { user } = useAuth()
  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user || !conversationId) return

    loadConversation()
    loadMessages()
    markAsRead()

    // Subscribe to new messages via Realtime
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('[ChatWindow] New message received:', payload)

          // Fetch the full message with relations
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(
                id, username, avatar_url, avatar_template, nft_avatar_url
              ),
              reply_to_message:messages!messages_reply_to_message_id_fkey(
                id, content, sender_id, created_at
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (newMessage) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage as Message]
            })

            // Mark as read if the window is focused
            if (document.hasFocus()) {
              markAsRead()
            }
          }
        }
      )
      .subscribe()

    // Cleanup on unmount or conversation change
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, conversationId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversation = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('加载会话详情失败')
      }

      const data = await response.json()
      setConversation(data.conversation)
    } catch (error) {
      console.error('[ChatWindow] 加载会话错误:', error)
    }
  }

  const loadMessages = async (before?: string) => {
    try {
      if (before) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const params = new URLSearchParams({
        conversationId,
        limit: '50',
      })
      if (before) {
        params.append('before', before)
      }

      const response = await fetch(`/api/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('加载消息失败')
      }

      const data = await response.json()

      if (before) {
        setMessages((prev) => [...data.messages, ...prev])
      } else {
        setMessages(data.messages || [])
      }

      setHasMore(data.pagination?.has_more || false)
    } catch (error) {
      console.error('[ChatWindow] 加载消息错误:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const markAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
    } catch (error) {
      console.error('[ChatWindow] 标记已读错误:', error)
    }
  }

  const handleSendMessage = async (content: string, replyToMessageId?: string) => {
    try {
      setSending(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('未授权')
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          content,
          reply_to_message_id: replyToMessageId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '发送消息失败')
      }

      const data = await response.json()
      setMessages((prev) => [...prev, data.message])
      setReplyToMessage(null)
    } catch (error) {
      console.error('[ChatWindow] 发送消息错误:', error)
      alert(error instanceof Error ? error.message : '发送消息失败')
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleLoadMore = () => {
    if (messages.length > 0 && hasMore && !loadingMore) {
      const oldestMessage = messages[0]
      loadMessages(oldestMessage.id)
    }
  }

  const getConversationTitle = () => {
    if (!conversation) return '加载中...'
    if (conversation.conversation_type === 'group') {
      return conversation.group_name || '群聊'
    }
    return conversation.other_participant?.username || '未知用户'
  }

  const getConversationAvatar = () => {
    if (!conversation) return null
    if (conversation.conversation_type === 'group') {
      return {
        username: conversation.group_name || '群聊',
        avatar_url: conversation.group_avatar_url,
        avatar_template: 'bottts' as const,
      }
    }
    const participant = conversation.other_participant
    return {
      username: participant?.username || '未知用户',
      avatar_url: participant?.avatar_url,
      avatar_template: participant?.avatar_template as any,
      nft_avatar_url: participant?.nft_avatar_url,
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">请先登录</p>
      </div>
    )
  }

  const avatar = getConversationAvatar()

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header - Telegram 风格 */}
      <div className="flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors lg:hidden flex-shrink-0"
              aria-label="返回"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          )}
          {avatar && (
            <div className="flex-shrink-0">
              <Avatar
                username={avatar.username}
                avatarUrl={avatar.avatar_url}
                avatarTemplate={avatar.avatar_template}
                nftAvatarUrl={avatar.nft_avatar_url}
                size="md"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white truncate text-base">
              {getConversationTitle()}
            </h2>
            {conversation?.conversation_type === 'group' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {conversation.participants?.length || 0} 位成员
              </p>
            )}
          </div>
        </div>
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors flex-shrink-0"
          aria-label="更多选项"
        >
          <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 py-3 lg:px-4 lg:py-4 overscroll-contain"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center mb-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  {loadingMore ? '加载中...' : '加载更多消息'}
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>暂无消息，开始聊天吧</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user.id
                const prevMessage = index > 0 ? messages[index - 1] : null
                const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={isOwnMessage}
                    showAvatar={showAvatar}
                  />
                )
              })
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        replyToMessage={replyToMessage}
        onCancelReply={() => setReplyToMessage(null)}
        disabled={loading || sending}
      />
    </div>
  )
}
