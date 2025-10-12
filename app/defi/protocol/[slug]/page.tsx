'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import ProtocolDetailSkeleton from '@/components/defi/ProtocolDetailSkeleton'
import MetricCard from '@/components/defi/MetricCard'
import { useProtocolDetail } from '@/hooks/useProtocolDetail'
import { ProtocolDetail } from '@/lib/defillama/types'
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  BarChart3,
  Users,
  Zap,
  Info,
  Twitter,
  Globe,
  Code,
  Shield
} from 'lucide-react'

// TVL 数据项类型
type TVLDataItem = number | { date?: number; totalLiquidityUSD?: number }

// 动态导入图表组件（懒加载）
const TVLHistoryChart = dynamic(
  () => import('@/components/defi/charts/TVLHistoryChart'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="h-[400px] animate-pulse bg-gray-800 rounded" />
      </div>
    )
  }
)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function ProtocolDetailPage({ params }: PageProps) {
  const [slug, setSlug] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'info' | 'yields' | 'methodology'>('info')

  useEffect(() => {
    params.then(p => setSlug(p.slug))
  }, [params])

  // 预连接到 DeFiLlama API (DNS 预取 + 预连接)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // DNS 预取
      const dnsPrefetch = document.createElement('link')
      dnsPrefetch.rel = 'dns-prefetch'
      dnsPrefetch.href = 'https://api.llama.fi'
      document.head.appendChild(dnsPrefetch)

      // 预连接（包含 DNS、TCP、TLS 握手）
      const preconnect = document.createElement('link')
      preconnect.rel = 'preconnect'
      preconnect.href = 'https://api.llama.fi'
      preconnect.crossOrigin = 'anonymous'
      document.head.appendChild(preconnect)

      // CDN 预连接（logo 和图片）
      const cdnPreconnect = document.createElement('link')
      cdnPreconnect.rel = 'preconnect'
      cdnPreconnect.href = 'https://icons.llama.fi'
      cdnPreconnect.crossOrigin = 'anonymous'
      document.head.appendChild(cdnPreconnect)

      return () => {
        // 清理
        document.head.removeChild(dnsPrefetch)
        document.head.removeChild(preconnect)
        document.head.removeChild(cdnPreconnect)
      }
    }
  }, [])

  // 使用优化的数据获取 Hook
  const { data: protocol, isLoading, error } = useProtocolDetail(slug) as {
    data: ProtocolDetail | undefined
    isLoading: boolean
    error: Error | null
  }

  // 转换历史数据（使用 useMemo 缓存）
  const chartData = useMemo(() => {
    if (!protocol?.tvl) return []

    return protocol.tvl.map((item: TVLDataItem, index: number) => ({
      date: typeof item === 'object' && item.date ? item.date : index,
      tvl: typeof item === 'number' ? item : (item.totalLiquidityUSD || 0),
      timestamp: typeof item === 'object' && item.date ? item.date : Date.now() / 1000 - (protocol.tvl.length - index) * 86400
    }))
  }, [protocol?.tvl])

  const currentTVL = useMemo(() => {
    if (protocol?.currentChainTvls) {
      return Object.values(protocol.currentChainTvls).reduce((a, b) => a + b, 0)
    }
    if (chartData.length > 0) {
      return chartData[chartData.length - 1].tvl
    }
    return 0
  }, [protocol?.currentChainTvls, chartData])

  // 模拟的关键指标（实际应从 API 获取）
  const mockMetrics = useMemo(() => ({
    fees: currentTVL * 0.01,
    revenue: currentTVL * 0.005,
    holdersRevenue: currentTVL * 0.003,
    volume30d: currentTVL * 15,
    liquidity: currentTVL * 0.1,
    activeAddresses: 5500,
    transactions: 38688,
    gasUsed: 1353
  }), [currentTVL])

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <div className="h-10 w-32 bg-gray-800 rounded animate-pulse" />
          </div>
          <ProtocolDetailSkeleton />
        </main>
      </div>
    )
  }

  // 错误状态
  if (error || !protocol) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
            <h3 className="text-xl font-semibold text-white mb-2">
              {error?.message || '协议不存在'}
            </h3>
            <Link
              href="/defi"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mt-4"
            >
              <ArrowLeft className="w-4 h-4" />
              返回列表
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 overflow-x-hidden">
        {/* 返回按钮 */}
        <Link
          href="/defi"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">返回协议列表</span>
          <span className="sm:hidden">返回</span>
        </Link>

        {/* 协议头部信息 */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6 mb-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3 md:gap-4 min-w-0 flex-1">
              {protocol.logo && (
                <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 ring-2 ring-gray-700">
                  <Image
                    src={protocol.logo}
                    alt={protocol.name}
                    fill
                    className="object-cover"
                    unoptimized
                    priority
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-xl md:text-3xl font-bold text-white truncate">
                    {protocol.name}
                  </h1>
                  <span className="text-gray-500 text-sm md:text-base flex-shrink-0">
                    ({protocol.symbol || 'N/A'})
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                    {protocol.category}
                  </span>

                  {protocol.chains && protocol.chains.length > 0 && (
                    <span className="text-xs md:text-sm text-gray-500">
                      · {protocol.chains.length} chains
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧链接 - 移动端堆叠 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {protocol.url && (
                <a
                  href={protocol.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition"
                  title="Website"
                >
                  <Globe className="w-4 h-4 md:w-5 md:h-5" />
                </a>
              )}
              {protocol.twitter && (
                <a
                  href={`https://twitter.com/${protocol.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition"
                  title="Twitter"
                >
                  <Twitter className="w-4 h-4 md:w-5 md:h-5" />
                </a>
              )}
            </div>
          </div>

          {protocol.description && (
            <p className="text-sm md:text-base text-gray-400 leading-relaxed">
              {protocol.description}
            </p>
          )}

          {/* 审计和其他信息 - 移动端可滚动 */}
          <div className="flex items-center gap-3 md:gap-4 mt-4 pt-4 border-t border-gray-800 overflow-x-auto hide-scrollbar">
            {protocol.audits && (
              <div className="flex items-center gap-2 text-xs md:text-sm flex-shrink-0">
                <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />
                <span className="text-gray-400">Audited</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500 flex-shrink-0">
              <Code className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Category: {protocol.category}</span>
            </div>
          </div>
        </div>

        {/* Tab 导航 - 移动端可滚动 */}
        <div className="mb-6 bg-gray-900 rounded-xl border border-gray-800 p-2 -mx-4 px-4 md:mx-0 md:px-2">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
                activeTab === 'info'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Information
            </button>
            <button
              onClick={() => setActiveTab('yields')}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
                activeTab === 'yields'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Yields
            </button>
            <button
              onClick={() => setActiveTab('methodology')}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
                activeTab === 'methodology'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Info className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Methodology
            </button>
          </div>
        </div>

        {/* 主内容区 - 使用 Suspense 懒加载 */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* TVL 图表 - 懒加载 */}
            {chartData.length > 0 && (
              <Suspense fallback={<div className="h-[400px] bg-gray-900 rounded-xl animate-pulse" />}>
                <TVLHistoryChart
                  data={chartData}
                  height={400}
                />
              </Suspense>
            )}

            {/* 关键指标网格 - 移动端单列 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <MetricCard
                icon={DollarSign}
                label="Fees (Annualized)"
                value={mockMetrics.fees}
                change={protocol.change_1d}
              />
              <MetricCard
                icon={DollarSign}
                label="Revenue (Annualized)"
                value={mockMetrics.revenue}
                change={protocol.change_1d}
              />
              <MetricCard
                icon={DollarSign}
                label="Holders Revenue (Annualized)"
                value={mockMetrics.holdersRevenue}
                change={protocol.change_7d}
              />
              <MetricCard
                icon={BarChart3}
                label="DEX Volume 30d"
                value={mockMetrics.volume30d}
              />
              <MetricCard
                icon={TrendingUp}
                label={`${protocol.symbol} Liquidity`}
                value={mockMetrics.liquidity}
              />
            </div>

            {/* 用户活动数据 */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                User Activity
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Active Addresses (24h)</div>
                  <div className="text-2xl font-bold text-white">
                    {mockMetrics.activeAddresses.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Transactions (24h)</div>
                  <div className="text-2xl font-bold text-white">
                    {mockMetrics.transactions.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Gas Used (24h)</div>
                  <div className="text-2xl font-bold text-white">
                    ${mockMetrics.gasUsed.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* 支持的链 */}
            {protocol.chains && protocol.chains.length > 0 && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Supported Blockchains</h3>
                <div className="flex flex-wrap gap-2">
                  {protocol.chains.map((chain, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 text-sm font-medium bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:border-gray-600 transition"
                    >
                      {chain}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'yields' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Yield Opportunities</h3>
            <p className="text-gray-400">
              收益率数据集成开发中...
            </p>
          </div>
        )}

        {activeTab === 'methodology' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Methodology</h3>
            <div className="space-y-4 text-gray-400">
              <div>
                <h4 className="font-semibold text-white mb-2">TVL (Total Value Locked)</h4>
                <p>Total value of all coins held in the smart contracts of the protocol</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Fees</h4>
                <p>Swap fees paid by users</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Revenue</h4>
                <p>Percentage of swap fees going to treasury and/or token holders</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">DEX Volume</h4>
                <p>Volume of all spot token swaps that go through the protocol</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
