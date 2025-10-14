import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { defillama } from '@/lib/defillama/client'
import { YieldPool } from '@/lib/defillama/types'
import PoolDetailContent from '@/components/defi/pool-detail/PoolDetailContent'
import { Loader2, AlertCircle } from 'lucide-react'

// 启用静态生成，每 5 分钟重新验证
export const revalidate = 300

interface PageProps {
  params: Promise<{ poolId: string }>
}

// 获取池子数据的辅助函数
async function getPoolData(poolId: string): Promise<YieldPool | null> {
  try {
    const decodedPoolId = decodeURIComponent(poolId)
    const pools = await defillama.getYields()
    const pool = pools.find(p => p.pool === decodedPoolId)
    return pool || null
  } catch (error) {
    console.error('Error fetching pool data:', error)
    return null
  }
}

// 生成动态 SEO metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { poolId } = await params
  const pool = await getPoolData(poolId)

  if (!pool) {
    return {
      title: '池子未找到 | DeFi 数据浏览器',
      description: '未找到请求的 DeFi 收益率池子'
    }
  }

  const title = `${pool.project} - ${pool.symbol} | APY ${pool.apy.toFixed(2)}%`
  const description = `${pool.project} 在 ${pool.chain} 链上的收益率池子，当前 APY ${pool.apy.toFixed(2)}%，TVL $${(pool.tvlUsd / 1000000).toFixed(2)}M。${pool.stablecoin ? '稳定币池子' : ''}${pool.ilRisk === 'no' ? '，无无常损失风险' : ''}`

  const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mini-social.vercel.app'}/defi/yields/${encodeURIComponent(poolId)}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [
        {
          url: '/og-defi.png', // 你可以创建一个默认的 OG 图片
          width: 1200,
          height: 630,
          alt: `${pool.project} - DeFi Pool`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-defi.png'],
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function PoolDetailPage({ params }: PageProps) {
  const { poolId } = await params

  if (!poolId) {
    notFound()
  }

  const pool = await getPoolData(poolId)

  if (!pool) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">池子未找到</h2>
            <p className="text-gray-600 mb-6">
              无法找到 ID 为 {poolId} 的池子信息
            </p>
            <a
              href="/defi"
              className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              返回 DeFi 浏览器
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <PoolDetailContent pool={pool} />
}
