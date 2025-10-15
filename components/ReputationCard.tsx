'use client'

/**
 * 声誉信息卡片组件
 * 显示用户的详细声誉信息
 */

import { useState, useEffect } from 'react'
import { Award, TrendingUp, RefreshCw, Loader2 } from 'lucide-react'
import type { Profile } from '@/types/database'
import { getLevelInfo, getNextLevelInfo } from '@/lib/reputation'

interface ReputationCardProps {
  profile: Profile
  onRefresh?: () => void
}

export default function ReputationCard({
  profile,
  onRefresh,
}: ReputationCardProps) {
  const [refreshing, setRefreshing] = useState(false)

  // 如果未验证钱包，不显示
  if (!profile.wallet_address || !profile.reputation_level) {
    return null
  }

  const levelInfo = getLevelInfo(profile.reputation_level)
  const score = profile.reputation_score || 0
  const nextLevelInfo = getNextLevelInfo(score)

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return

    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  // 格式化时间
  const formatTime = (dateString?: string) => {
    if (!dateString) return '从未更新'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    return `${diffDays} 天前`
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">用户声誉</h3>
        </div>

        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1 disabled:opacity-50"
            title="刷新声誉数据"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>刷新</span>
          </button>
        )}
      </div>

      {/* 等级和分数 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-4xl">{levelInfo.emoji}</span>
            <div>
              <div className={`text-2xl font-bold ${levelInfo.color}`}>
                {levelInfo.name}
              </div>
              <div className="text-sm text-gray-600">
                {levelInfo.description}
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-4xl font-bold text-gray-900">{score}</div>
          <div className="text-sm text-gray-500">/ 100 分</div>
        </div>
      </div>

      {/* 进度条（升级到下一等级） */}
      {nextLevelInfo.nextLevel && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              距离 {getLevelInfo(nextLevelInfo.nextLevel).name}
            </span>
            <span className="text-sm font-semibold text-gray-900">
              还需 {nextLevelInfo.scoreNeeded} 分
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${nextLevelInfo.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 统计数据 */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {profile.wallet_age_days || 0}
          </div>
          <div className="text-xs text-gray-600">钱包年龄（天）</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {profile.on_chain_tx_count || 0}
          </div>
          <div className="text-xs text-gray-600">链上交易</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {profile.defi_protocol_count || 0}
          </div>
          <div className="text-xs text-gray-600">DeFi 协议</div>
        </div>
      </div>

      {/* 更新时间 */}
      <div className="mt-4 text-center text-xs text-gray-500">
        最后更新：{formatTime(profile.reputation_updated_at)}
      </div>
    </div>
  )
}
