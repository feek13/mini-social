'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import { MessageCircle, Search, UserPlus, X, Loader2 } from 'lucide-react'
import type { Conversation } from '@/types/database'

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
  onSelectConversation: (conversationId: string) => void
  selectedConversationId?: string
}

export default function ConversationList({ onSelectConversation, selectedConversationId }: Props) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [totalUnread, setTotalUnread] = useState(0)
  const [showSearchModal, setShowSearchModal] = useState(false)

  useEffect(() => {
    if (!user) return

    loadConversations()

    // Subscribe to conversation updates via Realtime
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          console.log('[ConversationList] Conversation updated:', payload)
          // Reload conversations to get latest data
          loadConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          console.log('[ConversationList] New conversation:', payload)
          // Reload conversations to include new one
          loadConversations()
        }
      )
      .subscribe()

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.error('[ConversationList] 未找到访问令牌')
        return
      }

      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '加载会话列表失败')
      }

      const data = await response.json()
      setConversations(data.conversations || [])
      setTotalUnread(data.total_unread || 0)
    } catch (error) {
      console.error('[ConversationList] 错误:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return ''

    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`

    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const getConversationTitle = (conversation: ConversationWithDetails) => {
    if (conversation.conversation_type === 'group') {
      return conversation.group_name || '群聊'
    }
    return conversation.other_participant?.username || '未知用户'
  }

  const getConversationAvatar = (conversation: ConversationWithDetails) => {
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
      avatar_template: participant?.avatar_template as 'micah' | 'adventurer' | 'avataaars' | 'bottts' | 'identicon' | undefined,
      nft_avatar_url: participant?.nft_avatar_url,
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <MessageCircle className="w-12 h-12 mb-4" />
        <p>请先登录</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <>
        {/* Telegram 风格顶部操作栏 */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              私信
            </h1>
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full transition-colors shadow-sm"
              aria-label="新建会话"
              title="新建会话"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 空状态 */}
        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 px-4">
          <MessageCircle className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium mb-2">暂无会话</p>
          <p className="text-sm text-center">点击右上角 + 按钮开始新的对话</p>
        </div>

        {showSearchModal && (
          <SearchUserModal
            onClose={() => setShowSearchModal(false)}
            onSelectUser={(username) => {
              setShowSearchModal(false)
              window.location.href = `/profile/${username}?action=message`
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      {/* Telegram 风格顶部操作栏 - 桌面端和移动端都显示 */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            私信
          </h1>
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full transition-colors shadow-sm"
            aria-label="新建会话"
            title="新建会话"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {conversations.map((conversation) => {
        const avatar = getConversationAvatar(conversation)
        const isSelected = conversation.id === selectedConversationId
        const unreadCount = conversation.unread_count || 0

        return (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`w-full px-3 py-3 lg:px-4 lg:py-3.5 flex items-center gap-3 transition-colors text-left border-l-4 ${
              isSelected
                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-600'
                : 'border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            <Avatar
              username={avatar.username}
              avatarUrl={avatar.avatar_url}
              avatarTemplate={avatar.avatar_template}
              nftAvatarUrl={avatar.nft_avatar_url}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <h3 className={`font-semibold truncate text-base ${
                  unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {getConversationTitle(conversation)}
                </h3>
                <span className={`text-xs flex-shrink-0 ${
                  unreadCount > 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {formatTimestamp(conversation.last_message_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm truncate flex-1 ${
                  unreadCount > 0 ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {conversation.last_message_content || '暂无消息'}
                </p>
                {unreadCount > 0 && (
                  <span className="flex-shrink-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-full min-w-[18px]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
      </div>

      {/* 搜索模态框 */}
      {showSearchModal && (
        <SearchUserModal
          onClose={() => setShowSearchModal(false)}
          onSelectUser={(username) => {
            setShowSearchModal(false)
            window.location.href = `/profile/${username}?action=message`
          }}
        />
      )}
    </>
  )
}

/**
 * 搜索用户模态框
 */
function SearchUserModal({
  onClose,
  onSelectUser,
}: {
  onClose: () => void
  onSelectUser: (username: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{
    id: string
    username: string
    avatar_url?: string
    avatar_template?: string
    nft_avatar_url?: string
    bio?: string
  }>>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim() && searchQuery.trim().length >= 2) {
        searchUsers()
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  const searchUsers = async () => {
    try {
      setSearching(true)
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`)

      if (!response.ok) {
        throw new Error('搜索失败')
      }

      const data = await response.json()
      setSearchResults(data.users || [])
    } catch (error) {
      console.error('搜索用户错误:', error)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl max-w-md w-full shadow-xl max-h-[85vh] sm:max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">新建会话</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索用户名或简介..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg
                       bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-base
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {searching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onSelectUser(user.username)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors text-left touch-manipulation"
                >
                  <Avatar
                    username={user.username}
                    avatarUrl={user.avatar_url}
                    avatarTemplate={user.avatar_template as 'micah' | 'adventurer' | 'avataaars' | 'bottts' | 'identicon' | undefined}
                    nftAvatarUrl={user.nft_avatar_url}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate text-base">
                      {user.username}
                    </p>
                    {user.bio && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {user.bio}
                      </p>
                    )}
                  </div>
                  <UserPlus className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : searchQuery.trim() && searchQuery.trim().length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 px-4">
              <Search className="w-12 h-12 mb-3" />
              <p className="font-medium mb-1">未找到匹配的用户</p>
              <p className="text-sm text-center">试试其他关键词</p>
            </div>
          ) : searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mb-3" />
              <p className="text-sm">至少输入 2 个字符</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 px-4">
              <Search className="w-12 h-12 mb-3" />
              <p className="text-sm text-center">支持用户名、简介模糊搜索</p>
              <p className="text-xs text-gray-400 mt-1">输入至少 2 个字符开始搜索</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
