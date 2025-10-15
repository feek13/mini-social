'use client'

/**
 * 钱包验证徽章组件
 * 显示用户的钱包验证状态和声誉等级
 */

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import type { ReputationLevel } from '@/types/database'
import { getLevelInfo } from '@/lib/reputation'
import ReputationModal from './ReputationModal'

interface WalletBadgeProps {
  isVerified: boolean
  reputationLevel?: ReputationLevel
  username?: string
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  clickable?: boolean
}

export default function WalletBadge({
  isVerified,
  reputationLevel,
  username,
  size = 'md',
  showTooltip = true,
  clickable = true,
}: WalletBadgeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!isVerified || !reputationLevel) {
    return null
  }

  const levelInfo = getLevelInfo(reputationLevel)

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const handleClick = (e: React.MouseEvent) => {
    if (clickable && username) {
      e.preventDefault()
      e.stopPropagation()
      setIsModalOpen(true)
    }
  }

  return (
    <>
      <div
        className={`inline-flex items-center space-x-1 ${sizeClasses[size]} group relative ${
          clickable && username ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''
        }`}
        title={showTooltip ? `已验证钱包 · ${levelInfo.name}${clickable && username ? ' · 点击查看详情' : ''}` : undefined}
        onClick={handleClick}
      >
      {/* 验证图标 */}
      <CheckCircle
        className={`${
          size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'
        } text-blue-500`}
      />

      {/* 等级表情 */}
      <span className="leading-none">{levelInfo.emoji}</span>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-10">
          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <div className="font-semibold">已验证钱包</div>
            <div className={levelInfo.color}>
              {levelInfo.emoji} {levelInfo.name}
            </div>
            <div className="text-gray-300 text-xs mt-1">
              {levelInfo.description}
            </div>
            {clickable && username && (
              <div className="text-blue-300 text-xs mt-1 font-semibold">
                点击查看详情 →
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* 声誉详情弹窗 */}
    {username && (
      <ReputationModal
        username={username}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    )}
    </>
  )
}
