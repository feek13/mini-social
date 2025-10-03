'use client'

import { useState, useEffect } from 'react'
import { Bell, BellRing, Loader2 } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'

interface FollowButtonProps {
  userId: string
  username: string
  initialFollowing?: boolean
  initialNotifyOnPost?: boolean
  onFollowChange?: (following: boolean) => void
}

export default function FollowButton({
  userId,
  username,
  initialFollowing = false,
  initialNotifyOnPost = false,
  onFollowChange,
}: FollowButtonProps) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [notifyOnPost, setNotifyOnPost] = useState(initialNotifyOnPost)
  const [isLoading, setIsLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // 如果未登录或者是自己，不显示按钮
  if (!user || user.id === userId) {
    return null
  }

  // 处理关注/取关
  const handleFollowToggle = async () => {
    if (isLoading) return

    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (isFollowing) {
        // 取消关注
        const response = await fetch(`/api/users/${username}/follow`, {
          method: 'DELETE',
          headers: {
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || '取消关注失败')
        }

        setIsFollowing(false)
        setNotifyOnPost(false)
        onFollowChange?.(false)
      } else {
        // 关注
        const response = await fetch(`/api/users/${username}/follow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || '关注失败')
        }

        const result = await response.json()
        setIsFollowing(true)
        setNotifyOnPost(result.notifyOnPost || false)
        onFollowChange?.(true)
      }
    } catch (error) {
      console.error('关注操作失败:', error)
      alert(error instanceof Error ? error.message : '操作失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理通知开关
  const handleNotifyToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!isFollowing || isLoading) return

    setIsLoading(true)
    const newNotifyState = !notifyOnPost

    // 乐观更新
    setNotifyOnPost(newNotifyState)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetch(`/api/users/${username}/notify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({ notifyOnPost: newNotifyState }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || '设置失败')
      }

      const result = await response.json()
      setNotifyOnPost(result.notifyOnPost)
    } catch (error) {
      console.error('设置通知失败:', error)
      // 失败时回滚
      setNotifyOnPost(!newNotifyState)
      alert(error instanceof Error ? error.message : '设置失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      {/* 关注按钮 */}
      <button
        onClick={handleFollowToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isLoading}
        className={`
          px-4 py-2 rounded-full font-medium transition-all duration-200 active:scale-95
          flex items-center space-x-2 min-w-[100px] justify-center
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${
            isFollowing
              ? isHovered
                ? 'bg-red-50 text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>处理中</span>
          </>
        ) : (
          <span>
            {isFollowing ? (isHovered ? '取消关注' : '已关注') : '关注'}
          </span>
        )}
      </button>

      {/* 通知铃铛按钮（仅在已关注时显示） */}
      {isFollowing && (
        <button
          onClick={handleNotifyToggle}
          disabled={isLoading}
          title={notifyOnPost ? '关闭发文通知' : '开启发文通知'}
          className={`
            p-2 rounded-full transition-all duration-200 active:scale-95
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            ${
              notifyOnPost
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          {notifyOnPost ? (
            <BellRing className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  )
}
