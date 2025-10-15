'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import ConversationList from '@/components/messaging/ConversationList'
import ChatWindow from '@/components/messaging/ChatWindow'
import { MessageCircle } from 'lucide-react'

export default function MessagesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>()
  const [showChat, setShowChat] = useState(false)

  // Check for conversation query parameter on mount
  useEffect(() => {
    const conversationParam = searchParams.get('conversation')
    if (conversationParam) {
      setSelectedConversationId(conversationParam)
      setShowChat(true)
    }
  }, [searchParams])

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
    setShowChat(true)
  }

  const handleBack = () => {
    setShowChat(false)
    setSelectedConversationId(undefined)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <MessageCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          请先登录
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          登录后即可使用私信功能
        </p>
        <button
          onClick={() => router.push('/auth/signin')}
          className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
        >
          前往登录
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900 pb-safe overflow-hidden">
      {/* Main Content - Telegram 风格布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List - Desktop: always visible, Mobile: hide when chat is open */}
        <div className={`w-full lg:w-96 border-r border-gray-200 dark:border-gray-800 overflow-y-auto ${
          showChat ? 'hidden lg:block' : 'block'
        }`}>
          <ConversationList
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversationId}
          />
        </div>

        {/* Chat Window - Desktop: always visible, Mobile: show when conversation selected */}
        <div className={`flex-1 ${
          showChat ? 'block' : 'hidden lg:block'
        }`}>
          {selectedConversationId ? (
            <ChatWindow
              conversationId={selectedConversationId}
              onBack={handleBack}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 px-4">
              <MessageCircle className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium mb-2 text-center">选择一个会话开始聊天</p>
              <p className="text-sm text-center">或者在用户资料页发起新的对话</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
