'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Activity, TrendingUp, Zap } from 'lucide-react'
import ProductTabs from '@/components/defi/ProductTabs'
import YieldTable from '@/components/defi/YieldTable'
import YieldFilters from '@/components/defi/YieldFilters'
import HotProductCards from '@/components/defi/HotProductCards'
import { PancakeSwapPools } from '@/components/defi/PancakeSwapPools'
import { YieldPool } from '@/lib/defillama/types'
import { PoolCategory, SortOption, TVL_RANGES, getHotProducts, getUniqueChains } from '@/lib/defi-utils'
import { useDebounce } from '@/hooks/useDebounce'

export default function InvestDiscovery() {
  // 状态管理
  const [yields, setYields] = useState<YieldPool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 筛选状态
  const [activeCategory, setActiveCategory] = useState<PoolCategory>('all')
  const [selectedChain, setSelectedChain] = useState('all')
  const [selectedTvlRange, setSelectedTvlRange] = useState(0)
  const [selectedRisk, setSelectedRisk] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('apy_desc')
  const [searchQuery, setSearchQuery] = useState('')

  // 使用防抖搜索
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // 可用的链列表
  const [availableChains, setAvailableChains] = useState<string[]>([])

  // 获取收益率数据
  const fetchYields = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      // 构建查询参数
      const params = new URLSearchParams({
        category: activeCategory,
        sortBy: sortBy,
        limit: '500',
      })

      if (selectedChain !== 'all') {
        params.set('chain', selectedChain)
      }

      if (selectedRisk !== 'all') {
        params.set('risk', selectedRisk)
      }

      // TVL 范围
      const tvlRange = TVL_RANGES[selectedTvlRange]
      if (tvlRange.min > 0) {
        params.set('minTvl', tvlRange.min.toString())
      }
      if (tvlRange.max < Infinity) {
        params.set('maxTvl', tvlRange.max.toString())
      }

      const response = await fetch(`/api/defi/yields?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取数据失败')
      }

      setYields(data.pools || [])

      // 提取可用的链
      if (data.pools && data.pools.length > 0) {
        const chains = getUniqueChains(data.pools)
        setAvailableChains(chains)
      }
    } catch (error) {
      console.error('获取收益率失败:', error)
      setError(error instanceof Error ? error.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [activeCategory, selectedChain, selectedTvlRange, selectedRisk, sortBy])

  // 初始加载和筛选变化时重新获取
  useEffect(() => {
    fetchYields()
  }, [fetchYields])

  // 搜索过滤（前端）
  const filteredYields = yields.filter((pool) => {
    if (!debouncedSearchQuery) return true
    const query = debouncedSearchQuery.toLowerCase()
    return (
      pool.project.toLowerCase().includes(query) ||
      pool.symbol.toLowerCase().includes(query) ||
      pool.chain.toLowerCase().includes(query)
    )
  })

  // 获取热门投资品
  const hotProducts = getHotProducts(yields, 5)

  // 统计各分类数量
  const categoryCounts: Record<PoolCategory, number> = {
    stablecoin: yields.filter((p) => p.stablecoin).length,
    single: yields.filter((p) => p.exposure === 'single').length,
    multi: yields.filter((p) => p.exposure === 'multi').length,
    all: yields.length,
  }

  return (
    <div className="space-y-6">
      {/* 顶部统计区 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6" />
            <h1 className="text-3xl font-bold">Web3 投资入口，轻松触达</h1>
          </div>
          <div className="flex flex-wrap gap-6 text-white/90">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-lg">
                <span className="font-bold text-white">{yields.length}</span> 个投资品
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="text-lg">
                <span className="font-bold text-white">{new Set(yields.map(p => p.project)).size}</span> 个协议
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 text-center">🌐</span>
              <span className="text-lg">
                <span className="font-bold text-white">{availableChains.length}</span> 个网络
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="搜索协议、代币或池子..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
        />
      </div>

      {/* PancakeSwap Top 热门池子 */}
      <PancakeSwapPools
        chain="bsc"
        minTvl={100000}
        limit={12}
        title="🔥 PancakeSwap 热门池子 (BSC)"
      />

      {/* 热门投资品 */}
      {hotProducts.length > 0 && (
        <HotProductCards products={hotProducts} />
      )}

      {/* 产品分类 Tab */}
      <ProductTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        counts={categoryCounts}
      />

      {/* 筛选器 */}
      <YieldFilters
        chains={availableChains}
        selectedChain={selectedChain}
        selectedTvlRange={selectedTvlRange}
        selectedRisk={selectedRisk}
        sortBy={sortBy}
        onChainChange={setSelectedChain}
        onTvlRangeChange={setSelectedTvlRange}
        onRiskChange={setSelectedRisk}
        onSortChange={setSortBy}
      />

      {/* 加载状态 */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
          <p className="font-semibold">加载失败</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* 表格视图 */}
      {!loading && !error && (
        <YieldTable
          pools={filteredYields}
          onSort={(column) => {
            // 这里可以添加客户端排序逻辑
            console.log('排序:', column)
          }}
          currentSort={sortBy.startsWith('apy') ? 'apy' : sortBy.startsWith('tvl') ? 'tvl' : 'apy30d'}
        />
      )}

      {/* 使用说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-3">💡 使用提示</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-semibold">•</span>
            <span>
              <strong>产品分类</strong>：稳定币（低风险）、单币质押（无 IL）、流动性挖矿（高收益）
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold">•</span>
            <span>
              <strong>TVL 筛选</strong>：建议选择 TVL $10M+ 的池子，流动性更好，风险更低
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold">•</span>
            <span>
              <strong>30d Avg APY</strong>：比当前 APY 更稳定可靠，推荐参考这个指标
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold">•</span>
            <span>
              <strong>认购跳转</strong>：点击&ldquo;认购&rdquo;按钮会跳转到协议官网，需要连接钱包
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
