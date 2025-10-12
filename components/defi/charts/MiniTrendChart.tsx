'use client'

interface MiniTrendChartProps {
  data: { tvl: number }[]
  color?: string
  height?: number
}

export default function MiniTrendChart({
  data,
  color = '#3B82F6',
  height = 50
}: MiniTrendChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  // 计算最小值和最大值
  const values = data.map(d => d.tvl)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1 // 避免除以0

  // 生成 SVG 路径点
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = ((max - d.tvl) / range) * 100
    return `${x},${y}`
  }).join(' ')

  // 生成填充区域路径
  const pathD = `M0,100 L${points} L100,100 Z`

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="opacity-60"
      >
        {/* 填充渐变 */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.05 }} />
          </linearGradient>
        </defs>

        {/* 填充区域 */}
        <path
          d={pathD}
          fill={`url(#gradient-${color})`}
        />

        {/* 线条 */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}
