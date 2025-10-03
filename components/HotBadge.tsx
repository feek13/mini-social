import { Flame } from 'lucide-react'

interface HotBadgeProps {
  score: number
  rank?: number
}

export default function HotBadge({ score, rank }: HotBadgeProps) {
  // 根据热度分数确定颜色
  const getColorClass = () => {
    if (score > 50) {
      return 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
    } else if (score > 20) {
      return 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white'
    } else {
      return 'bg-gradient-to-r from-yellow-500 to-yellow-300 text-gray-800'
    }
  }

  // 获取排名徽章
  const getRankBadge = () => {
    if (!rank) return null

    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="flex items-center gap-2">
      {rank && (
        <div className="flex items-center justify-center min-w-[2.5rem] h-8 font-bold text-sm">
          <span className={rank <= 3 ? 'text-2xl' : 'text-gray-600'}>
            {getRankBadge()}
          </span>
        </div>
      )}
      <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${getColorClass()}`}>
        <Flame className="w-4 h-4 animate-pulse" />
        <span className="text-sm font-semibold">{score.toFixed(1)}</span>
      </div>
    </div>
  )
}
