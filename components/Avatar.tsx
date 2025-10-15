'use client'

import { useState, useEffect, memo } from 'react'
import Image from 'next/image'
import { getInitials, getAvatarGradient, cn } from '@/lib/utils'
import { getUserAvatar } from '@/lib/avatar'

interface AvatarProps {
  username?: string
  avatarUrl?: string
  avatarTemplate?: string
  nftAvatarUrl?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showNFTBadge?: boolean
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
  nftAvatarUrl,
  size = 'md',
  className,
  showNFTBadge = false,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [nftError, setNftError] = useState(false)
  const initials = getInitials(username)

  // 获取用户头像（优先级：NFT > 自定义 URL > 模版 > null）
  const displayAvatar = nftAvatarUrl && !nftError
    ? nftAvatarUrl
    : getUserAvatar({
        username,
        avatar_url: avatarUrl,
        avatar_template: avatarTemplate,
      })

  const isNFT = nftAvatarUrl && !nftError && displayAvatar === nftAvatarUrl

  // 当头像 URL 改变时，重置错误状态
  useEffect(() => {
    setImageError(false)
    setNftError(false)
  }, [displayAvatar, nftAvatarUrl])

  // 如果有头像 URL（NFT、自定义或模版生成的），且图片未加载失败，显示图片
  if (displayAvatar && !imageError) {
    return (
      <div className={cn(
        'rounded-full overflow-hidden flex-shrink-0 bg-gray-100 relative',
        isNFT && 'ring-2 ring-purple-500',
        sizeClasses[size],
        className
      )}>
        <Image
          src={displayAvatar}
          alt={username || '用户头像'}
          width={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 64}
          height={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 64}
          onError={() => {
            if (isNFT) {
              setNftError(true)
            }
            setImageError(true)
          }}
          className="w-full h-full object-cover"
          unoptimized // DiceBear SVG 不需要优化
          loading="lazy" // 懒加载
        />
        {/* NFT Badge (optional) */}
        {isNFT && showNFTBadge && (
          <div className="absolute -top-0.5 -right-0.5 bg-purple-500 rounded-full p-0.5">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-5a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
          </div>
        )}
      </div>
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
