'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import TVLHistoryChart from '@/components/defi/charts/TVLHistoryChart'
import MetricCard from '@/components/defi/MetricCard'
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  BarChart3,
  Users,
  Zap,
  Loader2,
  AlertCircle,
  Info,
  Twitter,
  Globe,
  Code,
  Shield
} from 'lucide-react'
import { ProtocolDetail } from '@/lib/defillama/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function ProtocolDetailPage({ params }: PageProps) {
  const [slug, setSlug] = useState<string>('')
  const [protocol, setProtocol] = useState<ProtocolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'info' | 'yields' | 'methodology'>('info')

  useEffect(() => {
    params.then(p => setSlug(p.slug))
  }, [params])

  useEffect(() => {
    if (!slug) return

    const fetchProtocolDetail = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/defi/protocols/${slug}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '获取协议详情失败')
        }

        setProtocol(data.protocol)
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败')
      } finally {
        setLoading(false)
      }
    }

    fetchProtocolDetail()
  }, [slug])

  // 转换历史数据
  type TVLItem = number | { date?: number; totalLiquidityUSD?: number }
  const chartData = protocol?.tvl
    ? protocol.tvl.map((item: TVLItem, index: number) => ({
        date: typeof item === 'object' && item.date ? item.date : index,
        tvl: typeof item === 'number' ? item : (typeof item === 'object' && item.totalLiquidityUSD ? item.totalLiquidityUSD : 0),
        timestamp: (typeof item === 'object' && item.date) ? item.date : Date.now() / 1000 - (protocol.tvl.length - index) * 86400
      }))
    : []

  const currentTVL = protocol?.currentChainTvls
    ? Object.values(protocol.currentChainTvls).reduce((a, b) => a + b, 0)
    : chartData.length > 0
    ? chartData[chartData.length - 1].tvl
    : 0

  // 模拟的关键指标数据（实际应该从 API 获取）
  const mockMetrics = {
    fees: currentTVL * 0.01,
    revenue: currentTVL * 0.005,
    holdersRevenue: currentTVL * 0.003,
    volume30d: currentTVL * 15,
    liquidity: currentTVL * 0.1,
    activeAddresses: 5500,
    transactions: 38688,
    gasUsed: 1353
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  if (error || !protocol) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {error || '协议不存在'}
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

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 返回按钮 */}
        <Link
          href="/defi"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          返回协议列表
        </Link>

        {/* 协议头部信息 */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              {protocol.logo && (
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 ring-2 ring-gray-700">
                  <Image
                    src={protocol.logo}
                    alt={protocol.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">
                    {protocol.name}
                  </h1>
                  <span className="text-gray-500">({protocol.symbol || 'N/A'})</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 text-sm font-medium bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                    {protocol.category}
                  </span>

                  {protocol.chains && protocol.chains.length > 0 && (
                    <span className="text-sm text-gray-500">
                      · {protocol.chains.length} chains
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧链接 */}
            <div className="flex items-center gap-2">
              {protocol.url && (
                <a
                  href={protocol.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition"
                  title="Website"
                >
                  <Globe className="w-5 h-5" />
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
                  <Twitter className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {protocol.description && (
            <p className="text-gray-400 leading-relaxed">
              {protocol.description}
            </p>
          )}

          {/* 审计和其他信息 */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-800">
            {protocol.audits && (
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-gray-400">Audited</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Code className="w-4 h-4" />
              <span>Category: {protocol.category}</span>
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="mb-6 bg-gray-900 rounded-xl border border-gray-800 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'info'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Information
            </button>
            <button
              onClick={() => setActiveTab('yields')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'yields'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              Yields
            </button>
            <button
              onClick={() => setActiveTab('methodology')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'methodology'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Info className="w-4 h-4" />
              Methodology
            </button>
          </div>
        </div>

        {/* 主内容区 */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* TVL 主图表 */}
            {chartData.length > 0 && (
              <TVLHistoryChart
                data={chartData}
                height={400}
              />
            )}

            {/* 关键指标网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
