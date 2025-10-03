'use client'

import { useState, useEffect, memo } from 'react'
import Image from 'next/image'
import { getInitials, getAvatarGradient, cn } from '@/lib/utils'
import { getUserAvatar } from '@/lib/avatar'

interface AvatarProps {
  username?: string
  avatarUrl?: string
  avatarTemplate?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

const Avatar = memo(function Avatar({
  username,
  avatarUrl,
  avatarTemplate,
  size = 'md',
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const initials = getInitials(username)

  // 获取用户头像（优先级：自定义 URL > 模版 > null）
  const displayAvatar = getUserAvatar({
    username,
    avatar_url: avatarUrl,
    avatar_template: avatarTemplate,
  })

  // 当头像 URL 改变时，重置错误状态
  useEffect(() => {
    setImageError(false)
  }, [displayAvatar])

  // 如果有头像 URL（自定义或模版生成的），且图片未加载失败，显示图片
  if (displayAvatar && !imageError) {
    return (
      <Image
        src={displayAvatar}
        alt={username || '用户头像'}
        width={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 64}
        height={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 64}
        onError={() => setImageError(true)}
        className={cn(
          'rounded-full object-cover flex-shrink-0',
          sizeClasses[size],
          className
        )}
        unoptimized // DiceBear SVG 不需要优化
        loading="lazy" // 懒加载
      />
    )
  }

  // 否则显示首字母头像
  const gradient = getAvatarGradient(username)

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br',
        gradient,
        sizeClasses[size],
        className
      )}
    >
      <span className="text-white font-semibold select-none">
        {initials}
      </span>
    </div>
  )
})

export default Avatar
