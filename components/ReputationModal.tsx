'use client'

import { useState, useEffect } from 'react'
import { X, TrendingUp, Calendar, Hash, Wallet, Activity } from 'lucide-react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

interface ReputationModalProps {
  username: string
  isOpen: boolean
  onClose: () => void
}

interface ReputationData {
  score?: number
  level?: string
  updatedAt?: string
  walletAge?: number
  txCount?: number
  protocolCount?: number
  ethBalance?: string
  dimensions?: {
    walletAge: number
    activity: number
    defiParticipation: number
    assetScale: number
    socialActivity: number
  }
  history?: Array<{
    score: number
    createdAt: string
  }>
}

const LEVEL_CONFIG = {
  'bronze': { emoji: '🥉', name: 'Bronze', color: '#CD7F32', range: '0-19' },
  'silver': { emoji: '🥈', name: 'Silver', color: '#C0C0C0', range: '20-39' },
  'gold': { emoji: '🥇', name: 'Gold', color: '#FFD700', range: '40-59' },
  'diamond': { emoji: '💎', name: 'Diamond', color: '#B9F2FF', range: '60-79' },
  'legend': { emoji: '👑', name: 'Legend', color: '#FF6B35', range: '80-100' },
}

export default function ReputationModal({ username, isOpen, onClose }: ReputationModalProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReputationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && username) {
      fetchReputationData()
    }
  }, [isOpen, username])

  const fetchReputationData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/wallet/stats?username=${username}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '获取声誉数据失败')
      }

      setData(result)
    } catch (err) {
      console.error('获取声誉数据错误:', err)
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const levelConfig = data?.level ? LEVEL_CONFIG[data.level.toLowerCase() as keyof typeof LEVEL_CONFIG] : null

  // 准备雷达图数据
  const radarData = data?.dimensions ? [
    { dimension: '钱包年龄', value: data.dimensions.walletAge, fullMark: 20 },
    { dimension: '活跃度', value: data.dimensions.activity, fullMark: 25 },
    { dimension: 'DeFi参与', value: data.dimensions.defiParticipation, fullMark: 30 },
    { dimension: '资产规模', value: data.dimensions.assetScale, fullMark: 15 },
    { dimension: '社交活动', value: data.dimensions.socialActivity, fullMark: 10 },
  ] : []

  // 准备趋势图数据
  const trendData = data?.history?.map(item => ({
    date: new Date(item.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    score: item.score,
  })) || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">@{username}</h2>
              <p className="text-sm text-gray-500">Web3 声誉详情</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={fetchReputationData}
                className="mt-4 text-blue-500 hover:text-blue-600 text-sm"
              >
                重试
              </button>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* 声誉等级卡片 */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">当前等级</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-4xl">{levelConfig?.emoji}</span>
                      <div>
                        <h3 className="text-2xl font-bold" style={{ color: levelConfig?.color }}>
                          {levelConfig?.name}
                        </h3>
                        <p className="text-sm text-gray-500">分数范围: {levelConfig?.range}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">综合得分</p>
                    <p className="text-5xl font-bold text-blue-600">{data.score ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">满分 100</p>
                  </div>
                </div>

                {/* 进度条到下一等级 */}
                {data.level && data.level !== 'legend' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>距离下一等级</span>
                      <span>{getNextLevelProgress(data.score ?? 0, data.level)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
                        style={{ width: `${getProgressPercentage(data.score ?? 0, data.level)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* 统计数据网格 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Calendar} label="钱包年龄" value={`${data.walletAge ?? 0} 天`} />
                <StatCard icon={Activity} label="交易数量" value={(data.txCount ?? 0).toLocaleString()} />
                <StatCard icon={Hash} label="DeFi协议" value={(data.protocolCount ?? 0).toString()} />
                <StatCard icon={Wallet} label="ETH余额" value={`${parseFloat(data.ethBalance ?? '0').toFixed(4)} ETH`} />
              </div>

              {/* 维度得分雷达图 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                  维度得分分析
                </h4>
                <div className="w-full flex justify-center">
                  <RadarChart width={400} height={300} data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <Radar
                      name="得分"
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.5}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                  </RadarChart>
                </div>
              </div>

              {/* 历史趋势图 */}
              {trendData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-green-500" />
                    声誉变化趋势
                  </h4>
                  <div className="w-full overflow-x-auto">
                    <LineChart width={600} height={250} data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 4 }}
                        name="声誉分数"
                      />
                    </LineChart>
                  </div>
                </div>
              )}

              {/* 最后更新时间 */}
              {data.updatedAt && (
                <div className="text-center text-xs text-gray-400">
                  最后更新: {new Date(data.updatedAt).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// 辅助组件：统计卡片
function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
      <div className="flex items-center space-x-2 mb-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <p className="text-xs text-gray-600">{label}</p>
      </div>
      <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
    </div>
  )
}

// 辅助函数：计算到下一等级的进度
function getNextLevelProgress(score: number | undefined, level: string | undefined): string {
  if (!level || score === undefined) return '暂无数据'

  const nextLevelThresholds: Record<string, number> = {
    'bronze': 20,
    'silver': 40,
    'gold': 60,
    'diamond': 80,
  }

  const threshold = nextLevelThresholds[level.toLowerCase()]
  if (!threshold) return '已满级'

  const needed = threshold - score
  return `还需 ${needed} 分`
}

// 辅助函数：计算进度百分比
function getProgressPercentage(score: number | undefined, level: string | undefined): number {
  if (!level || score === undefined) return 0

  const ranges: Record<string, { min: number; max: number }> = {
    'bronze': { min: 0, max: 19 },
    'silver': { min: 20, max: 39 },
    'gold': { min: 40, max: 59 },
    'diamond': { min: 60, max: 79 },
  }

  const range = ranges[level.toLowerCase()]
  if (!range) return 100

  return ((score - range.min) / (range.max - range.min + 1)) * 100
}
