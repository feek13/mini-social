'use client'

import Avatar from '@/components/Avatar'
import type { Message } from '@/types/database'

type Props = {
  message: Message
  isOwnMessage: boolean
  showAvatar?: boolean
}

export default function MessageBubble({ message, isOwnMessage, showAvatar = true }: Props) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const sender = message.sender

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 lg:mb-4`}>
      <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[85%] sm:max-w-[75%] lg:max-w-[70%]`}>
        {showAvatar && sender && (
          <div className="flex-shrink-0">
            <Avatar
              username={sender.username}
              avatarUrl={sender.avatar_url}
              avatarTemplate={sender.avatar_template as 'micah' | 'adventurer' | 'avataaars' | 'bottts' | 'identicon' | undefined}
              nftAvatarUrl={sender.nft_avatar_url}
              size="sm"
            />
          </div>
        )}
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {!isOwnMessage && sender && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-2">
              {sender.username}
            </span>
          )}

          {/* Reply reference */}
          {message.reply_to_message && (
            <div className={`px-2.5 py-1.5 lg:px-3 lg:py-2 mb-1 rounded-lg text-xs ${
              isOwnMessage
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            } border-l-2 ${
              isOwnMessage ? 'border-blue-600' : 'border-gray-400'
            }`}>
              <div className="font-medium">
                回复 {message.reply_to_message.sender?.username || '用户'}
              </div>
              <div className="line-clamp-2 opacity-75">
                {message.reply_to_message.content}
              </div>
            </div>
          )}

          {/* Message content */}
          <div className={`px-3 py-2 lg:px-4 rounded-2xl text-base ${
            isOwnMessage
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
          }`}>
            {/* Text message */}
            {message.message_type === 'text' && (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}

            {/* Image message */}
            {message.message_type === 'image' && message.media_url && (
              <div className="space-y-2">
                {message.content && (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                )}
                <img
                  src={message.media_url}
                  alt="图片消息"
                  className="rounded-lg max-w-full h-auto"
                />
              </div>
            )}

            {/* File message */}
            {message.message_type === 'file' && message.media_url && (
              <div className="space-y-2">
                {message.content && (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                )}
                <a
                  href={message.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center space-x-2 underline ${
                    isOwnMessage ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>下载文件</span>
                </a>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <span className={`text-xs text-gray-500 dark:text-gray-400 mt-1 px-2`}>
            {formatTimestamp(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
