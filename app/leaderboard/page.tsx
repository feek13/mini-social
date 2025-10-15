'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, TrendingUp, ChevronLeft, ChevronRight, Crown, ArrowLeft } from 'lucide-react'
import Avatar from '@/components/Avatar'
import WalletBadge from '@/components/WalletBadge'
import { getLevelInfo } from '@/lib/reputation'
import type { ReputationLevel } from '@/types/database'

interface LeaderboardUser {
  rank: number
  user: {
    id: string
    username: string
    avatarUrl?: string
    avatarTemplate?: string
    bio?: string
  }
  reputation: {
    score: number
    level: ReputationLevel
    updatedAt: string
  }
  stats: {
    txCount: number
    protocolCount: number
    walletAgeDays: number
    ethBalance: string
  }
}

interface LeaderboardResponse {
  leaderboard: LeaderboardUser[]
  pagination: {
    currentPage: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  filters: {
    level: string
    timeRange: string
  }
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20',
        })

        if (selectedLevel !== 'all') {
          params.append('level', selectedLevel)
        }

        if (selectedTimeRange !== 'all') {
          params.append('timeRange', selectedTimeRange)
        }

        const response = await fetch(`/api/leaderboard?${params.toString()}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '获取排行榜失败')
        }

        setData(result)
      } catch (err) {
        console.error('获取排行榜错误:', err)
        setError(err instanceof Error ? err.message : '获取排行榜失败')
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [selectedLevel, selectedTimeRange, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedLevel, selectedTimeRange])

  // Get rank medal
  const getRankMedal = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: 'text-yellow-500' }
    if (rank === 2) return { icon: '🥈', color: 'text-gray-400' }
    if (rank === 3) return { icon: '🥉', color: 'text-orange-600' }
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">声誉排行榜</h1>
          </div>
          <Link
            href="/"
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回首页</span>
          </Link>
        </div>
        <p className="text-gray-600">
          基于链上数据的用户声誉排名，展示最活跃的 Web3 用户
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Level Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              筛选等级
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option value="all">全部等级</option>
              <option value="legend">传奇 💎</option>
              <option value="diamond">钻石 💠</option>
              <option value="gold">黄金 🏆</option>
              <option value="silver">白银 🥈</option>
              <option value="bronze">青铜 🥉</option>
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              时间范围
            </label>
            <div className="flex space-x-2">
              {[
                { value: 'all', label: '全部' },
                { value: 'month', label: '本月' },
                { value: 'week', label: '本周' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedTimeRange(option.value)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    selectedTimeRange === option.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        {data && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              共找到 <span className="font-semibold text-gray-900">{data.pagination.totalCount}</span> 位用户
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            重试
          </button>
        </div>
      )}

      {/* Leaderboard List */}
      {!loading && !error && data && (
        <>
          {data.leaderboard.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">暂无符合条件的用户</p>
              <p className="text-gray-400 text-sm mt-2">尝试调整筛选条件</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.leaderboard.map((entry) => {
                const medal = getRankMedal(entry.rank)
                const levelInfo = getLevelInfo(entry.reputation.level)

                return (
                  <div
                    key={entry.user.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-16 text-center">
                        {medal ? (
                          <div className="flex flex-col items-center">
                            <span className="text-3xl mb-1">{medal.icon}</span>
                            <span className={`text-sm font-bold ${medal.color}`}>
                              #{entry.rank}
                            </span>
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-gray-400">
                            #{entry.rank}
                          </div>
                        )}
                      </div>

                      {/* Avatar */}
                      <Link
                        href={`/profile/${entry.user.username}`}
                        className="flex-shrink-0"
                      >
                        <Avatar
                          username={entry.user.username}
                          avatarUrl={entry.user.avatarUrl}
                          avatarTemplate={entry.user.avatarTemplate}
                          size="lg"
                          className="hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition"
                        />
                      </Link>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Link
                            href={`/profile/${entry.user.username}`}
                            className="font-bold text-lg text-gray-900 hover:text-blue-500 transition truncate"
                          >
                            {entry.user.username}
                          </Link>
                          <WalletBadge
                            isVerified={true}
                            reputationLevel={entry.reputation.level}
                            username={entry.user.username}
                            size="md"
                          />
                          {entry.rank <= 3 && (
                            <Crown className="w-5 h-5 text-yellow-500 animate-pulse" />
                          )}
                        </div>
                        {entry.user.bio && (
                          <p className="text-sm text-gray-600 truncate mb-2">
                            {entry.user.bio}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>{entry.stats.txCount} 笔交易</span>
                          </div>
                          <div>
                            {entry.stats.protocolCount} 个协议
                          </div>
                          <div>
                            钱包 {entry.stats.walletAgeDays} 天
                          </div>
                        </div>
                      </div>

                      {/* Reputation Score */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {entry.reputation.score}
                        </div>
                        <div className={`text-sm font-semibold ${levelInfo.color}`}>
                          {levelInfo.emoji} {levelInfo.name}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center space-x-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!data.pagination.hasPrevPage}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center space-x-1 ${
                  data.pagination.hasPrevPage
                    ? 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>上一页</span>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                  let pageNum: number

                  if (data.pagination.totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= data.pagination.totalPages - 2) {
                    pageNum = data.pagination.totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!data.pagination.hasNextPage}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center space-x-1 ${
                  data.pagination.hasNextPage
                    ? 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>下一页</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Page Info */}
          {data.pagination.totalPages > 1 && (
            <div className="text-center text-sm text-gray-500 mt-4">
              第 {data.pagination.currentPage} / {data.pagination.totalPages} 页
            </div>
          )}
        </>
      )}
    </div>
  )
}
