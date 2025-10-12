'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, Loader2, TrendingUp, Droplets, Coins, Zap, Sparkles } from 'lucide-react'
import { Protocol, YieldPool } from '@/lib/defillama/types'
import Image from 'next/image'
import { formatTVL, formatAPY } from '@/lib/utils'

export type DeFiEmbedType = 'protocol' | 'yield' | 'token'

export interface DeFiEmbed {
  type: DeFiEmbedType
  referenceId: string
  snapshotData: Protocol | YieldPool | TokenData
}

export interface TokenData {
  chain: string
  address: string
  symbol: string
  price: number
  decimals: number
}

interface DeFiEmbedPickerProps {
  onSelect: (embed: DeFiEmbed) => void
  onClose: () => void
}

type TabType = 'protocol' | 'yield' | 'token'

// 紧凑型分类筛选
const COMPACT_CATEGORIES = [
  { label: '全部', value: '' },
  { label: 'DEX', value: 'Dexes' },
  { label: '借贷', value: 'Lending' },
  { label: '收益', value: 'Yield' },
  { label: '稳定币', value: 'CDP' },
]

// 紧凑型链筛选（热门链）
const COMPACT_CHAINS = [
  { label: '全部', value: '' },
  { label: 'ETH', value: 'Ethereum' },
  { label: 'ARB', value: 'Arbitrum' },
  { label: 'OP', value: 'Optimism' },
  { label: 'BASE', value: 'Base' },
]

// APY 筛选范围
const APY_FILTERS = [
  { label: '全部', minApy: 0, icon: Sparkles },
  { label: '高收益 >20%', minApy: 20, icon: TrendingUp },
  { label: '超高 >50%', minApy: 50, icon: Zap },
]

// 代币分类
const TOKEN_CATEGORIES = [
  { label: 'WETH', chain: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  { label: 'USDC', chain: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { label: 'USDT', chain: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { label: 'WBTC', chain: 'ethereum', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
]

export default function DeFiEmbedPicker({ onSelect, onClose }: DeFiEmbedPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('protocol')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 协议筛选状态
  const [protocolCategory, setProtocolCategory] = useState('')
  const [protocolChain, setProtocolChain] = useState('')
  const [protocolSortBy, setProtocolSortBy] = useState<'tvl_desc' | 'tvl_asc'>('tvl_desc')

  // 协议搜索结果
  const [protocols, setProtocols] = useState<Protocol[]>([])

  // 收益池筛选状态
  const [yieldMinApy, setYieldMinApy] = useState(0)
  const [yieldChain, setYieldChain] = useState('')
  const [yieldSortBy, setYieldSortBy] = useState<'apy_desc' | 'apy_asc'>('apy_desc')

  // 收益池搜索结果
  const [yields, setYields] = useState<YieldPool[]>([])

  // 代币信息
  const [tokenChain, setTokenChain] = useState('ethereum')
  const [tokenAddress, setTokenAddress] = useState('')
  const [tokenData, setTokenData] = useState<TokenData | null>(null)

  // 确保组件已挂载到 DOM
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // 加载推荐数据（考虑筛选条件和排序）
  useEffect(() => {
    if (!mounted) return

    const loadRecommendations = async () => {
      if (activeTab === 'protocol') {
        // 加载热门协议
        try {
          const params = new URLSearchParams()
          params.append('limit', '50') // 获取更多数据用于排序
          if (protocolCategory) params.append('category', protocolCategory)
          if (protocolChain) params.append('chain', protocolChain)

          const response = await fetch(`/api/defi/protocols?${params}`)
          const data = await response.json()
          if (response.ok && data.protocols) {
            // 客户端排序
            const sorted = [...data.protocols].sort((a: Protocol, b: Protocol) => {
              if (protocolSortBy === 'tvl_desc') {
                return (b.tvl || 0) - (a.tvl || 0)
              } else {
                return (a.tvl || 0) - (b.tvl || 0)
              }
            })
            setProtocols(sorted.slice(0, 20))
          }
        } catch (err) {
          console.error('加载推荐协议失败:', err)
        }
      } else if (activeTab === 'yield') {
        // 加载高收益池
        try {
          const params = new URLSearchParams()
          params.append('limit', '50') // 获取更多数据用于排序
          if (yieldMinApy > 0) params.append('minApy', yieldMinApy.toString())
          if (yieldChain) params.append('chain', yieldChain)

          const response = await fetch(`/api/defi/yields?${params}`)
          const data = await response.json()
          if (response.ok && data.pools) {
            // 客户端排序
            const sorted = [...data.pools].sort((a: YieldPool, b: YieldPool) => {
              if (yieldSortBy === 'apy_desc') {
                return (b.apy || 0) - (a.apy || 0)
              } else {
                return (a.apy || 0) - (b.apy || 0)
              }
            })
            setYields(sorted.slice(0, 20))
          }
        } catch (err) {
          console.error('加载推荐收益池失败:', err)
        }
      }
    }

    loadRecommendations()
  }, [mounted, activeTab, protocolCategory, protocolChain, protocolSortBy, yieldMinApy, yieldChain, yieldSortBy])

  // 搜索协议（包含筛选条件和排序）
  const searchProtocols = async () => {
    if (!searchQuery.trim()) {
      setError('请输入搜索关键词')
      return
    }

    setLoading(true)
    setError('')
    setProtocols([])

    try {
      const params = new URLSearchParams()
      params.append('search', encodeURIComponent(searchQuery))
      params.append('limit', '50')
      if (protocolCategory) params.append('category', protocolCategory)
      if (protocolChain) params.append('chain', protocolChain)

      const response = await fetch(`/api/defi/protocols?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '搜索失败')
      }

      // 客户端排序
      const sorted = [...(data.protocols || [])].sort((a: Protocol, b: Protocol) => {
        if (protocolSortBy === 'tvl_desc') {
          return (b.tvl || 0) - (a.tvl || 0)
        } else {
          return (a.tvl || 0) - (b.tvl || 0)
        }
      })

      setProtocols(sorted.slice(0, 20))

      if (sorted.length === 0) {
        setError('未找到匹配的协议')
      }
    } catch (err) {
      console.error('搜索协议失败:', err)
      setError(err instanceof Error ? err.message : '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  // 搜索收益池（包含筛选条件和排序）
  const searchYields = async () => {
    setLoading(true)
    setError('')
    setYields([])

    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append('protocol', searchQuery)
      }
      params.append('limit', '50')
      if (yieldMinApy > 0) params.append('minApy', yieldMinApy.toString())
      if (yieldChain) params.append('chain', yieldChain)

      const response = await fetch(`/api/defi/yields?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '搜索失败')
      }

      // 客户端排序
      const sorted = [...(data.pools || [])].sort((a: YieldPool, b: YieldPool) => {
        if (yieldSortBy === 'apy_desc') {
          return (b.apy || 0) - (a.apy || 0)
        } else {
          return (a.apy || 0) - (b.apy || 0)
        }
      })

      setYields(sorted.slice(0, 20))

      if (sorted.length === 0) {
        setError('未找到匹配的收益池')
      }
    } catch (err) {
      console.error('搜索收益池失败:', err)
      setError(err instanceof Error ? err.message : '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取代币价格
  const fetchTokenPrice = async () => {
    if (!tokenAddress.trim()) {
      setError('请输入代币地址')
      return
    }

    setLoading(true)
    setError('')
    setTokenData(null)

    try {
      const response = await fetch('/api/defi/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: [{ chain: tokenChain, address: tokenAddress.trim() }]
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取价格失败')
      }

      // API 返回的 key 是小写的，需要转换匹配
      const tokenKey = `${tokenChain}:${tokenAddress.trim().toLowerCase()}`
      const priceData = data.prices[tokenKey]

      if (!priceData) {
        throw new Error('未找到该代币价格')
      }

      setTokenData({
        chain: tokenChain,
        address: tokenAddress.trim(),
        symbol: priceData.symbol,
        price: priceData.price,
        decimals: priceData.decimals,
      })
    } catch (err) {
      console.error('获取代币价格失败:', err)
      setError(err instanceof Error ? err.message : '获取价格失败')
    } finally {
      setLoading(false)
    }
  }

  // 选择协议
  const handleSelectProtocol = (protocol: Protocol) => {
    onSelect({
      type: 'protocol',
      referenceId: protocol.slug,
      snapshotData: protocol,
    })
  }

  // 选择收益池
  const handleSelectYield = (pool: YieldPool) => {
    onSelect({
      type: 'yield',
      referenceId: pool.pool,
      snapshotData: pool,
    })
  }

  // 选择代币
  const handleSelectToken = () => {
    if (!tokenData) return

    onSelect({
      type: 'token',
      referenceId: `${tokenData.chain}:${tokenData.address}`,
      snapshotData: tokenData,
    })
  }

  // 等待组件挂载后再渲染，使用 Portal 渲染到 body
  if (!mounted) return null

  const modalContent = (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">插入 DeFi 数据</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('protocol')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'protocol'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />
            协议
          </button>
          <button
            onClick={() => setActiveTab('yield')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'yield'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Droplets className="w-4 h-4 inline mr-1" />
            收益池
          </button>
          <button
            onClick={() => setActiveTab('token')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'token'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Coins className="w-4 h-4 inline mr-1" />
            代币
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 协议搜索 */}
          {activeTab === 'protocol' && (
            <div className="space-y-3">
              {/* 紧凑型筛选按钮 */}
              <div className="space-y-2">
                {/* 分类筛选 */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-medium text-gray-500 py-1.5">分类:</span>
                  {COMPACT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setProtocolCategory(cat.value)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                        protocolCategory === cat.value
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 链筛选 */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-medium text-gray-500 py-1.5">链:</span>
                  {COMPACT_CHAINS.map((chain) => (
                    <button
                      key={chain.value}
                      onClick={() => setProtocolChain(chain.value)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                        protocolChain === chain.value
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {chain.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 搜索框 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchProtocols()}
                  placeholder="搜索协议名称（如：aave, uniswap）"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={searchProtocols}
                  disabled={loading}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              {/* 协议列表标题和排序 */}
              {!loading && protocols.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">
                    💡 {searchQuery ? '搜索结果' : '热门协议推荐'} ({protocols.length})
                  </p>

                  {/* TVL 排序切换 */}
                  <div className="flex bg-gray-100 rounded-md p-0.5">
                    <button
                      onClick={() => setProtocolSortBy('tvl_desc')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        protocolSortBy === 'tvl_desc'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="TVL 从高到低"
                    >
                      TVL ↓
                    </button>
                    <button
                      onClick={() => setProtocolSortBy('tvl_asc')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        protocolSortBy === 'tvl_asc'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="TVL 从低到高"
                    >
                      TVL ↑
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {protocols.map((protocol) => (
                  <button
                    key={protocol.slug}
                    onClick={() => handleSelectProtocol(protocol)}
                    className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-left"
                  >
                    {protocol.logo && (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image src={protocol.logo} alt={protocol.name} fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{protocol.name}</h4>
                      <p className="text-sm text-gray-600">TVL: {formatTVL(protocol.tvl)}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      {protocol.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 收益池搜索 */}
          {activeTab === 'yield' && (
            <div className="space-y-3">
              {/* 紧凑型筛选按钮 */}
              <div className="space-y-2">
                {/* APY 筛选 */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-medium text-gray-500 py-1.5">收益:</span>
                  {APY_FILTERS.map((filter, index) => {
                    const Icon = filter.icon
                    return (
                      <button
                        key={index}
                        onClick={() => setYieldMinApy(filter.minApy)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                          yieldMinApy === filter.minApy
                            ? 'bg-green-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {filter.label}
                      </button>
                    )
                  })}
                </div>

                {/* 链筛选 */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-medium text-gray-500 py-1.5">链:</span>
                  {COMPACT_CHAINS.map((chain) => (
                    <button
                      key={chain.value}
                      onClick={() => setYieldChain(chain.value)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                        yieldChain === chain.value
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {chain.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 搜索框 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchYields()}
                  placeholder="搜索协议名称（可选）"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={searchYields}
                  disabled={loading}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              {/* 收益池列表标题和排序 */}
              {!loading && yields.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">
                    💡 {searchQuery ? '搜索结果' : '高收益池推荐'} ({yields.length})
                  </p>

                  {/* APY 排序切换 */}
                  <div className="flex bg-gray-100 rounded-md p-0.5">
                    <button
                      onClick={() => setYieldSortBy('apy_desc')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        yieldSortBy === 'apy_desc'
                          ? 'bg-white text-green-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="APY 从高到低"
                    >
                      APY ↓
                    </button>
                    <button
                      onClick={() => setYieldSortBy('apy_asc')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        yieldSortBy === 'apy_asc'
                          ? 'bg-white text-green-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="APY 从低到高"
                    >
                      APY ↑
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {yields.map((pool) => (
                  <button
                    key={pool.pool}
                    onClick={() => handleSelectYield(pool)}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900">{pool.project}</h4>
                      <p className="text-sm text-gray-600">{pool.symbol}</p>
                      <p className="text-xs text-gray-500 mt-1">{pool.chain}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{formatAPY(pool.apy)}</p>
                      <p className="text-xs text-gray-500">TVL: {formatTVL(pool.tvlUsd)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 代币价格 */}
          {activeTab === 'token' && (
            <div className="space-y-3">
              {/* 快捷代币选择 */}
              {!tokenData && !loading && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">💡 快捷选择常见代币</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TOKEN_CATEGORIES.map((token) => (
                      <button
                        key={token.label}
                        onClick={() => {
                          setTokenChain(token.chain)
                          setTokenAddress(token.address)
                        }}
                        className="p-2.5 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left text-sm transition"
                      >
                        <div className="font-semibold text-gray-900">{token.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">点击快速填充</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 手动输入区域 */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">区块链</label>
                  <select
                    value={tokenChain}
                    onChange={(e) => setTokenChain(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="bsc">BSC</option>
                    <option value="polygon">Polygon</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="optimism">Optimism</option>
                    <option value="avalanche">Avalanche</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">代币地址</label>
                  <input
                    type="text"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchTokenPrice()}
                    placeholder="0x..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={fetchTokenPrice}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      查询中...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      查询价格
                    </>
                  )}
                </button>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              {tokenData && (
                <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h4 className="font-bold text-lg text-gray-900 mb-2">{tokenData.symbol}</h4>
                  <p className="text-3xl font-bold text-blue-600 mb-2">${tokenData.price.toFixed(6)}</p>
                  <p className="text-sm text-gray-600 mb-4">
                    链: {tokenData.chain} · 精度: {tokenData.decimals}
                  </p>
                  <button
                    onClick={handleSelectToken}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    选择该代币
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
